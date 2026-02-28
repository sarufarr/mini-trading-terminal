import { PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import BN from 'bn.js';
import { connection, keypair } from '@/lib/solana';
import { resolveSwapProvider, type PreferredSwapProvider } from '@/lib/swap';
import JupiterClient from '@/lib/jupiter';
import {
  findClmmPool,
  getClmmQuote,
  getLocalClmmQuote,
  getLocalClmmQuoteAsync,
  setClmmPoolCache,
} from '@/lib/raydium-clmm';
import { ETradeDirection } from '@/types/trade';

export interface SwapQuoteParams {
  tokenAddress: string;
  networkId: number;
  direction: ETradeDirection;
  amountInAtomic: string;
  slippageBps?: number;
}

export interface SwapQuoteResult {
  outAmountAtomic: string;
  priceImpactPct: string | null;
  simulatedSlippageBps: number | null;
}

export type SwapQuoteResultWithProvider = SwapQuoteResult & {
  providerName: string;
};

/**
 * Synchronous local quote for CLMM (Raydium). No RPC. Runs on main thread.
 * Prefer getLocalSwapQuoteAsync (worker) to keep main thread free for 60fps.
 */
export function getLocalSwapQuote(
  tokenAddress: string,
  amountInAtomic: string,
  direction: ETradeDirection
): SwapQuoteResult | null {
  const dir = direction === ETradeDirection.BUY ? 'buy' : 'sell';
  const local = getLocalClmmQuote(tokenAddress, amountInAtomic, dir);
  if (!local) return null;
  return {
    outAmountAtomic: local.outAmountAtomic,
    priceImpactPct: null,
    simulatedSlippageBps: null,
  };
}

/**
 * Async local quote in Web Worker; keeps main thread free for 60fps.
 */
export async function getLocalSwapQuoteAsync(
  tokenAddress: string,
  amountInAtomic: string,
  direction: ETradeDirection
): Promise<SwapQuoteResult | null> {
  const dir = direction === ETradeDirection.BUY ? 'buy' : 'sell';
  const local = await getLocalClmmQuoteAsync(tokenAddress, amountInAtomic, dir);
  if (!local) return null;
  return {
    outAmountAtomic: local.outAmountAtomic,
    priceImpactPct: null,
    simulatedSlippageBps: null,
  };
}

export async function getSwapQuote(
  params: SwapQuoteParams,
  preferredProvider?: PreferredSwapProvider | null
): Promise<SwapQuoteResultWithProvider> {
  const {
    tokenAddress,
    networkId,
    direction,
    amountInAtomic,
    slippageBps = 100,
  } = params;

  const amountBn = new BN(amountInAtomic, 10);
  if (amountBn.lte(new BN(0))) {
    return {
      outAmountAtomic: '0',
      priceImpactPct: null,
      simulatedSlippageBps: null,
      providerName: 'Raydium CLMM',
    };
  }

  const inputMint =
    direction === ETradeDirection.BUY
      ? NATIVE_MINT
      : new PublicKey(tokenAddress);
  const outputMint =
    direction === ETradeDirection.BUY
      ? new PublicKey(tokenAddress)
      : NATIVE_MINT;

  const provider = await resolveSwapProvider(
    connection,
    tokenAddress,
    networkId,
    preferredProvider
  );

  if (provider.name === 'Jupiter') {
    const data = await JupiterClient.getOrder({
      inputMint,
      outputMint,
      amount: amountBn,
      signer: keypair.publicKey,
    });
    if (data.error) {
      throw new Error(data.error);
    }
    const simulatedBps =
      data.dynamicSlippageReport?.simulatedIncurredSlippageBps ?? null;
    return {
      outAmountAtomic: data.outAmount,
      priceImpactPct: data.priceImpactPct ?? null,
      simulatedSlippageBps: simulatedBps != null ? simulatedBps : null,
      providerName: 'Jupiter',
    };
  }

  const poolId = await findClmmPool(
    connection,
    new PublicKey(tokenAddress),
    NATIVE_MINT
  );
  if (!poolId) {
    throw new Error('No Raydium CLMM pool found');
  }
  const { minAmountOut, poolStateSnapshot } = await getClmmQuote({
    connection,
    poolId,
    inputMint,
    amountIn: BigInt(amountInAtomic),
    slippageBps,
  });
  setClmmPoolCache(tokenAddress, poolStateSnapshot);
  return {
    outAmountAtomic: minAmountOut.toString(),
    priceImpactPct: null,
    simulatedSlippageBps: null,
    providerName: 'Raydium CLMM',
  };
}

/**
 * Get quote from given provider for silent comparison. Returns null if provider unavailable.
 */
export async function getSwapQuoteFromProvider(
  providerName: PreferredSwapProvider,
  params: SwapQuoteParams
): Promise<SwapQuoteResult | null> {
  try {
    const result = await getSwapQuote(params, providerName);
    return {
      outAmountAtomic: result.outAmountAtomic,
      priceImpactPct: result.priceImpactPct,
      simulatedSlippageBps: result.simulatedSlippageBps,
    };
  } catch {
    return null;
  }
}
