import Decimal from 'decimal.js';

const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_DOWN });

const Q64 = new D(2).pow(64);

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
