/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { CodexProvider } from '@/contexts/codex-provider';
import { FloatingTradingPanel } from '@/components/FloatingTradingPanel';
import { useTradePanelStore } from '@/store/trade-panel.store';
import type { EnhancedToken } from '@/lib/codex';

const mockBalances = vi.hoisted(() => vi.fn());
const mockCodexClient = {
  queries: {
    balances: (input: unknown) => mockBalances(input),
  },
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <CodexProvider client={mockCodexClient as never}>{children}</CodexProvider>
);

vi.mock('@/lib/solana', () => ({
  keypair: {
    publicKey: { toBase58: () => 'mockWallet' },
  },
  connection: {},
}));

vi.mock('@/lib/raydium-clmm', () => ({
  warmClmmPoolCache: vi.fn().mockResolvedValue(undefined),
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
    const { container } = render(
      <TestWrapper>
        <FloatingTradingPanel token={minimalToken} />
      </TestWrapper>
    );
    expect(container.querySelector('[class*="fixed"]')).toBeNull();
  });

  it('renders panel content when open', async () => {
    act(() => {
      useTradePanelStore.getState().open();
    });
    render(
      <TestWrapper>
        <FloatingTradingPanel token={minimalToken} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Balance')).toBeDefined();
    });
    expect(screen.getByText('Buy')).toBeDefined();
    expect(screen.getByText('Sell')).toBeDefined();
  });
});
