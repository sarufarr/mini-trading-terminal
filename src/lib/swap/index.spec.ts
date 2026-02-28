import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js';
import BN from 'bn.js';

const mockConnection = new Connection('https://test.rpc');

let raydiumAvailable = false;
let jupiterAvailable = false;

vi.mock('./providers/raydium-clmm', () => {
  return {
    RaydiumClmmProvider: vi.fn().mockImplementation(() => ({
      name: 'RaydiumMock',
      isAvailable: vi.fn((_conn: Connection) =>
        Promise.resolve(raydiumAvailable)
      ),
      buildTransaction: vi.fn(async () => ({
        transaction: {} as unknown as VersionedTransaction,
        blockhashCtx: {
          blockhash: 'raydium-blockhash',
          lastValidBlockHeight: 1,
        } as unknown as BlockhashWithExpiryBlockHeight,
      })),
    })),
  };
});

vi.mock('./providers/jupiter', () => {
  return {
    JupiterProvider: vi.fn().mockImplementation(() => ({
      name: 'JupiterMock',
      isAvailable: vi.fn((_conn: Connection) =>
        Promise.resolve(jupiterAvailable)
      ),
      buildTransaction: vi.fn(async () => ({
        transaction: {} as unknown as VersionedTransaction,
        blockhashCtx: {
          blockhash: 'jupiter-blockhash',
          lastValidBlockHeight: 1,
        } as unknown as BlockhashWithExpiryBlockHeight,
      })),
    })),
  };
});

import { buildSwapTransaction } from './index';

describe('buildSwapTransaction provider selection', () => {
  const dummyMint = new PublicKey('11111111111111111111111111111111');
  const signer = dummyMint;
  const amount = new BN(1_000_000);

  const baseRequest = {
    connection: mockConnection,
    tokenAddress: 'raydium-token',
    networkId: 1,
    inputMint: dummyMint,
    outputMint: dummyMint,
    amount,
    signer,
  };

  beforeEach(() => {
    raydiumAvailable = false;
    jupiterAvailable = false;
  });

  it('prefers Raydium CLMM provider when available', async () => {
    raydiumAvailable = true;
    jupiterAvailable = true;

    const plan = await buildSwapTransaction({
      ...baseRequest,
      tokenAddress: 'raydium-token',
    });

    expect(plan.providerName).toBe('RaydiumMock');
    expect(plan.blockhashCtx.blockhash).toBe('raydium-blockhash');
  });

  it('falls back to Jupiter when Raydium is unavailable', async () => {
    raydiumAvailable = false;
    jupiterAvailable = true;

    const plan = await buildSwapTransaction({
      ...baseRequest,
      tokenAddress: 'jupiter-token',
    });

    expect(plan.providerName).toBe('JupiterMock');
    expect(plan.blockhashCtx.blockhash).toBe('jupiter-blockhash');
  });

  it('throws when no provider is available', async () => {
    raydiumAvailable = false;
    jupiterAvailable = false;

    await expect(
      buildSwapTransaction({
        ...baseRequest,
        tokenAddress: 'unknown-token',
      })
    ).rejects.toThrow('No swap provider available for token: unknown-token');
  });

  it('returns plan with transaction and blockhashCtx', async () => {
    raydiumAvailable = true;

    const plan = await buildSwapTransaction({
      ...baseRequest,
      slippageBps: 200,
    });

    expect(plan).toHaveProperty('transaction');
    expect(plan).toHaveProperty('blockhashCtx');
    expect(plan).toHaveProperty('providerName');
    expect(plan.blockhashCtx).toHaveProperty('blockhash');
    expect(plan.blockhashCtx).toHaveProperty('lastValidBlockHeight');
  });
});
