import { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface BalanceRowProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  leftLabel?: React.ReactNode;
  children: React.ReactNode;
}

export const BalanceRow = memo(function BalanceRow({
  loading,
  error,
  onRetry,
  leftLabel = 'Balance',
  children,
}: BalanceRowProps) {
  return (
    <div
      className="flex justify-between items-center text-xs text-muted-foreground px-1"
      aria-busy={loading}
    >
      <span className="flex items-center gap-1.5">{leftLabel}</span>
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        {loading ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-label="Updating balance"
          />
        ) : null}
        {error ? (
          <>
            <span className="text-destructive">Fetch failed</span>
            <button
              type="button"
              onClick={() => void onRetry()}
              className="text-primary hover:underline"
              aria-label="Retry fetching balance"
            >
              Retry
            </button>
          </>
        ) : (
          children
        )}
      </span>
    </div>
  );
});
