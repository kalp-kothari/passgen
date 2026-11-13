import { useState } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import PasswordGenerator from './components/PasswordGenerator';
import PasswordAnalyzer from './components/PasswordAnalyzer';
import BreachChecker from './components/BreachChecker';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import KickMascot from './components/KickMascot';
import { MascotProvider } from './context/MascotContext';

export default function App() {
  const [activePassword, setActivePassword] = useState('');

  return (
    <MascotProvider>
      <div className="min-h-screen bg-kb-black text-white font-exo selection:bg-kb-red selection:text-white relative">
        <Navbar />

        <main>
          <HeroSection />
          <PasswordGenerator onPasswordGenerated={setActivePassword} />
          <PasswordAnalyzer sharedPassword={activePassword} onPasswordChange={setActivePassword} />
          <BreachChecker sharedPassword={activePassword} />
          <HowItWorks />
        </main>

        <Footer />

        {/* ── Persistent Interactive Floating Mascot ── */}
        <KickMascot />
      </div>
    </MascotProvider>
  );
}
