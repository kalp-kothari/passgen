// ─────────────────────────────────────────────────────────────────────────────
// Markov Chain Password Predictability Model
//
// Uses bigram transition probabilities to estimate how "patterned" a password
// looks compared to known weak/common password character sequences.
// ─────────────────────────────────────────────────────────────────────────────

import { transitions, startProbs } from '../data/markovData';

const ALPHABET_SIZE = 96; // printable ASCII
const UNIFORM_LOG   = Math.log(1 / ALPHABET_SIZE); // ≈ -4.56
const VERY_COMMON_LOG = Math.log(0.35);             // ≈ -1.05

/** Returns 0–100 (0 = unpredictable/random, 100 = very common pattern) */
export function calculatePredictability(password: string): number {
  if (password.length < 2) return 0;

  const lower = password.toLowerCase();
  let totalLog = 0;
  let count    = 0;

  // Starting character
  const sp = startProbs[lower[0]] ?? (1 / ALPHABET_SIZE);
  totalLog += Math.log(Math.max(sp, 1e-9));
  count++;

  // Bigram transitions
  for (let i = 0; i < lower.length - 1; i++) {
    const curr  = lower[i];
    const next  = lower[i + 1];
    const trans = transitions[curr];
    const prob  = trans?.[next] ?? (1 / ALPHABET_SIZE);
    totalLog += Math.log(Math.max(prob, 1e-9));
    count++;
  }

  const avgLog = totalLog / count;

  // Map: UNIFORM_LOG (least predictable) → 0 ; VERY_COMMON_LOG → 100
  const raw = (avgLog - UNIFORM_LOG) / (VERY_COMMON_LOG - UNIFORM_LOG) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** Returns human-readable insights based on the Markov analysis */
export function getMarkovInsights(password: string): string[] {
  const insights: string[] = [];
  const score = calculatePredictability(password);
  const lower = password.toLowerCase();

  if (score > 65) {
    insights.push('Markov model: character transitions closely match common password patterns');
  } else if (score > 35) {
    insights.push('Markov model: some character sequences are statistically predictable');
  } else if (password.length > 0) {
    insights.push('Markov model: character patterns appear relatively random');
  }

  // Flag specific high-probability bigrams
  const flagged: string[] = [];
  for (let i = 0; i < lower.length - 1; i++) {
    const trans = transitions[lower[i]];
    const prob  = trans?.[lower[i + 1]] ?? (1 / ALPHABET_SIZE);
    if (prob > 0.30) {
      flagged.push(`"${password[i]}${password[i + 1]}"`);
    }
  }
  if (flagged.length > 0) {
    insights.push(`Highly predictable pairs: ${[...new Set(flagged)].slice(0, 4).join(', ')}`);
  }

  return insights;
}
