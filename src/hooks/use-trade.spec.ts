/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrade } from '@/hooks/use-trade';
import { ETradePhaseStatus } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import type { PublicKey } from '@solana/web3.js';

const mockExecuteTrade = vi.hoisted(() => vi.fn());
const mockPublicKey = vi.hoisted(
  () =>
    ({
      toBase58: () => 'mockPubkeyBase58',
    }) as unknown as PublicKey
);
vi.mock('@/service/trade-service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/service/trade-service')>();
  return {
    ...actual,
    executeTrade: (opts: unknown) => mockExecuteTrade(opts),
  };
});

vi.mock('@/lib/solana', () => ({
  keypair: {
    publicKey: mockPublicKey,
  },
}));

describe('useTrade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns IDLE phase and signer initially', () => {
    mockExecuteTrade.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useTrade({ tokenAddress: 'addr', networkId: 1 })
    );

    expect(result.current.phase.status).toBe(ETradePhaseStatus.IDLE);
    expect(result.current.signer).toBe(mockPublicKey);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('execute BUY resolves with txid and sets SUCCESS phase', async () => {
    mockExecuteTrade.mockResolvedValue({ txid: 'tx-123' });

    const { result } = renderHook(() =>
      useTrade({ tokenAddress: 'addr', networkId: 1 })
    );

    await act(async () => {
      const txid = await result.current.execute({
        direction: ETradeDirection.BUY,
        value: 0.1,
      });
      expect(txid).toBe('tx-123');
    });

    expect(result.current.phase.status).toBe(ETradePhaseStatus.SUCCESS);
    if (result.current.phase.status === ETradePhaseStatus.SUCCESS) {
      expect(result.current.phase.txid).toBe('tx-123');
    }
  });

  it('execute failure sets ERROR phase and rethrows', async () => {
    const err = new Error('Trade failed');
    mockExecuteTrade.mockRejectedValue(err);

    const { result } = renderHook(() =>
      useTrade({ tokenAddress: 'addr', networkId: 1 })
    );

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.execute({
          direction: ETradeDirection.BUY,
          value: 0.1,
        });
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toEqual(err);
    expect(result.current.phase.status).toBe(ETradePhaseStatus.ERROR);
    if (result.current.phase.status === ETradePhaseStatus.ERROR) {
      expect(result.current.phase.message).toBe('Trade failed');
    }
  });

  it('reset sets phase back to IDLE', async () => {
    mockExecuteTrade.mockResolvedValue({ txid: 'tx-456' });

    const { result } = renderHook(() =>
      useTrade({ tokenAddress: 'addr', networkId: 1 })
    );

    await act(async () => {
      await result.current.execute({
        direction: ETradeDirection.BUY,
        value: 0.01,
      });
    });

    expect(result.current.phase.status).toBe(ETradePhaseStatus.SUCCESS);

    act(() => {
      result.current.reset();
    });

    expect(result.current.phase.status).toBe(ETradePhaseStatus.IDLE);
  });
});
