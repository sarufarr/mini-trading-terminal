import { PublicKey } from '@solana/web3.js';
import { i32ToBeBytes } from '@/lib/utils';
import { RAYDIUM_CLMM_PROGRAM_ID, TICK_ARRAY_SIZE } from './constants';

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

export function getSwapTickArrays(
  poolId: PublicKey,
  tickCurrent: number,
  tickSpacing: number,
  zeroForOne: boolean
): [PublicKey, PublicKey, PublicKey] {
  const step = tickSpacing * TICK_ARRAY_SIZE;
  const start = getTickArrayStartIndex(tickCurrent, tickSpacing);

  const indices = zeroForOne
    ? [start, start - step, start - step * 2]
    : [start, start + step, start + step * 2];

  return indices.map((i) => getTickArrayAddress(poolId, i)) as [
    PublicKey,
    PublicKey,
    PublicKey,
  ];
}
