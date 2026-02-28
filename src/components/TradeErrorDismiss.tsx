import { memo } from 'react';
import { cn } from '@/lib/cn';

interface TradeErrorDismissProps {
  message: string;
  onDismiss: () => void;
  className?: string;
}

export const TradeErrorDismiss = memo(
  ({ message, onDismiss, className }: TradeErrorDismissProps) => {
    if (!import.meta.env.DEV) return null;
    return (
      <p
        className={cn(
          'text-xs text-destructive cursor-pointer hover:underline',
          className
        )}
        onClick={onDismiss}
      >
        {message} · click to dismiss
      </p>
    );
  }
);

TradeErrorDismiss.displayName = 'TradeErrorDismiss';
