import { Connection, PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { findClmmPool, buildClmmSwapTransaction } from '@/lib/raydium-clmm';
import { SOLANA_NETWORK_ID } from '@/lib/raydium-clmm/constants';
import { DEFAULT_SLIPPAGE_BPS } from '@/constants/trade';
import type {
  SwapProvider,
  BuildTransactionParams,
  BuildTransactionResult,
} from '../types';

export class RaydiumClmmProvider implements SwapProvider {
  readonly name = 'Raydium CLMM';

  async isAvailable(
    connection: Connection,
    tokenAddress: string,
    networkId: number
  ): Promise<boolean> {
    if (networkId !== SOLANA_NETWORK_ID) return false;
    try {
      const poolId = await findClmmPool(
        connection,
        new PublicKey(tokenAddress)
      );
      return poolId !== null;
    } catch {
      return false;
    }
  }

  async buildTransaction(
    params: BuildTransactionParams
  ): Promise<BuildTransactionResult> {
    const {
      connection,
      inputMint,
      outputMint,
      amount,
      signer,
      slippageBps = DEFAULT_SLIPPAGE_BPS,
    } = params;
    const tokenMint = inputMint.equals(NATIVE_MINT) ? outputMint : inputMint;

    const poolId = await findClmmPool(connection, tokenMint);
    if (!poolId)
      throw new Error(`No Raydium CLMM pool found for ${tokenMint.toString()}`);

    return buildClmmSwapTransaction({
      connection,
      payer: signer,
      poolId,
      inputMint,
      amountIn: BigInt(amount.toString()),
      slippageBps,
    });
  }
}
