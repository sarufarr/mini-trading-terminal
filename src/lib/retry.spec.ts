import { describe, expect, it, vi } from 'vitest';
import {
  getBackoffDelayMs,
  isRetryableTradeError,
  runWithRetry,
} from './retry';

describe('lib/retry', () => {
  describe('getBackoffDelayMs', () => {
    it('returns base delay for first attempt', () => {
      expect(getBackoffDelayMs(0)).toBe(1000);
    });

    it('exponential increase with default multiplier 2', () => {
      expect(getBackoffDelayMs(0)).toBe(1000);
      expect(getBackoffDelayMs(1)).toBe(2000);
      expect(getBackoffDelayMs(2)).toBe(4000);
      expect(getBackoffDelayMs(3)).toBe(8000);
    });

    it('caps at maxDelayMs', () => {
      expect(getBackoffDelayMs(10)).toBe(15_000);
    });

    it('respects custom options', () => {
      expect(
        getBackoffDelayMs(1, {
          baseDelayMs: 500,
          multiplier: 3,
          maxDelayMs: 5000,
        })
      ).toBe(1500);
      expect(
        getBackoffDelayMs(2, {
          baseDelayMs: 500,
          multiplier: 3,
          maxDelayMs: 5000,
        })
      ).toBe(4500);
      expect(
        getBackoffDelayMs(3, {
          baseDelayMs: 500,
          multiplier: 3,
          maxDelayMs: 5000,
        })
      ).toBe(5000);
    });
  });

  describe('isRetryableTradeError', () => {
    it('returns true for blockhash expired', () => {
      expect(isRetryableTradeError(new Error('blockhash has expired'))).toBe(
        true
      );
      expect(isRetryableTradeError(new Error('Block height exceeded'))).toBe(
        true
      );
    });

    it('returns true for timeout / not confirmed', () => {
      expect(
        isRetryableTradeError(new Error('Transaction was not confirmed'))
      ).toBe(true);
      expect(isRetryableTradeError(new Error('request timeout'))).toBe(true);
    });

    it('returns true for network errors', () => {
      expect(isRetryableTradeError(new Error('fetch failed'))).toBe(true);
      expect(isRetryableTradeError(new Error('ECONNRESET'))).toBe(true);
    });

    it('returns false for slippage / business errors', () => {
      expect(
        isRetryableTradeError(
          new Error('Slippage tolerance exceeded: received less than minimum')
        )
      ).toBe(false);
      expect(isRetryableTradeError(new Error('Insufficient SOL balance'))).toBe(
        false
      );
    });

    it('checks transactionError.message when present', () => {
      expect(
        isRetryableTradeError({
          transactionError: { message: 'blockhash not found' },
        })
      ).toBe(true);
    });
  });

  describe('runWithRetry', () => {
    it('returns result on first success', async () => {
      const result = await runWithRetry(async () => 'ok');
      expect(result).toBe('ok');
    });

    it('retries on retryable error and succeeds', async () => {
      let calls = 0;
      const result = await runWithRetry(async () => {
        calls++;
        if (calls < 2) throw new Error('blockhash expired');
        return 'ok';
      });
      expect(result).toBe('ok');
      expect(calls).toBe(2);
    });

    it('calls onRetry before each retry', async () => {
      const onRetry = vi.fn();
      await runWithRetry(
        async () => {
          if (onRetry.mock.calls.length < 1) {
            throw new Error('timeout');
          }
          return 'ok';
        },
        { maxRetries: 2, onRetry }
      );
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('throws immediately on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Slippage exceeded'));
      await expect(runWithRetry(fn)).rejects.toThrow('Slippage exceeded');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws after maxRetries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('blockhash expired'));
      await expect(runWithRetry(fn, { maxRetries: 2 })).rejects.toThrow(
        'blockhash expired'
      );
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
