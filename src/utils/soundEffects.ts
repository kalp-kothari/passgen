// ─────────────────────────────────────────────────────────────────────────────
// Kick Buttowski Comic Sound Effects Engine (Web Audio API)
// Synthesized purely in-browser - zero external audio assets, instant playback!
// ─────────────────────────────────────────────────────────────────────────────

type SoundType = 'kickflip' | 'copy' | 'weak' | 'extreme' | 'glare' | 'click' | 'powerup';

let audioCtx: AudioContext | null = null;
let isSoundEnabled = true;

// Load persisted mute preference from localStorage
try {
  const saved = localStorage.getItem('kb_sound_enabled');
  if (saved !== null) {
    isSoundEnabled = saved === 'true';
  }
} catch {
  isSoundEnabled = true;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioEnabled(): boolean {
  return isSoundEnabled;
}

export function setAudioEnabled(enabled: boolean): void {
  isSoundEnabled = enabled;
  try {
    localStorage.setItem('kb_sound_enabled', String(enabled));
  } catch {}
}

export function toggleAudio(): boolean {
  setAudioEnabled(!isSoundEnabled);
  if (isSoundEnabled) {
    playSound('click');
  }
  return isSoundEnabled;
}

/**
 * Play a synthesized comic daredevil sound effect.
 */
export function playSound(type: SoundType): void {
  if (!isSoundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (type) {
      // 1. Kickflip: Stunt whoosh + ascending electric rock glide
      case 'kickflip': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.32);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
        break;
      }

      // 2. Copy to clipboard: Bright comic crystal chime!
      case 'copy': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.setValueAtTime(1320, now + 0.08); // E6
        osc2.frequency.setValueAtTime(1760, now + 0.08); // A6

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
        break;
      }

      // 3. Weak: Comic sad trombone "womp womp"
      case 'weak': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';

        // Slide down with vibrato
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(190, now + 0.22);
        osc.frequency.setValueAtTime(180, now + 0.25);
        osc.frequency.linearRampToValueAtTime(120, now + 0.55);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.58);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }

      // 4. Extreme: Power guitar rock chord!
      case 'extreme': {
        [220, 330, 440, 660].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.4);

          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.005, now + 0.55);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.58);
        });
        break;
      }

      // 5. Glare: Dramatic movie low bass pulse
      case 'glare': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
        break;
      }

      // 6. Click: Skateboard wheel tap
      case 'click': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      // 7. Powerup: Cheetah chug boost sound
      case 'powerup': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.28);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }
    }
  } catch (e) {
    // Gracefully ignore audio errors (e.g. autoplay policy)
  }
}
