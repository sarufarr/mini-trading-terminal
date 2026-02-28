/**
 * Pool slice: CLMM pool state cache, Tick Array cache.
 *
 * Limit re-renders: use selector for one token's pool; useShallow for derived "has cache";
 * getState/setState for non-React access; subscribe for reactivity.
 */

import { create } from 'zustand';
import type { ClmmPoolStateSnapshot } from '@/lib/raydium-clmm/types';

const POOL_TTL_MS = 30_000;

/** Tick cache entry: keyed by poolId + startIndex to avoid refetching same tick array */
export interface TickCacheEntry {
  poolId: string;
  startIndex: number;
  fetchedAt: number;
}

interface PoolStore {
  /** tokenAddress -> pool snapshot (SOL pair) */
  pools: Record<string, ClmmPoolStateSnapshot>;
  /** poolId -> list of cached tick array startIndices (with fetchedAt for TTL) */
  tickCache: Record<string, TickCacheEntry[]>;

  setPool: (
    tokenAddress: string,
    snapshot: Omit<ClmmPoolStateSnapshot, 'fetchedAt'>
  ) => void;
  getPool: (tokenAddress: string) => ClmmPoolStateSnapshot | null;
  setTickCacheEntry: (poolId: string, startIndex: number) => void;
  getTickCachedStartIndices: (poolId: string) => number[];
}

export const usePoolStore = create<PoolStore>()((set, get) => ({
  pools: {},
  tickCache: {},

  setPool: (tokenAddress, snapshot) =>
    set((s) => ({
      pools: {
        ...s.pools,
        [tokenAddress]: {
          ...snapshot,
          fetchedAt: Date.now(),
        },
      },
    })),

  getPool: (tokenAddress) => {
    const entry = get().pools[tokenAddress];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > POOL_TTL_MS) return null;
    return entry;
  },

  setTickCacheEntry: (poolId, startIndex) =>
    set((s) => {
      const list = s.tickCache[poolId] ?? [];
      const now = Date.now();
      const filtered = list.filter((e) => e.startIndex !== startIndex);
      return {
        tickCache: {
          ...s.tickCache,
          [poolId]: [...filtered, { poolId, startIndex, fetchedAt: now }],
        },
      };
    }),

  getTickCachedStartIndices: (poolId) => {
    const list = get().tickCache[poolId] ?? [];
    const now = Date.now();
    return list
      .filter((e) => now - e.fetchedAt <= POOL_TTL_MS)
      .map((e) => e.startIndex);
  },
}));
