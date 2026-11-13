import { motion } from 'framer-motion';
import {
  Zap, Shield, Lock, TrendingUp, Database, Key,
  AlertTriangle, CheckCircle, Lightbulb, ArrowUp,
} from 'lucide-react';
import { useMascot } from '../context/MascotContext';
import { scrollToStep } from '../lib/scrollHelper';

const CARDS = [
  {
    icon: <Key size={32} className="text-kb-yellow" />,
    title: 'Password Generation',
    color: 'bg-kb-yellow',
    body: `We use the browser's built-in Web Crypto API (crypto.getRandomValues) to generate cryptographically secure random bytes — the same standard used in TLS encryption. Math.random() is never used. Each candidate is independently generated and shuffled using Fisher-Yates with Web Crypto entropy.`,
    tip: 'More character categories + longer length = exponentially larger brute-force space.',
  },
  {
    icon: <TrendingUp size={32} className="text-kb-red" />,
    title: 'What is Password Entropy?',
    color: 'bg-kb-red',
    body: `Entropy (measured in bits) describes how unpredictable a password is. If a password is chosen from a pool of N characters and has length L, its entropy is L × log₂(N). An entropy of 60 bits means an attacker needs ~2⁶⁰ guesses on average. Each extra bit doubles the search difficulty.`,
    tip: 'A 16-char password with all 4 categories has ~105 bits of theoretical keyspace entropy.',
  },
  {
    icon: <Zap size={32} className="text-kb-black" />,
    title: '2nd-Order Markov Model',
    color: 'bg-white',
    body: `Our custom Markov Chain model learned from 3,514,402 real passwords (33,560,343 character transitions across 8,823 second-order contexts with Laplace smoothing). It measures average negative log-likelihood surprisal S(x) to actively reject predictable sequences (like "pass", "123", or keyboard runs) during generation.`,
    tip: 'Acts as an active candidate filter — rejecting common bigram/trigram habits before output.',
  },
  {
    icon: <Shield size={32} className="text-green-400" />,
    title: 'Breach Checking (k-Anonymity)',
    color: 'bg-kb-dark-grey',
    body: `We never send your password to any server. Instead we SHA-1 hash it in your browser and send only the first 5 hex characters to the Have I Been Pwned API. The API returns all hashes starting with those 5 chars; we compare the rest locally. Your full password never leaves your device.`,
    tip: 'Even if network traffic were intercepted, a 5-char hash prefix cannot reveal the password.',
  },
  {
    icon: <Lock size={32} className="text-kb-yellow" />,
    title: 'Why Length Matters Most',
    color: 'bg-kb-dark-red',
    body: `Adding one character multiplies the search space by the charset size (up to ~95×). Going from 8 to 16 characters doesn't double security — it exponentially squares it. A 20-character password of only lowercase letters (entropy ≈ 94 bits) is stronger than a 10-character password using all character types (entropy ≈ 65 bits).`,
    tip: 'Length is the primary mathematical defense against modern GPU cluster cracking.',
  },
];

const TIPS = [
  { icon: <AlertTriangle size={16} />, text: 'Never reuse passwords across different sites' },
  { icon: <CheckCircle  size={16} />, text: 'Use a trusted password manager to store complex passwords' },
  { icon: <AlertTriangle size={16} />, text: 'Avoid names, birthdays, or anything on your social media' },
  { icon: <CheckCircle  size={16} />, text: 'Enable two-factor authentication (2FA) wherever possible' },
  { icon: <AlertTriangle size={16} />, text: 'Never share passwords via email, SMS, or chat' },
  { icon: <CheckCircle  size={16} />, text: 'Change passwords immediately if a service you use reports a breach' },
  { icon: <Lightbulb    size={16} />, text: 'Passphrases (4+ random words) are both strong and memorable' },
  { icon: <Database     size={16} />, text: '"Not found in breach database" does NOT guarantee a password is safe' },
];

const containerVar = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12 } },
};
const cardVar = {
  hidden: { opacity: 0, y: 50 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

export default function HowItWorks() {
  const { triggerAction } = useMascot();

  return (
    <section id="how" className="bg-kb-grey relative overflow-hidden py-14 sm:py-16">
      {/* Halftone */}
      <div className="absolute inset-0 bg-halftone-red pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-kb-black border-2 border-kb-red px-3 py-1 rounded-sm shadow-comic mb-2">
            <span className="w-2 h-2 bg-kb-red rounded-full animate-ping" />
            <span className="font-bangers text-white text-sm tracking-widest">
              STEP 04 OF 04 • THE INTEL & SECURITY PRINCIPLES
            </span>
          </div>
          <h2 className="font-bangers text-kb-black text-3xl sm:text-4xl md:text-5xl mt-1">
            HOW IT WORKS
          </h2>
          <p className="font-exo text-kb-mid-grey mt-3 max-w-xl mx-auto">
            Mathematical foundations, 2nd-order Markov statistics, and privacy engineering.
          </p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={containerVar}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {CARDS.map((card, i) => (
            <motion.div
              key={i}
              variants={cardVar}
              className="comic-card bg-white rounded-sm p-6 flex flex-col gap-3"
            >
              <div className={`w-12 h-12 ${card.color} border-2 border-kb-black rounded-sm flex items-center justify-center`}>
                {card.icon}
              </div>
              <h3 className="font-bangers text-kb-black text-xl tracking-wide">{card.title}</h3>
              <p className="font-exo text-kb-mid-grey text-sm leading-relaxed">{card.body}</p>
              <div className="mt-auto pt-3 border-t-2 border-dashed border-kb-black/20 flex gap-2 items-start">
                <Zap size={14} className="text-kb-red shrink-0 mt-0.5" />
                <p className="font-exo text-xs text-kb-black font-semibold">{card.tip}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Security tips ticker */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-kb-red border-2 border-kb-black px-3 py-1 rounded-sm">
              <span className="font-bangers text-white text-sm tracking-widest">⚡ PRO TIPS</span>
            </div>
            <div className="flex-1 h-0.5 bg-kb-black/20" />
          </div>

          {/* Scrolling ticker */}
          <div className="bg-kb-black border-3 border-kb-black rounded-sm overflow-hidden py-3 relative">
            <div
              className="flex gap-16 whitespace-nowrap animate-ticker"
              style={{ width: 'max-content' }}
            >
              {[...TIPS, ...TIPS].map((tip, i) => (
                <span key={i} className="font-exo text-sm text-kb-grey flex items-center gap-2 shrink-0">
                  <span className="text-kb-yellow">{tip.icon}</span>
                  {tip.text}
                  <span className="text-kb-red mx-4">•</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Return to Step 01 CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <motion.button
            onClick={() => {
              triggerAction('jump', "LET'S FORGE ANOTHER MASTERPIECE!", 1800);
              scrollToStep('generator');
            }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 2 }}
            className="btn-extreme bg-kb-red text-white text-2xl px-10 py-4 rounded-sm inline-flex items-center gap-3 shadow-comic"
          >
            <Zap size={24} className="fill-white" />
            FORGE ANOTHER PASSWORD (RETURN TO STEP 01)
            <ArrowUp size={24} className="text-white" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
