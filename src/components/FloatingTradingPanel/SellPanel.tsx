import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/cn';
import { useBalance } from '@/hooks/use-balance';
import { ETradePhaseStatus, useTrade } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { showTradeSuccess, showTradeError } from '@/lib/trade-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import type { EnhancedToken } from '@/lib/codex';
import Decimal from 'decimal.js';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { SELL_PCT_PRESETS } from '@/constants/trade';
import { BalanceRow } from './BalanceRow';
import { TradePanelLayout } from './TradePanelLayout';

interface Props {
  token: EnhancedToken;
}

export const SellPanel = memo(function SellPanel({ token }: Props) {
  const [pct, setPct] = useState<number>(50);

  const {
    tokenBalance,
    tokenAtomicBalance,
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

  const sellAmount = new Decimal(tokenBalance).mul(pct).div(100).toNumber();
  const slippageBps = useTradePanelStore((s) => s.slippageBps);

  const handleSell = useCallback(async () => {
    if (tokenBalance <= 0) return;
    try {
      const txid = await execute({
        direction: ETradeDirection.SELL,
        value: pct,
        tokenAtomicBalance,
        slippageBps,
      });
      showTradeSuccess('sell', txid);
    } catch (err) {
      showTradeError(getErrorMessage(err));
    }
  }, [pct, execute, tokenAtomicBalance, tokenBalance, slippageBps]);

  const canTrade =
    tokenBalance > 0 &&
    (phase.status === ETradePhaseStatus.IDLE ||
      phase.status === ETradePhaseStatus.ERROR);

  const balanceRow = (
    <BalanceRow
      loading={balanceLoading}
      error={balanceError}
      onRetry={refreshBalance}
    >
      <>
        {tokenBalance.toLocaleString()} {token.symbol ?? 'Token'}
      </>
    </BalanceRow>
  );

  return (
    <TradePanelLayout
      balanceRow={balanceRow}
      phase={phase}
      direction={ETradeDirection.SELL}
      canTrade={canTrade}
      onExecute={handleSell}
      onErrorDismiss={reset}
      tokenSymbol={token.symbol ?? undefined}
    >
      <div className="flex gap-1.5">
        {SELL_PCT_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setPct(preset)}
            aria-label={`Sell ${preset}%`}
            className={cn(
              'flex-1 min-h-9 py-2 rounded-md text-xs font-medium transition-colors',
              pct === preset
                ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/40'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
            )}
          >
            {preset}%
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs px-1">
        <span className="text-muted-foreground">Selling</span>
        <span className="font-medium">
          {sellAmount.toLocaleString()} {token.symbol ?? 'Token'}
        </span>
      </div>
    </TradePanelLayout>
  );
});

SellPanel.displayName = 'SellPanel';
