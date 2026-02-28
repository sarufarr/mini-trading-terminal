import { memo, useCallback, useEffect } from 'react';
import { ETradePhaseStatus, type TradePhase } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { TradeButton } from './TradeButton';
import { TradeErrorDismiss } from '@/components/TradeErrorDismiss';
import { SlippageSelector } from './SlippageSelector';
import { MevProtectionHint } from './MevProtectionHint';

interface TradePanelLayoutProps {
  balanceRow: React.ReactNode;
  phase: TradePhase;
  direction: ETradeDirection;
  canTrade: boolean;
  onExecute: () => void;
  onErrorDismiss: () => void;
  tokenSymbol?: string;
  quoteRow?: React.ReactNode;
  /** Register canTrade + onExecute for global shortcuts */
  onRegisterExecute?: (canTrade: boolean, execute: () => void) => void;
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
  quoteRow,
  onRegisterExecute,
  children,
}: TradePanelLayoutProps) {
  useEffect(() => {
    onRegisterExecute?.(canTrade, onExecute);
    return () => onRegisterExecute?.(false, () => {});
  }, [canTrade, onExecute, onRegisterExecute]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' || !canTrade) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      onExecute();
    },
    [canTrade, onExecute]
  );

  return (
    <div
      className="flex flex-col gap-5 p-4 h-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-label="Trade panel"
    >
      {balanceRow}
      {children}
      {quoteRow}
      <SlippageSelector direction={direction} />
      {import.meta.env.DEV && phase.status === ETradePhaseStatus.ERROR && (
        <TradeErrorDismiss
          message={phase.message}
          onDismiss={onErrorDismiss}
          className="px-0"
        />
      )}
      <div className="mt-auto space-y-2">
        <MevProtectionHint />
        <TradeButton
          phase={phase}
          direction={direction}
          tokenSymbol={tokenSymbol}
          disabled={!canTrade}
          onClick={onExecute}
        />
      </div>
    </div>
  );
});

TradePanelLayout.displayName = 'TradePanelLayout';
