/**
 * In-memory cache of CLMM pool state for instant local getAmountOut (no RPC).
 * State lives in usePoolStore; this module delegates get/set for backward compatibility.
 */
import { getAmountOutFromSqrtPriceAndLiquidity } from './math';
import { getAmountOutInWorker } from './worker-client';
import { NATIVE_MINT } from '@solana/spl-token';
import type { ClmmPoolStateSnapshot } from './types';
import { usePoolStore } from '@/store/pool.store';

export type { ClmmPoolStateSnapshot };

function getZeroForOne(
  tokenAddress: string,
  direction: 'buy' | 'sell'
): boolean {
  const snapshot = usePoolStore.getState().getPool(tokenAddress);
  if (!snapshot) return false;
  if (direction === 'buy')
    return snapshot.token0Mint === NATIVE_MINT.toBase58();
  return snapshot.token0Mint === tokenAddress;
}

export function setClmmPoolCache(
  tokenAddress: string,
  snapshot: Omit<ClmmPoolStateSnapshot, 'fetchedAt'>
): void {
  usePoolStore.getState().setPool(tokenAddress, snapshot);
}

export function getClmmPoolCache(
  tokenAddress: string
): ClmmPoolStateSnapshot | null {
  return usePoolStore.getState().getPool(tokenAddress);
}

/**
 * Synchronous local CLMM quote: no RPC. Returns null if no cache or invalid amount.
 */
export function getLocalClmmQuote(
  tokenAddress: string,
  amountInAtomic: string,
  direction: 'buy' | 'sell'
): { outAmountAtomic: string } | null {
  const snapshot = getClmmPoolCache(tokenAddress);
  if (!snapshot) return null;

  const amountIn = BigInt(amountInAtomic);
  if (amountIn <= 0n) return null;

  const zeroForOne = getZeroForOne(tokenAddress, direction);
  const out = getAmountOutFromSqrtPriceAndLiquidity(
    snapshot.sqrtPriceX64,
    snapshot.liquidity,
    amountIn,
    zeroForOne
  );

  return { outAmountAtomic: out.toString() };
}

/**
 * Async local CLMM quote in Web Worker; keeps main thread free for 60fps.
 */
export async function getLocalClmmQuoteAsync(
  tokenAddress: string,
  amountInAtomic: string,
  direction: 'buy' | 'sell'
): Promise<{ outAmountAtomic: string } | null> {
  const snapshot = getClmmPoolCache(tokenAddress);
  if (!snapshot) return null;

  const amountIn = BigInt(amountInAtomic);
  if (amountIn <= 0n) return null;

  const zeroForOne = getZeroForOne(tokenAddress, direction);
  const out = await getAmountOutInWorker(
    snapshot.sqrtPriceX64,
    snapshot.liquidity,
    amountIn,
    zeroForOne
  );
  return { outAmountAtomic: out.toString() };
}
