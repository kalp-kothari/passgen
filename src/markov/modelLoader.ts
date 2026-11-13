// ─────────────────────────────────────────────────────────────────────────────
// Model Loader — loads and caches the 7.15MB second-order Markov JSON model
// ─────────────────────────────────────────────────────────────────────────────

export interface MarkovMetadata {
  model: string;
  algorithm: string;
  order: number;
  smoothing: string;
  trained_at: string;
  passwords_processed: number;
  files_processed: number;
  transitions_learned: number;
  vocabulary_size: number;
  contexts_learned: number;
}

export interface ContextData {
  total: number;
  counts: Record<string, number>;
  probabilities: Record<string, number>;
}

export interface TrainedMarkovModel {
  metadata: MarkovMetadata;
  vocabulary: string[];
  vocab_size_with_end_token: number;
  contexts: Record<string, ContextData>;
}

let cachedModel: TrainedMarkovModel | null = null;
let loadPromise: Promise<TrainedMarkovModel> | null = null;

export type ModelLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

let currentStatus: ModelLoadStatus = 'idle';
let statusListeners: Array<(status: ModelLoadStatus) => void> = [];

export function getModelStatus(): ModelLoadStatus {
  return currentStatus;
}

export function subscribeModelStatus(listener: (status: ModelLoadStatus) => void): () => void {
  statusListeners.push(listener);
  listener(currentStatus);
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener);
  };
}

function setStatus(status: ModelLoadStatus) {
  currentStatus = status;
  statusListeners.forEach(l => l(status));
}

/**
 * Loads the trained Markov Chain model from public/model/markov_model.json
 * Implements singleton caching so the 7.15 MB file is fetched and parsed only once.
 */
export async function loadMarkovModel(): Promise<TrainedMarkovModel> {
  if (cachedModel) {
    return cachedModel;
  }

  if (loadPromise) {
    return loadPromise;
  }

  setStatus('loading');

  loadPromise = (async () => {
    try {
      const res = await fetch('/model/markov_model.json');
      if (!res.ok) {
        throw new Error(`Failed to load Markov model: HTTP ${res.status}`);
      }
      const data: TrainedMarkovModel = await res.json();
      
      // Verify expected fields
      if (!data.metadata || !data.contexts || !data.vocab_size_with_end_token) {
        throw new Error('Markov model JSON is missing expected schema keys.');
      }

      cachedModel = data;
      setStatus('ready');
      return cachedModel;
    } catch (err) {
      console.error('[MarkovModelLoader] Error loading model:', err);
      setStatus('error');
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

/** Get the synchronously cached model if already loaded */
export function getLoadedModel(): TrainedMarkovModel | null {
  return cachedModel;
}
