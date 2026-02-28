import { PublicKey } from '@solana/web3.js';
import { i32ToBeBytes } from '@/lib/utils';
import { RAYDIUM_CLMM_PROGRAM_ID, TICK_ARRAY_SIZE } from './constants';

/** Max tick arrays per swap to avoid tx size / remaining_accounts limit */
const MAX_TICK_ARRAYS = 10;

export function getTickArrayStartIndex(
  tick: number,
  tickSpacing: number
): number {
  const arraySize = tickSpacing * TICK_ARRAY_SIZE;
  return Math.floor(tick / arraySize) * arraySize;
}

export function getTickArrayAddress(
  poolId: PublicKey,
  startIndex: number
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('tick_array'), poolId.toBuffer(), i32ToBeBytes(startIndex)],
    RAYDIUM_CLMM_PROGRAM_ID
  );
  return pda;
}

/**
 * Return startIndex of all tick arrays in swap direction (current + end).
 * Direction: endTick < tickCurrent => lower ticks, else higher. Used to pass all accounts for cross-tick swap.
 */
export function getTickArrayStartIndicesInRange(
  tickCurrent: number,
  endTick: number,
  tickSpacing: number,
  _zeroForOne: boolean
): number[] {
  const step = tickSpacing * TICK_ARRAY_SIZE;
  const start = getTickArrayStartIndex(tickCurrent, tickSpacing);
  const endStart = getTickArrayStartIndex(endTick, tickSpacing);
  const indices: number[] = [];
  if (endTick <= tickCurrent) {
    for (
      let i = start;
      i >= endStart && indices.length < MAX_TICK_ARRAYS;
      i -= step
    )
      indices.push(i);
  } else {
    for (
      let i = start;
      i <= endStart && indices.length < MAX_TICK_ARRAYS;
      i += step
    )
      indices.push(i);
  }
  return indices;
}

/**
 * Collect PDAs of all Tick Arrays in [tickCurrent, endTick] in traversal order.
 * If endTick missing or same segment, return at least 3 arrays (legacy behavior).
 */
export function getSwapTickArrays(
  poolId: PublicKey,
  tickCurrent: number,
  tickSpacing: number,
  zeroForOne: boolean,
  endTick?: number | null
): PublicKey[] {
  const step = tickSpacing * TICK_ARRAY_SIZE;
  const start = getTickArrayStartIndex(tickCurrent, tickSpacing);

  const indices =
    endTick != null && endTick !== tickCurrent
      ? getTickArrayStartIndicesInRange(
          tickCurrent,
          endTick,
          tickSpacing,
          zeroForOne
        )
      : zeroForOne
        ? [start, start - step, start - step * 2]
        : [start, start + step, start + step * 2];

  return indices.map((i) => getTickArrayAddress(poolId, i));
}
