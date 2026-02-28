import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import {
  calcMinAmountOut,
  getAmountOutFromSqrtPriceAndLiquidity,
  getEndSqrtPriceX64AfterSwap,
  sqrtPriceX64ToPrice,
  sqrtPriceX64ToTick,
} from './math';

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

  describe('getAmountOutFromSqrtPriceAndLiquidity', () => {
    const Q64 = 2n ** 64n;

    it('returns 0 when amountIn or liquidity is 0', () => {
      expect(
        getAmountOutFromSqrtPriceAndLiquidity(Q64, 1_000_000n, 0n, true)
      ).toBe(0n);
      expect(
        getAmountOutFromSqrtPriceAndLiquidity(Q64, 0n, 1_000_000n, true)
      ).toBe(0n);
    });

    it('zeroForOne: token0 in gives token1 out', () => {
      const s = Q64;
      const L = 1_000_000_000_000n;
      const amountIn = 1_000_000n;
      const out = getAmountOutFromSqrtPriceAndLiquidity(s, L, amountIn, true);
      expect(out).toBeGreaterThan(0n);
      expect(out).toBeLessThan(amountIn * 2n);
    });

    it('oneForZero: token1 in gives token0 out', () => {
      const s = Q64;
      const L = 1_000_000_000_000n;
      const amountIn = 1_000_000n;
      const out = getAmountOutFromSqrtPriceAndLiquidity(s, L, amountIn, false);
      expect(out).toBeGreaterThan(0n);
    });

    it('larger amountIn gives larger amountOut for zeroForOne', () => {
      const s = Q64;
      const L = 10n ** 18n;
      const out1 = getAmountOutFromSqrtPriceAndLiquidity(
        s,
        L,
        1_000_000n,
        true
      );
      const out2 = getAmountOutFromSqrtPriceAndLiquidity(
        s,
        L,
        2_000_000n,
        true
      );
      expect(out2).toBeGreaterThan(out1);
    });
  });

  describe('getEndSqrtPriceX64AfterSwap', () => {
    const Q64 = 2n ** 64n;

    it('returns null when liquidity or amountIn is 0', () => {
      expect(getEndSqrtPriceX64AfterSwap(Q64, 0n, 1_000_000n, true)).toBeNull();
      expect(getEndSqrtPriceX64AfterSwap(Q64, 1_000_000n, 0n, true)).toBeNull();
    });

    it('zeroForOne: end price is lower than current', () => {
      const s = Q64;
      const L = 1_000_000_000_000n;
      const amountIn = 1_000_000n;
      const end = getEndSqrtPriceX64AfterSwap(s, L, amountIn, true);
      expect(end).not.toBeNull();
      expect(end!).toBeLessThan(s);
    });

    it('oneForZero: end sqrt price is lower than current (more token0 out)', () => {
      const s = Q64;
      const L = 1_000_000_000_000n;
      const amountIn = 1_000_000n;
      const end = getEndSqrtPriceX64AfterSwap(s, L, amountIn, false);
      expect(end).not.toBeNull();
      expect(end!).toBeLessThan(s);
    });
  });

  describe('sqrtPriceX64ToTick', () => {
    it('tick 0 corresponds to sqrtPriceX64 = 2^64', () => {
      const Q64 = 2n ** 64n;
      const tick = sqrtPriceX64ToTick(Q64);
      expect(tick).toBe(0);
    });

    it('higher sqrtPrice gives positive tick', () => {
      const Q64 = 2n ** 64n;
      const tick = sqrtPriceX64ToTick(Q64 * 2n);
      expect(tick).toBeGreaterThan(0);
    });

    it('lower sqrtPrice gives negative tick', () => {
      const Q64 = 2n ** 64n;
      const tick = sqrtPriceX64ToTick(Q64 / 2n);
      expect(tick).toBeLessThan(0);
    });
  });
});
