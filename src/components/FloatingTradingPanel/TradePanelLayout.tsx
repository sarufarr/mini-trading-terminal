import { memo } from 'react';
import { ETradePhaseStatus } from '@/hooks/use-trade';
import type { TradePhase } from '@/types/trade';
import { ETradeDirection } from '@/types/trade';
import { TradeButton } from './TradeButton';
import { TradeErrorDismiss } from '@/components/TradeErrorDismiss';
import { SlippageSelector } from './SlippageSelector';

interface TradePanelLayoutProps {
  balanceRow: React.ReactNode;
  phase: TradePhase;
  direction: ETradeDirection;
  canTrade: boolean;
  onExecute: () => void;
  onErrorDismiss: () => void;
  tokenSymbol?: string;
  children: React.ReactNode;
}

export const TradePanelLayout = memo(function TradePanelLayout({
  balanceRow,
  phase,
  direction,
  canTrade,
  onExecute,
  onErrorDismiss,
  tokenSymbol,
  children,
}: TradePanelLayoutProps) {
  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      {balanceRow}
      {children}
      <SlippageSelector />
      {import.meta.env.DEV && phase.status === ETradePhaseStatus.ERROR && (
        <TradeErrorDismiss
          message={phase.message}
          onDismiss={onErrorDismiss}
          className="px-1"
        />
      )}
      <div className="mt-auto">
        <TradeButton
          phase={phase}
          mode={direction}
          tokenSymbol={tokenSymbol}
          disabled={!canTrade}
          onClick={onExecute}
        />
      </div>
    </div>
  );
});
