import { PublicKey } from '@solana/web3.js';
import { describe, expect, it, vi } from 'vitest';
import {
  getTickArrayStartIndex,
  getTickArrayAddress,
  getSwapTickArrays,
} from './tick-array';
import { TICK_ARRAY_SIZE } from './constants';

vi.mock('@solana/web3.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/web3.js')>();
  return {
    ...actual,
    PublicKey: class extends actual.PublicKey {
      static findProgramAddressSync(_seeds: Buffer[], _programId: PublicKey) {
        const buf = Buffer.alloc(32, 0);
        if (_seeds[2]) buf.set(_seeds[2], 0);
        return [new (this as typeof actual.PublicKey)(buf), 255] as [
          PublicKey,
          number,
        ];
      }
    },
  };
});

describe('raydium-clmm tick-array', () => {
  const poolId = new PublicKey('11111111111111111111111111111111');

  describe('getTickArrayStartIndex', () => {
    it('returns start index for tick within first array', () => {
      const tickSpacing = 1;
      const tick = 50;
      const result = getTickArrayStartIndex(tick, tickSpacing);
      const arraySize = tickSpacing * TICK_ARRAY_SIZE;
      expect(result).toBe(Math.floor(tick / arraySize) * arraySize);
    });

    it('returns correct start for tick at array boundary', () => {
      const tickSpacing = 10;
      const arraySize = tickSpacing * TICK_ARRAY_SIZE;
      const tick = arraySize;
      const result = getTickArrayStartIndex(tick, tickSpacing);
      expect(result).toBe(arraySize);
    });

    it('returns correct start for negative tick', () => {
      const tickSpacing = 60;
      const tick = -120;
      const result = getTickArrayStartIndex(tick, tickSpacing);
      const arraySize = tickSpacing * TICK_ARRAY_SIZE;
      expect(result).toBe(Math.floor(tick / arraySize) * arraySize);
    });
  });

  describe('getTickArrayAddress', () => {
    it('returns deterministic PDA for same inputs', () => {
      const startIndex = 0;
      const addr1 = getTickArrayAddress(poolId, startIndex);
      const addr2 = getTickArrayAddress(poolId, startIndex);
      expect(addr1.equals(addr2)).toBe(true);
    });

    it('returns different addresses for different start indices', () => {
      const addr1 = getTickArrayAddress(poolId, 0);
      const addr2 = getTickArrayAddress(poolId, 5280);
      expect(addr1.equals(addr2)).toBe(false);
    });
  });

  describe('getSwapTickArrays', () => {
    it('returns 3 tick array addresses for zeroForOne when endTick not provided', () => {
      const tickCurrent = 0;
      const tickSpacing = 60;
      const addrs = getSwapTickArrays(poolId, tickCurrent, tickSpacing, true);

      expect(addrs).toHaveLength(3);
      expect(addrs[0]).toBeInstanceOf(PublicKey);
      expect(addrs[1]).toBeInstanceOf(PublicKey);
      expect(addrs[2]).toBeInstanceOf(PublicKey);
    });

    it('returns 3 tick array addresses for oneForZero when endTick not provided', () => {
      const tickCurrent = 0;
      const tickSpacing = 60;
      const addrs = getSwapTickArrays(poolId, tickCurrent, tickSpacing, false);

      expect(addrs).toHaveLength(3);
    });

    it('returns different addresses for zeroForOne vs oneForZero', () => {
      const tickCurrent = 0;
      const tickSpacing = 60;
      const addrsZfo = getSwapTickArrays(
        poolId,
        tickCurrent,
        tickSpacing,
        true
      );
      const addrsOfo = getSwapTickArrays(
        poolId,
        tickCurrent,
        tickSpacing,
        false
      );

      expect(addrsZfo[1].equals(addrsOfo[1])).toBe(false);
      expect(addrsZfo[2].equals(addrsOfo[2])).toBe(false);
    });

    it('returns more than 3 tick arrays when endTick spans multiple arrays', () => {
      const tickSpacing = 60;
      const step = tickSpacing * TICK_ARRAY_SIZE;
      const tickCurrent = step * 2;
      const endTick = tickCurrent - step * 3;
      const addrs = getSwapTickArrays(
        poolId,
        tickCurrent,
        tickSpacing,
        true,
        endTick
      );
      expect(addrs.length).toBeGreaterThanOrEqual(4);
    });
  });
});
