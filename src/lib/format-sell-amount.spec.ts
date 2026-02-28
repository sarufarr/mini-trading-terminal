import { describe, expect, it } from 'vitest';
import { formatSellPresetAmount } from '@/lib/format-sell-amount';

describe('formatSellPresetAmount', () => {
  it('returns percentage of balance in fixed form for normal range', () => {
    expect(formatSellPresetAmount(100, 50)).toBe('50');
    expect(formatSellPresetAmount(1000, 25)).toBe('250');
    expect(formatSellPresetAmount(1, 100)).toBe('1');
  });

  it('strips trailing zeros', () => {
    expect(formatSellPresetAmount(10, 10)).toBe('1');
    expect(formatSellPresetAmount(100, 1)).toBe('1');
  });

  it('returns "0" for zero balance or zero pct', () => {
    expect(formatSellPresetAmount(0, 50)).toBe('0');
    expect(formatSellPresetAmount(100, 0)).toBe('0');
  });

  it('uses exponential form for values >= 1e9', () => {
    const result = formatSellPresetAmount(1e10, 10);
    expect(result).toMatch(/^1\.0000e\+9$/);
  });

  it('uses exponential form for small positive values < 1e-9', () => {
    const result = formatSellPresetAmount(1e-10, 100);
    expect(result).toMatch(/^1\.0000e-10$/);
  });

  it('clamps pct to 0-100 when computing (caller can pass any number)', () => {
    expect(formatSellPresetAmount(100, 100)).toBe('100');
    expect(formatSellPresetAmount(100, 150)).toBe('150'); // no clamp inside fn
  });
});
