import { memo } from 'react';
import { cn } from '@/lib/cn';
import { BalanceRow } from './BalanceRow';

interface BalanceRowWithPresetBadgeProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  isCustomAmount: boolean;
  balanceContent: React.ReactNode;
}

export const BalanceRowWithPresetBadge = memo(
  function BalanceRowWithPresetBadge({
    loading,
    error,
    onRetry,
    isCustomAmount,
    balanceContent,
  }: BalanceRowWithPresetBadgeProps) {
    return (
      <BalanceRow
        loading={loading}
        error={error}
        onRetry={onRetry}
        leftLabel={
          <>
            Balance
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                isCustomAmount
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-muted/60 text-muted-foreground'
              )}
            >
              {isCustomAmount ? 'Custom' : 'Preset'}
            </span>
          </>
        }
      >
        {balanceContent}
      </BalanceRow>
    );
  }
);
