import { Connection, VersionedTransaction } from '@solana/web3.js';
import JupiterClient from '@/lib/jupiter';
import { SOLANA_NETWORK_ID } from '@/lib/raydium-clmm/constants';
import type {
  SwapProvider,
  BuildTransactionParams,
  BuildTransactionResult,
} from '../types';

export class JupiterProvider implements SwapProvider {
  readonly name = 'Jupiter';

  async isAvailable(
    _connection: Connection,
    _tokenAddress: string,
    networkId: number
  ): Promise<boolean> {
    return networkId === SOLANA_NETWORK_ID;
  }

  async buildTransaction(
    params: BuildTransactionParams
  ): Promise<BuildTransactionResult> {
    const { connection, inputMint, outputMint, amount, signer } = params;

    const [data, blockhashCtx] = await Promise.all([
      JupiterClient.getOrder({ inputMint, outputMint, amount, signer }),
      connection.getLatestBlockhash('confirmed'),
    ]);

    if (data.error) {
      const msg = data.error.toLowerCase().includes('insufficient funds')
        ? `Insufficient funds. Try a smaller amount or check your SOL and token balance.`
        : `Jupiter error: ${data.error}`;
      throw new Error(msg);
    }
    if (!data.transaction) throw new Error('Jupiter returned no transaction');

    const transaction = VersionedTransaction.deserialize(
      Buffer.from(data.transaction, 'base64')
    );

    return { transaction, blockhashCtx };
  }
}
