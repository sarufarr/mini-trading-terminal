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
