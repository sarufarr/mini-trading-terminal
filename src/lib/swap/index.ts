import type {
  SwapProvider,
  BuildTransactionResult,
  BuildTransactionParams,
} from './types';
import { JupiterProvider } from './providers/jupiter';
import { RaydiumClmmProvider } from './providers/raydium-clmm';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

const providers: SwapProvider[] = [
  new RaydiumClmmProvider(),
  new JupiterProvider(),
];

export async function resolveSwapProvider(
  connection: Connection,
  tokenAddress: string,
  networkId: number
): Promise<SwapProvider> {
  for (const provider of providers) {
    if (await provider.isAvailable(connection, tokenAddress, networkId)) {
      return provider;
    }
  }

  throw new Error(`No swap provider available for token: ${tokenAddress}`);
}

export interface SwapRequest {
  connection: Connection;
  tokenAddress: string;
  networkId: number;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amount: BN;
  signer: PublicKey;
  slippageBps?: number;
}

export interface SwapPlan extends BuildTransactionResult {
  providerName: string;
}

export async function buildSwapTransaction(
  request: SwapRequest
): Promise<SwapPlan> {
  const { connection, tokenAddress, networkId, ...buildParams } = request;
  const provider = await resolveSwapProvider(
    connection,
    tokenAddress,
    networkId
  );
  const result = await provider.buildTransaction({
    connection,
    ...buildParams,
  } as BuildTransactionParams);

  return {
    ...result,
    providerName: provider.name,
  };
}

export type { SwapProvider, BuildTransactionResult, BuildTransactionParams };
