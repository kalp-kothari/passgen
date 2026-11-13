import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, ShieldCheck, Eye, EyeOff, AlertTriangle, Loader2, ArrowDown } from 'lucide-react';
import { checkBreach, type BreachResult } from '../lib/breachChecker';
import { useMascot } from '../context/MascotContext';
import { scrollToStep } from '../lib/scrollHelper';

interface BreachCheckerProps {
  sharedPassword?: string;
  onBreachFound?: (breached: boolean) => void;
}

type CheckState = 'idle' | 'scanning' | 'done' | 'error';

function ScanAnimation() {
  return (
    <div className="relative mx-auto w-64 h-32 border-2 border-kb-red rounded-sm bg-kb-dark-grey overflow-hidden">
      {/* Grid lines */}
      {[25, 50, 75].map(p => (
        <div key={p} className="absolute left-0 right-0 h-px bg-kb-red/20" style={{ top: `${p}%` }} />
      ))}
      {[25, 50, 75].map(p => (
        <div key={p} className="absolute top-0 bottom-0 w-px bg-kb-red/20" style={{ left: `${p}%` }} />
      ))}

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-6 scan-overlay"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Corner brackets */}
      {[
        'top-1 left-1',
        'top-1 right-1 rotate-90',
        'bottom-1 left-1 -rotate-90',
        'bottom-1 right-1 rotate-180',
      ].map((cls, i) => (
        <svg key={i} className={`absolute ${cls} w-4 h-4`} viewBox="0 0 16 16" fill="none">
          <path d="M0 8 L0 0 L8 0" stroke="#E61E25" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ))}

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.p
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="font-bangers text-kb-red text-lg tracking-widest"
        >
          SCANNING HIBP DATABASE...
        </motion.p>
      </div>
    </div>
  );
}

function BreachResultDisplay({ result }: { result: BreachResult }) {
  if (result.breached) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="bg-red-50 border-4 border-kb-red rounded-sm p-6 text-center comic-card-red"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ repeat: 2, duration: 0.4 }}
        >
          <ShieldAlert size={56} className="text-kb-red mx-auto mb-3" />
        </motion.div>
        <h3 className="font-bangers text-kb-red text-3xl tracking-widest mb-2">
          ⚠ BREACH DETECTED!
        </h3>
        <p className="font-exo text-kb-black text-base font-bold mb-1">
          This password appeared{' '}
          <span className="text-kb-red text-xl">{result.occurrences.toLocaleString()}</span>{' '}
          time{result.occurrences !== 1 ? 's' : ''} in known data breaches.
        </p>
        <p className="font-exo text-kb-mid-grey text-sm mt-3 leading-relaxed">
          Attackers actively try these passwords. <strong>Change this immediately</strong> on any
          site where you use it. Use our generator above to forge a secure replacement.
        </p>
        <div className="mt-4 p-3 bg-kb-red/10 border border-kb-red/30 rounded-sm">
          <p className="font-exo text-xs text-kb-mid-grey">
            <strong>Source:</strong> Have I Been Pwned by Troy Hunt ·{' '}
            <strong>Method:</strong> k-anonymity (only 5 hash chars were sent)
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="bg-green-50 border-4 border-green-500 rounded-sm p-6 text-center comic-card"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.5 }}
      >
        <ShieldCheck size={56} className="text-green-600 mx-auto mb-3" />
      </motion.div>
      <h3 className="font-bangers text-green-700 text-3xl tracking-widest mb-2">
        ✓ NOT FOUND!
      </h3>
      <p className="font-exo text-kb-black text-base font-bold mb-1">
        No match found in the HIBP breached password database.
      </p>
      <p className="font-exo text-kb-mid-grey text-sm mt-3 leading-relaxed">
        Good news! But remember: absence from this database doesn't guarantee security.
        Always use a unique password for every account.
      </p>
      <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-sm">
        <p className="font-exo text-xs text-kb-mid-grey">
          <strong>Checked against:</strong> 10+ billion pwned passwords via HIBP ·{' '}
          <strong>Privacy:</strong> Only 5 hex chars of your SHA-1 hash were sent
        </p>
      </div>
    </motion.div>
  );
}

export default function BreachChecker({ sharedPassword, onBreachFound }: BreachCheckerProps) {
  const { triggerAction } = useMascot();
  const [password, setPassword] = useState(sharedPassword || '');
  const [showPwd, setShowPwd] = useState(false);
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [result, setResult] = useState<BreachResult | null>(null);

  useEffect(() => {
    if (sharedPassword) {
      setPassword(sharedPassword);
      setCheckState('idle');
      setResult(null);
    }
  }, [sharedPassword]);

  const handleCheck = useCallback(async () => {
    if (!password || checkState === 'scanning') return;
    setCheckState('scanning');
    setResult(null);

    // Kick reaction while scanning:
    triggerAction('scanning', "LET'S SEE WHAT WE'VE GOT...", 2500);

    const [res] = await Promise.all([
      checkBreach(password),
      new Promise(r => setTimeout(r, 1800)),
    ]);

    if (res.error) {
      setCheckState('error');
    } else {
      setCheckState('done');
      if (res.breached) {
        triggerAction('breached', "UH-OH! THIS ONE'S BEEN EXPOSED!", 3500);
      } else {
        triggerAction('safe', 'LOOKS CLEAR! BUT STAY SMART!', 3000);
      }
      if (onBreachFound) {
        onBreachFound(res.breached);
      }
      // After breach scan displays results, smoothly scroll to next step (Step 4: How It Works)
      setTimeout(() => {
        scrollToStep('how');
      }, 1600);
    }
    setResult(res);
  }, [password, checkState, triggerAction, onBreachFound]);

  return (
    <section id="breach" className="bg-kb-dark-grey relative overflow-hidden py-14 sm:py-16">
      <div className="absolute inset-0 bg-halftone pointer-events-none opacity-40" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-kb-red" />

      <div className="relative max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-kb-black border-2 border-kb-red px-3 py-1 rounded-sm shadow-comic mb-2">
            <span className="w-2 h-2 bg-kb-red rounded-full animate-ping" />
            <span className="font-bangers text-white text-sm tracking-widest">
              STEP 03 OF 04 • BREACH CHECKER
            </span>
          </div>
          <h2 className="font-bangers text-white text-3xl sm:text-4xl md:text-5xl mt-1">
            BREACH CHECKER
          </h2>
          <p className="font-exo text-kb-grey/60 mt-2">
            Powered by Have I Been Pwned · k-anonymity · Your password never leaves your device
          </p>
        </motion.div>

        {/* Input card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white comic-card rounded-sm p-6 md:p-8"
        >
          {/* Privacy disclaimer badge */}
          <div className="bg-kb-black border-l-4 border-kb-yellow p-3 rounded-sm mb-6 flex gap-3 items-start">
            <AlertTriangle size={16} className="text-kb-yellow shrink-0 mt-0.5" />
            <p className="font-exo text-kb-grey text-xs leading-relaxed">
              <strong className="text-kb-yellow">Privacy first:</strong> We SHA-1 hash your password
              locally, then send <em>only the first 5 hex characters</em> to the HIBP API. The full
              hash — and therefore your password — never leaves your browser.
            </p>
          </div>

          {/* Input */}
          <div className="mb-5">
            <label className="font-bangers text-kb-black text-xl tracking-wide block mb-2">
              PASSWORD TO CHECK
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setCheckState('idle'); setResult(null); }}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                placeholder="Enter a password to check..."
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
          </div>

          {/* Check button */}
          <motion.button
            onClick={handleCheck}
            disabled={!password || checkState === 'scanning'}
            whileHover={{ scale: password && checkState !== 'scanning' ? 1.02 : 1, y: -1 }}
            whileTap={{ scale: 0.97, y: 2 }}
            className="btn-extreme w-full bg-kb-red text-white text-2xl py-4 rounded-sm
                       flex items-center justify-center gap-3 disabled:opacity-50 mb-6"
          >
            {checkState === 'scanning' ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                className="flex items-center gap-2"
              >
                <Loader2 size={22} className="animate-spin" /> SCANNING DATABASE...
              </motion.span>
            ) : (
              <>
                <Search size={22} /> CHECK FOR BREACHES <Search size={22} />
              </>
            )}
          </motion.button>

          {/* Scan animation */}
          <AnimatePresence>
            {checkState === 'scanning' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <ScanAnimation />
                <div className="text-center">
                  <p className="font-bangers text-kb-black text-lg tracking-wider">QUERYING HIBP DATABASE</p>
                  <p className="font-exo text-kb-mid-grey text-sm mt-1">
                    Sending 5-char hash prefix · comparing suffix locally
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {checkState === 'done' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <BreachResultDisplay result={result} />
              </motion.div>
            )}
            {checkState === 'error' && result && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-orange-50 border-2 border-orange-400 rounded-sm p-4 text-center"
              >
                <p className="font-bangers text-orange-700 text-xl mb-1">CONNECTION ERROR</p>
                <p className="font-exo text-orange-700 text-sm">{result.error}</p>
                <p className="font-exo text-kb-mid-grey text-xs mt-2">
                  Check your internet connection and try again.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* How k-anon works */}
          {checkState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="border-t-2 border-dashed border-kb-black/20 pt-5 mt-2"
            >
              <p className="font-bangers text-kb-black text-base tracking-wide mb-3">HOW K-ANONYMITY WORKS</p>
              <div className="flex flex-col gap-2">
                {[
                  { step: '01', text: 'Your password is SHA-1 hashed entirely in your browser' },
                  { step: '02', text: 'Only the first 5 hex chars (e.g. "5BAA6") are sent to HIBP' },
                  { step: '03', text: 'HIBP returns all hash suffixes matching that prefix (~500 entries)' },
                  { step: '04', text: 'Your browser checks if your full hash is in the returned list' },
                  { step: '05', text: 'Result shown — your actual password never touched the internet' },
                ].map(item => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <span className="font-bangers text-kb-red text-sm w-6 shrink-0">{item.step}</span>
                    <p className="font-exo text-sm text-kb-mid-grey">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Proceed to Step 04: How It Works */}
          <motion.button
            onClick={() => {
              triggerAction('jump', "LET'S DIVE INTO THE INTEL!", 1800);
              scrollToStep('how');
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98, y: 1 }}
            className="btn-extreme w-full bg-kb-yellow text-kb-black text-xl py-3.5 px-6 rounded-sm flex items-center justify-center gap-2 shadow-comic mt-6 hover:bg-yellow-400"
          >
            <span>PROCEED TO STEP 04: HOW IT WORKS</span>
            <ArrowDown size={20} className="text-kb-black" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
