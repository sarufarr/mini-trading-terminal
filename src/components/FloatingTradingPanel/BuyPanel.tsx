import { memo, useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { useBalance } from '@/hooks/use-balance';
import { useTrade, ETradePhaseStatus } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { showTradeSuccess, showTradeError } from '@/lib/trade-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import type { EnhancedToken } from '@/lib/codex';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { SOL_PRESETS, FEE_RESERVE_SOL } from '@/constants/trade';
import { BalanceRow } from './BalanceRow';
import { TradePanelLayout } from './TradePanelLayout';

interface Props {
  token: EnhancedToken;
}

export const BuyPanel = memo(function BuyPanel({ token }: Props) {
  const [amount, setAmount] = useState('');

  const parsedAmount = Number.parseFloat(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const {
    nativeBalance,
    refreshBalance,
    loading: balanceLoading,
    error: balanceError,
  } = useBalance(
    token.address,
    Number(token.decimals),
    9,
    Number(token.networkId)
  );

  const { phase, execute, reset } = useTrade({
    tokenAddress: token.address,
    networkId: Number(token.networkId),
    onSuccess: refreshBalance,
  });

  const slippageBps = useTradePanelStore((s) => s.slippageBps);

  const handleBuy = useCallback(async () => {
    if (!hasValidAmount) return;
    try {
      const txid = await execute({
        direction: ETradeDirection.BUY,
        value: parsedAmount,
        slippageBps,
      });
      showTradeSuccess('buy', txid);
    } catch (err) {
      showTradeError(getErrorMessage(err));
    }
  }, [execute, hasValidAmount, parsedAmount, slippageBps]);

  const canTrade =
    hasValidAmount &&
    (phase.status === ETradePhaseStatus.IDLE ||
      phase.status === ETradePhaseStatus.ERROR);

  const maxSpendableSol = Math.max(0, nativeBalance - FEE_RESERVE_SOL);
  const isMaxSpendable = maxSpendableSol > 0;
  const isAtMax =
    isMaxSpendable &&
    Number.isFinite(parsedAmount) &&
    Math.abs(parsedAmount - maxSpendableSol) < 1e-6;

  const handleMax = useCallback(() => {
    if (!isMaxSpendable) return;
    setAmount(maxSpendableSol.toFixed(4));
  }, [isMaxSpendable, maxSpendableSol]);

  const isPresetAmount =
    amount === '' ||
    SOL_PRESETS.some(
      (p) =>
        amount === String(p) ||
        (Number.isFinite(parsedAmount) && Math.abs(parsedAmount - p) < 1e-9)
    );
  const isCustomAmount = !isPresetAmount;

  const balanceRow = (
    <BalanceRow
      loading={balanceLoading}
      error={balanceError}
      onRetry={refreshBalance}
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
      {`${nativeBalance.toFixed(4)} SOL`}
    </BalanceRow>
  );

  return (
    <TradePanelLayout
      balanceRow={balanceRow}
      phase={phase}
      direction={ETradeDirection.BUY}
      canTrade={canTrade}
      onExecute={handleBuy}
      onErrorDismiss={reset}
      tokenSymbol={token.symbol ?? undefined}
    >
      <div className="flex gap-1.5">
        {SOL_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAmount(String(preset))}
            aria-label={`Set amount to ${preset} SOL`}
            className={cn(
              'flex-1 min-h-9 py-2 rounded-md text-xs font-medium transition-colors',
              amount === String(preset)
                ? 'bg-green-500/20 text-green-500 ring-1 ring-green-500/40'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="relative flex items-center">
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.001"
          className="h-12 py-3 px-4 pr-24 text-base rounded-md rounded-r-none border-r-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="absolute right-0 flex items-center h-12 border border-input rounded-r-md bg-muted/30">
          <button
            type="button"
            onClick={handleMax}
            disabled={!isMaxSpendable}
            className={cn(
              'h-full px-3 text-xs font-semibold transition-colors',
              !isMaxSpendable
                ? 'cursor-not-allowed text-muted-foreground/50 pointer-events-none'
                : isAtMax
                  ? 'bg-green-500/20 text-green-500'
                  : 'text-foreground hover:bg-muted/60'
            )}
            aria-label="Set to max spendable SOL"
          >
            Max
          </button>
          <span className="pr-3 text-base text-muted-foreground border-l border-input pl-2">
            SOL
          </span>
        </div>
      </div>
    </TradePanelLayout>
  );
});

BuyPanel.displayName = 'BuyPanel';
