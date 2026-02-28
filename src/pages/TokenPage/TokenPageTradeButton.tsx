import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/cn';

interface TokenPageTradeButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  visible: boolean;
}

export function TokenPageTradeButton({
  isOpen,
  onToggle,
  visible,
}: TokenPageTradeButtonProps) {
  if (!visible) return null;

  return (
    <div className="flex justify-center">
      <motion.button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
          'border border-border/60 backdrop-blur-sm',
          isOpen
            ? 'bg-primary/10 text-primary border-primary/40'
            : 'bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
        whileTap={{ scale: 0.96 }}
      >
        <Zap className={cn('w-3.5 h-3.5', isOpen && 'fill-primary')} />
        {isOpen ? 'Close Trade Panel' : 'Instant Trade'}
      </motion.button>
    </div>
  );
}
