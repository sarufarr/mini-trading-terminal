import {
  Connection,
  PublicKey,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js';
import BN from 'bn.js';

export interface BuildTransactionParams {
  connection: Connection;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: BN;
  signer: PublicKey;
  slippageBps?: number;
}

export interface BuildTransactionResult {
  transaction: VersionedTransaction;
  blockhashCtx: BlockhashWithExpiryBlockHeight;
}

export interface SwapProvider {
  readonly name: string;
  isAvailable(
    connection: Connection,
    tokenAddress: string,
    networkId: number
  ): Promise<boolean>;
  buildTransaction(
    params: BuildTransactionParams
  ): Promise<BuildTransactionResult>;
}
