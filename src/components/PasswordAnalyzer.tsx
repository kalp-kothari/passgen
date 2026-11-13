import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Zap, AlertTriangle, CheckCircle, XCircle, Info, Activity, ShieldAlert, ArrowDown, Cpu, Flame } from 'lucide-react';
import { analyzePassword, type PasswordAnalysis, type StrengthLevel } from '../lib/passwordAnalyzer';
import { loadMarkovModel, getLoadedModel, type TrainedMarkovModel } from '../markov/modelLoader';
import { scorePasswordWithPyTorch, type PyTorchScoreResult } from '../neural/pytorchLstmEngine';
import { useMascot } from '../context/MascotContext';
import { scrollToStep } from '../lib/scrollHelper';
import { playSound } from '../utils/soundEffects';

interface PasswordAnalyzerProps {
  sharedPassword?: string;
  onPasswordChange?: (password: string) => void;
}

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; barClass: string; textClass: string; bg: string }> = {
  WEAK:     { label: 'WEAK',     barClass: 'strength-weak',     textClass: 'text-red-500',    bg: 'bg-red-50'   },
  MODERATE: { label: 'MODERATE', barClass: 'strength-moderate', textClass: 'text-orange-500', bg: 'bg-orange-50'},
  STRONG:   { label: 'STRONG',   barClass: 'strength-strong',   textClass: 'text-green-600',  bg: 'bg-green-50' },
  EXTREME:  { label: 'EXTREME',  barClass: 'strength-extreme',  textClass: 'text-kb-yellow',  bg: 'bg-yellow-50'},
};

function StrengthMeter({ score, level }: { score: number; level: StrengthLevel }) {
  const cfg = STRENGTH_CONFIG[level];
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bangers text-kb-black text-lg tracking-wide">STRENGTH RATING</span>
        <motion.span
          key={level}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-bangers text-2xl tracking-widest ${cfg.textClass}`}
        >
          {cfg.label}
        </motion.span>
      </div>
      <div className="h-5 bg-kb-grey border-2 border-kb-black rounded-sm overflow-hidden">
        <motion.div
          className={`h-full ${cfg.barClass} rounded-sm`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 15 }}
        />
      </div>
      <div className="flex justify-between font-exo text-xs text-kb-mid-grey mt-1">
        <span>WEAK</span><span>MODERATE</span><span>STRONG</span><span>EXTREME</span>
      </div>
    </div>
  );
}

function EntropyDisplay({ entropy }: { entropy: number }) {
  return (
    <div className="bg-kb-black border-2 border-kb-black rounded-sm p-4">
      <p className="font-bangers text-kb-grey text-sm tracking-wider mb-1">ENTROPY</p>
      <motion.p
        key={Math.round(entropy)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bangers text-kb-yellow text-4xl"
      >
        {entropy > 0 ? `${entropy.toFixed(1)}` : '—'}
        <span className="text-kb-grey text-xl ml-1">bits</span>
      </motion.p>
      <p className="font-exo text-kb-grey/50 text-xs mt-1">
        {entropy === 0 ? 'Enter a password above' :
         entropy < 28  ? 'Very low — trivially crackable' :
         entropy < 50  ? 'Low — crackable offline' :
         entropy < 80  ? 'Good — strong against most attacks' :
                         'Excellent — mathematically robust'}
      </p>
    </div>
  );
}

function CrackingTimeDisplay({ crackingTime }: { crackingTime: PasswordAnalysis['crackingTime'] }) {
  const rows = [
    { label: 'Online (throttled, 10K/s)',    value: crackingTime.online,      icon: '🌐' },
    { label: 'Offline slow hash (bcrypt)',   value: crackingTime.offlineSlow, icon: '🐌' },
    { label: 'Offline fast hash (MD5/SHA1)', value: crackingTime.offlineFast, icon: '⚡' },
  ];
  return (
    <div className="border-2 border-kb-black rounded-sm overflow-hidden">
      <div className="bg-kb-black px-4 py-2 flex items-center gap-2">
        <span className="font-bangers text-kb-grey text-sm tracking-wider">EST. CRACKING TIME</span>
        <div className="group relative">
          <Info size={12} className="text-kb-grey/50 cursor-help" />
          <div className="absolute left-0 bottom-5 hidden group-hover:block w-56 bg-kb-black border border-kb-red text-xs font-exo text-kb-grey p-2 rounded z-10">
            Statistical brute-force approximations. Real-world cracking depends on hardware and hashing algorithms.
          </div>
        </div>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`flex items-center justify-between px-4 py-2.5 font-exo text-sm
                      ${i < rows.length - 1 ? 'border-b border-kb-black/10' : ''} bg-white`}
        >
          <span className="text-kb-mid-grey flex items-center gap-2">
            <span>{row.icon}</span> {row.label}
          </span>
          <span className="font-bold text-kb-black">{row.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

function CompositionBadges({ comp }: { comp: PasswordAnalysis['charComposition'] }) {
  const badges = [
    { label: 'Uppercase A-Z', active: comp.hasUppercase },
    { label: 'Lowercase a-z', active: comp.hasLowercase },
    { label: 'Digits 0-9',    active: comp.hasNumbers   },
    { label: 'Symbols !@#',   active: comp.hasSymbols   },
  ];
  return (
    <div>
      <p className="font-bangers text-kb-black text-lg tracking-wide mb-3">CHARACTER COMPOSITION</p>
      <div className="grid grid-cols-2 gap-2">
        {badges.map(b => (
          <div
            key={b.label}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm border-2 font-exo text-sm
                        ${b.active
                          ? 'bg-green-100 border-green-500 text-green-800'
                          : 'bg-red-50 border-red-300 text-red-600'}`}
          >
            {b.active
              ? <CheckCircle size={14} className="text-green-600 shrink-0" />
              : <XCircle    size={14} className="text-red-500 shrink-0" />}
            {b.label}
          </div>
        ))}
      </div>
      <p className="font-exo text-xs text-kb-mid-grey mt-2">
        Unique characters: <strong>{comp.uniqueChars}</strong> / {comp.totalChars}
        {comp.totalChars > 0 && ` (${Math.round((comp.uniqueChars / comp.totalChars) * 100)}%)`}
      </p>
    </div>
  );
}

function PredictabilityBar({ score, surprisal, classification }: { score: number; surprisal: number; classification: string }) {
  const color = score > 65 ? 'bg-kb-red' : score > 35 ? 'bg-orange-400' : 'bg-green-500';
  return (
    <div className="bg-kb-dark-grey p-4 rounded-sm border border-kb-mid-grey text-white">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-kb-yellow" />
          <p className="font-bangers text-lg tracking-wide text-white">2ND-ORDER MARKOV PREDICTABILITY</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-exo text-xs text-kb-yellow font-bold">
            {surprisal.toFixed(2)} bits/char
          </span>
          <span className={`font-bangers text-xs px-2 py-0.5 rounded-sm text-white ${color}`}>
            {classification}
          </span>
        </div>
      </div>
      <div className="h-3 bg-kb-black border border-kb-black rounded-sm overflow-hidden my-2">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>
      <div className="flex justify-between font-exo text-[11px] text-kb-grey/60">
        <span>0% (Highly Random)</span>
        <span>Predictability Score: {score}/100</span>
        <span>100% (Weak / Common)</span>
      </div>
    </div>
  );
}

export default function PasswordAnalyzer({ sharedPassword, onPasswordChange }: PasswordAnalyzerProps) {
  const { triggerAction } = useMascot();
  const [password, setPassword] = useState(sharedPassword || '');
  const [showPwd, setShowPwd] = useState(false);
  const [model, setModel] = useState<TrainedMarkovModel | null>(getLoadedModel());
  const [analysis, setAnalysis] = useState<PasswordAnalysis | null>(null);
  const [pytorchScore, setPytorchScore] = useState<PyTorchScoreResult | null>(null);

  useEffect(() => {
    if (!model) {
      loadMarkovModel().then(m => {
        setModel(m);
        if (password) {
          setAnalysis(analyzePassword(password, m));
          setPytorchScore(scorePasswordWithPyTorch(password));
        }
      }).catch(err => console.error(err));
    }
  }, [model, password]);

  useEffect(() => {
    if (sharedPassword && sharedPassword !== password) {
      setPassword(sharedPassword);
      const res = analyzePassword(sharedPassword, model);
      setAnalysis(res);
      const pScore = scorePasswordWithPyTorch(sharedPassword);
      setPytorchScore(pScore);

      if (res.strength === 'WEAK') {
        playSound('weak');
        triggerAction('weak', "YEW SUCK! DUDE, THAT'S WEAK!", 2400);
      } else if (res.strength === 'MODERATE') {
        triggerAction('moderate', 'NOT BAD! BUT COULD BE MORE EXTREME!', 2200);
      } else if (res.strength === 'STRONG') {
        playSound('copy');
        triggerAction('strong', "NOW WE'RE TALKING! AWESOME!", 2200);
      } else if (res.strength === 'EXTREME') {
        playSound('extreme');
        triggerAction('extreme', 'CERTIFIED GIGACHAD DAREDEVIL STATUS!', 2600);
      }
    }
  }, [sharedPassword, model, triggerAction]);

  const handleChange = useCallback((val: string) => {
    setPassword(val);
    if (onPasswordChange) {
      onPasswordChange(val);
    }
    const result = analyzePassword(val, model);
    setAnalysis(result);
    const pScore = scorePasswordWithPyTorch(val);
    setPytorchScore(pScore);

    // Dynamic Kick mascot strength reactions:
    if (val.length === 0) {
      return;
    }

    if (result.strength === 'WEAK') {
      playSound('weak');
      triggerAction('weak', "YEW SUCK! DUDE, THAT'S WEAK!", 2400);
    } else if (result.strength === 'MODERATE') {
      triggerAction('moderate', 'NOT BAD! BUT COULD BE MORE EXTREME!', 2200);
    } else if (result.strength === 'STRONG') {
      playSound('copy');
      triggerAction('strong', "NOW WE'RE TALKING! AWESOME!", 2200);
    } else if (result.strength === 'EXTREME') {
      playSound('extreme');
      triggerAction('extreme', 'CERTIFIED GIGACHAD DAREDEVIL STATUS!', 2600);
    }
  }, [model, triggerAction, onPasswordChange]);

  const hasAnalysis = analysis && password.length > 0;

  return (
    <section id="analyzer" className="bg-kb-black relative overflow-hidden py-14 sm:py-16">
      <div className="absolute inset-0 bg-halftone pointer-events-none opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-kb-yellow" />

      <div className="relative max-w-3xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-kb-black border-2 border-kb-yellow px-3 py-1 rounded-sm shadow-comic mb-2">
            <span className="w-2 h-2 bg-kb-yellow rounded-full animate-ping" />
            <span className="font-bangers text-white text-sm tracking-widest">
              STEP 02 OF 04 • PASSWORD ANALYZER
            </span>
          </div>
          <h2 className="font-bangers text-white text-3xl sm:text-4xl md:text-5xl mt-1">
            PASSWORD ANALYZER
          </h2>
          <p className="font-exo text-kb-grey/60 mt-2">
            Real-time strength analysis powered by entropy + trained 2nd-order Markov Chain transitions
          </p>
        </motion.div>

        {/* Input card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white comic-card-red rounded-sm p-6 md:p-8"
        >
          {/* Password input */}
          <div className="mb-6">
            <label className="font-bangers text-kb-black text-xl tracking-wide block mb-2">
              ENTER YOUR PASSWORD
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onFocus={() => triggerAction('analyze', '*BUTTOWSKI-GLARE* EXAMINING PREDICTABILITY...', 2000)}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (password && onPasswordChange) {
                      onPasswordChange(password);
                    }
                    triggerAction('scanning', 'NEXT UP: CHECKING KNOWN LEAKS...', 1800);
                    scrollToStep('breach');
                  }
                }}
                placeholder="Type a password to analyze..."
                autoComplete="off"
                spellCheck={false}
                className="w-full font-mono-kb text-lg bg-kb-black text-kb-yellow border-3 border-kb-black
                           rounded-sm px-4 py-4 pr-14 focus:outline-none focus:border-kb-yellow
                           placeholder:text-kb-grey/30 placeholder:font-exo placeholder:text-base placeholder:not-italic"
              />
              <button
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-kb-grey hover:text-kb-yellow transition-colors"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="font-exo text-xs text-kb-mid-grey mt-1.5 flex items-center gap-1">
              <Zap size={11} className="text-kb-red" />
              Password is evaluated locally using the in-browser Markov model. Never transmitted.
            </p>
          </div>

          {/* Analysis results */}
          <AnimatePresence>
            {hasAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6 overflow-hidden"
              >
                {/* Strength meter */}
                <StrengthMeter score={analysis.score} level={analysis.strength} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entropy */}
                  <EntropyDisplay entropy={analysis.entropy} />

                  {/* Quick stats */}
                  <div className="bg-kb-black border-2 border-kb-black rounded-sm p-4">
                    <p className="font-bangers text-kb-grey text-sm tracking-wider mb-2">QUICK STATS</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Length',          value: `${analysis.charComposition.totalChars} chars` },
                        { label: 'Unique chars',    value: `${analysis.charComposition.uniqueChars}` },
                        { label: 'Markov Surprisal', value: `${analysis.averageSurprisal.toFixed(2)} bits/char` },
                        { label: 'Markov Predictability', value: `${analysis.predictabilityScore}/100` },
                      ].map(stat => (
                        <div key={stat.label} className="flex justify-between font-exo text-sm">
                          <span className="text-kb-grey/60">{stat.label}</span>
                          <span className="text-kb-yellow font-bold">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cracking time */}
                <CrackingTimeDisplay crackingTime={analysis.crackingTime} />

                {/* Composition badges */}
                <CompositionBadges comp={analysis.charComposition} />

                {/* Real-time Markov predictability bar */}
                <PredictabilityBar
                  score={analysis.predictabilityScore}
                  surprisal={analysis.averageSurprisal}
                  classification={analysis.classification}
                />

                {/* PyTorch Neural Char-LSTM Predictability (.pt Model) */}
                {pytorchScore && (
                  <div className="bg-kb-black border-2 border-kb-red rounded-sm p-4 text-white shadow-comic">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-kb-red/40 pb-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="text-kb-yellow w-5 h-5 animate-pulse" />
                        <span className="font-bangers text-base tracking-wider text-white">
                          PYTORCH .PT NEURAL PREDICTABILITY EVALUATION
                        </span>
                      </div>
                      <span className="text-[11px] font-exo bg-kb-yellow/20 text-kb-yellow border border-kb-yellow/50 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Flame size={12} className="text-kb-red" />
                        <span>WEIGHTS: password_forge_weights.pt (250k params)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 text-center">
                      <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey">
                        <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Neural Perplexity</p>
                        <p className={`font-bangers text-xl ${pytorchScore.perplexity < 14 ? 'text-kb-red' : 'text-green-400'}`}>
                          {pytorchScore.perplexity.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey">
                        <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Cross-Entropy Loss</p>
                        <p className="font-bangers text-xl text-kb-yellow">
                          {pytorchScore.crossEntropyLoss.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-kb-dark-grey p-2 rounded border border-kb-mid-grey col-span-2 sm:col-span-1">
                        <p className="text-[10px] font-exo text-kb-grey/60 uppercase">Neural Surprisal</p>
                        <p className="font-bangers text-xl text-white">
                          {pytorchScore.neuralSurprisalBits.toFixed(1)} <span className="text-xs text-kb-grey">bits</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-kb-dark-grey/80 p-2.5 rounded border border-kb-mid-grey flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-exo text-kb-grey/70">Daredevil Neural Rating:</span>
                      <span className="font-bangers text-sm sm:text-base text-kb-yellow tracking-wide">
                        {pytorchScore.daredevilRating}
                      </span>
                    </div>
                  </div>
                )}

                {/* Markov insights from 2nd-order model */}
                {analysis.markovInsights.length > 0 && (
                  <div className="bg-kb-dark-grey border-l-4 border-kb-yellow rounded-sm p-4 space-y-1.5">
                    <p className="font-bangers text-kb-yellow text-sm tracking-wider mb-2 flex items-center gap-1.5">
                      <Zap size={14} /> MARKOV CHAIN TRANSITION INSIGHTS
                    </p>
                    {analysis.markovInsights.map((insight, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="font-exo text-sm text-kb-grey flex gap-2"
                      >
                        <span className="text-kb-yellow shrink-0">▸</span>
                        {insight}
                      </motion.p>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {analysis.patterns.warnings.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-kb-red rounded-sm p-4 space-y-1.5">
                    <p className="font-bangers text-kb-red text-sm tracking-wider mb-2 flex items-center gap-2">
                      <AlertTriangle size={14} /> PATTERN WARNINGS
                    </p>
                    {analysis.patterns.warnings.map((w, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="font-exo text-sm text-red-700 flex gap-2"
                      >
                        <span className="text-kb-red shrink-0">⚠</span> {w}
                      </motion.p>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div className="border-2 border-dashed border-kb-black rounded-sm p-4 space-y-2">
                    <p className="font-bangers text-kb-black text-lg tracking-wide mb-1">💡 SUGGESTIONS</p>
                    {analysis.suggestions.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-2 items-start font-exo text-sm text-kb-mid-grey"
                      >
                        <span className="text-kb-red font-bold shrink-0">→</span>
                        {s}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!hasAnalysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-kb-grey/30"
            >
              <Zap size={40} className="mx-auto mb-3 text-kb-grey/20" />
              <p className="font-bangers text-xl tracking-wider">TYPE TO ANALYZE</p>
              <p className="font-exo text-sm mt-1">Kick reacts in real time to your password's strength</p>
            </motion.div>
          )}

          {/* Proceed to Step 03: Breach Checker */}
          <motion.button
            onClick={() => {
              if (password && onPasswordChange) {
                onPasswordChange(password);
              }
              triggerAction('scanning', 'NEXT UP: CHECKING KNOWN LEAKS...', 1800);
              scrollToStep('breach');
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98, y: 1 }}
            className="btn-extreme w-full bg-kb-red text-white text-2xl py-4 rounded-sm flex items-center justify-center gap-3 shadow-comic mt-6"
          >
            <ShieldAlert size={22} className="text-white" />
            <span>PROCEED TO STEP 03: CHECK BREACHES</span>
            <ArrowDown size={22} className="text-white" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
