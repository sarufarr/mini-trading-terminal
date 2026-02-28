import { describe, expect, it } from 'vitest';
import { parseAccountData } from './util';

describe('raydium-clmm util', () => {
  describe('parseAccountData', () => {
    it('parses Uint8Array and returns data and view', () => {
      const source = new Uint8Array([1, 2, 3, 4, 5]);
      const { data, view } = parseAccountData(source);

      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(5);
      expect(data[0]).toBe(1);
      expect(view).toBeInstanceOf(DataView);
      expect(view.byteLength).toBe(5);
    });

    it('parses Uint8Array (typed array) and returns data and view', () => {
      const source = new Uint8Array([10, 20, 30]);
      const { data, view } = parseAccountData(source);

      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(3);
      expect(data[0]).toBe(10);
      expect(view).toBeInstanceOf(DataView);
      expect(view.byteLength).toBe(3);
    });

    it('throws for non-Uint8Array input', () => {
      expect(() => parseAccountData(null)).toThrow(
        /Expected binary account data/
      );
      expect(() => parseAccountData(undefined)).toThrow(
        /Expected binary account data/
      );
      expect(() => parseAccountData('string')).toThrow(
        /Expected binary account data/
      );
      expect(() => parseAccountData(123)).toThrow(
        /Expected binary account data/
      );
    });
  });
});
