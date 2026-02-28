import { useEffect, useMemo, useState } from 'react';
import type { PriceImpactStatus } from '@/lib/price-impact';
import { getPriceImpactStatusInWorker } from '@/lib/compute-worker-client';

export interface UsePriceImpactStatusParams {
  priceImpactPct: string | null;
  simulatedSlippageBps: number | null;
}

const DEFAULT_STATUS: PriceImpactStatus = {
  effectivePct: 0,
  isWarn: false,
  isBlock: false,
};

/**
 * Runs price impact status calculation in a Web Worker so the main thread stays free for 60fps.
 * Returns a stable priceImpactStatus reference when effectivePct/isWarn/isBlock are unchanged,
 * so parents (BuyPanel/SellPanel) and memo(QuoteInfo) avoid unnecessary re-renders on high-frequency quote updates.
 */
export function usePriceImpactStatus({
  priceImpactPct,
  simulatedSlippageBps,
}: UsePriceImpactStatusParams): {
  priceImpactStatus: PriceImpactStatus;
  loading: boolean;
} {
  const [status, setStatus] = useState<PriceImpactStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPriceImpactStatusInWorker(priceImpactPct, simulatedSlippageBps)
      .then((next) => {
        if (!cancelled) {
          setStatus(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(DEFAULT_STATUS);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [priceImpactPct, simulatedSlippageBps]);

  // Stable reference when values unchanged → QuoteInfo and parent useMemo deps stay stable
  const priceImpactStatus = useMemo(
    () => ({
      effectivePct: status.effectivePct,
      isWarn: status.isWarn,
      isBlock: status.isBlock,
    }),
    [status.effectivePct, status.isWarn, status.isBlock]
  );

  return { priceImpactStatus, loading };
}
