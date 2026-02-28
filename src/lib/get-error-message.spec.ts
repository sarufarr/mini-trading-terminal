import { describe, expect, it } from 'vitest';
import { getErrorMessage, getTradeErrorDisplay } from '@/lib/get-error-message';

/** Helper: create Error with cause (avoids ES2022 Error constructor in ES2020 lib). */
function errorWithCause(message: string, cause: unknown): Error {
  const err = new Error(message) as Error & { cause?: unknown };
  err.cause = cause;
  return err;
}

describe('getErrorMessage', () => {
  it('returns message for Error instance', () => {
    expect(getErrorMessage(new Error('foo'))).toBe('foo');
  });

  it('returns string as-is', () => {
    expect(getErrorMessage('bar')).toBe('bar');
  });

  it('converts other to String', () => {
    expect(getErrorMessage(123)).toBe('123');
  });

  it('appends Error.cause when present', () => {
    const cause = new Error('root cause');
    const err = errorWithCause('wrapper', cause);
    expect(getErrorMessage(err)).toBe('wrapper — root cause');
  });

  it('chains multiple causes up to maxDepth', () => {
    const inner = new Error('inner');
    const mid = errorWithCause('mid', inner);
    const outer = errorWithCause('outer', mid);
    expect(getErrorMessage(outer)).toBe('outer — mid — inner');
  });

  it('stops at maxCauseDepth to avoid infinite recursion', () => {
    const inner = new Error('inner');
    const mid = errorWithCause('mid', inner);
    const outer = errorWithCause('outer', mid);
    const getMsg = getErrorMessage as (
      err: unknown,
      maxDepth?: number
    ) => string;
    expect(getMsg(outer, 1)).toBe('outer — mid');
    expect(getMsg(outer, 2)).toBe('outer — mid — inner');
  });

  it('handles cause as string', () => {
    const err = errorWithCause('failed', 'underlying reason');
    expect(getErrorMessage(err)).toBe('failed — underlying reason');
  });
});

describe('getTradeErrorDisplay', () => {
  it('maps insufficient SOL to Insufficient balance (SOL)', () => {
    const d = getTradeErrorDisplay(
      new Error('Insufficient SOL balance: have 0.5 SOL')
    );
    expect(d.title).toBe('Insufficient balance');
    expect(d.description).toContain('SOL');
  });

  it('maps insufficient funds to Insufficient balance', () => {
    const d = getTradeErrorDisplay(new Error('Insufficient funds'));
    expect(d.title).toBe('Insufficient balance');
  });

  it('maps insufficient token to Insufficient balance (token)', () => {
    const d = getTradeErrorDisplay(new Error('Insufficient token balance'));
    expect(d.title).toBe('Insufficient balance');
    expect(d.description).toContain('token');
  });

  it('maps no balance to sell to Insufficient balance', () => {
    const d = getTradeErrorDisplay(
      new Error('Insufficient token balance: no balance to sell.')
    );
    expect(d.title).toBe('Insufficient balance');
  });

  it('maps slippage errors to Slippage exceeded', () => {
    expect(
      getTradeErrorDisplay(new Error('SlippageToleranceExceeded')).title
    ).toBe('Slippage exceeded');
    expect(getTradeErrorDisplay(new Error('Error 0x1771')).title).toBe(
      'Slippage exceeded'
    );
    expect(getTradeErrorDisplay(new Error('Code 6001')).title).toBe(
      'Slippage exceeded'
    );
    expect(getTradeErrorDisplay(new Error('Code 6010')).title).toBe(
      'Slippage exceeded'
    );
  });

  it('maps simulation failed to Simulation failed', () => {
    const d = getTradeErrorDisplay(new Error('Transaction simulation failed'));
    expect(d.title).toBe('Simulation failed');
  });

  it('maps instruction failed to Simulation failed', () => {
    const d = getTradeErrorDisplay(
      new Error('Instruction 2 failed: something')
    );
    expect(d.title).toBe('Simulation failed');
  });

  it('maps network/fetch errors to Network error', () => {
    expect(
      getTradeErrorDisplay(new Error('Network request failed')).title
    ).toBe('Network error');
    expect(getTradeErrorDisplay(new Error('fetch failed')).title).toBe(
      'Network error'
    );
    expect(getTradeErrorDisplay(new Error('ECONNREFUSED')).title).toBe(
      'Network error'
    );
    expect(getTradeErrorDisplay(new Error('timeout')).title).toBe(
      'Network error'
    );
  });

  it('maps transaction failed on-chain', () => {
    const d = getTradeErrorDisplay(new Error('Transaction failed on-chain'));
    expect(d.title).toBe('Transaction failed');
  });

  it('maps Jupiter error to Quote error', () => {
    const d = getTradeErrorDisplay(new Error('Jupiter error: no route'));
    expect(d.title).toBe('Quote error');
    expect(d.description).toContain('no route');
  });

  it('maps no Jito tip account to Jito unavailable', () => {
    const d = getTradeErrorDisplay(new Error('No Jito tip account available'));
    expect(d.title).toBe('Jito unavailable');
  });

  it('maps no swap provider / no raydium to No route', () => {
    expect(
      getTradeErrorDisplay(new Error('No swap provider available')).title
    ).toBe('No route');
    expect(
      getTradeErrorDisplay(new Error('No Raydium CLMM pool found')).title
    ).toBe('No route');
  });

  it('maps failed to fetch token balance to Balance unavailable', () => {
    const d = getTradeErrorDisplay(new Error('Failed to fetch token balance'));
    expect(d.title).toBe('Balance unavailable');
  });

  it('maps blockhash/block height to Network error', () => {
    expect(getTradeErrorDisplay(new Error('Blockhash expired')).title).toBe(
      'Network error'
    );
  });

  it('falls back to Trade failed for unknown errors', () => {
    const d = getTradeErrorDisplay(new Error('Some unknown error'));
    expect(d.title).toBe('Trade failed');
    expect(d.description).toBe('Some unknown error');
  });

  it('truncates long fallback description to 300 chars', () => {
    const long = 'x'.repeat(400);
    const d = getTradeErrorDisplay(new Error(long));
    expect(d.title).toBe('Trade failed');
    expect(d.description.length).toBeLessThanOrEqual(304);
    expect(d.description.endsWith('…')).toBe(true);
  });

  it('handles string errors', () => {
    const d = getTradeErrorDisplay('Insufficient SOL balance');
    expect(d.title).toBe('Insufficient balance');
  });
});
