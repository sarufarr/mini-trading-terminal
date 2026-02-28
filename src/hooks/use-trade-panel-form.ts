/**
 * Shared trade panel state and handlers for BuyPanel and SellPanel.
 * Centralizes useSwapQuote, useTrade, useTradeConfirmFlow, useAutoSlippageFromQuote, usePriceImpactStatus and canTrade derivation.
 */
import { useCallback } from 'react';
import { useTradeStore } from '@/store/trade.store';
import { useOptimisticTradeStore } from '@/store/optimistic-trade.store';
import { useTrade } from '@/hooks/use-trade';
import { useTradeConfirmFlow } from '@/hooks/use-trade-confirm-flow';
import { useSwapQuote, type UseSwapQuoteResult } from '@/hooks/use-swap-quote';
import { useAutoSlippageFromQuote } from '@/hooks/use-auto-slippage-from-quote';
import { usePriceImpactStatus } from '@/hooks/use-price-impact-status';
import { ETradeDirection, ETradePhaseStatus } from '@/types/trade';
import type { EnhancedToken } from '@/lib/codex';
import type { OptimisticTradeState } from '@/store/optimistic-trade.store';

export interface UseTradePanelFormParams {
  token: EnhancedToken;
  direction: ETradeDirection;
  amountInAtomic: string;
  hasValidAmount: boolean;
  /** Build optimistic state when tx is sent; receives current quote and txid. */
  buildOptimisticPayload: (
    quote: UseSwapQuoteResult,
    txid: string
  ) => OptimisticTradeState;
  /** Called on trade success (e.g. refreshBalance); hook also clears optimistic. */
  onSuccess?: () => void;
}

export interface UseTradePanelFormReturn {
  quote: UseSwapQuoteResult;
  phase: ReturnType<typeof useTrade>['phase'];
  execute: ReturnType<typeof useTrade>['execute'];
  reset: ReturnType<typeof useTrade>['reset'];
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
  preferredSwapProvider: 'Raydium CLMM' | 'Jupiter' | null;
  confirmFlow: ReturnType<typeof useTradeConfirmFlow>;
  priceImpactStatus: ReturnType<
    typeof usePriceImpactStatus
  >['priceImpactStatus'];
  canTrade: boolean;
}

export function useTradePanelForm({
  token,
  direction,
  amountInAtomic,
  hasValidAmount,
  buildOptimisticPayload,
  onSuccess,
}: UseTradePanelFormParams): UseTradePanelFormReturn {
  const slippageBps = useTradeStore((s) => s.slippageBps);
  const setSlippageBps = useTradeStore((s) => s.setSlippageBps);
  const preferredSwapProvider = useTradeStore((s) => s.preferredSwapProvider);
  const clearOptimistic = useOptimisticTradeStore((s) => s.clearOptimistic);
  const setOptimistic = useOptimisticTradeStore((s) => s.setOptimistic);

  const quote = useSwapQuote({
    tokenAddress: token.address,
    tokenDecimals: Number(token.decimals),
    networkId: Number(token.networkId),
    direction,
    amountInAtomic,
    slippageBps,
  });

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    clearOptimistic();
  }, [onSuccess, clearOptimistic]);

  const onSent = useCallback(
    (txid: string) => {
      setOptimistic(buildOptimisticPayload(quote, txid));
    },
    [quote, buildOptimisticPayload, setOptimistic]
  );

  const { phase, execute, reset } = useTrade({
    tokenAddress: token.address,
    networkId: Number(token.networkId),
    onSuccess: handleSuccess,
    onSent,
  });

  const confirmFlow = useTradeConfirmFlow({
    onClearOptimistic: clearOptimistic,
  });

  useAutoSlippageFromQuote({
    simulatedSlippageBps: quote.simulatedSlippageBps,
    loading: quote.loading,
    hasValidAmount,
    slippageBps,
    setSlippageBps,
  });

  const { priceImpactStatus } = usePriceImpactStatus({
    priceImpactPct: quote.priceImpactPct,
    simulatedSlippageBps: quote.simulatedSlippageBps,
  });

  const canTrade =
    hasValidAmount &&
    (phase.status === ETradePhaseStatus.IDLE ||
      phase.status === ETradePhaseStatus.ERROR) &&
    !priceImpactStatus.isBlock;

  return {
    quote,
    phase,
    execute,
    reset,
    slippageBps,
    setSlippageBps,
    preferredSwapProvider,
    confirmFlow,
    priceImpactStatus,
    canTrade,
  };
}
