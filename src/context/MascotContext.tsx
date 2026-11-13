import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

export type MascotAction =
  | 'idle'
  | 'hover'
  | 'click'
  | 'stunt'            // Password generated: full skateboard flip across screen
  | 'copy'             // Password copied: quick victory pose
  | 'regenerate'      // Quick 360 spin
  | 'analyze'         // Examining password
  | 'weak'            // Weak password: disappointed head shake
  | 'moderate'        // Moderate password: nod / thumbs up
  | 'strong'          // Strong password: rock-on celebration
  | 'extreme'         // Extreme password: stunt celebration
  | 'scanning'        // Breach scanning
  | 'breached'        // Breach detected: shocked warning
  | 'safe'            // Breach clean: celebratory pose
  | 'jump';           // Get started clicked: jump

export interface SpeechBubbleItem {
  id: string;
  text: string;
  variant: 'default' | 'danger' | 'extreme' | 'warning' | 'success';
  timestamp: number;
}

export interface MascotContextType {
  action: MascotAction;
  customMessage: string | null;
  bubbles: SpeechBubbleItem[];
  triggerAction: (action: MascotAction, message?: string, durationMs?: number) => void;
  resetToIdle: () => void;
  dismissBubble: (id: string) => void;
}

const MascotContext = createContext<MascotContextType | null>(null);

function getActionVariant(action: MascotAction): 'default' | 'danger' | 'extreme' | 'warning' | 'success' {
  switch (action) {
    case 'weak':
    case 'breached':
      return 'danger';
    case 'moderate':
    case 'scanning':
      return 'warning';
    case 'strong':
    case 'safe':
    case 'copy':
      return 'success';
    case 'extreme':
    case 'stunt':
    case 'regenerate':
    case 'jump':
    case 'click':
      return 'extreme';
    case 'analyze':
    case 'hover':
    case 'idle':
    default:
      return 'default';
  }
}

function getDefaultMessage(action: MascotAction): string {
  switch (action) {
    case 'weak':
      return "YEW SUCK! DUDE, THAT'S WEAK!";
    case 'moderate':
      return 'NOT BAD! BUT COULD BE MORE EXTREME!';
    case 'strong':
      return "NOW WE'RE TALKING! AWESOME!";
    case 'extreme':
      return 'CERTIFIED GIGACHAD DAREDEVIL STATUS!';
    case 'stunt':
      return "NOW THAT'S EXTREME! 360 KICKFLIP!";
    case 'copy':
      return 'COPIED TO CLIPBOARD!';
    case 'regenerate':
      return 'FORGING ANOTHER MASTERPIECE!';
    case 'analyze':
      return '*BUTTOWSKI-GLARE* EXAMINING PREDICTABILITY...';
    case 'scanning':
      return 'PEEKING INTO 800M+ BREACH RECORDS...';
    case 'breached':
      return 'DANGER! THIS PASSWORD HAS BEEN PWNED!';
    case 'safe':
      return 'ALL CLEAR! DAREDEVIL VERIFIED!';
    case 'jump':
      return 'SHOWTIME! DIVE IN!';
    case 'hover':
      return "LET'S DO THIS!";
    case 'click':
      return 'AWESOME! AWESOME! AWESOME!';
    case 'idle':
    default:
      return "CHIMICHANGA! LET'S FORGE!";
  }
}

export function MascotProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<MascotAction>('idle');
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<SpeechBubbleItem[]>([
    {
      id: 'initial',
      text: "CHIMICHANGA! LET'S FORGE!",
      variant: 'default',
      timestamp: Date.now(),
    },
  ]);
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissBubble = useCallback((id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  }, []);

  const resetToIdle = useCallback(() => {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    setAction('idle');
    setCustomMessage(null);
  }, []);

  const triggerAction = useCallback((newAction: MascotAction, message?: string, durationMs = 2800) => {
    if (actionTimerRef.current) {
      clearTimeout(actionTimerRef.current);
    }

    setAction(newAction);
    const bubbleText = message || getDefaultMessage(newAction);
    setCustomMessage(bubbleText);

    const bubbleId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const variant = getActionVariant(newAction);

    setBubbles(prev => {
      // Avoid immediate duplicate of the exact same message within 400ms
      const last = prev[prev.length - 1];
      if (last && last.text === bubbleText && Date.now() - last.timestamp < 500) {
        return prev;
      }
      // Keep up to 3 bubbles in the stack (older on top, latest appended at the end/bottom)
      const updated = [...prev, { id: bubbleId, text: bubbleText, variant, timestamp: Date.now() }];
      return updated.slice(-3);
    });

    // Automatically remove this bubble after duration
    setTimeout(() => {
      dismissBubble(bubbleId);
    }, durationMs);

    // Auto-reset action pose to idle after duration
    actionTimerRef.current = setTimeout(() => {
      setAction('idle');
      setCustomMessage(null);
    }, durationMs);
  }, [dismissBubble]);

  return (
    <MascotContext.Provider value={{ action, customMessage, bubbles, triggerAction, resetToIdle, dismissBubble }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    throw new Error('useMascot must be used within a MascotProvider');
  }
  return ctx;
}
