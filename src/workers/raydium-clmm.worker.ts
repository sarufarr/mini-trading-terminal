/**
 * Web Worker for Raydium CLMM: pool parsing + quote math.
 * Keeps main thread free for 60fps UI.
 */
import Decimal from 'decimal.js';

/* --- Layout (must match pool.ts) --- */
const POOL_LAYOUT = {
  token0Mint: 80,
  token1Mint: 112,
  liquidity: 244,
  sqrtPriceX64: 260,
  tickCurrent: 276,
  tickSpacing: 242,
  status: 280,
} as const;

function readU8(view: DataView, offset: number): number {
  return view.getUint8(offset);
}
function readU16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}
function readI32LE(view: DataView, offset: number): number {
  return view.getInt32(offset, true);
}
function readU64LE(view: DataView, offset: number): bigint {
  const lo = BigInt(view.getUint32(offset, true));
  const hi = BigInt(view.getUint32(offset + 4, true));
  return (hi << 32n) | lo;
}
function readU128LE(view: DataView, offset: number): bigint {
  const lo = readU64LE(view, offset);
  const hi = readU64LE(view, offset + 8);
  return (hi << 64n) | lo;
}
function read32Bytes(data: Uint8Array, offset: number): Uint8Array {
  return data.slice(offset, offset + 32);
}
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function parsePoolData(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    token0Mint: read32Bytes(data, POOL_LAYOUT.token0Mint),
    token1Mint: read32Bytes(data, POOL_LAYOUT.token1Mint),
    liquidity: readU128LE(view, POOL_LAYOUT.liquidity),
    sqrtPriceX64: readU128LE(view, POOL_LAYOUT.sqrtPriceX64),
    tickCurrent: readI32LE(view, POOL_LAYOUT.tickCurrent),
    tickSpacing: readU16LE(view, POOL_LAYOUT.tickSpacing),
    status: readU8(view, POOL_LAYOUT.status),
  };
}

/* --- Math (from math.ts) --- */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_DOWN });
const Q64 = new D(2).pow(64);

function sqrtPriceX64ToPrice(sqrtPriceX64: bigint): Decimal {
  const sqrt = new D(sqrtPriceX64.toString()).div(Q64);
  return sqrt.pow(2);
}

function calcMinAmountOut(
  amountIn: bigint,
  price: Decimal,
  slippageBps: number
): string {
  const slippageFactor = new D(1).minus(new D(slippageBps).div(10000));
  return new D(amountIn.toString())
    .mul(price.toString())
    .mul(slippageFactor)
    .toFixed(0, Decimal.ROUND_DOWN);
}

/* --- Message handling --- */
type ParsePoolMsg = { id: string; type: 'PARSE_POOL'; data: ArrayBuffer };
type ParsePoolsFilterMsg = {
  id: string;
  type: 'PARSE_POOLS_FILTER';
  accounts: { pubkey: string; data: ArrayBuffer }[];
  tokenMint: Uint8Array;
  quoteMint: Uint8Array;
};
type CalcQuoteMsg = {
  id: string;
  type: 'CALC_QUOTE';
  sqrtPriceX64: string;
  amountIn: string;
  slippageBps: number;
  zeroForOne: boolean;
};
type GetAmountOutMsg = {
  id: string;
  type: 'GET_AMOUNT_OUT';
  sqrtPriceX64: string;
  liquidity: string;
  amountIn: string;
  zeroForOne: boolean;
};
type GetEndSqrtPriceMsg = {
  id: string;
  type: 'GET_END_SQRT_PRICE';
  sqrtPriceX64: string;
  liquidity: string;
  amountIn: string;
  zeroForOne: boolean;
};
type SqrtPriceToTickMsg = {
  id: string;
  type: 'SQRT_PRICE_TO_TICK';
  sqrtPriceX64: string;
};

type WorkerMsg =
  | ParsePoolMsg
  | ParsePoolsFilterMsg
  | CalcQuoteMsg
  | GetAmountOutMsg
  | GetEndSqrtPriceMsg
  | SqrtPriceToTickMsg;

function handleParsePool(id: string, data: ArrayBuffer) {
  const arr = new Uint8Array(data);
  const parsed = parsePoolData(arr);
  return {
    id,
    result: {
      sqrtPriceX64: parsed.sqrtPriceX64.toString(),
      token0Mint: Array.from(parsed.token0Mint),
      token1Mint: Array.from(parsed.token1Mint),
      liquidity: parsed.liquidity.toString(),
      tickCurrent: parsed.tickCurrent,
      tickSpacing: parsed.tickSpacing,
      status: parsed.status,
    },
  };
}

function handleParsePoolsFilter(
  id: string,
  accounts: { pubkey: string; data: ArrayBuffer }[],
  tokenMint: Uint8Array,
  quoteMint: Uint8Array
) {
  const tokenMintArr = new Uint8Array(tokenMint);
  const quoteMintArr = new Uint8Array(quoteMint);

  let best: { pubkey: string; liquidity: bigint } | null = null;
  for (const { pubkey, data } of accounts) {
    const arr = new Uint8Array(data);
    const parsed = parsePoolData(arr);
    if (parsed.status !== 0 || parsed.liquidity === 0n) continue;

    const t0 = parsed.token0Mint;
    const t1 = parsed.token1Mint;
    const hasToken =
      bytesEqual(t0, tokenMintArr) || bytesEqual(t1, tokenMintArr);
    const hasQuote =
      bytesEqual(t0, quoteMintArr) || bytesEqual(t1, quoteMintArr);
    if (!hasToken || !hasQuote) continue;

    if (!best || parsed.liquidity > best.liquidity) {
      best = { pubkey, liquidity: parsed.liquidity };
    }
  }

  return { id, result: best ? best.pubkey : null };
}

function handleCalcQuote(
  id: string,
  sqrtPriceX64: string,
  amountIn: string,
  slippageBps: number,
  zeroForOne: boolean
) {
  const priceAtomic = sqrtPriceX64ToPrice(BigInt(sqrtPriceX64));
  const effectivePrice = zeroForOne ? priceAtomic : new D(1).div(priceAtomic);
  const minOut = calcMinAmountOut(
    BigInt(amountIn),
    effectivePrice,
    slippageBps
  );
  return { id, result: minOut };
}

/* --- CLMM math (from math.ts), keep main thread free --- */
const Q64_BI = 2n ** 64n;

function getAmountOutFromSqrtPriceAndLiquidity(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): string {
  if (liquidity === 0n || sqrtPriceX64 === 0n || amountIn === 0n) return '0';
  const s = sqrtPriceX64;
  const L = liquidity;
  if (zeroForOne) {
    const denom = amountIn * s + L * Q64_BI;
    if (denom === 0n) return '0';
    const sNew = (L * s * Q64_BI) / denom;
    if (sNew >= s) return '0';
    const amountOut = (L * (s - sNew)) / Q64_BI;
    return amountOut.toString();
  } else {
    const sNew = s - (amountIn * Q64_BI) / L;
    if (sNew <= 0n) return '0';
    const amountOut = (L * Q64_BI * (s - sNew)) / (sNew * s);
    return amountOut.toString();
  }
}

function getEndSqrtPriceX64AfterSwap(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): string | null {
  if (liquidity === 0n || sqrtPriceX64 === 0n || amountIn === 0n) return null;
  const s = sqrtPriceX64;
  const L = liquidity;
  if (zeroForOne) {
    const denom = amountIn * s + L * Q64_BI;
    if (denom === 0n) return null;
    const sNew = (L * s * Q64_BI) / denom;
    if (sNew >= s) return null;
    return sNew.toString();
  } else {
    const sNew = s - (amountIn * Q64_BI) / L;
    if (sNew <= 0n) return null;
    return sNew.toString();
  }
}

const LN_1_0001 = new D('1.0001').ln();

function sqrtPriceX64ToTick(sqrtPriceX64: bigint): number {
  if (sqrtPriceX64 <= 0n) return -887272;
  const sqrtRatio = new D(sqrtPriceX64.toString()).div(Q64);
  const price = sqrtRatio.pow(2);
  const tick = price.ln().div(LN_1_0001);
  return Math.floor(tick.toNumber());
}

function handleGetAmountOut(
  id: string,
  sqrtPriceX64: string,
  liquidity: string,
  amountIn: string,
  zeroForOne: boolean
) {
  const out = getAmountOutFromSqrtPriceAndLiquidity(
    BigInt(sqrtPriceX64),
    BigInt(liquidity),
    BigInt(amountIn),
    zeroForOne
  );
  return { id, result: out };
}

function handleGetEndSqrtPrice(
  id: string,
  sqrtPriceX64: string,
  liquidity: string,
  amountIn: string,
  zeroForOne: boolean
) {
  const result = getEndSqrtPriceX64AfterSwap(
    BigInt(sqrtPriceX64),
    BigInt(liquidity),
    BigInt(amountIn),
    zeroForOne
  );
  return { id, result };
}

function handleSqrtPriceToTick(id: string, sqrtPriceX64: string) {
  const tick = sqrtPriceX64ToTick(BigInt(sqrtPriceX64));
  return { id, result: tick };
}

self.onmessage = (e: MessageEvent<WorkerMsg>) => {
  const msg = e.data;
  try {
    let response:
      | { id: string; result: unknown }
      | { id: string; error: string };
    switch (msg.type) {
      case 'PARSE_POOL':
        response = handleParsePool(msg.id, msg.data);
        break;
      case 'PARSE_POOLS_FILTER':
        response = handleParsePoolsFilter(
          msg.id,
          msg.accounts,
          msg.tokenMint,
          msg.quoteMint
        );
        break;
      case 'CALC_QUOTE':
        response = handleCalcQuote(
          msg.id,
          msg.sqrtPriceX64,
          msg.amountIn,
          msg.slippageBps,
          msg.zeroForOne
        );
        break;
      case 'GET_AMOUNT_OUT':
        response = handleGetAmountOut(
          msg.id,
          msg.sqrtPriceX64,
          msg.liquidity,
          msg.amountIn,
          msg.zeroForOne
        );
        break;
      case 'GET_END_SQRT_PRICE':
        response = handleGetEndSqrtPrice(
          msg.id,
          msg.sqrtPriceX64,
          msg.liquidity,
          msg.amountIn,
          msg.zeroForOne
        );
        break;
      case 'SQRT_PRICE_TO_TICK':
        response = handleSqrtPriceToTick(msg.id, msg.sqrtPriceX64);
        break;
      default:
        response = {
          id: (msg as { id: string }).id,
          error: 'Unknown message type',
        };
    }
    self.postMessage(response);
  } catch (err) {
    self.postMessage({
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
