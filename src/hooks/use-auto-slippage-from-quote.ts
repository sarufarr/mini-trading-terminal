import { useEffect } from 'react';
import { SLIPPAGE_MIN_BPS, SLIPPAGE_MAX_BPS } from '@/constants/trade';

/**
 * Syncs slippage from quote's simulatedSlippageBps when quote is ready and amount is valid.
 * Used by BuyPanel and SellPanel to suggest slippage from the swap quote.
 */
export function useAutoSlippageFromQuote({
  simulatedSlippageBps,
  loading,
  hasValidAmount,
  slippageBps,
  setSlippageBps,
}: {
  simulatedSlippageBps: number | null;
  loading: boolean;
  hasValidAmount: boolean;
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
}): void {
  useEffect(() => {
    if (simulatedSlippageBps != null && !loading && hasValidAmount) {
      const clamped = Math.min(
        SLIPPAGE_MAX_BPS,
        Math.max(SLIPPAGE_MIN_BPS, simulatedSlippageBps)
      );
      if (clamped !== slippageBps) setSlippageBps(clamped);
    }
  }, [
    simulatedSlippageBps,
    loading,
    hasValidAmount,
    slippageBps,
    setSlippageBps,
  ]);
}
