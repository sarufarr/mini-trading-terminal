import { memo } from 'react';
import { cn } from '@/lib/cn';
import { ETradePhaseStatus } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { SlippageSelector } from '@/components/FloatingTradingPanel/SlippageSelector';
import { TradeErrorDismiss } from '@/components/TradeErrorDismiss';
import type { TradePhase } from '@/hooks/use-trade';

interface TradingPanelFooterProps {
  direction: ETradeDirection;
  phase: TradePhase;
  canTrade: boolean;
  isProcessing: boolean;
  tokenSymbol: string;
  onExecute: () => void;
  onErrorDismiss: () => void;
}

export const TradingPanelFooter = memo(function TradingPanelFooter({
  direction,
  phase,
  canTrade,
  isProcessing,
  tokenSymbol,
  onExecute,
  onErrorDismiss,
}: TradingPanelFooterProps) {
  const label = isProcessing
    ? 'Processing...'
    : direction === ETradeDirection.BUY
      ? `Buy ${tokenSymbol}`
      : `Sell ${tokenSymbol}`;

  return (
    <>
      <SlippageSelector direction={direction} />

      {isProcessing && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          {phase.status === ETradePhaseStatus.AWAITING_SIGNATURE &&
            'Awaiting signature...'}
          {phase.status === ETradePhaseStatus.SENDING &&
            'Sending transaction...'}
          {phase.status === ETradePhaseStatus.CONFIRMING &&
            'Confirming on-chain...'}
          {phase.status === ETradePhaseStatus.SUCCESS &&
            'Transaction confirmed!'}
        </p>
      )}

      {import.meta.env.DEV && phase.status === ETradePhaseStatus.ERROR && (
        <TradeErrorDismiss
          message={phase.message}
          onDismiss={onErrorDismiss}
          className="text-center"
        />
      )}

      <button
        onClick={onExecute}
        disabled={!canTrade}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold transition-all disabled:cursor-not-allowed',
          direction === ETradeDirection.BUY
            ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/30 disabled:text-green-500/50'
            : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/30 disabled:text-red-500/50'
        )}
        aria-label={
          isProcessing
            ? 'Processing'
            : direction === ETradeDirection.BUY
              ? `Buy ${tokenSymbol}`
              : `Sell ${tokenSymbol}`
        }
      >
        {label}
      </button>
    </>
  );
});

TradingPanelFooter.displayName = 'TradingPanelFooter';
