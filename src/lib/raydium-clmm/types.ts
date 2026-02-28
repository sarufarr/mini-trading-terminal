import { PublicKey } from '@solana/web3.js';

export interface PoolState {
  ammConfig: PublicKey;
  owner: PublicKey;
  token0Mint: PublicKey;
  token1Mint: PublicKey;
  token0Vault: PublicKey;
  token1Vault: PublicKey;
  observationKey: PublicKey;
  mintDecimals0: number;
  mintDecimals1: number;
  tickSpacing: number;
  liquidity: bigint;
  sqrtPriceX64: bigint;
  tickCurrent: number;
  status: number;
}

/** CLMM pool snapshot for local getAmountOut cache (key = tokenAddress, quote = SOL) */
export interface ClmmPoolStateSnapshot {
  sqrtPriceX64: bigint;
  liquidity: bigint;
  token0Mint: string;
  token1Mint: string;
  fetchedAt: number;
}
