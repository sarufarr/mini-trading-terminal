import {
  PRICE_IMPACT_WARN_PCT,
  PRICE_IMPACT_BLOCK_PCT,
} from '@/constants/trade';

export interface PriceImpactStatus {
  /** Effective price impact in % (max of priceImpactPct and simulatedSlippageBps when available). */
  effectivePct: number;
  /** True when impact >= PRICE_IMPACT_WARN_PCT (e.g. 3%). */
  isWarn: boolean;
  /** True when impact >= PRICE_IMPACT_BLOCK_PCT (e.g. 5%); trade should be disabled. */
  isBlock: boolean;
}

/**
 * Derives warning/block status from quote's price impact and simulated slippage.
 * Uses the higher of the two when both are available (liquidity depth + amount).
 */
export function getPriceImpactStatus(
  priceImpactPct: string | null,
  simulatedSlippageBps: number | null
): PriceImpactStatus {
  const fromPriceImpact =
    priceImpactPct != null && priceImpactPct !== ''
      ? Number.parseFloat(priceImpactPct)
      : 0;
  const fromSimulated =
    simulatedSlippageBps != null ? simulatedSlippageBps / 100 : 0;
  const effectivePct =
    Number.isFinite(fromPriceImpact) || Number.isFinite(fromSimulated)
      ? Math.max(
          Number.isFinite(fromPriceImpact) ? fromPriceImpact : 0,
          Number.isFinite(fromSimulated) ? fromSimulated : 0
        )
      : 0;

  return {
    effectivePct,
    isWarn: effectivePct >= PRICE_IMPACT_WARN_PCT,
    isBlock: effectivePct >= PRICE_IMPACT_BLOCK_PCT,
  };
}
