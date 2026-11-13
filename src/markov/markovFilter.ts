// ─────────────────────────────────────────────────────────────────────────────
// Markov Filter — 2nd-order character-level Markov scoring engine
// Uses Laplace-smoothed transition probabilities from the trained 7.15MB model.
// ─────────────────────────────────────────────────────────────────────────────

import { loadMarkovModel, getLoadedModel, type TrainedMarkovModel } from './modelLoader';

export const END_TOKEN = '$';
export const START_TOKEN = '^';

export type PredictabilityClassification =
  | 'VERY_PREDICTABLE'
  | 'PREDICTABLE'
  | 'MODERATE'
  | 'UNPREDICTABLE';

export interface TransitionDetail {
  context: string;
  char: string;
  probability: number;
  surprisalBits: number;
  isUnobservedContext: boolean;
  isUnobservedTransition: boolean;
}

export interface MarkovScoreResult {
  averageSurprisal: number;       // S(x) in bits/char (typical: 1.5 - 9.0)
  totalNegativeLogLikelihood: number;
  transitionCount: number;
  predictabilityScore: number;    // Normalized 0 - 100 (100 = very predictable, 0 = highly random)
  classification: PredictabilityClassification;
  transitions: TransitionDetail[];
  flaggedSequences: string[];
  modelMetadata: TrainedMarkovModel['metadata'] | null;
}

/**
 * Calculates second-order Laplace smoothed probability P(nextChar | context)
 */
export function getTransitionProbability(
  model: TrainedMarkovModel,
  context: string,
  nextChar: string
): { probability: number; isUnobservedContext: boolean; isUnobservedTransition: boolean } {
  const V = model.vocab_size_with_end_token || 96;
  const ctxData = model.contexts[context];

  if (!ctxData) {
    // Unseen context in training data -> uniform Laplace probability 1 / V
    return {
      probability: 1.0 / V,
      isUnobservedContext: true,
      isUnobservedTransition: true,
    };
  }

  // Known context: check if nextChar was observed
  if (ctxData.probabilities && nextChar in ctxData.probabilities) {
    return {
      probability: ctxData.probabilities[nextChar],
      isUnobservedContext: false,
      isUnobservedTransition: false,
    };
  }

  // Observed context, but this specific nextChar was unobserved:
  // Laplace formula: (0 + 1) / (total + V)
  const total = ctxData.total || 0;
  return {
    probability: 1.0 / (total + V),
    isUnobservedContext: false,
    isUnobservedTransition: true,
  };
}

/**
 * Evaluates a password using the second-order Markov Chain model.
 * 
 * S(x) = - (1 / L) * sum(log2 P(c_i | c_{i-2}, c_{i-1}))
 * 
 * Sequences used:
 * 1. P(c0 | '^^')
 * 2. P(c1 | '^' + c0)
 * 3. P(ci | c_{i-2}c_{i-1}) for i = 2 .. n-1
 * 4. P('$' | c_{n-2}c_{n-1})  [End of password transition]
 */
export function scorePasswordWithMarkov(
  password: string,
  model: TrainedMarkovModel
): MarkovScoreResult {
  if (!password || password.length === 0) {
    return {
      averageSurprisal: 0,
      totalNegativeLogLikelihood: 0,
      transitionCount: 0,
      predictabilityScore: 100,
      classification: 'VERY_PREDICTABLE',
      transitions: [],
      flaggedSequences: [],
      modelMetadata: model.metadata,
    };
  }

  const details: TransitionDetail[] = [];
  const flagged: string[] = [];

  // Helper to record transition
  const record = (context: string, char: string) => {
    const { probability, isUnobservedContext, isUnobservedTransition } =
      getTransitionProbability(model, context, char);
    // Avoid log2(0)
    const safeProb = Math.max(probability, 1e-12);
    const surprisalBits = -Math.log2(safeProb);
    details.push({
      context,
      char,
      probability: safeProb,
      surprisalBits,
      isUnobservedContext,
      isUnobservedTransition,
    });

    // If probability is very high (> 20%), flag this as a common pattern
    if (probability > 0.20 && char !== END_TOKEN) {
      flagged.push(`${context}→${char}`);
    }
  };

  // 1. Initial character given '^^'
  const c0 = password[0];
  record('^^', c0);

  if (password.length > 1) {
    // 2. Second character given '^' + c0
    const c1 = password[1];
    record(`^${c0}`, c1);

    // 3. Characters 2 to N-1 given previous 2 characters
    for (let i = 2; i < password.length; i++) {
      const ctx = password.substring(i - 2, i);
      const ci = password[i];
      record(ctx, ci);
    }

    // 4. End token '$' given last 2 characters
    const endCtx = password.substring(password.length - 2);
    record(endCtx, END_TOKEN);
  } else {
    // Single character password end token
    record(`^${c0}`, END_TOKEN);
  }

  const totalNLL = details.reduce((acc, d) => acc + d.surprisalBits, 0);
  const avgSurprisal = totalNLL / details.length;

  // Calibrate Predictability Score (0 - 100):
  // Based on empirical password benchmark:
  // - 123456 -> avg surprisal 1.87
  // - password -> avg surprisal 2.70
  // - qwerty -> avg surprisal 2.78
  // - correcthorsebatterystaple -> avg surprisal 3.76
  // - Uniform random over 95 printable chars -> log2(96) = 6.58
  // - High-entropy randomized passwords with symbols -> 7.2 to 8.5+
  // We map:
  // Surprisal <= 2.0 -> Predictability 100
  // Surprisal >= 7.8 -> Predictability 0
  const MIN_SURPRISAL = 2.0;
  const MAX_SURPRISAL = 7.8;
  const clamped = Math.max(MIN_SURPRISAL, Math.min(MAX_SURPRISAL, avgSurprisal));
  const rawPredictability = 100 - ((clamped - MIN_SURPRISAL) / (MAX_SURPRISAL - MIN_SURPRISAL)) * 100;
  const predictabilityScore = Math.round(rawPredictability);

  // Classification:
  let classification: PredictabilityClassification = 'UNPREDICTABLE';
  if (avgSurprisal < 3.2) {
    classification = 'VERY_PREDICTABLE';
  } else if (avgSurprisal < 5.2) {
    classification = 'PREDICTABLE';
  } else if (avgSurprisal < 6.5) {
    classification = 'MODERATE';
  } else {
    classification = 'UNPREDICTABLE';
  }

  return {
    averageSurprisal: Math.round(avgSurprisal * 1000) / 1000,
    totalNegativeLogLikelihood: Math.round(totalNLL * 100) / 100,
    transitionCount: details.length,
    predictabilityScore,
    classification,
    transitions: details,
    flaggedSequences: [...new Set(flagged)].slice(0, 5),
    modelMetadata: model.metadata,
  };
}

/**
 * Convenience method: scores password using cached model, or loads it if needed
 */
export async function scorePassword(password: string): Promise<MarkovScoreResult> {
  let model = getLoadedModel();
  if (!model) {
    model = await loadMarkovModel();
  }
  return scorePasswordWithMarkov(password, model);
}
