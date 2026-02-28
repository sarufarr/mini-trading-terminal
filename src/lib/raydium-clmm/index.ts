import {
  Connection,
  PublicKey,
  SystemProgram,
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
import { sqrtPriceX64ToPrice, calcMinAmountOut } from './math';
import Decimal from 'decimal.js';
import { DEFAULT_SLIPPAGE_BPS } from '@/constants/trade';

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

  const priceAtomic = sqrtPriceX64ToPrice(poolState.sqrtPriceX64);

  if (priceAtomic.isZero())
    throw new Error('Pool price is zero, cannot calculate swap amount');
  const effectivePrice = zeroForOne
    ? priceAtomic
    : new Decimal(1).div(priceAtomic);
  const minAmountOut = calcMinAmountOut(amountIn, effectivePrice, slippageBps);

  const tickArrays = getSwapTickArrays(
    poolId,
    poolState.tickCurrent,
    poolState.tickSpacing,
    zeroForOne
  );

  const instructions = [];
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
