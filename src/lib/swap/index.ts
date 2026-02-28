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

const PROVIDER_NAMES = {
  'Raydium CLMM': true,
  Jupiter: true,
} as const;

export type PreferredSwapProvider = keyof typeof PROVIDER_NAMES;

/**
 * @param preferredProvider When set and available, use this provider first (for "better price" switch)
 */
export async function resolveSwapProvider(
  connection: Connection,
  tokenAddress: string,
  networkId: number,
  preferredProvider?: PreferredSwapProvider | null
): Promise<SwapProvider> {
  if (preferredProvider && PROVIDER_NAMES[preferredProvider]) {
    const provider = providers.find((p) => p.name === preferredProvider);
    if (
      provider &&
      (await provider.isAvailable(connection, tokenAddress, networkId))
    ) {
      return provider;
    }
  }
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
  /** Used when user chooses "switch" for better price */
  preferredSwapProvider?: PreferredSwapProvider | null;
}

export interface SwapPlan extends BuildTransactionResult {
  providerName: string;
}

export async function buildSwapTransaction(
  request: SwapRequest
): Promise<SwapPlan> {
  const {
    connection,
    tokenAddress,
    networkId,
    preferredSwapProvider,
    ...buildParams
  } = request;
  const provider = await resolveSwapProvider(
    connection,
    tokenAddress,
    networkId,
    preferredSwapProvider
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
