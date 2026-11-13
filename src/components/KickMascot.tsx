import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ComicSpeechBubble from './ComicSpeechBubble';
import { useMascot, type MascotAction } from '../context/MascotContext';
import { ArrowLeftRight, X, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const HOVER_PHRASES = [
  'WHAT ARE YOU WAITING FOR?',
  "LET'S DO THIS!",
  'NEED A STRONGER PASSWORD?',
  'BRING IT ON!',
  "THAT'S MORE LIKE IT!",
  'AWESOME! AWESOME! AWESOME!',
];

export type FloatPosition = 'bottom-right' | 'bottom-left';

export default function KickMascot() {
  const { action, bubbles, triggerAction } = useMascot();
  const [position, setPosition] = useState<FloatPosition>('bottom-right');
  const [isMinimized, setIsMinimized] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [isDoctorStrange, setIsDoctorStrange] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);


  // Mouse move tilt calculation
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || action === 'stunt') return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (e.clientX - centerX) / (rect.width / 2);
    const dy = (e.clientY - centerY) / (rect.height / 2);
    setTilt({
      x: Math.max(-12, Math.min(12, dx * 10)),
      y: Math.max(-10, Math.min(10, -dy * 8)),
    });
  }, [action]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (action === 'idle' && !isDoctorStrange) {
      const phrase = HOVER_PHRASES[Math.floor(Math.random() * HOVER_PHRASES.length)];
      triggerAction('hover', phrase, 2500);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount % 4 === 0) {
      // Easter egg: Doctor Strange Kick!
      playSound('extreme');
      setIsDoctorStrange(true);
      triggerAction('extreme', 'I SAW 14,000,605 PASSWORDS IN THE MULTIVERSE! THIS ONE SURVIVED!', 3500);
      setTimeout(() => setIsDoctorStrange(false), 3600);
    } else {
      playSound('click');
      const clickPhrases = [
        'AWESOME! AWESOME! AWESOME!',
        'CHIMICHANGA! READY FOR ACTION!',
        'A DAREDEVIL NEVER BACKS DOWN!',
        'BAM! FORGE IT EXTREME!',
      ];
      triggerAction('click', clickPhrases[nextCount % clickPhrases.length], 2000);
    }
  };

  const togglePosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(prev => (prev === 'bottom-right' ? 'bottom-left' : 'bottom-right'));
  };

  // Determine authentic Kick Buttowski image asset dynamically based on emotional expression:
  const getMascotImage = () => {
    if (isDoctorStrange) {
      return '/assets/kick-buttowski/kick-doctor.png';
    }

    switch (action) {
      // 1. Weak password -> Derp Kick pointing and saying "yew suck"
      case 'weak':
        return '/assets/kick-buttowski/kick-yewsuck.png';

      // 2. Moderate password -> Kick in winter hat shrugging in disbelief
      case 'moderate':
        return '/assets/kick-buttowski/kick-shrug.png';

      // 3. Strong password / Safe / Copy -> Kick on bicycle giving thumbs up
      case 'strong':
      case 'copy':
      case 'safe':
        return '/assets/kick-buttowski/kick-thumbsup.png';

      // 4. Extreme password -> Gigachad Kick with dark shades and muscular stunt suit
      case 'extreme':
        return '/assets/kick-buttowski/kick-gigachad.png';

      // 5. Analyzing password / typing -> Buttowski glare (*buttowski-glare*)
      case 'analyze':
        return '/assets/kick-buttowski/kick-glare.png';

      // 6. Breach scanning -> Kick peeking through rocks with focused scanning eyes
      case 'scanning':
        return '/assets/kick-buttowski/kick-peeking.png';

      // 7. Breach detected -> Gunther & Kick screaming in sheer horror!
      case 'breached':
        return '/assets/kick-buttowski/kick-screaming.png';

      // 8. Stunt / Jump / Regenerate / Idle / Hover -> Iconic rock-on daredevil pose
      case 'stunt':
      case 'regenerate':
      case 'jump':
      case 'idle':
      case 'hover':
      case 'click':
      default:
        return '/assets/kick-buttowski/kick-idle.png';
    }
  };

  const currentImg = getMascotImage();

  return (
    <aside
      aria-label="Kick Buttowski Interactive Mascot"
      className={`fixed bottom-4 z-50 transition-all duration-300 ease-out select-none ${
        position === 'bottom-right' ? 'right-4 sm:right-8' : 'left-4 sm:left-8'
      }`}
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="relative flex flex-col items-center justify-end cursor-pointer group"
      >
        {/* Floating Controls Bar (Position switch & minimize) */}
        <div className="flex items-center gap-1.5 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={togglePosition}
            title={`Switch dock to ${position === 'bottom-right' ? 'bottom-left' : 'bottom-right'}`}
            className="bg-kb-black/90 hover:bg-kb-red text-white text-[10px] font-bangers tracking-wider px-2 py-0.5 rounded border border-white/40 shadow-sm flex items-center gap-1 transition-colors"
          >
            <ArrowLeftRight size={11} />
            <span>{position === 'bottom-right' ? 'DOCK LEFT' : 'DOCK RIGHT'}</span>
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setIsMinimized(v => !v);
            }}
            title={isMinimized ? 'Expand Kick' : 'Minimize Kick'}
            className="bg-kb-black/90 hover:bg-kb-yellow hover:text-kb-black text-white p-0.5 rounded border border-white/40 transition-colors"
          >
            {isMinimized ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* ── Speech Bubble List (Stacked upward with latest most below) ── */}
        {!isMinimized && bubbles.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 mb-2 w-full max-w-[240px]">
            <AnimatePresence initial={false}>
              {bubbles.map((b, i) => (
                <ComicSpeechBubble
                  key={b.id}
                  id={b.id}
                  message={b.text}
                  variant={b.variant}
                  isLatest={i === bubbles.length - 1}
                  orderIndex={i}
                  totalCount={bubbles.length}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Background Glow Aura (Static & Compact) ── */}
        {!isMinimized && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div
              className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full blur-xl opacity-35 transition-colors duration-400 ${
                action === 'breached' || action === 'weak'
                  ? 'bg-kb-red'
                  : action === 'strong' || action === 'safe'
                  ? 'bg-green-400'
                  : action === 'extreme' || action === 'stunt' || isDoctorStrange
                  ? 'bg-kb-yellow'
                  : 'bg-kb-yellow/60'
              }`}
            />
          </div>
        )}

        {/* ── Interactive Character Sprite ── */}
        <motion.div
          animate={
            action === 'stunt'
              ? {
                  x: position === 'bottom-right' ? [-260, -120, 160, 0] : [260, 120, -160, 0],
                  y: [0, -60, -20, 0],
                  rotate: [0, -25, 360, 0],
                  scale: [1, 1.2, 1.15, 1],
                }
              : action === 'weak'
              ? {
                  x: [-8, 8, -6, 6, 0],
                  rotate: [-4, 4, -3, 3, 0],
                  y: [0, 4, 0],
                  scale: 1,
                }
              : action === 'strong' || action === 'safe'
              ? {
                  x: 0,
                  rotate: 0,
                  y: [0, -14, 0, -8, 0],
                  scale: [1, 1.08, 1],
                }
              : action === 'extreme' || isDoctorStrange
              ? {
                  x: 0,
                  y: [0, -20, 0, -12, 0],
                  rotate: [0, 8, -8, 0],
                  scale: [1, 1.15, 1],
                }
              : action === 'regenerate'
              ? {
                  x: 0,
                  rotate: [0, 360, 0],
                  y: [0, -15, 0],
                  scale: 1,
                }
              : action === 'copy'
              ? {
                  x: 0,
                  rotate: 0,
                  scale: [1, 1.12, 1],
                  y: [0, -10, 0],
                }
              : action === 'analyze' || action === 'scanning'
              ? {
                  x: 0,
                  rotate: [0, 3, 0],
                  scale: [1, 1.06, 1],
                  y: [0, -4, 0],
                }
              : action === 'jump'
              ? {
                  x: 0,
                  rotate: 0,
                  y: [0, -35, 0],
                  scale: [1, 1.1, 1],
                }
              : {
                  x: 0,
                  y: 0,
                  rotate: 0,
                  rotateY: tilt.x,
                  rotateX: tilt.y,
                  scale: isHovered ? 1.03 : 1,
                }
          }
          transition={
            action === 'stunt'
              ? { duration: 1.3, ease: [0.25, 1, 0.5, 1] }
              : action === 'weak'
              ? { duration: 0.6 }
              : action === 'strong' || action === 'extreme' || isDoctorStrange
              ? { duration: 0.8, repeat: 1 }
              : action === 'regenerate'
              ? { duration: 0.6 }
              : { duration: 0.25, ease: 'easeOut' }
          }
          className={`relative flex items-center justify-center ${
            isMinimized ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-32 h-32 sm:w-40 sm:h-40'
          }`}
          style={{ perspective: 1000 }}
        >
          {/* Active Expression Cartoon Sprite */}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImg}
              src={currentImg}
              alt="Kick Buttowski Expression"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
          </AnimatePresence>

          

          {/* Non-overlapping Action Stamps (Positioned at bottom corners of Kick) */}
          {action === 'stunt' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
              className="absolute bottom-2 -right-2 bg-kb-yellow text-kb-black font-bangers text-[11px] sm:text-xs px-2 py-0.5 rounded-sm border-2 border-kb-black shadow-comic"
            >
              ⚡ 360 KICKFLIP!
            </motion.div>
          )}

          {action === 'breached' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
              className="absolute bottom-2 -right-2 bg-kb-red text-white font-bangers text-[11px] sm:text-xs px-2 py-0.5 rounded-sm border-2 border-white shadow-comic"
            >
              ⚠ PWNED!
            </motion.div>
          )}

          {(action === 'strong' || action === 'safe' || action === 'copy') && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute bottom-2 -right-2 bg-green-500 text-white font-bangers text-[11px] sm:text-xs px-2 py-0.5 rounded-sm border-2 border-kb-black shadow-comic"
            >
              ★ AWESOME!
            </motion.div>
          )}

          {action === 'extreme' && !isDoctorStrange && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="absolute bottom-2 -right-2 bg-kb-yellow text-kb-black font-bangers text-[11px] sm:text-xs px-2 py-0.5 rounded-sm border-2 border-kb-black shadow-comic"
            >
              🔥 GIGACHAD!
            </motion.div>
          )}

          {isDoctorStrange && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
              className="absolute bottom-2 -right-2 bg-purple-600 text-white font-bangers text-[11px] sm:text-xs px-2 py-0.5 rounded-sm border-2 border-white shadow-comic flex items-center gap-1"
            >
              <Sparkles size={11} /> MULTIVERSE!
            </motion.div>
          )}
        </motion.div>
      </div>
    </aside>
  );
}
