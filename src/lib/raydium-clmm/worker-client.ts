/**
 * Client for raydium-clmm.worker.ts. Delegates heavy parsing/math to keep main thread at 60fps.
 */
import { PublicKey } from '@solana/web3.js';

type WorkerMsg =
  | { id: string; type: 'PARSE_POOL'; data: ArrayBuffer }
  | {
      id: string;
      type: 'PARSE_POOLS_FILTER';
      accounts: { pubkey: string; data: ArrayBuffer }[];
      tokenMint: Uint8Array;
      quoteMint: Uint8Array;
    }
  | {
      id: string;
      type: 'CALC_QUOTE';
      sqrtPriceX64: string;
      amountIn: string;
      slippageBps: number;
      zeroForOne: boolean;
    }
  | {
      id: string;
      type: 'GET_AMOUNT_OUT';
      sqrtPriceX64: string;
      liquidity: string;
      amountIn: string;
      zeroForOne: boolean;
    }
  | {
      id: string;
      type: 'GET_END_SQRT_PRICE';
      sqrtPriceX64: string;
      liquidity: string;
      amountIn: string;
      zeroForOne: boolean;
    }
  | {
      id: string;
      type: 'SQRT_PRICE_TO_TICK';
      sqrtPriceX64: string;
    };

type WorkerResponse =
  | { id: string; result: unknown }
  | { id: string; error: string };

let workerInstance: Worker | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('@/workers/raydium-clmm.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return workerInstance;
}

function postTask<T>(msg: WorkerMsg): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const handler = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== msg.id) return;
      worker.removeEventListener('message', handler);
      if ('error' in e.data) reject(new Error(e.data.error));
      else resolve(e.data.result as T);
    };
    worker.addEventListener('message', handler);
    worker.postMessage(msg);
  });
}

let taskId = 0;
function nextId(): string {
  return `clmm-${++taskId}-${Date.now()}`;
}

export interface ParsedPoolData {
  sqrtPriceX64: bigint;
  token0Mint: Uint8Array;
  token1Mint: Uint8Array;
  liquidity: bigint;
  tickCurrent: number;
  tickSpacing: number;
  status: number;
}

export async function parsePoolInWorker(
  data: ArrayBuffer
): Promise<ParsedPoolData> {
  const raw = await postTask<{
    sqrtPriceX64: string;
    token0Mint: number[];
    token1Mint: number[];
    liquidity: string;
    tickCurrent: number;
    tickSpacing: number;
    status: number;
  }>({ id: nextId(), type: 'PARSE_POOL', data });

  return {
    sqrtPriceX64: BigInt(raw.sqrtPriceX64),
    token0Mint: new Uint8Array(raw.token0Mint),
    token1Mint: new Uint8Array(raw.token1Mint),
    liquidity: BigInt(raw.liquidity),
    tickCurrent: raw.tickCurrent,
    tickSpacing: raw.tickSpacing,
    status: raw.status,
  };
}

export async function parsePoolsFilterInWorker(
  accounts: { pubkey: PublicKey; account: { data: Buffer } }[],
  tokenMint: PublicKey,
  quoteMint: PublicKey
): Promise<PublicKey | null> {
  const poolPubkey = await postTask<string | null>({
    id: nextId(),
    type: 'PARSE_POOLS_FILTER',
    accounts: accounts.map((a) => {
      const d = a.account.data;
      const buf = d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength);
      return {
        pubkey: a.pubkey.toBase58(),
        data: buf,
      };
    }),
    tokenMint: new Uint8Array(tokenMint.toBytes()),
    quoteMint: new Uint8Array(quoteMint.toBytes()),
  });

  return poolPubkey ? new PublicKey(poolPubkey) : null;
}

export async function calcQuoteInWorker(
  sqrtPriceX64: bigint,
  amountIn: bigint,
  slippageBps: number,
  zeroForOne: boolean
): Promise<bigint> {
  const minOut = await postTask<string>({
    id: nextId(),
    type: 'CALC_QUOTE',
    sqrtPriceX64: sqrtPriceX64.toString(),
    amountIn: amountIn.toString(),
    slippageBps,
    zeroForOne,
  });
  return BigInt(minOut);
}

export async function getAmountOutInWorker(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): Promise<bigint> {
  const out = await postTask<string>({
    id: nextId(),
    type: 'GET_AMOUNT_OUT',
    sqrtPriceX64: sqrtPriceX64.toString(),
    liquidity: liquidity.toString(),
    amountIn: amountIn.toString(),
    zeroForOne,
  });
  return BigInt(out);
}

export async function getEndSqrtPriceX64AfterSwapInWorker(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): Promise<bigint | null> {
  const result = await postTask<string | null>({
    id: nextId(),
    type: 'GET_END_SQRT_PRICE',
    sqrtPriceX64: sqrtPriceX64.toString(),
    liquidity: liquidity.toString(),
    amountIn: amountIn.toString(),
    zeroForOne,
  });
  return result != null ? BigInt(result) : null;
}

export async function sqrtPriceX64ToTickInWorker(
  sqrtPriceX64: bigint
): Promise<number> {
  return postTask<number>({
    id: nextId(),
    type: 'SQRT_PRICE_TO_TICK',
    sqrtPriceX64: sqrtPriceX64.toString(),
  });
}
