import type { Keypair } from '@solana/web3.js';
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SendTransactionError,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  type BlockhashWithExpiryBlockHeight,
  type Connection,
  type SimulatedTransactionResponse,
} from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import Decimal from 'decimal.js';
import bs58 from 'bs58';
import { bn } from '@/lib/utils';
import { buildSwapTransaction } from '@/lib/swap';
import {
  confirmTransaction,
  connection as defaultConnection,
  getSolanaBalance,
  getTokenBalance,
  keypair as defaultKeypair,
  sendTransaction,
  signTransaction,
  simulateTransaction,
} from '@/lib/solana';
import { getRandomJitoTipAccount, sendJitoBundle } from '@/lib/jito';
import {
  DEFAULT_JITO_TIP_LAMPORTS,
  DEFAULT_SLIPPAGE_BPS,
  FEE_RESERVE_LAMPORTS,
} from '@/constants/trade';
import { ETradeDirection } from '@/types/trade';
import { env } from '@/env';
import type { Env } from '@/env';

const JUPITER_SLIPPAGE_EXCEEDED_ERROR_CODE = 6001;
/** Raydium CLMM swap min amount out / slippage exceeded */
const RAYDIUM_SLIPPAGE_EXCEEDED_ERROR_CODE = 6010;
export const SLIPPAGE_ERROR_MESSAGE =
  'Slippage tolerance exceeded: received less than minimum. Try increasing slippage and retry.';

export interface TradeConfig {
  isDryRun: boolean;
  dryRunResult: 'success' | 'fail';
  useJito: boolean;
  jitoTipLamports: number;
}

export function getTradeConfig(env: Env): TradeConfig {
  const useJito = Boolean(env.VITE_JITO_BLOCK_ENGINE_URL);
  let jitoTipLamports = DEFAULT_JITO_TIP_LAMPORTS;
  if (
    useJito &&
    env.VITE_JITO_TIP_LAMPORTS != null &&
    env.VITE_JITO_TIP_LAMPORTS !== ''
  ) {
    const n = Number(env.VITE_JITO_TIP_LAMPORTS);
    if (Number.isFinite(n) && n > 0) jitoTipLamports = n;
  }
  return {
    isDryRun: env.VITE_DRY_RUN ?? false,
    dryRunResult: env.VITE_DRY_RUN_RESULT ?? 'success',
    useJito,
    jitoTipLamports,
  };
}

export interface ValidateBalanceInput {
  direction: ETradeDirection;
  atomicAmount: Decimal;
  solBalance: Decimal | null;
  tokenBalance: Decimal | null;
  tokenAddress: string;
  valueDisplay: number;
  jitoTipLamports: number;
  useJito: boolean;
}

export function validateBalanceForTrade(input: ValidateBalanceInput): void {
  const {
    direction,
    atomicAmount,
    solBalance,
    tokenBalance,
    valueDisplay,
    jitoTipLamports,
    useJito,
  } = input;

  if (direction === ETradeDirection.BUY) {
    const required = atomicAmount
      .plus(FEE_RESERVE_LAMPORTS)
      .plus(jitoTipLamports);
    if (solBalance == null || solBalance.lt(required)) {
      const have = solBalance?.div(LAMPORTS_PER_SOL).toFixed(4) ?? '0';
      throw new Error(
        `Insufficient SOL balance: have ${have} SOL, need ${valueDisplay} SOL + fee reserve${useJito ? ' + Jito tip' : ''}`
      );
    }
    return;
  }

  if (tokenBalance === null) {
    throw new Error('Failed to fetch token balance');
  }
  if (tokenBalance.lt(atomicAmount)) {
    throw new Error(
      `Insufficient token balance: have ${tokenBalance.toString()} atoms, need ${atomicAmount.toString()}`
    );
  }
}

export interface ParsedSimulationError {
  reason: string;
  detailedMessage: string;
  isSlippageError: boolean;
}

function isSlippageToleranceExceeded(
  err: unknown,
  reason: string,
  detailedMessage: string,
  logs?: string[]
): boolean {
  if (
    Array.isArray(err) &&
    err[0] === 'InstructionError' &&
    err[2] &&
    typeof err[2] === 'object' &&
    'Custom' in err[2]
  ) {
    const code = (err[2] as { Custom: number }).Custom;
    if (
      code === JUPITER_SLIPPAGE_EXCEEDED_ERROR_CODE ||
      code === RAYDIUM_SLIPPAGE_EXCEEDED_ERROR_CODE
    ) {
      return true;
    }
  }
  const slippagePattern = /0x1771|6001|6010|SlippageToleranceExceeded/i;
  if (slippagePattern.test(reason) || slippagePattern.test(detailedMessage)) {
    return true;
  }
  if (Array.isArray(logs) && logs.some((l) => slippagePattern.test(l))) {
    return true;
  }
  return false;
}

export function parseSimulationError(
  simulation: SimulatedTransactionResponse & {
    err: NonNullable<SimulatedTransactionResponse['err']>;
  }
): ParsedSimulationError {
  const logs = simulation.logs ?? [];
  let reason = 'Transaction simulation failed';
  const err = simulation.err as unknown;

  if (typeof err === 'string') {
    reason = err;
  } else if (
    Array.isArray(err) &&
    err.length >= 2 &&
    err[0] === 'InstructionError'
  ) {
    const [, index, details] = err;
    reason = `Instruction ${index} failed: ${JSON.stringify(details)}`;
  } else {
    reason = JSON.stringify(err);
  }

  const slippageLog =
    logs.find((l: string) => /slippage/i.test(l)) ??
    logs.find((l: string) => /error/i.test(l) || /fail/i.test(l));

  const detailedMessage = slippageLog
    ? `${reason}. Details: ${slippageLog}`
    : logs.length
      ? `${reason}. See logs: ${logs.slice(-3).join(' | ')}`
      : reason;

  const isSlippageError = isSlippageToleranceExceeded(
    simulation.err,
    reason,
    detailedMessage
  );

  return { reason, detailedMessage, isSlippageError };
}

export type TradeExecuteParams =
  | {
      direction: ETradeDirection.BUY;
      value: number;
      slippageBps?: number;
    }
  | {
      direction: ETradeDirection.SELL;
      value: number;
      tokenAtomicBalance: Decimal;
      slippageBps?: number;
    };

export interface ExecuteTradeOptions {
  tokenAddress: string;
  networkId: number;
  params: TradeExecuteParams;
  onBeforeSend?: () => void;
  onAfterSend?: (txid: string) => void;
  onSuccess?: () => void;
  keypair?: Keypair;
  connection?: Connection;
  config?: TradeConfig;
}

export const calculateTradeAtomicAmount = (
  params: TradeExecuteParams
): Decimal => {
  if (params.direction === ETradeDirection.BUY) {
    return new Decimal(params.value).mul(LAMPORTS_PER_SOL);
  }

  return params.tokenAtomicBalance.mul(params.value).div(100);
};

async function confirmAndNotify(
  connection: Connection,
  txid: string,
  blockhashCtx: BlockhashWithExpiryBlockHeight,
  onAfterSend?: (txid: string) => void
): Promise<{ txid: string }> {
  onAfterSend?.(txid);
  const result = await confirmTransaction(connection, txid, blockhashCtx);
  if (result.value.err) throw new Error('Transaction failed on-chain');
  return { txid };
}

export async function executeTrade(
  options: ExecuteTradeOptions
): Promise<{ txid: string }> {
  const {
    tokenAddress,
    networkId,
    params,
    onBeforeSend,
    onAfterSend,
    onSuccess,
    keypair: kp = defaultKeypair,
    connection: conn = defaultConnection,
    config: configOverride,
  } = options;

  const config = configOverride ?? getTradeConfig(env);
  const { isDryRun, dryRunResult, useJito, jitoTipLamports } = config;
  const { direction, slippageBps } = params;

  let amountToUse = calculateTradeAtomicAmount(params);

  if (!isDryRun) {
    if (direction === ETradeDirection.BUY) {
      const solBalance = await getSolanaBalance(conn, kp.publicKey.toBase58());
      validateBalanceForTrade({
        direction: ETradeDirection.BUY,
        atomicAmount: amountToUse,
        solBalance,
        tokenBalance: null,
        tokenAddress,
        valueDisplay: params.value,
        jitoTipLamports,
        useJito,
      });
    } else {
      const tokenBalance = await getTokenBalance(
        conn,
        kp.publicKey.toBase58(),
        tokenAddress
      );
      if (tokenBalance === null) {
        throw new Error('Failed to fetch token balance');
      }
      amountToUse = Decimal.min(amountToUse, tokenBalance);
      if (amountToUse.lte(0)) {
        throw new Error(
          'Insufficient token balance: no balance to sell. Refresh and try again.'
        );
      }
      validateBalanceForTrade({
        direction: ETradeDirection.SELL,
        atomicAmount: amountToUse,
        solBalance: null,
        tokenBalance,
        tokenAddress,
        valueDisplay: params.value,
        jitoTipLamports,
        useJito,
      });
    }
  }

  const inputMint =
    direction === ETradeDirection.BUY
      ? NATIVE_MINT
      : new PublicKey(tokenAddress);
  const outputMint =
    direction === ETradeDirection.BUY
      ? new PublicKey(tokenAddress)
      : NATIVE_MINT;

  const { transaction, blockhashCtx } = await buildSwapTransaction({
    connection: conn,
    tokenAddress,
    networkId,
    inputMint,
    outputMint,
    amount: bn(amountToUse),
    signer: kp.publicKey,
    slippageBps: slippageBps ?? DEFAULT_SLIPPAGE_BPS,
  });

  const signed = signTransaction(kp, transaction);

  const simulation = await simulateTransaction(conn, signed);
  if (simulation.err) {
    const parsed = parseSimulationError({
      ...simulation,
      err: simulation.err,
    });
    if (parsed.isSlippageError) {
      throw new Error(SLIPPAGE_ERROR_MESSAGE);
    }
    throw new Error(parsed.detailedMessage);
  }

  if (isDryRun) {
    const fakeTxid = 'dry-run-simulated-' + Date.now();
    if (dryRunResult === 'fail') {
      console.warn(
        '[trade] DRY RUN: simulating on-chain failure (VITE_DRY_RUN_RESULT=fail).'
      );
      throw new Error(
        'Dry run: simulated on-chain failure. Set VITE_DRY_RUN_RESULT=success or unset to simulate success.'
      );
    }
    console.warn('[trade] DRY RUN: simulation passed, tx not sent.', fakeTxid);
    onAfterSend?.(fakeTxid);
    onSuccess?.();
    return { txid: fakeTxid };
  }

  if (useJito) {
    const tipAccount = await getRandomJitoTipAccount();
    if (!tipAccount) {
      throw new Error('No Jito tip account available');
    }

    const tipMessage = new TransactionMessage({
      payerKey: kp.publicKey,
      recentBlockhash: blockhashCtx.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: kp.publicKey,
          toPubkey: new PublicKey(tipAccount),
          lamports: jitoTipLamports,
        }),
      ],
    }).compileToV0Message();

    const tipTx = new VersionedTransaction(tipMessage);
    tipTx.sign([kp]);

    onBeforeSend?.();
    await sendJitoBundle([signed, tipTx]);

    const txid = bs58.encode(signed.signatures[0]);
    const result = await confirmAndNotify(
      conn,
      txid,
      blockhashCtx,
      onAfterSend
    );
    onSuccess?.();
    return result;
  }

  onBeforeSend?.();
  try {
    const txid = await sendTransaction(conn, signed);
    const result = await confirmAndNotify(
      conn,
      txid,
      blockhashCtx,
      onAfterSend
    );
    onSuccess?.();
    return result;
  } catch (sendErr: unknown) {
    const slippagePattern = /0x1771|6001|6010|SlippageToleranceExceeded/i;
    const message =
      sendErr instanceof Error ? sendErr.message : String(sendErr);
    if (slippagePattern.test(message)) {
      throw new Error(SLIPPAGE_ERROR_MESSAGE);
    }
    if (sendErr instanceof SendTransactionError) {
      const logs = sendErr.logs ?? (await sendErr.getLogs(conn));
      if (Array.isArray(logs) && logs.some((l) => slippagePattern.test(l))) {
        throw new Error(SLIPPAGE_ERROR_MESSAGE);
      }
      throw new Error(
        sendErr.transactionError.message +
          (logs?.length ? `\nLogs: ${logs.slice(-5).join(' ')}` : '')
      );
    }
    throw sendErr;
  }
}
