/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CodexProvider } from '@/contexts/codex-provider';
import { NetworkPage } from '@/pages/NetworkPage';
import type { Network } from '@/types/network';
import type { TokenFilterResult } from '@/lib/codex-types';

const mockGetNetworks = vi.fn();
const mockFilterTokens = vi.fn();
const mockCodexClient = {
  queries: {
    getNetworks: (input: unknown) => mockGetNetworks(input),
    filterTokens: (input: unknown) => mockFilterTokens(input),
  },
};

vi.mock('@/contexts/use-codex-client', () => ({
  useCodexClient: () => mockCodexClient,
}));

function renderNetworkPage(networkId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/networks/${networkId}`]}>
      <CodexProvider client={mockCodexClient as never}>
        <Routes>
          <Route path="/networks/:networkId" element={<NetworkPage />} />
        </Routes>
      </CodexProvider>
    </MemoryRouter>
  );
}

const mockTokenResult = (
  address: string,
  name: string,
  symbol: string
): TokenFilterResult & { token: NonNullable<TokenFilterResult['token']> } =>
  ({
    token: {
      address,
      name,
      symbol,
      info: null,
      exchanges: [],
    },
  }) as unknown as TokenFilterResult & {
    token: NonNullable<TokenFilterResult['token']>;
  };

describe('NetworkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const networks: Network[] = [{ id: 1, name: 'Solana' }];
    mockGetNetworks.mockResolvedValue({ getNetworks: networks });
    mockFilterTokens.mockResolvedValue({
      filterTokens: {
        results: [
          mockTokenResult('addr1', 'Token A', 'TKA'),
          mockTokenResult('addr2', 'Token B', 'TKB'),
        ],
      },
    });
  });

  it('shows loading then tokens when data loads', async () => {
    renderNetworkPage('1');

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Solana')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Tokens')).toBeInTheDocument();
      expect(
        screen.queryByText('No tokens found on this network.')
      ).not.toBeInTheDocument();
    });
  });

  it('shows error when filterTokens fails', async () => {
    mockFilterTokens.mockRejectedValue(new Error('API error'));

    renderNetworkPage('1');

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          /Failed to load tokens|API error/.test(content)
        )
      ).toBeInTheDocument();
    });
  });

  it('filters out results without token (hasTokenResult)', async () => {
    mockFilterTokens.mockResolvedValue({
      filterTokens: {
        results: [
          mockTokenResult('addr1', 'Valid', 'VLD'),
          null,
          { token: null },
        ],
      },
    });

    renderNetworkPage('1');

    await waitFor(() => {
      expect(screen.getByText('Tokens')).toBeInTheDocument();
    });
    expect(
      screen.queryByText('No tokens found on this network.')
    ).not.toBeInTheDocument();
  });
});
