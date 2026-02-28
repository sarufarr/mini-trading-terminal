import Decimal from 'decimal.js';

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_DOWN });

const Q64 = new D(2).pow(64);

const Q64_BI = 2n ** 64n;

export function sqrtPriceX64ToPrice(sqrtPriceX64: bigint): Decimal {
  const sqrt = new D(sqrtPriceX64.toString()).div(Q64);
  return sqrt.pow(2);
}

export function calcMinAmountOut(
  amountIn: bigint,
  price: Decimal,
  slippageBps: number
): bigint {
  const slippageFactor = new D(1).minus(new D(slippageBps).div(10000));
  const minOut = new D(amountIn.toString())
    .mul(price.toString())
    .mul(slippageFactor)
    .toFixed(0, Decimal.ROUND_DOWN);
  return BigInt(minOut);
}

/**
 * CLMM getAmountOut: given sqrtPriceX64 and liquidity, compute output amount
 * without RPC. Uses concentrated liquidity invariant (Uniswap V3 / Raydium style).
 * - zeroForOne: token0 in → token1 out (e.g. SOL → token)
 * - oneForZero: token1 in → token0 out (e.g. token → SOL)
 */
export function getAmountOutFromSqrtPriceAndLiquidity(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): bigint {
  if (liquidity === 0n || sqrtPriceX64 === 0n || amountIn === 0n) return 0n;

  const s = sqrtPriceX64;
  const L = liquidity;

  if (zeroForOne) {
    // token0 in, token1 out: delta_x = L*(Q64/s_new - Q64/s) => s_new = L*s*Q64 / (amountIn*s + L*Q64)
    const denom = amountIn * s + L * Q64_BI;
    if (denom === 0n) return 0n;
    const sNew = (L * s * Q64_BI) / denom;
    if (sNew >= s) return 0n;
    const amountOut = (L * (s - sNew)) / Q64_BI;
    return amountOut;
  } else {
    // token1 in, token0 out: delta_y = L*(s - s_new)/Q64 => s_new = s - amountIn*Q64/L
    const sNew = s - (amountIn * Q64_BI) / L;
    if (sNew <= 0n) return 0n;
    const amountOut = (L * Q64_BI * (s - sNew)) / (sNew * s);
    return amountOut;
  }
}

/**
 * Compute end sqrtPriceX64 after swap (single-segment liquidity, consistent with getAmountOut).
 * Used to estimate tick range crossed so all required Tick Array accounts can be loaded.
 */
export function getEndSqrtPriceX64AfterSwap(
  sqrtPriceX64: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): bigint | null {
  if (liquidity === 0n || sqrtPriceX64 === 0n || amountIn === 0n) return null;
  const s = sqrtPriceX64;
  const L = liquidity;
  if (zeroForOne) {
    const denom = amountIn * s + L * Q64_BI;
    if (denom === 0n) return null;
    const sNew = (L * s * Q64_BI) / denom;
    if (sNew >= s) return null;
    return sNew;
  } else {
    const sNew = s - (amountIn * Q64_BI) / L;
    if (sNew <= 0n) return null;
    return sNew;
  }
}

const LN_1_0001 = new D('1.0001').ln();

/**
 * sqrtPriceX64 → tick（Raydium/Uniswap V3: price = 1.0001^tick, sqrtPriceX64 = sqrt(price)*2^64）
 */
export function sqrtPriceX64ToTick(sqrtPriceX64: bigint): number {
  if (sqrtPriceX64 <= 0n) return -887272;
  const sqrtRatio = new D(sqrtPriceX64.toString()).div(Q64);
  const price = sqrtRatio.pow(2);
  const tick = price.ln().div(LN_1_0001);
  return Math.floor(tick.toNumber());
}
