import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { calcMinAmountOut, sqrtPriceX64ToPrice } from './math';

describe('raydium-clmm math', () => {
  describe('sqrtPriceX64ToPrice', () => {
    it('converts sqrtPriceX64 to atomic price ratio when sqrtPrice = 1', () => {
      const Q64 = BigInt(2) ** BigInt(64);
      const price = sqrtPriceX64ToPrice(Q64);

      expect(price.toNumber()).toBeCloseTo(1, 8);
    });

    it('converts sqrtPriceX64 when price < 1', () => {
      const Q64 = BigInt(2) ** BigInt(64);
      const sqrtPriceX64 = Q64 / 2n;
      const price = sqrtPriceX64ToPrice(sqrtPriceX64);

      expect(price.toNumber()).toBeCloseTo(0.25, 8);
    });

    it('converts sqrtPriceX64 when price > 1', () => {
      const Q64 = BigInt(2) ** BigInt(64);
      const sqrtPriceX64 = Q64 * 2n;
      const price = sqrtPriceX64ToPrice(sqrtPriceX64);

      expect(price.toNumber()).toBeCloseTo(4, 6);
    });

    it('handles sqrtPriceX64 = 1 (minimum non-zero)', () => {
      const price = sqrtPriceX64ToPrice(1n);
      expect(price.toNumber()).toBeGreaterThan(0);
      expect(price.toNumber()).toBeLessThan(1e-30);
    });
  });

  describe('calcMinAmountOut', () => {
    it('computes min amount out with slippage', () => {
      const amountIn = 1_000_000_000n;
      const price = new Decimal(2);
      const slippageBps = 100;

      const minOut = calcMinAmountOut(amountIn, price, slippageBps);
      expect(Number(minOut)).toBe(1_980_000_000);
    });

    it('returns full amount when slippage is 0', () => {
      const amountIn = 1_000_000_000n;
      const price = new Decimal(2);
      const slippageBps = 0;

      const minOut = calcMinAmountOut(amountIn, price, slippageBps);
      expect(Number(minOut)).toBe(2_000_000_000);
    });

    it('returns zero when slippage is 100%', () => {
      const amountIn = 1_000_000_000n;
      const price = new Decimal(2);
      const slippageBps = 10000;

      const minOut = calcMinAmountOut(amountIn, price, slippageBps);
      expect(Number(minOut)).toBe(0);
    });

    it('rounds down fractional results', () => {
      const amountIn = 1_000_000_001n;
      const price = new Decimal(1.5);
      const slippageBps = 100;

      const minOut = calcMinAmountOut(amountIn, price, slippageBps);
      expect(Number(minOut)).toBe(1_485_000_001);
    });
  });
});
