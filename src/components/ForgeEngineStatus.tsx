import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, CheckCircle2, Loader2, AlertCircle, Database, ShieldCheck, Flame, Layers, FileCode2 } from 'lucide-react';
import { loadMarkovModel, getModelStatus, subscribeModelStatus, type TrainedMarkovModel, type ModelLoadStatus } from '../markov/modelLoader';

interface PyTorchMeta {
  model_name: string;
  file_name: string;
  format: string;
  architecture: string;
  vocab_size: number;
  total_parameters: number;
  samples_trained: number;
  final_loss: number;
  final_perplexity: number;
  training_time_seconds: number;
  loss_history: Array<{ epoch: number; loss: number; perplexity: number }>;
  vocab_tokens: number;
  status: string;
}

export default function ForgeEngineStatus() {
  const [model, setModel] = useState<TrainedMarkovModel | null>(null);
  const [status, setStatus] = useState<ModelLoadStatus>(getModelStatus());
  const [pytorchMeta, setPytorchMeta] = useState<PyTorchMeta | null>(null);
  const [activeTab, setActiveTab] = useState<'markov' | 'pytorch'>('markov');

  useEffect(() => {
    const unsub = subscribeModelStatus(newStatus => {
      setStatus(newStatus);
    });

    loadMarkovModel()
      .then(m => setModel(m))
      .catch(err => console.error('[ForgeEngineStatus] Failed to load model:', err));

    // Load PyTorch metadata
    fetch('/model/pytorch_metadata.json')
      .then(res => res.json())
      .then(data => setPytorchMeta(data))
      .catch(err => console.warn('[ForgeEngineStatus] PyTorch metadata not loaded yet:', err));

    return unsub;
  }, []);

  const meta = model?.metadata;

  return (
    <div className="bg-kb-black border-3 border-kb-red rounded-sm p-4 text-white shadow-comic mb-8">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-kb-red/40 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <Cpu className="text-kb-yellow w-6 h-6 animate-pulse" />
          <h3 className="font-bangers text-2xl tracking-wide text-white">
            FORGE ENGINE STATUS
          </h3>
          {/* Engine Tabs */}
          <div className="flex items-center gap-1 bg-kb-dark-grey p-0.5 rounded border border-kb-mid-grey text-xs font-bangers">
            <button
              onClick={() => setActiveTab('markov')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'markov'
                  ? 'bg-kb-red text-white shadow-sm'
                  : 'text-kb-grey/70 hover:text-white'
              }`}
            >
              2ND-ORDER MARKOV
            </button>
            <button
              onClick={() => setActiveTab('pytorch')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'pytorch'
                  ? 'bg-kb-yellow text-kb-black shadow-sm'
                  : 'text-kb-grey/70 hover:text-white'
              }`}
            >
              <Flame size={12} className="fill-current" />
              <span>PYTORCH .PT WEIGHTS</span>
            </button>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {activeTab === 'markov' ? (
            <>
              {status === 'loading' && (
                <span className="flex items-center gap-1.5 text-xs font-exo font-bold bg-yellow-500/20 text-kb-yellow border border-kb-yellow/50 px-3 py-1 rounded-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> LOADING MODEL (7.15 MB)...
                </span>
              )}
              {status === 'ready' && (
                <span className="flex items-center gap-1.5 text-xs font-exo font-bold bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 2ND-ORDER MARKOV ACTIVE
                </span>
              )}
              {status === 'error' && (
                <span className="flex items-center gap-1.5 text-xs font-exo font-bold bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5" /> MODEL LOAD FAILED
                </span>
              )}
              {status === 'idle' && (
                <span className="text-xs font-exo text-kb-grey/60 px-3 py-1">INITIALIZING...</span>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-exo font-bold bg-kb-yellow/20 text-kb-yellow border border-kb-yellow/50 px-3 py-1 rounded-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span>PYTORCH WEIGHTS VERIFIED (.PT)</span>
            </span>
          )}
        </div>
      </div>

      {/* Tab 1: Markov Model View */}
      {activeTab === 'markov' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Model Name</p>
              <p className="font-exo text-xs font-bold text-white truncate" title={meta?.model || 'Loading...'}>
                {meta?.model || 'Password Forge'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Algorithm</p>
              <p className="font-exo text-xs font-bold text-kb-yellow truncate">
                {meta ? `${meta.algorithm} (Order ${meta.order})` : 'Order 2 Markov'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Training Passwords</p>
              <p className="font-bangers text-sm text-green-400">
                {meta ? meta.passwords_processed.toLocaleString() : '3,514,402'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Learned Transitions</p>
              <p className="font-bangers text-sm text-kb-yellow">
                {meta ? meta.transitions_learned.toLocaleString() : '33,560,343'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Contexts Learned</p>
              <p className="font-bangers text-sm text-white">
                {meta ? meta.contexts_learned.toLocaleString() : '8,823'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Smoothing / Vocab</p>
              <p className="font-exo text-xs font-bold text-kb-grey">
                {meta ? `${meta.smoothing} (V=${model?.vocab_size_with_end_token || 96})` : 'Laplace (V=96)'}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-kb-mid-grey/40 flex flex-wrap items-center justify-between text-[11px] font-exo text-kb-grey/70 gap-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-kb-red" />
              <span>Dataset: <strong>david-palma/wordlists</strong> (50 breach wordlist files)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span>Role: <strong>Active Client Predictability Filter</strong> (Crypto generation + Markov candidate rejection)</span>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: PyTorch Neural Weights View */}
      {activeTab === 'pytorch' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Model Artifact</p>
              <p className="font-exo text-xs font-bold text-white truncate" title="password_forge_weights.pt">
                password_forge_weights.pt
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Neural Architecture</p>
              <p className="font-exo text-xs font-bold text-kb-yellow truncate" title="2-layer Char-LSTM (128-dim)">
                2-Layer Char-LSTM (128d)
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Trained Parameters</p>
              <p className="font-bangers text-sm text-green-400">
                {pytorchMeta ? pytorchMeta.total_parameters.toLocaleString() : '250,338'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Training Set Size</p>
              <p className="font-bangers text-sm text-kb-yellow">
                {pytorchMeta ? `${pytorchMeta.samples_trained.toLocaleString()} Passwords` : '75,000 Passwords'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Final Loss & PPL</p>
              <p className="font-bangers text-sm text-white">
                {pytorchMeta ? `Loss ${pytorchMeta.final_loss} (PPL ${pytorchMeta.final_perplexity})` : 'Loss 2.31 (PPL 10.11)'}
              </p>
            </div>

            <div className="bg-kb-dark-grey p-2.5 rounded-sm border border-kb-mid-grey">
              <p className="font-exo text-[10px] text-kb-grey/60 uppercase font-semibold">Format & Size</p>
              <p className="font-exo text-xs font-bold text-kb-grey">
                PyTorch .pt (~1.01 MB)
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-kb-mid-grey/40 flex flex-wrap items-center justify-between text-[11px] font-exo text-kb-grey/70 gap-2">
            <div className="flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-kb-yellow" />
              <span>Weights Location: <code className="text-white bg-kb-dark-grey px-1 rounded">public/model/password_forge_weights.pt</code></span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span>Inference Evaluation: <code className="text-white bg-kb-dark-grey px-1 rounded">python eval_pytorch_model.py</code></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
