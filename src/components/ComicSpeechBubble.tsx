import { motion } from 'framer-motion';

export interface ComicSpeechBubbleProps {
  id?: string;
  message: string;
  variant?: 'default' | 'danger' | 'extreme' | 'warning' | 'success';
  isLatest?: boolean;
  orderIndex?: number;
  totalCount?: number;
  className?: string;
}

export default function ComicSpeechBubble({
  message,
  variant = 'default',
  isLatest = true,
  orderIndex = 0,
  totalCount = 1,
  className = '',
}: ComicSpeechBubbleProps) {
  if (!message) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-kb-red text-white border-kb-black shadow-comic';
      case 'extreme':
        return 'bg-kb-yellow text-kb-black border-kb-black shadow-comic';
      case 'warning':
        return 'bg-orange-500 text-white border-kb-black shadow-comic';
      case 'success':
        return 'bg-green-500 text-white border-kb-black shadow-comic';
      case 'default':
      default:
        return 'bg-white text-kb-black border-kb-black shadow-comic';
    }
  };

  const getTailColor = () => {
    switch (variant) {
      case 'danger':
        return 'bg-kb-red';
      case 'extreme':
        return 'bg-kb-yellow';
      case 'warning':
        return 'bg-orange-500';
      case 'success':
        return 'bg-green-500';
      case 'default':
      default:
        return 'bg-white';
    }
  };

  // Stack styling: older bubbles higher up are slightly smaller and more muted
  const isOlder = !isLatest && totalCount > 1;

  return (
    <motion.div
      layout
      initial={{ scale: 0.75, opacity: 0, y: 16 }}
      animate={{
        scale: isOlder ? 0.88 : 1,
        opacity: isOlder ? 0.75 : 1,
        y: 0,
      }}
      exit={{ scale: 0.65, opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      className={`relative select-none text-center pointer-events-none ${
        isOlder ? 'px-3 py-1 rounded-sm border-2 text-xs' : 'px-4 py-2 rounded-md border-3 text-xs sm:text-sm'
      } font-bangers tracking-wider max-w-[270px] ${getVariantStyles()} ${className}`}
    >
      {/* Speech Text */}
      <span className="leading-tight block drop-shadow-sm">{message}</span>

      {/* Comic Tail: ONLY on the latest bubble at the very bottom pointing down to Kick! */}
      {isLatest && (
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 border-r-3 border-b-3 border-kb-black ${getTailColor()}`}
        />
      )}
    </motion.div>
  );
}
