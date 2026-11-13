// ─────────────────────────────────────────────────────────────────────────────
// Password Strength Analyzer — integrates 2nd-order Markov Chain model
// ─────────────────────────────────────────────────────────────────────────────

import { getLoadedModel, type TrainedMarkovModel } from '../markov/modelLoader';
import { scorePasswordWithMarkov, type MarkovScoreResult, type PredictabilityClassification } from '../markov/markovFilter';

export type StrengthLevel = 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';

export interface CharComposition {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers:   boolean;
  hasSymbols:   boolean;
  uniqueChars:  number;
  totalChars:   number;
}

export interface PatternDetection {
  hasRepeated:        boolean;
  hasSequential:      boolean;
  hasKeyboard:        boolean;
  hasCommonWord:      boolean;
  repeatedExamples:   string[];
  sequentialExamples: string[];
  warnings:           string[];
}

export interface CrackingTime {
  online:      string;  // 10k/s (rate-limited login)
  offlineSlow: string;  // 10M/s (bcrypt)
  offlineFast: string;  // 10B/s (MD5/raw hash)
}

export interface PasswordAnalysis {
  strength:            StrengthLevel;
  score:               number;   // 0–100
  entropy:             number;   // bits
  crackingTime:        CrackingTime;
  charComposition:     CharComposition;
  patterns:            PatternDetection;
  suggestions:         string[];
  markovInsights:      string[];
  predictabilityScore: number;   // 0–100 (0 = highly random, 100 = very predictable)
  averageSurprisal:    number;   // bits/char from trained Markov model
  classification:      PredictabilityClassification;
}

const KEYBOARD_RUNS = [
  'qwertyuiop','asdfghjkl','zxcvbnm',
  'qwerty','qwert','asdf','asdfg','zxcv','zxcvb',
  'qazwsx','wsxedc','1qaz2wsx','poiuyt','lkjhgf','mnbvcx',
];

const COMMON_FRAGMENTS = [
  'password','passw0rd','p@ssword','p@$$word','passwd',
  'admin','login','user','welcome','letmein',
  'monkey','dragon','master','sunshine','princess',
  'baseball','football','soccer','hockey','killer',
  'shadow','superman','batman','trustno1','hello',
  'michael','jessica','jennifer','joshua','hunter',
  'harley','robert','iloveyou','starwars','access','secret',
  '123456','654321','111111','000000','696969',
];

function charsetSize(c: CharComposition): number {
  let n = 0;
  if (c.hasLowercase) n += 26;
  if (c.hasUppercase) n += 26;
  if (c.hasNumbers)   n += 10;
  if (c.hasSymbols)   n += 32;
  return n || 26;
}

function formatTime(seconds: number): string {
  if (seconds < 0.001)                    return 'Instantly';
  if (seconds < 1)                        return '< 1 second';
  if (seconds < 60)                       return `~${Math.round(seconds)}s`;
  if (seconds < 3_600)                    return `~${Math.round(seconds / 60)} min`;
  if (seconds < 86_400)                   return `~${Math.round(seconds / 3_600)} hr`;
  if (seconds < 86_400 * 365)             return `~${Math.round(seconds / 86_400)} days`;
  if (seconds < 86_400 * 365 * 1_000)    return `~${Math.round(seconds / (86_400 * 365))} yrs`;
  if (seconds < 86_400 * 365 * 1e9)      return `~${(seconds / (86_400 * 365 * 1_000)).toFixed(1)}K yrs`;
  if (seconds < 86_400 * 365 * 1e12)     return `~${(seconds / (86_400 * 365 * 1e9)).toFixed(1)}M yrs`;
  if (seconds < 86_400 * 365 * 1e15)     return `~${(seconds / (86_400 * 365 * 1e12)).toFixed(1)}B yrs`;
  return 'Longer than the universe';
}

function entropyToCrackingTime(entropy: number): CrackingTime {
  const combos = Math.pow(2, entropy);
  const avg    = combos / 2;
  return {
    online:      formatTime(avg / 10_000),
    offlineSlow: formatTime(avg / 10_000_000),
    offlineFast: formatTime(avg / 10_000_000_000),
  };
}

function entropyToBaseScore(entropy: number): number {
  if (entropy <  28) return (entropy / 28) * 25;
  if (entropy <  50) return 25 + ((entropy - 28) / 22) * 25;
  if (entropy <  80) return 50 + ((entropy - 50) / 30) * 25;
  return 75 + Math.min(20, ((entropy - 80) / 60) * 20);
}

function scoreToStrength(score: number): StrengthLevel {
  if (score <  25) return 'WEAK';
  if (score <  50) return 'MODERATE';
  if (score <  75) return 'STRONG';
  return 'EXTREME';
}

export function analyzePassword(password: string, customModel?: TrainedMarkovModel | null): PasswordAnalysis {
  if (!password) return emptyAnalysis();

  const comp: CharComposition = {
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers:   /[0-9]/.test(password),
    hasSymbols:   /[^a-zA-Z0-9]/.test(password),
    uniqueChars:  new Set(password).size,
    totalChars:   password.length,
  };

  const N       = charsetSize(comp);
  const entropy = password.length * Math.log2(N);

  const lower    = password.toLowerCase();
  const warnings: string[] = [];
  const repEx:    string[] = [];
  const seqEx:    string[] = [];
  let hasRepeated = false, hasSequential = false, hasKeyboard = false, hasCommonWord = false;

  // Repeated chars (3+ in a row)
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i+1] && password[i] === password[i+2]) {
      hasRepeated = true;
      repEx.push(`"${password[i]}${password[i+1]}${password[i+2]}"`);
    }
  }

  // Sequential chars (3+ ascending or descending)
  for (let i = 0; i < password.length - 2; i++) {
    const a = password.charCodeAt(i), b = password.charCodeAt(i+1), c = password.charCodeAt(i+2);
    if ((b === a+1 && c === b+1) || (b === a-1 && c === b-1)) {
      hasSequential = true;
      seqEx.push(`"${password[i]}${password[i+1]}${password[i+2]}"`);
    }
  }

  // Keyboard patterns
  for (const run of KEYBOARD_RUNS) {
    if (lower.includes(run)) {
      hasKeyboard = true;
      warnings.push(`Keyboard pattern: "${run}"`);
      break;
    }
  }

  // Common password words
  for (const frag of COMMON_FRAGMENTS) {
    if (lower.includes(frag)) {
      hasCommonWord = true;
      warnings.push(`Known password fragment: "${frag}"`);
      break;
    }
  }

  if (hasRepeated)   warnings.push(`Repeated chars: ${[...new Set(repEx)].slice(0,2).join(', ')}`);
  if (hasSequential) warnings.push(`Sequential chars: ${[...new Set(seqEx)].slice(0,2).join(', ')}`);

  const patterns: PatternDetection = {
    hasRepeated, hasSequential, hasKeyboard, hasCommonWord,
    repeatedExamples: repEx, sequentialExamples: seqEx, warnings,
  };

  // Evaluate against the trained 2nd-order Markov model
  const model = customModel ?? getLoadedModel();
  let markovScore: MarkovScoreResult | null = null;
  let markovInsights: string[] = [];
  let predictabilityScore = 50;
  let averageSurprisal = 0;
  let classification: PredictabilityClassification = 'MODERATE';

  if (model) {
    markovScore = scorePasswordWithMarkov(password, model);
    predictabilityScore = markovScore.predictabilityScore;
    averageSurprisal = markovScore.averageSurprisal;
    classification = markovScore.classification;

    if (markovScore.classification === 'VERY_PREDICTABLE') {
      markovInsights.push(`High statistical match to weak wordlist patterns (Surprisal: ${averageSurprisal} bits/char)`);
    } else if (markovScore.classification === 'PREDICTABLE') {
      markovInsights.push(`Some predictable character sequences detected (Surprisal: ${averageSurprisal} bits/char)`);
    } else if (markovScore.classification === 'MODERATE') {
      markovInsights.push(`Moderate unpredictability (Surprisal: ${averageSurprisal} bits/char)`);
    } else {
      markovInsights.push(`High Markov surprisal (${averageSurprisal} bits/char) — character transitions appear thoroughly randomized`);
    }

    if (markovScore.flaggedSequences.length > 0) {
      markovInsights.push(`Frequent wordlist transitions: ${markovScore.flaggedSequences.join(', ')}`);
    }
  }

  // Scoring combining entropy and 2nd-order Markov predictability
  let score = entropyToBaseScore(entropy);
  if (hasRepeated)             score -= 10;
  if (hasSequential)           score -= 15;
  if (hasKeyboard)             score -= 20;
  if (hasCommonWord)           score -= 30;
  if (password.length < 8)    score -= 25;
  if (password.length < 6)    score -= 20;

  // Penalize based on Markov predictability
  score -= (predictabilityScore / 100) * 20;

  if (comp.uniqueChars > password.length * 0.7) score += 5;
  if (password.length >= 16)  score += 5;
  if (password.length >= 20)  score += 5;
  score = Math.round(Math.max(0, Math.min(100, score)));

  // Improvement suggestions
  const suggestions: string[] = [];
  if (password.length < 12)     suggestions.push('Aim for at least 12 characters — length is the single most powerful factor.');
  if (!comp.hasUppercase)       suggestions.push('Add uppercase letters (A–Z) to broaden the search space.');
  if (!comp.hasLowercase)       suggestions.push('Mix in lowercase letters (a–z).');
  if (!comp.hasNumbers)         suggestions.push('Include numbers (0–9).');
  if (!comp.hasSymbols)         suggestions.push('Special characters (!@#$%) significantly increase Markov surprisal.');
  if (hasRepeated)              suggestions.push('Avoid repeating identical characters 3+ times.');
  if (hasSequential)            suggestions.push('Avoid sequential runs like "abc" or "123".');
  if (hasKeyboard)              suggestions.push('Avoid keyboard row runs (qwerty, asdf…).');
  if (hasCommonWord)            suggestions.push('Remove common words — they are in every attacker dictionary.');
  if (predictabilityScore > 65) suggestions.push('Character transitions match common password habits — randomize character order.');
  if (score >= 75 && suggestions.length === 0)  suggestions.push('Excellent password! Store it in a password manager.');

  return {
    strength: scoreToStrength(score),
    score,
    entropy:         Math.round(entropy * 10) / 10,
    crackingTime:    entropyToCrackingTime(entropy),
    charComposition: comp,
    patterns,
    suggestions:     suggestions.slice(0, 5),
    markovInsights,
    predictabilityScore,
    averageSurprisal,
    classification,
  };
}

function emptyAnalysis(): PasswordAnalysis {
  return {
    strength: 'WEAK', score: 0, entropy: 0,
    crackingTime:    { online: '—', offlineSlow: '—', offlineFast: '—' },
    charComposition: { hasUppercase:false, hasLowercase:false, hasNumbers:false, hasSymbols:false, uniqueChars:0, totalChars:0 },
    patterns:        { hasRepeated:false, hasSequential:false, hasKeyboard:false, hasCommonWord:false, repeatedExamples:[], sequentialExamples:[], warnings:[] },
    suggestions:     ['Start typing a password to get instant Markov analysis.'],
    markovInsights:  [],
    predictabilityScore: 0,
    averageSurprisal: 0,
    classification: 'VERY_PREDICTABLE',
  };
}
