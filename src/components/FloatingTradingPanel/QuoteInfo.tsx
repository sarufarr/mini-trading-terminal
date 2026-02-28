import { memo } from 'react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/get-error-message';
import type { PriceImpactStatus } from '@/lib/price-impact';

interface QuoteInfoProps {
  estimatedOut: string;
  minReceive: string;
  outUnit: 'SOL' | 'token';
  outUnitLabel: string;
  pricePerUnit: string | null;
  tokenSymbol?: string;
  priceImpactPct: string | null;
  simulatedSlippageBps: number | null;
  slippageBps: number;
  /** When set, shows warning or block message for high price impact. */
  priceImpactStatus?: PriceImpactStatus | null;
  loading?: boolean;
  error?: Error | null;
  className?: string;
}

function quoteInfoPropsAreEqual(
  prev: QuoteInfoProps,
  next: QuoteInfoProps
): boolean {
  if (
    prev.estimatedOut !== next.estimatedOut ||
    prev.minReceive !== next.minReceive ||
    prev.outUnit !== next.outUnit ||
    prev.outUnitLabel !== next.outUnitLabel ||
    prev.pricePerUnit !== next.pricePerUnit ||
    prev.tokenSymbol !== next.tokenSymbol ||
    prev.priceImpactPct !== next.priceImpactPct ||
    prev.simulatedSlippageBps !== next.simulatedSlippageBps ||
    prev.slippageBps !== next.slippageBps ||
    prev.loading !== next.loading ||
    prev.error !== next.error ||
    prev.className !== next.className
  )
    return false;
  const a = prev.priceImpactStatus;
  const b = next.priceImpactStatus;
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  return (
    a.effectivePct === b.effectivePct &&
    a.isWarn === b.isWarn &&
    a.isBlock === b.isBlock
  );
}

export const QuoteInfo = memo(function QuoteInfo({
  estimatedOut,
  minReceive,
  outUnit: _outUnit,
  outUnitLabel,
  pricePerUnit,
  priceImpactPct,
  simulatedSlippageBps,
  slippageBps,
  priceImpactStatus,
  tokenSymbol,
  loading,
  error,
  className,
}: QuoteInfoProps) {
  const hasAmount = estimatedOut !== '' && estimatedOut !== '0';
  const show = hasAmount || loading || error;

  if (!show) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm',
        className
      )}
      aria-live="polite"
    >
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          <span>Fetching quote…</span>
        </div>
      )}
      {error && !loading && (
        <p className="text-destructive text-xs">{getErrorMessage(error)}</p>
      )}
      {priceImpactStatus?.isBlock && !loading && (
        <p className="text-destructive text-xs font-medium" role="alert">
          Price impact too high ({priceImpactStatus.effectivePct.toFixed(2)}%).
          Reduce amount or try again later.
        </p>
      )}
      {priceImpactStatus?.isWarn && !priceImpactStatus.isBlock && !loading && (
        <p
          className="text-amber-600 dark:text-amber-500 text-xs font-medium"
          role="alert"
        >
          High price impact ({priceImpactStatus.effectivePct.toFixed(2)}%).
          Consider reducing amount.
        </p>
      )}
      {!loading && !error && hasAmount && (
        <div className="space-y-1">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground">Est. receive</span>
            <span className="font-medium tabular-nums">
              {estimatedOut} {outUnitLabel}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-muted-foreground">Min receive</span>
            <span className="tabular-nums text-muted-foreground">
              {minReceive} {outUnitLabel}
              <span className="ml-1 text-[10px]">
                (Slippage {slippageBps / 100}%)
              </span>
            </span>
          </div>
          {(pricePerUnit != null ||
            priceImpactPct != null ||
            simulatedSlippageBps != null) && (
            <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {pricePerUnit != null && (
                <span className="tabular-nums">
                  Price {pricePerUnit} SOL/{tokenSymbol ?? 'token'}
                </span>
              )}
              {priceImpactPct != null && priceImpactPct !== '' && (
                <span className="tabular-nums">
                  Price impact {priceImpactPct}%
                </span>
              )}
              {simulatedSlippageBps != null && (
                <span className="tabular-nums">
                  Slippage est. {(simulatedSlippageBps / 100).toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}, quoteInfoPropsAreEqual);

QuoteInfo.displayName = 'QuoteInfo';
