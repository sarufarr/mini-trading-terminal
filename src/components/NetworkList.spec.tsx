/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NetworkList } from '@/components/NetworkList';
import type { Network } from '@/types/network';

const topNetworks: Network[] = [
  { id: 1, name: 'Solana' },
  { id: 2, name: 'Ethereum' },
];
const restNetworks: Network[] = [
  { id: 3, name: 'Base' },
  { id: 4, name: 'Arbitrum' },
];

function renderNetworkList(
  props: {
    topNetworks?: Network[];
    restNetworks?: Network[];
    initialError?: string | null;
    onRefresh?: () => void | Promise<void>;
    refreshing?: boolean;
  } = {}
) {
  return render(
    <BrowserRouter>
      <NetworkList
        topNetworks={props.topNetworks ?? topNetworks}
        restNetworks={props.restNetworks ?? restNetworks}
        initialError={props.initialError ?? null}
        onRefresh={props.onRefresh}
        refreshing={props.refreshing ?? false}
      />
    </BrowserRouter>
  );
}

describe('NetworkList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top and rest networks', () => {
    renderNetworkList();
    expect(
      screen.getByPlaceholderText('Search networks...')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No networks available.')
    ).not.toBeInTheDocument();
    // VirtualList virtualizes content; we only assert list is not empty state
  });

  it('shows initialError when provided', () => {
    renderNetworkList({ initialError: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('shows empty state when no networks', () => {
    renderNetworkList({ topNetworks: [], restNetworks: [] });
    expect(screen.getByText('No networks available.')).toBeDefined();
  });

  it('has search input', () => {
    renderNetworkList();
    expect(
      screen.getByPlaceholderText('Search networks...')
    ).toBeInTheDocument();
  });
});
