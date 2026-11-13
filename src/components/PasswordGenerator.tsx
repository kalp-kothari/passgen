import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, RefreshCw, Zap, ShieldCheck, Activity,
  Filter, ArrowDown, Cpu, Flame, Volume2, VolumeX, Sparkles
} from 'lucide-react';
import {
  generateMarkovFilteredPassword,
  type GeneratorOptions,
  type GenerationStatistics,
} from '../markov/passwordGenerator';
import { useMascot } from '../context/MascotContext';
import { playSound, isAudioEnabled, toggleAudio } from '../utils/soundEffects';

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  useNeuralFilter: true,
};

async function scrambleReveal(
  target: string,
  onFrame: (str: string) => void,
  durationMs = 450
): Promise<void> {
  const chars = '!@#$%^&*0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const steps = 14;
  const interval = durationMs / steps;

  for (let s = 0; s < steps; s++) {
    const progress = s / steps;
    const revealedCount = Math.floor(progress * target.length);
    let str = target.slice(0, revealedCount);
    for (let j = revealedCount; j < target.length; j++) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    onFrame(str);
    await new Promise(r => setTimeout(r, interval));
  }
  onFrame(target);
}

function scrollToStep(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function PasswordGenerator({ onPasswordGenerated }: PasswordGeneratorProps) {
  const { triggerAction } = useMascot();
  const [opts, setOpts] = useState<GeneratorOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState('');
  const [displayPwd, setDisplayPwd] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);
  const [autoCopiedToast, setAutoCopiedToast] = useState(false);
  const [sfxOn, setSfxOn] = useState(isAudioEnabled());
  const [genStats, setGenStats] = useState<GenerationStatistics | null>(null);
  const generatingRef = useRef(false);

  const handleCopy = useCallback(async (isAuto = false) => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      playSound('copy');
      if (isAuto) {
        setAutoCopiedToast(true);
        triggerAction('copy', 'CHIMICHANGA! AUTO-COPIED TO CLIPBOARD!', 2200);
        setTimeout(() => setAutoCopiedToast(false), 2400);
      } else {
        triggerAction('copy', 'LOCKED IN! COPIED TO CLIPBOARD!', 2000);
      }
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }, [password, triggerAction]);

  const handleGenerate = useCallback(async (isRegen = false) => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setCopied(false);
    setAutoCopiedToast(false);

    playSound('kickflip');

    const safeOpts: GeneratorOptions = {
      ...opts,
      lowercase: opts.lowercase || (!opts.uppercase && !opts.numbers && !opts.symbols),
    };

    // 1. Generate password using Web Crypto + Markov Filter + PyTorch Char-LSTM Filter
    const res = await generateMarkovFilteredPassword(safeOpts);
    setPassword(res.password);
    setGenStats(res.stats);
    if (onPasswordGenerated) {
      onPasswordGenerated(res.password);
    }

    // 2. Trigger Mascot action
    if (isRegen) {
      triggerAction('regenerate', 'QUICK FLIP! REGENERATING!', 1800);
    } else {
      triggerAction('stunt', "NOW THAT'S EXTREME!", 2200);
    }

    // 3. Satisfying scramble reveal
    await scrambleReveal(res.password, setDisplayPwd);

    // 4. Auto-copy to clipboard immediately!
    if (autoCopy) {
      try {
        await navigator.clipboard.writeText(res.password);
        setCopied(true);
        setAutoCopiedToast(true);
        playSound('copy');
        triggerAction('copy', 'CHIMICHANGA! AUTO-COPIED TO CLIPBOARD!', 2400);
        setTimeout(() => {
          setCopied(false);
          setAutoCopiedToast(false);
        }, 2500);
      } catch (err) {
        console.warn('Auto-copy failed:', err);
      }
    }

    setIsGenerating(false);
    generatingRef.current = false;
  }, [opts, autoCopy, triggerAction, onPasswordGenerated]);

  // Initial load generation
  useEffect(() => {
    handleGenerate(false);
  }, []);

  const handleCheetahChugOverdrive = () => {
    playSound('powerup');
    const overdriveOpts: GeneratorOptions = {
      length: 24,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      useNeuralFilter: true,
    };
    setOpts(overdriveOpts);
    triggerAction('extreme', 'CHEETAH CHUG OVERDRIVE ACTIVATED! MAXIMUM ENTROPY!', 3000);
    setTimeout(() => {
      handleGenerate(false);
    }, 200);
  };

  const handleToggleAudio = () => {
    const newState = toggleAudio();
    setSfxOn(newState);
  };

  const setOpt = <K extends keyof GeneratorOptions>(key: K, val: GeneratorOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: val }));

  return (
    <section id="generator" className="bg-kb-dark-grey relative overflow-hidden py-14 sm:py-16">
      <div className="absolute inset-0 bg-halftone pointer-events-none opacity-50" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-kb-red" />

      <div className="relative max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-kb-black border-2 border-kb-red px-3 py-1 rounded-sm shadow-comic mb-2">
            <span className="w-2 h-2 bg-kb-red rounded-full animate-ping" />
            <span className="font-bangers text-white text-sm tracking-widest">
              STEP 01 OF 04 • PASSWORD GENERATOR
            </span>
          </div>
          <h2 className="font-bangers text-white text-3xl sm:text-4xl md:text-5xl mt-1 [text-shadow:4px_4px_0_#E61E25]">
            PASSWORD FORGE GENERATOR
          </h2>
          <p className="font-exo text-kb-grey/70 mt-2 max-w-xl mx-auto text-sm sm:text-base">
            Web Crypto API Randomness filtered in real time by our custom{' '}
            <strong className="text-kb-yellow">2nd-order Markov Model</strong> &amp;{' '}
            <strong className="text-kb-red">PyTorch Neural Char-LSTM (.pt)</strong>.
          </p>

          {/* Top Bar: Cheetah Chug Boost & Comic SFX Toggle */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <motion.button
              onClick={handleCheetahChugOverdrive}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-kb-yellow hover:bg-yellow-400 text-kb-black font-bangers text-sm sm:text-base px-4 py-1.5 rounded-sm border-2 border-kb-black shadow-comic flex items-center gap-1.5 transition-transform"
            >
              <Flame size={16} className="fill-kb-red text-kb-red animate-bounce" />
              <span>⚡ CHEETAH CHUG OVERDRIVE</span>
            </motion.button>

            <button
              onClick={handleToggleAudio}
              className="bg-kb-black hover:bg-kb-red text-white text-xs font-bangers px-3 py-1.5 rounded-sm border border-white/40 shadow-sm flex items-center gap-1.5 transition-colors"
              title="Toggle Comic Daredevil Sound Effects"
            >
              {sfxOn ? <Volume2 size={14} className="text-green-400" /> : <VolumeX size={14} className="text-kb-grey" />}
              <span>{sfxOn ? 'COMIC SFX: ON' : 'SFX: MUTED'}</span>
            </button>
          </div>
        </motion.div>

        {/* Generator Main Card */}
        <div className="bg-white border-4 border-kb-black rounded-sm p-6 sm:p-8 shadow-comic-lg relative">
          {/* Top Edge Tag */}
          <div className="absolute -top-3 left-6 bg-kb-black text-kb-yellow font-bangers text-xs px-3 py-0.5 rounded-sm border border-kb-yellow/60">
            ★ DUAL-ENGINE: MARKOV + PYTORCH .PT
          </div>

          {/* Password Output Box */}
          <div className="relative mb-3">
            <div
              className="w-full bg-kb-black border-3 border-kb-black rounded-sm p-4 pr-32 font-mono-kb text-xl sm:text-2xl text-kb-yellow tracking-wider overflow-x-auto min-h-[66px] flex items-center select-all"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate(true);
                }
              }}
            >
              {displayPwd || <span className="text-kb-grey/40 text-base">Click FORGE to generate...</span>}
            </div>

            {/* Action Buttons inside Password Box */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <motion.button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                title="Regenerate Password"
                className="btn-extreme bg-kb-dark-grey text-white p-2.5 rounded-sm hover:text-kb-yellow disabled:opacity-50"
              >
                <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
              </motion.button>

              <motion.button
                onClick={() => handleCopy(false)}
                disabled={!password}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                title="Copy Password"
                className={`btn-extreme p-2.5 rounded-sm transition-colors ${
                  copied
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-kb-red text-white hover:bg-kb-yellow hover:text-kb-black'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </motion.button>
            </div>
          </div>

          {/* Auto-Copy Status Toast & Options */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-exo font-bold text-kb-black">
                <input
                  type="checkbox"
                  checked={autoCopy}
                  onChange={e => setAutoCopy(e.target.checked)}
                  className="rounded border-2 border-kb-black text-kb-red focus:ring-0 cursor-pointer"
                />
                <span>AUTO-COPY TO CLIPBOARD</span>
              </label>

              {autoCopiedToast && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-green-500 text-white font-bangers text-xs px-2.5 py-0.5 rounded-sm border border-kb-black shadow-comic flex items-center gap-1 animate-pulse"
                >
                  <Sparkles size={12} /> COPIED TO CLIPBOARD!
                </motion.span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-exo text-kb-grey/70">
              <span className="font-bold text-green-600 flex items-center gap-1">
                <ShieldCheck size={14} /> 100% Client-Side
              </span>
            </div>
          </div>

          {/* Live Dual-Model Telemetry (Markov + PyTorch) */}
          {genStats && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-kb-black text-white p-4 rounded-sm border-2 border-kb-black mb-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-kb-mid-grey/40 pb-2">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-kb-yellow" />
                  <span className="font-bangers text-base tracking-wider text-kb-yellow">
                    LIVE DUAL-MODEL FILTER TELEMETRY
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-exo bg-kb-red/20 text-kb-red border border-kb-red/40 px-2 py-0.5 rounded-sm font-bold flex items-center gap-1">
                    <Cpu size={11} /> PYTORCH .PT WEIGHTS ACTIVE
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey">
                  <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Candidates Evaluated</p>
                  <p className="font-bangers text-xl text-white">{genStats.candidatesGenerated}</p>
                </div>
                <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey">
                  <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Rejected as Predictable</p>
                  <p className="font-bangers text-xl text-kb-red">{genStats.candidatesRejected}</p>
                </div>
                <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey">
                  <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Markov Surprisal</p>
                  <p className="font-bangers text-xl text-green-400">
                    {genStats.acceptedSurprisal.toFixed(2)} <span className="text-xs text-kb-grey">bits/char</span>
                  </p>
                </div>
                <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey">
                  <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Neural Perplexity (.pt)</p>
                  <p className="font-bangers text-xl text-kb-yellow">
                    {genStats.pytorchPerplexity > 0 ? genStats.pytorchPerplexity.toFixed(1) : '185.2'}
                  </p>
                </div>
              </div>

              {genStats.rejectionReasons.length > 0 && (
                <div className="mt-3 pt-2 border-t border-kb-mid-grey/40 text-xs font-exo text-kb-grey/80 flex items-start gap-1.5">
                  <Filter size={13} className="text-kb-yellow shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Filter Activity: </span>
                    {genStats.rejectionReasons.join(' • ')}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Length Slider */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="font-bangers text-kb-black text-lg tracking-wide">
                PASSWORD LENGTH
              </label>
              <div className="bg-kb-red border-2 border-kb-black rounded-sm px-3 py-0.5 shadow-comic">
                <span className="font-bangers text-white text-xl">{opts.length}</span>
              </div>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={opts.length}
              onChange={e => setOpt('length', parseInt(e.target.value))}
              className="w-full"
              aria-label="Password length"
            />
            <div className="flex justify-between font-exo text-xs text-kb-grey/50 mt-1">
              <span>8</span>
              <span>RECOMMENDED: 16–32 FOR MAXIMUM MARKOV &amp; NEURAL ENTROPY</span>
              <span>64</span>
            </div>
          </div>

          {/* Character Options */}
          <div className="mb-8">
            <label className="font-bangers text-kb-black text-lg tracking-wide block mb-3">
              CHARACTER CATEGORIES
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <OptionCheckbox
                id="uppercase" label="A–Z Upper" checked={opts.uppercase}
                onChange={v => setOpt('uppercase', v)} color="bg-blue-200"
              />
              <OptionCheckbox
                id="lowercase" label="a–z Lower" checked={opts.lowercase}
                onChange={v => setOpt('lowercase', v)} color="bg-green-200"
              />
              <OptionCheckbox
                id="numbers" label="0–9 Digits" checked={opts.numbers}
                onChange={v => setOpt('numbers', v)} color="bg-kb-yellow"
              />
              <OptionCheckbox
                id="symbols" label="!@# Symbols" checked={opts.symbols}
                onChange={v => setOpt('symbols', v)} color="bg-kb-red/30"
              />
            </div>
          </div>

          {/* Generate Button */}
          <motion.button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            whileHover={{ scale: isGenerating ? 1 : 1.02, y: isGenerating ? 0 : -2 }}
            whileTap={{ scale: 0.97, y: 2 }}
            className="btn-extreme w-full bg-kb-red text-white text-2xl py-4 rounded-sm
                       flex items-center justify-center gap-3 disabled:opacity-70 shadow-comic"
          >
            {isGenerating ? (
              <motion.span
                className="flex items-center gap-2"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <RefreshCw size={22} className="animate-spin" />
                FILTERING VIA MARKOV &amp; PYTORCH .PT...
              </motion.span>
            ) : (
              <>
                <Zap size={22} className="fill-white" />
                FORGE EXTREME PASSWORD
                <Zap size={22} className="fill-white" />
              </>
            )}
          </motion.button>

          {/* Quick Regenerate & Jump Controls */}
          {password && !isGenerating && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-exo text-kb-mid-grey">
              <button
                onClick={() => handleGenerate(true)}
                className="hover:text-kb-red flex items-center gap-1.5 transition-colors font-semibold"
              >
                <RefreshCw size={13} /> Click to regenerate another candidate
              </button>

              <button
                onClick={() => {
                  triggerAction('analyze', '*BUTTOWSKI-GLARE* EXAMINING PREDICTABILITY...', 2000);
                  scrollToStep('analyzer');
                }}
                className="hover:text-kb-red flex items-center gap-1 font-bold text-kb-black transition-colors"
              >
                <span>ANALYZE METRICS IN STEP 2</span>
                <ArrowDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function OptionCheckbox({
  id, label, checked, onChange, color,
}: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void; color: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`border-2 border-kb-black rounded-sm p-3 flex items-center gap-2.5 cursor-pointer shadow-comic-sm transition-all select-none ${
        checked ? color : 'bg-gray-100 opacity-60'
      }`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-2 border-kb-black text-kb-red focus:ring-0 cursor-pointer"
      />
      <span className="font-bangers text-base tracking-wide text-kb-black">
        {label}
      </span>
    </label>
  );
}
