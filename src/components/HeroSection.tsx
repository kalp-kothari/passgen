import { motion } from 'framer-motion';
import { ChevronDown, Zap, Flame } from 'lucide-react';
import { useMascot } from '../context/MascotContext';
import { playSound } from '../utils/soundEffects';

export default function HeroSection() {
  const { triggerAction } = useMascot();
  const titleLetters = 'KICK BUTTOWSKI'.split('');

  const scrollToStep = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGetStartedClick = () => {
    playSound('kickflip');
    triggerAction('jump', 'SHOWTIME! ENTERING THE FORGE!', 1800);
    scrollToStep('generator');
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen bg-kb-black flex items-center overflow-hidden pt-16"
    >
      {/* Halftone background */}
      <div className="absolute inset-0 bg-halftone pointer-events-none" />

      {/* Red diagonal gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-kb-red/20 pointer-events-none" />

      {/* Red accent bar on left */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className="absolute left-0 top-0 bottom-0 w-2 bg-kb-red origin-top"
      />

      <div className="relative max-w-7xl mx-auto px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

        {/* ── Left side (Text & Branding) ────────────────── */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          {/* Logo & Show Badge */}
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="inline-flex items-center gap-2 bg-kb-red border-2 border-white px-3 py-1 rounded-sm shadow-comic">
              <span className="w-2.5 h-2.5 bg-kb-yellow rounded-full animate-pulse" />
              <span className="font-bangers text-white text-sm tracking-widest">
                DISNEY XD • SUBURBAN DAREDEVIL
              </span>
            </div>
            <img
              src="/assets/kick-buttowski/kick-logo.png"
              alt="Kick Buttowski Logo"
              className="h-8 sm:h-9 object-contain drop-shadow"
            />
          </motion.div>

          {/* Animated title letters */}
          <div className="font-bangers text-4xl sm:text-5xl lg:text-6xl leading-none mb-2 overflow-hidden">
            <div className="flex flex-wrap gap-x-3">
              {titleLetters.map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.03, duration: 0.4, ease: 'easeOut' }}
                  className={char === ' ' ? 'w-4' : 'text-white drop-shadow-[4px_4px_0_#111111]'}
                >
                  {char}
                </motion.span>
              ))}
            </div>
          </div>

          <motion.h2
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="font-bangers text-kb-red text-3xl sm:text-4xl lg:text-5xl leading-none mb-3
                       [text-shadow:4px_4px_0px_#111]"
          >
            PASSWORD FORGE
          </motion.h2>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="inline-block bg-kb-yellow text-kb-black font-bangers text-xl sm:text-2xl px-4 py-1 rounded-sm shadow-comic mb-5"
          >
            BUILD IT STRONG. BREAK THE LIMITS.
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="font-exo text-kb-grey text-base sm:text-lg mb-8 max-w-xl leading-relaxed"
          >
            Generate cryptographically secure passwords filtered by our custom-trained{' '}
            <strong className="text-kb-yellow">2nd-order Markov Chain model</strong> and{' '}
            <strong className="text-kb-red">PyTorch Neural Char-LSTM (.pt weights)</strong>.
            Analyze predictability in real-time and check data breaches with zero data leaving your device.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="flex flex-wrap gap-4"
          >
            <motion.button
              onClick={handleGetStartedClick}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97, y: 2 }}
              className="btn-extreme bg-kb-red text-white text-xl px-6 py-2.5 rounded-sm inline-flex items-center gap-2 shadow-comic"
            >
              <Zap size={20} className="fill-white" /> FORGE NOW
            </motion.button>
            <motion.button
              onClick={() => {
                playSound('glare');
                triggerAction('analyze', '*BUTTOWSKI-GLARE* LEANING IN TO INSPECT...', 2000);
                scrollToStep('analyzer');
              }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97, y: 2 }}
              className="btn-extreme bg-transparent border-3 border-white text-white text-xl px-6 py-2.5 rounded-sm inline-flex items-center gap-2 hover:border-kb-yellow hover:text-kb-yellow"
            >
              ANALYZE STRENGTH
            </motion.button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10 max-w-xl"
          >
            <div>
              <p className="font-bangers text-kb-yellow text-2xl sm:text-3xl">3.5M+</p>
              <p className="font-exo text-kb-grey/60 text-xs">Markov Wordlist</p>
            </div>
            <div>
              <p className="font-bangers text-kb-yellow text-2xl sm:text-3xl">250K</p>
              <p className="font-exo text-kb-grey/60 text-xs">PyTorch .pt Weights</p>
            </div>
            <div>
              <p className="font-bangers text-kb-yellow text-2xl sm:text-3xl">33.5M</p>
              <p className="font-exo text-kb-grey/60 text-xs">Learned Transitions</p>
            </div>
            <div>
              <p className="font-bangers text-kb-yellow text-2xl sm:text-3xl">100%</p>
              <p className="font-exo text-kb-grey/60 text-xs">Client-Side Privacy</p>
            </div>
          </motion.div>
        </div>

        {/* ── Right side: Hero Daredevil Card Showcase ── */}
        <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center items-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative w-60 sm:w-72 aspect-square flex items-center justify-center"
          >
            {/* Spinning Comic Sunburst Rays */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-kb-yellow/20 via-kb-red/25 to-kb-yellow/20 blur-xl -z-10" />

            {/* Comic Frame Card */}
            <div className="bg-kb-black/80 border-4 border-kb-red rounded-sm p-4 shadow-comic w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-2 left-2 bg-kb-yellow text-kb-black font-bangers text-xs px-2 py-0.5 rounded-sm border border-kb-black shadow-sm">
                ★ DAREDEVIL SECURED
              </div>

              {/* Character Illustration in Hero */}
              <img src="/assets/kick-buttowski/kick-idle.png" alt="Kick Buttowski Daredevil" className="w-36 sm:w-44 object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]" />

              <div className="absolute bottom-2 text-center">
                <span className="font-bangers text-kb-yellow text-xs tracking-wider bg-kb-dark-grey px-3 py-1 rounded border border-kb-mid-grey">
                  CHOOSE YOUR EXTREME PASSWORD
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll down cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer"
        onClick={() => scrollToStep('generator')}
      >
        <span className="font-bangers text-kb-grey/50 text-xs tracking-widest">SCROLL DOWN</span>
        <div><ChevronDown size={20} className="text-kb-red" /></div>
      </motion.div>

      {/* Bottom zigzag divider */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-kb-dark-grey zigzag-top" />
    </section>
  );
}
