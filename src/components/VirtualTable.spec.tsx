/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualTable } from '@/components/VirtualTable';

const items = [
  { id: '1', name: 'A', value: 10 },
  { id: '2', name: 'B', value: 20 },
  { id: '3', name: 'C', value: 30 },
];

describe('VirtualTable', () => {
  it('returns null when items is empty', () => {
    const { container } = render(
      <VirtualTable<{ id: string }>
        items={[]}
        getItemKey={(item) => item.id}
        gridTemplateColumns="1fr 1fr"
        header={
          <>
            <span>Col1</span>
            <span>Col2</span>
          </>
        }
      >
        {() => null}
      </VirtualTable>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header and scroll area when items provided', () => {
    const { container } = render(
      <VirtualTable<{ id: string; name: string; value: number }>
        items={items}
        getItemKey={(item) => item.id}
        gridTemplateColumns="60px 1fr 1fr"
        header={
          <>
            <span>ID</span>
            <span>Name</span>
            <span>Value</span>
          </>
        }
      >
        {(item) => (
          <>
            <span>{item.id}</span>
            <span>{item.name}</span>
            <span>{item.value}</span>
          </>
        )}
      </VirtualTable>
    );
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(
      container.querySelector('[class*="overflow-auto"]')
    ).toBeInTheDocument();
  });

  it('shows Refreshing... when refreshing and onRefresh provided', () => {
    render(
      <VirtualTable<{ id: string }>
        items={[{ id: '1' }]}
        getItemKey={(item) => item.id}
        gridTemplateColumns="1fr"
        header={<span>H</span>}
        onRefresh={vi.fn()}
        refreshing
      >
        {(item) => <span>{item.id}</span>}
      </VirtualTable>
    );
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });

  it('shows Load more... when hasMore and onLoadMore provided', () => {
    render(
      <VirtualTable<{ id: string }>
        items={[{ id: '1' }]}
        getItemKey={(item) => item.id}
        gridTemplateColumns="1fr"
        header={<span>H</span>}
        onLoadMore={vi.fn()}
        hasMore
      >
        {(item) => <span>{item.id}</span>}
      </VirtualTable>
    );
    expect(screen.getByText('Load more...')).toBeInTheDocument();
  });

  it('applies className to root', () => {
    const { container } = render(
      <VirtualTable<{ id: string }>
        items={[{ id: '1' }]}
        getItemKey={(item) => item.id}
        gridTemplateColumns="1fr"
        header={<span>H</span>}
        className="custom-table"
      >
        {(item) => <span>{item.id}</span>}
      </VirtualTable>
    );
    const root = container.querySelector('.custom-table');
    expect(root).toBeInTheDocument();
  });
});
