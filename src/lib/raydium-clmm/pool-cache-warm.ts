/**
 * Warm CLMM pool cache: fetch sqrt_price_x64 and liquidity before user types amount
 * so getLocalClmmQuote returns instantly without RPC simulateTransaction.
 */
import { Connection, PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { findClmmPool } from './pool';
import { fetchPoolState } from './pool';
import { setClmmPoolCache } from './clmm-pool-cache';

/**
 * Prefill CLMM pool state cache for token (SOL pair only). After success, getLocalClmmQuote
 * returns getAmountOut(sqrtPriceX64, liquidity) synchronously with no network request.
 * @returns true if cached, false if no pool or failure (fallback to Jupiter/async quote)
 */
export async function warmClmmPoolCache(
  connection: Connection,
  tokenAddress: string
): Promise<boolean> {
  try {
    const poolId = await findClmmPool(
      connection,
      new PublicKey(tokenAddress),
      NATIVE_MINT
    );
    if (!poolId) return false;
    const state = await fetchPoolState(connection, poolId);
    setClmmPoolCache(tokenAddress, {
      sqrtPriceX64: state.sqrtPriceX64,
      liquidity: state.liquidity,
      token0Mint: state.token0Mint.toBase58(),
      token1Mint: state.token1Mint.toBase58(),
    });
    return true;
  } catch {
    return false;
  }
}
