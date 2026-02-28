import { describe, expect, it } from 'vitest';
import { getPriceImpactStatus } from '@/lib/price-impact';

describe('getPriceImpactStatus', () => {
  it('returns no warn/block when both inputs are null', () => {
    const status = getPriceImpactStatus(null, null);
    expect(status.effectivePct).toBe(0);
    expect(status.isWarn).toBe(false);
    expect(status.isBlock).toBe(false);
  });

  it('uses priceImpactPct when simulatedSlippageBps is null', () => {
    const status = getPriceImpactStatus('2.5', null);
    expect(status.effectivePct).toBe(2.5);
    expect(status.isWarn).toBe(false);
    expect(status.isBlock).toBe(false);
  });

  it('warns when price impact >= 3%', () => {
    const status = getPriceImpactStatus('3', null);
    expect(status.effectivePct).toBe(3);
    expect(status.isWarn).toBe(true);
    expect(status.isBlock).toBe(false);
  });

  it('blocks when price impact >= 5%', () => {
    const status = getPriceImpactStatus('5.5', null);
    expect(status.effectivePct).toBe(5.5);
    expect(status.isWarn).toBe(true);
    expect(status.isBlock).toBe(true);
  });

  it('uses simulatedSlippageBps (bps to %) when priceImpactPct is null', () => {
    const status = getPriceImpactStatus(null, 400); // 4%
    expect(status.effectivePct).toBe(4);
    expect(status.isWarn).toBe(true);
    expect(status.isBlock).toBe(false);
  });

  it('uses the higher of the two when both are present', () => {
    const status = getPriceImpactStatus('2', 600); // 2% vs 6%
    expect(status.effectivePct).toBe(6);
    expect(status.isWarn).toBe(true);
    expect(status.isBlock).toBe(true);
  });

  it('uses price impact when it is higher than simulated', () => {
    const status = getPriceImpactStatus('7', 200); // 7% vs 2%
    expect(status.effectivePct).toBe(7);
    expect(status.isBlock).toBe(true);
  });
});
