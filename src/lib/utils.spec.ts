import Decimal from 'decimal.js';
import BN from 'bn.js';
import { describe, expect, it } from 'vitest';
import {
  bn,
  decimalToBN,
  readU8,
  readU16LE,
  readI32LE,
  readU64LE,
  readU128LE,
  readPubkey,
  i32ToBeBytes,
} from './utils';

describe('lib/utils', () => {
  describe('decimalToBN', () => {
    it('converts Decimal to BN', () => {
      const d = new Decimal(123456789);
      const result = decimalToBN(d);
      expect(result.toString()).toBe('123456789');
    });

    it('truncates fractional part', () => {
      const d = new Decimal(123.999);
      const result = decimalToBN(d);
      expect(result.toString()).toBe('123');
    });

    it('handles zero', () => {
      const d = new Decimal(0);
      const result = decimalToBN(d);
      expect(result.toString()).toBe('0');
    });
  });

  describe('bn', () => {
    it('converts Decimal to BN', () => {
      const result = bn(new Decimal(1000));
      expect(result).toBeInstanceOf(BN);
      expect(result.toString()).toBe('1000');
    });

    it('converts bigint to BN', () => {
      const result = bn(1_000_000_000n);
      expect(result).toBeInstanceOf(BN);
      expect(result.toString()).toBe('1000000000');
    });

    it('throws for invalid type', () => {
      expect(() => bn(123 as unknown as Decimal)).toThrow(
        /Invalid type of value/
      );
    });
  });

  describe('readU8', () => {
    it('reads uint8 from DataView', () => {
      const buf = new ArrayBuffer(4);
      const view = new DataView(buf);
      view.setUint8(0, 0xff);
      expect(readU8(view, 0)).toBe(0xff);
    });
  });

  describe('readU16LE', () => {
    it('reads uint16 little-endian from DataView', () => {
      const buf = new ArrayBuffer(4);
      const view = new DataView(buf);
      view.setUint16(0, 0x1234, true);
      expect(readU16LE(view, 0)).toBe(0x1234);
    });
  });

  describe('readI32LE', () => {
    it('reads int32 little-endian from DataView', () => {
      const buf = new ArrayBuffer(4);
      const view = new DataView(buf);
      view.setInt32(0, -12345, true);
      expect(readI32LE(view, 0)).toBe(-12345);
    });
  });

  describe('readU64LE', () => {
    it('reads uint64 little-endian from DataView', () => {
      const buf = new ArrayBuffer(16);
      const view = new DataView(buf);
      view.setUint32(0, 0, true);
      view.setUint32(4, 1, true);
      const result = readU64LE(view, 0);
      expect(result).toBe(0x1_0000_0000n);
    });
  });

  describe('readU128LE', () => {
    it('reads uint128 little-endian from DataView', () => {
      const buf = new ArrayBuffer(16);
      const view = new DataView(buf);
      view.setUint32(0, 0, true);
      view.setUint32(4, 0, true);
      view.setUint32(8, 1, true);
      view.setUint32(12, 0, true);
      const result = readU128LE(view, 0);
      expect(result).toBe(1n << 64n);
    });
  });

  describe('readPubkey', () => {
    it('reads 32-byte PublicKey from Uint8Array', () => {
      const data = new Uint8Array(64);
      data[31] = 1;
      const pubkey = readPubkey(data, 0);
      expect(pubkey.toBytes().length).toBe(32);
      expect(pubkey.toBytes()[31]).toBe(1);
    });
  });

  describe('i32ToBeBytes', () => {
    it('encodes 0 as 4-byte big-endian', () => {
      const buf = i32ToBeBytes(0);
      expect(buf.length).toBe(4);
      expect(buf).toEqual(Buffer.from([0, 0, 0, 0]));
    });

    it('encodes positive int32 big-endian', () => {
      const buf = i32ToBeBytes(5280);
      expect(buf).toEqual(Buffer.from([0, 0, 0x14, 0xa0]));
    });

    it('encodes negative int32 big-endian', () => {
      const buf = i32ToBeBytes(-180);
      expect(buf).toEqual(Buffer.from([0xff, 0xff, 0xff, 0x4c]));
    });

    it('encodes -1 as 0xffffffff', () => {
      const buf = i32ToBeBytes(-1);
      expect(buf).toEqual(Buffer.from([0xff, 0xff, 0xff, 0xff]));
    });

    it('round-trips with Buffer.readInt32BE', () => {
      const values = [0, 1, -1, 3600, -3600, 30720, -30720];
      for (const v of values) {
        const buf = i32ToBeBytes(v);
        expect(buf.readInt32BE(0)).toBe(v);
      }
    });
  });
});
