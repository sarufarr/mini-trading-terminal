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
  simulateTransactionWithAccounts,
} from '@/lib/solana';
import { getRandomJitoTipAccount, sendJitoBundle } from '@/lib/jito';
import {
  DEFAULT_JITO_TIP_LAMPORTS,
  DEFAULT_SLIPPAGE_BPS,
  FEE_RESERVE_LAMPORTS,
  PHISHING_EXTRA_SLIPPAGE_BPS,
  PHISHING_FEE_TOLERANCE_LAMPORTS,
  SLIPPAGE_ERROR_CODES,
  SLIPPAGE_ERROR_PATTERN,
  SOL_DISPLAY_DECIMALS,
} from '@/constants/trade';
import {
  checkSimulationPhishing,
  getPostBalanceFromSimulation,
  getPreBalanceState,
} from '@/lib/simulation-balance-check';
import { runWithRetry, isRetryableTradeError } from '@/lib/retry';
import { ETradeDirection } from '@/types/trade';
import { env } from '@/env';
import type { Env } from '@/env';
import { devLog } from '@/lib/dev-log';

export const SLIPPAGE_ERROR_MESSAGE =
  'Slippage tolerance exceeded: received less than minimum. Try increasing slippage and retry.';

/** Thrown when phishing check detects unexpected fund outflow; UI shows warning and blocks send */
export class PhishingDetectedError extends Error {
  constructor(
    message: string,
    public readonly reason?: string
  ) {
    super(message);
    this.name = 'PhishingDetectedError';
    Object.setPrototypeOf(this, PhishingDetectedError.prototype);
  }
}

export interface TradeConfig {
  isDryRun: boolean;
  dryRunResult: 'success' | 'fail';
  useJito: boolean;
  jitoTipLamports: number;
}

export function getTradeConfig(env: Env): TradeConfig {
  const useJito = Boolean(env.VITE_JITO_BLOCK_ENGINE_URL);
  const jitoTipLamports =
    useJito && env.VITE_JITO_TIP_LAMPORTS != null
      ? env.VITE_JITO_TIP_LAMPORTS
      : DEFAULT_JITO_TIP_LAMPORTS;
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

/** Balance check before build. Throws with message for UI. */
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
      const have =
        solBalance?.div(LAMPORTS_PER_SOL).toFixed(SOL_DISPLAY_DECIMALS) ?? '0';
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
      SLIPPAGE_ERROR_CODES.includes(
        code as (typeof SLIPPAGE_ERROR_CODES)[number]
      )
    ) {
      return true;
    }
  }
  if (
    SLIPPAGE_ERROR_PATTERN.test(reason) ||
    SLIPPAGE_ERROR_PATTERN.test(detailedMessage)
  ) {
    return true;
  }
  if (Array.isArray(logs) && logs.some((l) => SLIPPAGE_ERROR_PATTERN.test(l))) {
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
    detailedMessage,
    logs
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
  /** Passed when user chooses "switch to better price" */
  preferredSwapProvider?: 'Raydium CLMM' | 'Jupiter' | null;
  /** Pre-built unsigned tx; when set, skip build and go straight to sign+send (confirm flow) */
  preBuilt?: {
    transaction: VersionedTransaction;
    blockhashCtx: BlockhashWithExpiryBlockHeight;
  };
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

/** Result of building a trade (unsigned), for confirm modal before sign+send */
export interface PrepareTradeResult {
  transaction: VersionedTransaction;
  blockhashCtx: BlockhashWithExpiryBlockHeight;
}

export interface ResolvedTradeAmount {
  amountToUse: Decimal;
  inputMint: PublicKey;
  outputMint: PublicKey;
}

/**
 * Resolve trade amount (with balance fetch + validation for non–dry-run), and mints.
 * Shared by prepareTrade and executeTrade so balance/amount logic lives in one place.
 */
export async function resolveTradeAmountAndMints(options: {
  tokenAddress: string;
  networkId: number;
  params: TradeExecuteParams;
  config: TradeConfig;
  keypair: Keypair;
  connection: Connection;
}): Promise<ResolvedTradeAmount> {
  const {
    tokenAddress,
    networkId: _networkId,
    params,
    config,
    keypair: kp,
    connection: conn,
  } = options;
  const { isDryRun, useJito, jitoTipLamports } = config;
  const { direction } = params;

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

  return { amountToUse, inputMint, outputMint };
}

/**
 * Build transaction and validate balance only; no signing. For confirm modal with fund-flow summary.
 * Returns unsigned transaction + blockhashCtx; pass to executeTrade as preBuilt after user confirms.
 */
export async function prepareTrade(
  options: Omit<
    ExecuteTradeOptions,
    'preBuilt' | 'onBeforeSend' | 'onAfterSend' | 'onSuccess'
  >
): Promise<PrepareTradeResult> {
  const {
    tokenAddress,
    networkId,
    params,
    preferredSwapProvider,
    keypair: kp = defaultKeypair,
    connection: conn = defaultConnection,
    config: configOverride,
  } = options;

  const config = configOverride ?? getTradeConfig(env);
  const { slippageBps } = params;

  const { amountToUse, inputMint, outputMint } =
    await resolveTradeAmountAndMints({
      tokenAddress,
      networkId,
      params,
      config,
      keypair: kp,
      connection: conn,
    });

  const { transaction, blockhashCtx } = await buildSwapTransaction({
    connection: conn,
    tokenAddress,
    networkId,
    inputMint,
    outputMint,
    amount: bn(amountToUse),
    signer: kp.publicKey,
    slippageBps: slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    preferredSwapProvider: preferredSwapProvider ?? undefined,
  });

  return { transaction, blockhashCtx };
}

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
    preferredSwapProvider,
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

  const { amountToUse, inputMint, outputMint } =
    await resolveTradeAmountAndMints({
      tokenAddress,
      networkId,
      params,
      config,
      keypair: kp,
      connection: conn,
    });

  let transaction: VersionedTransaction;
  let blockhashCtx: BlockhashWithExpiryBlockHeight;

  if (options.preBuilt) {
    transaction = options.preBuilt.transaction;
    blockhashCtx = options.preBuilt.blockhashCtx;
  } else {
    const built = await buildSwapTransaction({
      connection: conn,
      tokenAddress,
      networkId,
      inputMint,
      outputMint,
      amount: bn(amountToUse),
      signer: kp.publicKey,
      slippageBps: slippageBps ?? DEFAULT_SLIPPAGE_BPS,
      preferredSwapProvider: preferredSwapProvider ?? undefined,
    });
    transaction = built.transaction;
    blockhashCtx = built.blockhashCtx;
  }

  const signed = signTransaction(kp, transaction);

  const tokenMint = new PublicKey(tokenAddress);
  const preBalance = await getPreBalanceState(conn, kp.publicKey, tokenMint);
  const accountAddresses = [
    kp.publicKey.toBase58(),
    preBalance.tokenATA.toBase58(),
  ];

  const simulation = await simulateTransactionWithAccounts(
    conn,
    signed,
    accountAddresses
  );
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

  const postBalance = getPostBalanceFromSimulation(simulation, [
    accountAddresses[0],
    accountAddresses[1],
  ] as [string, string]);
  if (postBalance) {
    const amountInAtomic = BigInt(amountToUse.toFixed(0));
    const phishingResult = checkSimulationPhishing({
      direction,
      amountIn: amountInAtomic,
      slippageBps: slippageBps ?? DEFAULT_SLIPPAGE_BPS,
      pre: preBalance,
      post: postBalance,
      feeToleranceLamports: PHISHING_FEE_TOLERANCE_LAMPORTS,
      extraSlippageBps: PHISHING_EXTRA_SLIPPAGE_BPS,
    });
    if (!phishingResult.safe) {
      throw new PhishingDetectedError(
        'Unexpected fund outflow detected; possible malicious contract.',
        phishingResult.reason
      );
    }
  }

  if (isDryRun) {
    const fakeTxid = 'dry-run-simulated-' + Date.now();
    if (dryRunResult === 'fail') {
      devLog.warn(
        '[trade] DRY RUN: simulating on-chain failure (VITE_DRY_RUN_RESULT=fail).'
      );
      throw new Error(
        'Dry run: simulated on-chain failure. Set VITE_DRY_RUN_RESULT=success or unset to simulate success.'
      );
    }
    devLog.warn('[trade] DRY RUN: simulation passed, tx not sent.', fakeTxid);
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
  } catch (firstErr: unknown) {
    const message =
      firstErr instanceof Error ? firstErr.message : String(firstErr);
    if (SLIPPAGE_ERROR_PATTERN.test(message)) {
      throw new Error(SLIPPAGE_ERROR_MESSAGE);
    }
    if (firstErr instanceof SendTransactionError) {
      const logs = firstErr.logs ?? (await firstErr.getLogs(conn));
      if (
        Array.isArray(logs) &&
        logs.some((l) => SLIPPAGE_ERROR_PATTERN.test(l))
      ) {
        throw new Error(SLIPPAGE_ERROR_MESSAGE);
      }
      throw new Error(
        firstErr.transactionError.message +
          (logs?.length ? `\nLogs: ${logs.slice(-5).join(' ')}` : '')
      );
    }
    if (!isRetryableTradeError(firstErr)) throw firstErr;
    const result = await runWithRetry(
      async () => {
        const built = await buildSwapTransaction({
          connection: conn,
          tokenAddress,
          networkId,
          inputMint,
          outputMint,
          amount: bn(amountToUse),
          signer: kp.publicKey,
          slippageBps: slippageBps ?? DEFAULT_SLIPPAGE_BPS,
          preferredSwapProvider: preferredSwapProvider ?? undefined,
        });
        const signedTx = signTransaction(kp, built.transaction);
        const txid = await sendTransaction(conn, signedTx);
        return confirmAndNotify(conn, txid, built.blockhashCtx, onAfterSend);
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        multiplier: 2,
        maxDelayMs: 15_000,
        onRetry: (attempt, err) => {
          devLog.warn(
            `[trade] Send/confirm failed, retry ${attempt}/3:`,
            err instanceof Error ? err.message : err
          );
        },
      }
    );
    onSuccess?.();
    return result;
  }
}
