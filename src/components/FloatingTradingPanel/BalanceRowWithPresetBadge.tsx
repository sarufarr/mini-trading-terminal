import { memo } from 'react';
import { cn } from '@/lib/cn';
import {
  PRESET_BADGE_CUSTOM,
  PRESET_BADGE_PRESET,
} from '@/constants/preset-accent';
import { BalanceRow } from './BalanceRow';

interface BalanceRowWithPresetBadgeProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  /** When false (amount empty), badge is hidden. When true, show Custom or Preset by isCustomAmount. */
  hasValue: boolean;
  isCustomAmount: boolean;
  balanceContent: React.ReactNode;
}

export const BalanceRowWithPresetBadge = memo(
  function BalanceRowWithPresetBadge({
    loading,
    error,
    onRetry,
    hasValue,
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
            {hasValue && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-xs font-medium rounded-xl',
                  isCustomAmount ? PRESET_BADGE_CUSTOM : PRESET_BADGE_PRESET
                )}
              >
                {isCustomAmount ? 'Custom' : 'Preset'}
              </span>
            )}
          </>
        }
      >
        {balanceContent}
      </BalanceRow>
    );
  }
);

BalanceRowWithPresetBadge.displayName = 'BalanceRowWithPresetBadge';
