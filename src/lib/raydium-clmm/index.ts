import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { fetchPoolState } from './pool';
import { getSwapTickArrays } from './tick-array';
import {
  buildSwapBaseInputInstruction,
  getTokenProgramId,
} from './instruction';
import {
  calcQuoteInWorker,
  getEndSqrtPriceX64AfterSwapInWorker,
  sqrtPriceX64ToTickInWorker,
} from './worker-client';
import type { ClmmPoolStateSnapshot } from './clmm-pool-cache';
import { DEFAULT_SLIPPAGE_BPS } from '@/constants/trade';
import {
  getDynamicPriorityFee,
  makeComputeBudgetInstructions,
  computeUnitLimitForTickArrays,
} from '@/lib/priority-fee';

export interface ClmmSwapParams {
  connection: Connection;
  payer: PublicKey;
  poolId: PublicKey;
  inputMint: PublicKey;
  amountIn: bigint;
  slippageBps?: number;
}

export interface BuildClmmSwapTransactionResult {
  transaction: VersionedTransaction;
  blockhashCtx: BlockhashWithExpiryBlockHeight;
}

export { findClmmPool } from './pool';

export interface ClmmQuoteParams {
  connection: Connection;
  poolId: PublicKey;
  inputMint: PublicKey;
  amountIn: bigint;
  slippageBps?: number;
}

export async function getClmmQuote(params: ClmmQuoteParams): Promise<{
  minAmountOut: bigint;
  poolStateSnapshot: Omit<ClmmPoolStateSnapshot, 'fetchedAt'>;
}> {
  const {
    connection,
    poolId,
    inputMint,
    amountIn,
    slippageBps = DEFAULT_SLIPPAGE_BPS,
  } = params;
  const poolState = await fetchPoolState(connection, poolId);
  const zeroForOne = inputMint.equals(poolState.token0Mint);
  if (poolState.sqrtPriceX64 === 0n) {
    throw new Error('Pool price is zero, cannot calculate swap amount');
  }
  const minAmountOut = await calcQuoteInWorker(
    poolState.sqrtPriceX64,
    amountIn,
    slippageBps,
    zeroForOne
  );
  const poolStateSnapshot: Omit<ClmmPoolStateSnapshot, 'fetchedAt'> = {
    sqrtPriceX64: poolState.sqrtPriceX64,
    liquidity: poolState.liquidity,
    token0Mint: poolState.token0Mint.toBase58(),
    token1Mint: poolState.token1Mint.toBase58(),
  };
  return { minAmountOut, poolStateSnapshot };
}

export type { ClmmPoolStateSnapshot } from './clmm-pool-cache';
export {
  getLocalClmmQuote,
  getLocalClmmQuoteAsync,
  setClmmPoolCache,
} from './clmm-pool-cache';
export { warmClmmPoolCache } from './pool-cache-warm';

export async function buildClmmSwapTransaction(
  params: ClmmSwapParams
): Promise<BuildClmmSwapTransactionResult> {
  const {
    connection,
    payer,
    poolId,
    inputMint,
    amountIn,
    slippageBps = DEFAULT_SLIPPAGE_BPS,
  } = params;

  const poolState = await fetchPoolState(connection, poolId);
  const zeroForOne = inputMint.equals(poolState.token0Mint);

  if (poolState.sqrtPriceX64 === 0n) {
    throw new Error('Pool price is zero, cannot calculate swap amount');
  }

  const endSqrtPrice = await getEndSqrtPriceX64AfterSwapInWorker(
    poolState.sqrtPriceX64,
    poolState.liquidity,
    amountIn,
    zeroForOne
  );
  const endTick =
    endSqrtPrice != null
      ? await sqrtPriceX64ToTickInWorker(endSqrtPrice)
      : null;
  const tickArrays = getSwapTickArrays(
    poolId,
    poolState.tickCurrent,
    poolState.tickSpacing,
    zeroForOne,
    endTick
  );

  const minAmountOut = await calcQuoteInWorker(
    poolState.sqrtPriceX64,
    amountIn,
    slippageBps,
    zeroForOne
  );

  const cuLimit = computeUnitLimitForTickArrays(tickArrays.length);
  const { microLamports, computeUnitLimit } = await getDynamicPriorityFee(
    connection,
    { computeUnitLimit: cuLimit }
  );
  const computeBudgetIxs = makeComputeBudgetInstructions({
    microLamports,
    computeUnitLimit,
  });

  const instructions: TransactionInstruction[] = [];
  instructions.push(...computeBudgetIxs);

  const inputIsSOL = inputMint.equals(NATIVE_MINT);
  const outputMint = zeroForOne ? poolState.token1Mint : poolState.token0Mint;
  const outputIsSOL = outputMint.equals(NATIVE_MINT);
  const wsolATA = getAssociatedTokenAddressSync(NATIVE_MINT, payer);

  const outputTokenProgram = await getTokenProgramId(connection, outputMint);
  const outputATA = getAssociatedTokenAddressSync(
    outputMint,
    payer,
    false,
    outputTokenProgram
  );

  if (inputIsSOL) {
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        wsolATA,
        payer,
        NATIVE_MINT
      ),
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: wsolATA,
        lamports: Number(amountIn),
      }),
      createSyncNativeInstruction(wsolATA)
    );
  }

  instructions.push(
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      outputATA,
      payer,
      outputMint,
      outputTokenProgram
    )
  );

  instructions.push(
    await buildSwapBaseInputInstruction({
      connection,
      payer,
      poolId,
      poolState,
      tickArrays,
      amountIn,
      minAmountOut,
      zeroForOne,
    })
  );

  if (inputIsSOL || outputIsSOL) {
    instructions.push(createCloseAccountInstruction(wsolATA, payer, payer));
  }

  const blockhashCtx = await connection.getLatestBlockhash('confirmed');

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhashCtx.blockhash,
    instructions,
  }).compileToV0Message();

  return {
    transaction: new VersionedTransaction(message),
    blockhashCtx,
  };
}
