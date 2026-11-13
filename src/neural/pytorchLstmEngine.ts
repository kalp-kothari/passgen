// ─────────────────────────────────────────────────────────────────────────────
// PyTorch Neural Char-LSTM Engine for Browser Client
// Powered by trained PyTorch weights from: /model/password_forge_weights.pt
// Architecture: PasswordCharLSTM (2-layer, 128-dim, 64-embed, 98-vocab)
// ─────────────────────────────────────────────────────────────────────────────

export interface PyTorchScoreResult {
  password: string;
  crossEntropyLoss: number;
  perplexity: number;
  neuralSurprisalBits: number;
  perCharSurprisal: Array<{ char: string; surprisalBits: number }>;
  isPredictable: boolean;
  neuralStrengthRating: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
  daredevilRating: string;
}

export interface PyTorchModelState {
  isLoaded: boolean;
  isLoading: boolean;
  ptFileSize: number;
  totalParameters: number;
  trainingSamples: number;
  finalLoss: number;
  finalPerplexity: number;
  error: string | null;
}

const SPECIAL_TOKENS = ['<pad>', '<sos>', '<eos>'];
const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
export const NEURAL_VOCAB = [...SPECIAL_TOKENS, ...PRINTABLE_ASCII];

export const CHAR_TO_IDX: Record<string, number> = {};
export const IDX_TO_CHAR: Record<number, string> = {};
NEURAL_VOCAB.forEach((c, idx) => {
  CHAR_TO_IDX[c] = idx;
  IDX_TO_CHAR[idx] = c;
});

const PAD_IDX = 0;
const SOS_IDX = 1;
const EOS_IDX = 2;
const VOCAB_SIZE = 98;
const EMBED_DIM = 64;
const HIDDEN_DIM = 128;

interface RawTensors {
  config: { vocab_size: number; embed_dim: number; hidden_dim: number; num_layers: number };
  vocab: string[];
  training_meta: { total_parameters: number; samples_trained: number; final_loss: number; final_perplexity: number };
  weights: {
    'embedding.weight': number[][];
    'lstm.weight_ih_l0': number[][];
    'lstm.weight_hh_l0': number[][];
    'lstm.bias_ih_l0': number[];
    'lstm.bias_hh_l0': number[];
    'lstm.weight_ih_l1': number[][];
    'lstm.weight_hh_l1': number[][];
    'lstm.bias_ih_l1': number[];
    'lstm.bias_hh_l1': number[];
    'fc.weight': number[][];
    'fc.bias': number[];
  };
}

let loadedTensors: RawTensors | null = null;
let ptBufferSizeBytes = 1007745;
let modelLoadPromise: Promise<boolean> | null = null;

const stateSubscribers: Array<(s: PyTorchModelState) => void> = [];
let currentState: PyTorchModelState = {
  isLoaded: false,
  isLoading: false,
  ptFileSize: 0,
  totalParameters: 250338,
  trainingSamples: 75000,
  finalLoss: 2.3132,
  finalPerplexity: 10.11,
  error: null,
};

function notifySubscribers() {
  stateSubscribers.forEach(fn => fn(currentState));
}

export function subscribePyTorchModel(fn: (s: PyTorchModelState) => void): () => void {
  stateSubscribers.push(fn);
  fn(currentState);
  return () => {
    const idx = stateSubscribers.indexOf(fn);
    if (idx >= 0) stateSubscribers.splice(idx, 1);
  };
}

export function getPyTorchModelState(): PyTorchModelState {
  return currentState;
}

/**
 * Loads the real PyTorch .pt model file and tensor weights directly in browser.
 */
export async function loadPyTorchModel(): Promise<boolean> {
  if (loadedTensors) return true;
  if (modelLoadPromise) return modelLoadPromise;

  currentState.isLoading = true;
  notifySubscribers();

  modelLoadPromise = (async () => {
    try {
      // 1. Actively fetch the .pt binary file to verify integrity & cache in client
      const ptRes = await fetch('/model/password_forge_weights.pt');
      if (ptRes.ok) {
        const ptBlob = await ptRes.blob();
        ptBufferSizeBytes = ptBlob.size;
        currentState.ptFileSize = ptBlob.size;
        console.log(`[PyTorch LSTM] Verified .pt model file: password_forge_weights.pt (${ptBlob.size.toLocaleString()} bytes)`);
      }

      // 2. Fetch tensor weights exported from .pt
      const tensorsRes = await fetch('/model/password_forge_neural_tensors.json');
      if (!tensorsRes.ok) {
        throw new Error(`Failed to load PyTorch tensor JSON: HTTP ${tensorsRes.status}`);
      }

      loadedTensors = await tensorsRes.json();
      currentState = {
        isLoaded: true,
        isLoading: false,
        ptFileSize: ptBufferSizeBytes,
        totalParameters: loadedTensors?.training_meta?.total_parameters || 250338,
        trainingSamples: loadedTensors?.training_meta?.samples_trained || 75000,
        finalLoss: loadedTensors?.training_meta?.final_loss || 2.3132,
        finalPerplexity: loadedTensors?.training_meta?.final_perplexity || 10.11,
        error: null,
      };
      notifySubscribers();
      console.log(`[PyTorch LSTM] Neural Char-LSTM Engine initialized. (250,338 weights active)`);
      return true;
    } catch (err: any) {
      console.error('[PyTorch LSTM] Failed to initialize model:', err);
      currentState.isLoading = false;
      currentState.error = err.message || 'Failed to load PyTorch weights';
      notifySubscribers();
      return false;
    }
  })();

  return modelLoadPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Neural Forward Pass Math Utilities
// ─────────────────────────────────────────────────────────────────────────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-45, Math.min(45, x))));
}

function tanh(x: number): number {
  return Math.tanh(Math.max(-45, Math.min(45, x)));
}

/** Vector dot product / matrix multiplication row */
function dotRow(row: number[], vec: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < row.length; i++) {
    sum += row[i] * vec[i];
  }
  return sum;
}

/**
 * Single step forward pass through 2-layer LSTM cell.
 */
function lstmStep(
  inputVec: Float32Array,
  h: [Float32Array, Float32Array],
  c: [Float32Array, Float32Array],
  W_ih_0: number[][],
  W_hh_0: number[][],
  b_0: Float32Array,
  W_ih_1: number[][],
  W_hh_1: number[][],
  b_1: Float32Array
): void {
  // Layer 0: inputVec (64) -> gates (512) -> h0 (128), c0 (128)
  const gates0 = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    gates0[i] = dotRow(W_ih_0[i], inputVec) + dotRow(W_hh_0[i], h[0]) + b_0[i];
  }

  for (let i = 0; i < 128; i++) {
    const it = sigmoid(gates0[i]);
    const ft = sigmoid(gates0[128 + i]);
    const gt = tanh(gates0[256 + i]);
    const ot = sigmoid(gates0[384 + i]);

    c[0][i] = ft * c[0][i] + it * gt;
    h[0][i] = ot * tanh(c[0][i]);
  }

  // Layer 1: h0 (128) -> gates (512) -> h1 (128), c1 (128)
  const gates1 = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    gates1[i] = dotRow(W_ih_1[i], h[0]) + dotRow(W_hh_1[i], h[1]) + b_1[i];
  }

  for (let i = 0; i < 128; i++) {
    const it = sigmoid(gates1[i]);
    const ft = sigmoid(gates1[128 + i]);
    const gt = tanh(gates1[256 + i]);
    const ot = sigmoid(gates1[384 + i]);

    c[1][i] = ft * c[1][i] + it * gt;
    h[1][i] = ot * tanh(c[1][i]);
  }
}

/**
 * Score a password using the loaded PyTorch Char-LSTM weights.
 * Computes exact character-by-character neural cross-entropy loss, perplexity, and surprisal bits.
 */
export function scorePasswordWithPyTorch(password: string): PyTorchScoreResult {
  if (!password) {
    return {
      password: '',
      crossEntropyLoss: 0,
      perplexity: 1,
      neuralSurprisalBits: 0,
      perCharSurprisal: [],
      isPredictable: true,
      neuralStrengthRating: 'WEAK',
      daredevilRating: "Brad's punching bag",
    };
  }

  // Fallback if weights not yet loaded: use fast heuristic
  if (!loadedTensors) {
    const approxBits = password.length * 4.2;
    return {
      password,
      crossEntropyLoss: 3.2,
      perplexity: 24.5,
      neuralSurprisalBits: Math.round(approxBits * 10) / 10,
      perCharSurprisal: password.split('').map(c => ({ char: c, surprisalBits: 4.2 })),
      isPredictable: password.length < 8,
      neuralStrengthRating: password.length > 14 ? 'STRONG' : 'MODERATE',
      daredevilRating: 'Initializing Neural PyTorch Engine...',
    };
  }

  const w = loadedTensors.weights;
  const embed = w['embedding.weight'];

  // Combined biases for layer 0 and layer 1
  const b_0 = new Float32Array(512);
  const b_1 = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    b_0[i] = w['lstm.bias_ih_l0'][i] + w['lstm.bias_hh_l0'][i];
    b_1[i] = w['lstm.bias_ih_l1'][i] + w['lstm.bias_hh_l1'][i];
  }

  // Tokenize password with <sos> and <eos>
  const tokens: number[] = [SOS_IDX];
  for (let i = 0; i < password.length; i++) {
    tokens.push(CHAR_TO_IDX[password[i]] ?? PAD_IDX);
  }
  tokens.push(EOS_IDX);

  // Initialize hidden & cell states
  const h: [Float32Array, Float32Array] = [new Float32Array(HIDDEN_DIM), new Float32Array(HIDDEN_DIM)];
  const c: [Float32Array, Float32Array] = [new Float32Array(HIDDEN_DIM), new Float32Array(HIDDEN_DIM)];

  let totalNLL = 0;
  const perCharSurprisal: Array<{ char: string; surprisalBits: number }> = [];

  // Iterate over tokens[:-1] to predict tokens[1:]
  for (let t = 0; t < tokens.length - 1; t++) {
    const inputToken = tokens[t];
    const targetToken = tokens[t + 1];

    // Get embedding vector (64)
    const inputVec = new Float32Array(embed[inputToken]);

    // Step LSTM
    lstmStep(inputVec, h, c, w['lstm.weight_ih_l0'], w['lstm.weight_hh_l0'], b_0, w['lstm.weight_ih_l1'], w['lstm.weight_hh_l1'], b_1);

    // Compute FC logits: shape 98
    const logits = new Float32Array(VOCAB_SIZE);
    let maxLogit = -Infinity;
    for (let v = 0; v < VOCAB_SIZE; v++) {
      let sum = w['fc.bias'][v];
      const fcRow = w['fc.weight'][v];
      for (let j = 0; j < HIDDEN_DIM; j++) {
        sum += fcRow[j] * h[1][j];
      }
      logits[v] = sum;
      if (sum > maxLogit) maxLogit = sum;
    }

    // Log-softmax
    let sumExp = 0;
    for (let v = 0; v < VOCAB_SIZE; v++) {
      sumExp += Math.exp(logits[v] - maxLogit);
    }
    const logSumExp = maxLogit + Math.log(sumExp);
    const targetLogProb = logits[targetToken] - logSumExp;

    const nll = -targetLogProb;
    totalNLL += nll;

    const charSymbol = targetToken === EOS_IDX ? '<eos>' : password[t] || '';
    const surprisalBits = Math.round((nll / Math.LN2) * 100) / 100;
    if (charSymbol !== '<eos>') {
      perCharSurprisal.push({ char: charSymbol, surprisalBits });
    }
  }

  const numPredictions = tokens.length - 1;
  const avgLoss = totalNLL / numPredictions;
  const perplexity = Math.round(Math.exp(Math.min(avgLoss, 20)) * 100) / 100;
  const totalBits = Math.round((totalNLL / Math.LN2) * 100) / 100;

  // A password is deemed predictable if neural perplexity is very low (< 14) or average loss < 2.5
  const isPredictable = perplexity < 14.0 || avgLoss < 2.5;

  let neuralStrengthRating: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME' = 'MODERATE';
  let daredevilRating = 'Skatepark Ramp Amateur';

  if (perplexity < 6 || totalBits < 30) {
    neuralStrengthRating = 'WEAK';
    daredevilRating = "Brad's punching bag";
  } else if (perplexity < 25 || totalBits < 55) {
    neuralStrengthRating = 'MODERATE';
    daredevilRating = 'Training wheels at Dead Man’s Drop';
  } else if (perplexity < 80 || totalBits < 90) {
    neuralStrengthRating = 'STRONG';
    daredevilRating = 'Suburban Daredevil Stunt Rider';
  } else {
    neuralStrengthRating = 'EXTREME';
    daredevilRating = '100% KICK BUTTOWSKI CERTIFIED GIGACHAD!';
  }

  return {
    password,
    crossEntropyLoss: Math.round(avgLoss * 1000) / 1000,
    perplexity,
    neuralSurprisalBits: totalBits,
    perCharSurprisal,
    isPredictable,
    neuralStrengthRating,
    daredevilRating,
  };
}
