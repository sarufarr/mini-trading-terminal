import Decimal from 'decimal.js';
import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

export function decimalToBN(decimal: Decimal): BN {
  const intStr = decimal.trunc().toFixed(0);
  return new BN(intStr, 10);
}

export function bn(value: Decimal | bigint): BN {
  if (value instanceof Decimal) {
    return decimalToBN(value);
  } else if (typeof value === 'bigint') {
    return new BN(value.toString());
  } else {
    throw new Error(`Invalid type of value: ${value}`);
  }
}

export function readU8(view: DataView, offset: number): number {
  return view.getUint8(offset);
}

export function readU16LE(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

export function readI32LE(view: DataView, offset: number): number {
  return view.getInt32(offset, true);
}

export function readU64LE(view: DataView, offset: number): bigint {
  const lo = BigInt(view.getUint32(offset, true));
  const hi = BigInt(view.getUint32(offset + 4, true));
  return (hi << 32n) | lo;
}

export function readU128LE(view: DataView, offset: number): bigint {
  const lo = readU64LE(view, offset);
  const hi = readU64LE(view, offset + 8);
  return (hi << 64n) | lo;
}

export function readPubkey(data: Uint8Array, offset: number): PublicKey {
  return new PublicKey(data.subarray(offset, offset + 32));
}

export function i32ToBeBytes(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(value, 0);
  return buf;
}
