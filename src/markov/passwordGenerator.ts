// ─────────────────────────────────────────────────────────────────────────────
// Markov-Powered Secure Password Generator
// Uses crypto.getRandomValues() exclusively for cryptographically secure randomness.
// Uses the trained second-order Markov Chain model as an active predictability filter.
// ─────────────────────────────────────────────────────────────────────────────

import { loadMarkovModel, getLoadedModel, type TrainedMarkovModel } from './modelLoader';
import { scorePasswordWithMarkov, type MarkovScoreResult, type PredictabilityClassification } from './markovFilter';
import { loadPyTorchModel, scorePasswordWithPyTorch, type PyTorchScoreResult } from '../neural/pytorchLstmEngine';

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  minSurprisalThreshold?: number; // Optional custom filter threshold
  useNeuralFilter?: boolean;      // Active PyTorch .pt Neural Char-LSTM filter
}

export interface GenerationStatistics {
  candidatesGenerated: number;
  candidatesRejected: number;
  candidatesAccepted: number;
  generationDurationMs: number;
  acceptedSurprisal: number;
  classification: PredictabilityClassification;
  rejectionReasons: string[];
  usedFallback: boolean;
  modelLoaded: boolean;
  pytorchModelActive: boolean;
  pytorchLoss: number;
  pytorchPerplexity: number;
}

export interface GenerationResult {
  password: string;
  stats: GenerationStatistics;
  markovResult: MarkovScoreResult | null;
  pytorchResult: PyTorchScoreResult | null;
}

const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.?',
} as const;

const MAX_ATTEMPTS = 50;

// High-risk known password fragments from dictionary attacks
const REJECTED_FRAGMENTS = [
  'password', 'passw0rd', 'admin', 'login', 'qwerty',
  '123456', '654321', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'shadow', 'superman', 'iloveyou'
];

/** Cryptographically secure random integer in [0, max) using Web Crypto API */
function secureRandInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const limit = Math.floor(0x100000000 / max) * max;
  let val = array[0];
  while (val >= limit) {
    crypto.getRandomValues(array);
    val = array[0];
  }
  return val % max;
}

/** Pick one random character from a charset using crypto.getRandomValues */
function pickChar(charset: string): string {
  return charset[secureRandInt(charset.length)];
}

/** Fisher-Yates shuffle with Web Crypto randomness */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Check if candidate contains 3+ identical consecutive characters */
function hasConsecutiveRepeats(pwd: string): boolean {
  for (let i = 0; i < pwd.length - 2; i++) {
    if (pwd[i] === pwd[i + 1] && pwd[i] === pwd[i + 2]) {
      return true;
    }
  }
  return false;
}

/** Check if candidate contains 3+ sequential characters */
function hasSequentialRuns(pwd: string): boolean {
  for (let i = 0; i < pwd.length - 2; i++) {
    const a = pwd.charCodeAt(i);
    const b = pwd.charCodeAt(i + 1);
    const c = pwd.charCodeAt(i + 2);
    if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) {
      return true;
    }
  }
  return false;
}

/** Check if candidate contains common dictionary fragments */
function hasKnownWeakFragment(pwd: string): string | null {
  const lower = pwd.toLowerCase();
  for (const frag of REJECTED_FRAGMENTS) {
    if (lower.includes(frag)) {
      return frag;
    }
  }
  return null;
}

/**
 * Generates a single candidate password using Web Crypto API
 */
function generateRawCandidate(opts: GeneratorOptions): string {
  const { length, uppercase, lowercase, numbers, symbols } = opts;

  let charset = '';
  if (uppercase) charset += CHARSETS.uppercase;
  if (lowercase) charset += CHARSETS.lowercase;
  if (numbers)   charset += CHARSETS.numbers;
  if (symbols)   charset += CHARSETS.symbols;

  if (!charset) charset = CHARSETS.lowercase;

  // Guarantee at least one char from each selected category
  const guaranteed: string[] = [];
  if (uppercase && length >= 1) guaranteed.push(pickChar(CHARSETS.uppercase));
  if (lowercase && length >= 2) guaranteed.push(pickChar(CHARSETS.lowercase));
  if (numbers   && length >= 3) guaranteed.push(pickChar(CHARSETS.numbers));
  if (symbols   && length >= 4) guaranteed.push(pickChar(CHARSETS.symbols));

  // Fill remaining slots
  const fillLen = Math.max(0, length - guaranteed.length);
  const filler = Array.from({ length: fillLen }, () => pickChar(charset));

  // Securely shuffle the candidate
  return shuffleArray([...guaranteed, ...filler]).join('');
}

/**
 * Generate password with the trained 2nd-order Markov Predictability Filter
 */
export async function generateMarkovFilteredPassword(
  opts: GeneratorOptions
): Promise<GenerationResult> {
  const startTime = performance.now();
  let model: TrainedMarkovModel | null = getLoadedModel();

  if (!model) {
    try {
      model = await loadMarkovModel();
    } catch {
      model = null;
    }
  }

  // Threshold: candidates with average surprisal below this are rejected as too predictable.
  // When using all 4 charsets, average surprisal is typically > 6.5.
  // For shorter lengths or fewer charsets, we set a proportional threshold.
  const numSets = (opts.uppercase ? 1 : 0) + (opts.lowercase ? 1 : 0) + (opts.numbers ? 1 : 0) + (opts.symbols ? 1 : 0);
  const defaultMinSurprisal = numSets >= 3 ? 5.8 : (numSets === 2 ? 4.8 : 4.0);
  const minSurprisal = opts.minSurprisalThreshold ?? defaultMinSurprisal;

  let candidatesGenerated = 0;
  let candidatesRejected = 0;
  const rejectionReasons: string[] = [];
  let acceptedPassword = '';
  let acceptedScoreResult: MarkovScoreResult | null = null;
  let acceptedPytorchResult: PyTorchScoreResult | null = null;

  // Ensure PyTorch model load is triggered
  loadPyTorchModel().catch(() => {});

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    candidatesGenerated++;
    const candidate = generateRawCandidate(opts);

    // Rule 1: Reject identical consecutive triplets
    if (hasConsecutiveRepeats(candidate)) {
      candidatesRejected++;
      rejectionReasons.push(`Attempt ${attempt}: 3+ repeating characters`);
      continue;
    }

    // Rule 2: Reject sequential runs (e.g. abc, 123)
    if (hasSequentialRuns(candidate)) {
      candidatesRejected++;
      rejectionReasons.push(`Attempt ${attempt}: sequential run`);
      continue;
    }

    // Rule 3: Reject known dictionary fragments
    const weakFrag = hasKnownWeakFragment(candidate);
    if (weakFrag) {
      candidatesRejected++;
      rejectionReasons.push(`Attempt ${attempt}: contained known weak fragment "${weakFrag}"`);
      continue;
    }

    // Rule 4: Markov Predictability Filter
    let markovPassed = true;
    let currentMarkovScore: MarkovScoreResult | null = null;
    if (model) {
      currentMarkovScore = scorePasswordWithMarkov(candidate, model);
      if (currentMarkovScore.averageSurprisal < minSurprisal) {
        candidatesRejected++;
        rejectionReasons.push(
          `Attempt ${attempt}: Markov surprisal too low (${currentMarkovScore.averageSurprisal.toFixed(2)} < ${minSurprisal.toFixed(2)})`
        );
        markovPassed = false;
        continue;
      }
    }

    // Rule 5: PyTorch Neural Char-LSTM Predictability Filter (.pt weights)
    if (opts.useNeuralFilter !== false) {
      const currentPytorchScore = scorePasswordWithPyTorch(candidate);
      if (currentPytorchScore.isPredictable) {
        candidatesRejected++;
        rejectionReasons.push(
          `Attempt ${attempt}: PyTorch Char-LSTM detected predictable pattern (PPL ${currentPytorchScore.perplexity.toFixed(1)}, Loss ${currentPytorchScore.crossEntropyLoss.toFixed(2)})`
        );
        continue;
      }
      acceptedPytorchResult = currentPytorchScore;
    }

    // Candidate passed both 2nd-order Markov AND PyTorch Neural filters!
    acceptedPassword = candidate;
    acceptedScoreResult = currentMarkovScore;
    break;
  }

  let usedFallback = false;
  // Graceful fallback if attempt limit reached
  if (!acceptedPassword) {
    usedFallback = true;
    acceptedPassword = generateRawCandidate(opts);
    if (model) {
      acceptedScoreResult = scorePasswordWithMarkov(acceptedPassword, model);
    }
    acceptedPytorchResult = scorePasswordWithPyTorch(acceptedPassword);
    rejectionReasons.push(`Reached attempt limit (${MAX_ATTEMPTS}) - applied secure fallback`);
  }

  if (!acceptedPytorchResult && acceptedPassword) {
    acceptedPytorchResult = scorePasswordWithPyTorch(acceptedPassword);
  }

  const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

  const stats: GenerationStatistics = {
    candidatesGenerated,
    candidatesRejected,
    candidatesAccepted: 1,
    generationDurationMs: durationMs,
    acceptedSurprisal: acceptedScoreResult ? acceptedScoreResult.averageSurprisal : 0,
    classification: acceptedScoreResult ? acceptedScoreResult.classification : 'MODERATE',
    rejectionReasons: rejectionReasons.slice(0, 4),
    usedFallback,
    modelLoaded: model !== null,
    pytorchModelActive: true,
    pytorchLoss: acceptedPytorchResult ? acceptedPytorchResult.crossEntropyLoss : 0,
    pytorchPerplexity: acceptedPytorchResult ? acceptedPytorchResult.perplexity : 0,
  };

  return {
    password: acceptedPassword,
    stats,
    markovResult: acceptedScoreResult,
    pytorchResult: acceptedPytorchResult,
  };
}
