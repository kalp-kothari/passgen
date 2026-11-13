import { motion } from 'framer-motion';
import { Zap, Github, Shield, AlertTriangle } from 'lucide-react';

const TECH = [
  { label: 'React 18 + Vite', desc: 'Frontend framework' },
  { label: 'TypeScript',       desc: 'Type safety' },
  { label: 'Tailwind CSS',     desc: 'Utility styling' },
  { label: 'Framer Motion',    desc: 'Animations' },
  { label: 'Web Crypto API',   desc: 'Secure generation' },
  { label: 'HIBP API',         desc: 'Breach detection' },
  { label: 'Markov Chain',     desc: 'Predictability model' },
];

export default function Footer() {
  return (
    <footer className="bg-kb-black border-t-4 border-kb-red relative overflow-hidden">
      {/* Halftone bg */}
      <div className="absolute inset-0 bg-halftone pointer-events-none opacity-40" />

      <div className="relative max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-kb-red border-2 border-white rounded-sm flex items-center justify-center">
                <Zap size={20} className="text-white fill-white" />
              </div>
              <div>
                <p className="font-bangers text-white text-xl leading-none tracking-widest">KICK BUTTOWSKI</p>
                <p className="font-bangers text-kb-red text-lg leading-none tracking-widest">PASSWORD FORGE</p>
              </div>
            </div>
            <p className="font-exo text-kb-grey/70 text-sm leading-relaxed">
              An extreme-sports-themed password security platform built for
              college exhibition. Generate strong passwords, analyse them in
              real-time, and check for known data breaches — all in your browser.
            </p>
            <p className="font-bangers text-kb-yellow text-base mt-4 tracking-widest">
              BUILD IT STRONG. BREAK THE LIMITS.
            </p>
          </div>

          {/* Tech stack */}
          <div>
            <h3 className="font-bangers text-white text-xl tracking-widest mb-4 flex items-center gap-2">
              <Zap size={16} className="text-kb-red" /> TECH STACK
            </h3>
            <ul className="space-y-2">
              {TECH.map(t => (
                <li key={t.label} className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-kb-red rounded-full shrink-0" />
                  <span className="font-exo text-white text-sm font-semibold">{t.label}</span>
                  <span className="font-exo text-kb-grey/50 text-xs">— {t.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security disclaimer */}
          <div>
            <h3 className="font-bangers text-white text-xl tracking-widest mb-4 flex items-center gap-2">
              <Shield size={16} className="text-kb-yellow" /> SECURITY NOTICE
            </h3>
            <div className="bg-kb-dark-grey border-l-4 border-kb-red p-4 rounded-sm space-y-2">
              {[
                'Passwords are never stored or transmitted to any server.',
                'Breach checks use k-anonymity — only 5 hash chars leave your device.',
                'Cracking time estimates are statistical approximations, not guarantees.',
                'The Markov model scores predictability — it is not a cryptographic tool.',
                '"Not found in breach database" does not mean a password is safe to use.',
              ].map((note, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <AlertTriangle size={12} className="text-kb-yellow shrink-0 mt-0.5" />
                  <p className="font-exo text-kb-grey/70 text-xs leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 pt-6 border-t border-kb-mid-grey flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="font-exo text-kb-grey/40 text-xs">
            © 2026 Kick Buttowski: Password Forge · Built for educational purposes ·
            Dataset credit:{' '}
            <a
              href="https://github.com/david-palma/wordlists"
              target="_blank"
              rel="noopener noreferrer"
              className="text-kb-red hover:text-kb-yellow transition-colors"
            >
              david-palma/wordlists
            </a>
          </p>
          <a
            href="https://github.com/david-palma/wordlists"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-exo text-kb-grey/40 text-xs hover:text-kb-yellow transition-colors"
          >
            <Github size={14} /> wordlists dataset
          </a>
        </motion.div>
      </div>
    </footer>
  );
}
