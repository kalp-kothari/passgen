// ─────────────────────────────────────────────────────────────────────────────
// Markov Calibration & Validation Benchmark Suite
// Empirically measures surprisal distributions, acceptance rates, and timing.
// ─────────────────────────────────────────────────────────────────────────────

import { scorePasswordWithMarkov, type MarkovScoreResult } from './markovFilter';
import { generateMarkovFilteredPassword } from './passwordGenerator';
import { type TrainedMarkovModel } from './modelLoader';

export interface BenchmarkGroupResult {
  category: string;
  sampleCount: number;
  averageSurprisal: number;
  minSurprisal: number;
  maxSurprisal: number;
  samples: Array<{ password: string; surprisal: number; classification: string }>;
}

export interface GeneratorBenchmarkResult {
  attempts: number;
  avgDurationMs: number;
  avgCandidatesGenerated: number;
  avgCandidatesRejected: number;
  rejectionRatePercent: number;
  acceptanceRatePercent: number;
  avgAcceptedSurprisal: number;
}

export const COMMON_BENCHMARK_SAMPLES = [
  'password', '123456', 'qwerty', 'admin', 'iloveyou',
  '12345678', 'welcome', 'monkey', 'dragon', 'baseball',
  'football', 'master', 'sunshine', 'princess', 'solo'
];

export const HELD_OUT_MODERATE_SAMPLES = [
  'Summer2024!', 'Welcome#123', 'Password123$', 'Secret@2023',
  'DragonFly99!', 'StarWars#1', 'BlueSky!24', 'CoffeeBean$12'
];

/**
 * Runs a validation benchmark across common passwords vs moderate vs Markov-generated passwords.
 */
export async function runMarkovValidationSuite(
  model: TrainedMarkovModel
): Promise<{ groups: BenchmarkGroupResult[]; generatorMetrics: GeneratorBenchmarkResult }> {
  // 1. Common passwords group
  const commonScores = COMMON_BENCHMARK_SAMPLES.map(pwd => {
    const s = scorePasswordWithMarkov(pwd, model);
    return { password: pwd, surprisal: s.averageSurprisal, classification: s.classification };
  });

  const commonAvg = commonScores.reduce((a, b) => a + b.surprisal, 0) / commonScores.length;
  const commonMin = Math.min(...commonScores.map(s => s.surprisal));
  const commonMax = Math.max(...commonScores.map(s => s.surprisal));

  const commonGroup: BenchmarkGroupResult = {
    category: 'Common Leaked Passwords (High Predictability)',
    sampleCount: commonScores.length,
    averageSurprisal: Math.round(commonAvg * 100) / 100,
    minSurprisal: Math.round(commonMin * 100) / 100,
    maxSurprisal: Math.round(commonMax * 100) / 100,
    samples: commonScores,
  };

  // 2. Moderate structured passwords group
  const modScores = HELD_OUT_MODERATE_SAMPLES.map(pwd => {
    const s = scorePasswordWithMarkov(pwd, model);
    return { password: pwd, surprisal: s.averageSurprisal, classification: s.classification };
  });

  const modAvg = modScores.reduce((a, b) => a + b.surprisal, 0) / modScores.length;
  const modGroup: BenchmarkGroupResult = {
    category: 'Pattern-Based Structured Passwords (Moderate)',
    sampleCount: modScores.length,
    averageSurprisal: Math.round(modAvg * 100) / 100,
    minSurprisal: Math.round(Math.min(...modScores.map(s => s.surprisal)) * 100) / 100,
    maxSurprisal: Math.round(Math.max(...modScores.map(s => s.surprisal)) * 100) / 100,
    samples: modScores,
  };

  // 3. Run generator benchmark (generate 20 passwords)
  const RUNS = 20;
  let totalDuration = 0;
  let totalCandidates = 0;
  let totalRejected = 0;
  let totalAcceptedSurprisal = 0;
  const genSamples: Array<{ password: string; surprisal: number; classification: string }> = [];

  for (let i = 0; i < RUNS; i++) {
    const res = await generateMarkovFilteredPassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });
    totalDuration += res.stats.generationDurationMs;
    totalCandidates += res.stats.candidatesGenerated;
    totalRejected += res.stats.candidatesRejected;
    totalAcceptedSurprisal += res.stats.acceptedSurprisal;
    if (i < 8) {
      genSamples.push({
        password: res.password,
        surprisal: res.stats.acceptedSurprisal,
        classification: res.stats.classification,
      });
    }
  }

  const genGroup: BenchmarkGroupResult = {
    category: 'Markov-Filtered Cryptographic Candidates',
    sampleCount: RUNS,
    averageSurprisal: Math.round((totalAcceptedSurprisal / RUNS) * 100) / 100,
    minSurprisal: Math.round(Math.min(...genSamples.map(s => s.surprisal)) * 100) / 100,
    maxSurprisal: Math.round(Math.max(...genSamples.map(s => s.surprisal)) * 100) / 100,
    samples: genSamples,
  };

  const rejectionRate = Math.round((totalRejected / Math.max(1, totalCandidates)) * 100);
  const generatorMetrics: GeneratorBenchmarkResult = {
    attempts: RUNS,
    avgDurationMs: Math.round((totalDuration / RUNS) * 10) / 10,
    avgCandidatesGenerated: Math.round((totalCandidates / RUNS) * 10) / 10,
    avgCandidatesRejected: Math.round((totalRejected / RUNS) * 10) / 10,
    rejectionRatePercent: rejectionRate,
    acceptanceRatePercent: 100 - rejectionRate,
    avgAcceptedSurprisal: Math.round((totalAcceptedSurprisal / RUNS) * 100) / 100,
  };

  return {
    groups: [commonGroup, modGroup, genGroup],
    generatorMetrics,
  };
}
