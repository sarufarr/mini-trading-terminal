/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBalance } from '@/hooks/use-balance';

const mockBalances = vi.hoisted(() => vi.fn());
vi.mock('@/lib/codex', () => {
  return {
    getCodexClient: () => ({
      queries: {
        balances: (input: unknown) => mockBalances(input),
      },
    }),
  };
});

vi.mock('@/lib/solana', () => ({
  keypair: {
    publicKey: {
      toBase58: () => 'mockWalletAddress',
    },
  },
}));

describe('useBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs?.();
  });

  it('returns loading true initially and exposes refreshBalance', () => {
    mockBalances.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useBalance('tokenAddr', 6, 9, 1));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refreshBalance).toBe('function');
  });

  it('sets native and token balance from API response', async () => {
    mockBalances.mockResolvedValue({
      balances: {
        items: [
          { tokenId: 'native:1', balance: '2000000000' },
          { tokenId: 'tokenAddr:1', balance: '1500000' },
        ],
      },
    });

    const { result } = renderHook(() => useBalance('tokenAddr', 6, 9, 1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.nativeBalance).toBe(2);
    expect(result.current.tokenBalance).toBe(1.5);
    expect(result.current.error).toBeNull();
  });

  it('sets error when balances request fails', async () => {
    const err = new Error('Network error');
    mockBalances.mockRejectedValue(err);

    const { result } = renderHook(() => useBalance('tokenAddr', 6, 9, 1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(err);
  });

  it('refreshBalance clears error and refetches', async () => {
    mockBalances
      .mockRejectedValueOnce(new Error('First fail'))
      .mockResolvedValueOnce({
        balances: {
          items: [{ tokenId: 'native:1', balance: '1000000000' }],
        },
      });

    const { result } = renderHook(() => useBalance('tokenAddr', 6, 9, 1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).not.toBeNull();
    });

    await act(async () => {
      result.current.refreshBalance();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.nativeBalance).toBe(1);
    });
  });
});
