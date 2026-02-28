import Decimal from 'decimal.js';
import {
  SELL_AMOUNT_EXP_THRESHOLD_HIGH,
  SELL_AMOUNT_EXP_THRESHOLD_LOW,
} from '@/constants/trade';

/**
 * Format sell amount for a given percentage of token balance.
 * Uses exponential notation for very large or very small values.
 */
export function formatSellPresetAmount(
  tokenBalance: number,
  pct: number
): string {
  const val = new Decimal(tokenBalance).mul(pct).div(100).toNumber();
  if (
    val >= SELL_AMOUNT_EXP_THRESHOLD_HIGH ||
    (val > 0 && val < SELL_AMOUNT_EXP_THRESHOLD_LOW)
  )
    return val.toExponential(4);
  return val.toFixed(9).replace(/\.?0+$/, '') || '0';
}
