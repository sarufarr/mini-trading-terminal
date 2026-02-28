/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CodexProvider } from '@/contexts/codex-provider';
import { HomePage } from '@/pages/HomePage';
import type { Network } from '@/types/network';

const mockGetNetworks = vi.fn();
const mockCodexClient = {
  queries: {
    getNetworks: () => mockGetNetworks(),
  },
};

function renderHomePage() {
  return render(
    <BrowserRouter>
      <CodexProvider client={mockCodexClient as never}>
        <HomePage />
      </CodexProvider>
    </BrowserRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then title and network list when getNetworks succeeds', async () => {
    const networks: Network[] = [
      { id: 1, name: 'Solana' },
      { id: 2, name: 'Ethereum' },
    ];
    mockGetNetworks.mockResolvedValue({ getNetworks: networks });

    renderHomePage();

    expect(screen.getByText('Loading networks...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Tokedex')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('Loading networks...')).not.toBeInTheDocument();
      expect(
        screen.queryByText('No networks available.')
      ).not.toBeInTheDocument();
    });
  });

  it('shows error when getNetworks fails', async () => {
    mockGetNetworks.mockRejectedValue(new Error('Network error'));

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load networks.')).toBeDefined();
    });
  });

  it('filters out non-Network items from getNetworks', async () => {
    mockGetNetworks.mockResolvedValue({
      getNetworks: [
        { id: 1, name: 'Solana' },
        null,
        { id: 2, name: 'Ethereum' },
        { name: 'NoId' },
      ],
    });

    renderHomePage();

    await waitFor(() => {
      expect(screen.queryByText('Loading networks...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Tokedex')).toBeInTheDocument();
    expect(
      screen.queryByText('No networks available.')
    ).not.toBeInTheDocument();
  });
});
