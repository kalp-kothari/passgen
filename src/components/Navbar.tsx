import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Generator', href: '#generator' },
  { label: 'Analyzer',  href: '#analyzer'  },
  { label: 'Breach',    href: '#breach'    },
  { label: 'How It Works', href: '#how'   },
];

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-kb-black border-b-4 border-kb-red shadow-[0_4px_0_#E61E25]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-kb-red border-2 border-kb-black rounded-sm flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span className="font-bangers text-white text-xl tracking-widest hidden sm:block">
            PASSWORD <span className="text-kb-red">FORGE</span>
          </span>
        </a>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <a
                href={link.href}
                className="font-bangers text-kb-grey text-base tracking-wider px-3 py-1 rounded
                           hover:text-kb-yellow hover:bg-white/5 transition-colors duration-150"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="#generator"
          className="hidden md:flex btn-extreme bg-kb-red text-white px-4 py-1.5 text-sm rounded-sm items-center gap-2"
        >
          <Zap size={14} className="fill-white" /> FORGE NOW
        </a>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden bg-kb-black border-t-2 border-kb-red overflow-hidden"
          >
            <ul className="flex flex-col p-4 gap-3">
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="font-bangers text-white text-xl tracking-wider block hover:text-kb-yellow"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
