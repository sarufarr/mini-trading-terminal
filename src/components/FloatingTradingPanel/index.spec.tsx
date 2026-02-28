/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { FloatingTradingPanel } from '@/components/FloatingTradingPanel';
import { useTradePanelStore } from '@/store/trade-panel.store';
import type { EnhancedToken } from '@/lib/codex';

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
    publicKey: { toBase58: () => 'mockWallet' },
  },
}));

const mockExecuteTrade = vi.hoisted(() => vi.fn());
vi.mock('@/service/trade-service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/service/trade-service')>();
  return {
    ...actual,
    executeTrade: (opts: unknown) => mockExecuteTrade(opts),
  };
});

const minimalToken = {
  address: 'token-addr',
  symbol: 'TKN',
  decimals: 6,
  networkId: 1,
} as EnhancedToken;

describe('FloatingTradingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBalances.mockResolvedValue({
      balances: {
        items: [
          { tokenId: 'native:1', balance: '1000000000' },
          { tokenId: 'token-addr:1', balance: '0' },
        ],
      },
    });
  });

  it('renders nothing when panel is closed', () => {
    act(() => {
      useTradePanelStore.getState().close();
    });
    const { container } = render(<FloatingTradingPanel token={minimalToken} />);
    expect(container.querySelector('[class*="fixed"]')).toBeNull();
  });

  it('renders panel content when open', async () => {
    act(() => {
      useTradePanelStore.getState().open();
    });
    render(<FloatingTradingPanel token={minimalToken} />);

    await waitFor(() => {
      expect(screen.getByText('Balance')).toBeDefined();
    });
    expect(screen.getByText('Buy')).toBeDefined();
    expect(screen.getByText('Sell')).toBeDefined();
  });
});
