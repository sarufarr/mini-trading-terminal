/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { PullToRefresh } from '@/components/PullToRefresh';

describe('PullToRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <div data-testid="child">Content</div>
      </PullToRefresh>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Content');
  });

  it('does not show indicator initially', () => {
    render(
      <PullToRefresh onRefresh={vi.fn()}>
        <span>Inner</span>
      </PullToRefresh>
    );
    expect(screen.queryByText('Pull to refresh')).not.toBeInTheDocument();
    expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
  });

  it('calls onRefresh when release after pull past threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Content</div>
      </PullToRefresh>
    );
    const scrollEl = container.querySelector('[class*="overflow-auto"]');
    expect(scrollEl).toBeTruthy();
    if (!scrollEl) return;
    Object.defineProperty(scrollEl, 'scrollTop', {
      value: 0,
      configurable: true,
    });

    act(() => {
      fireEvent.touchStart(scrollEl, {
        touches: [{ clientX: 0, clientY: 80 }],
      });
    });
    await act(async () => {
      fireEvent.touchMove(scrollEl, {
        touches: [{ clientX: 0, clientY: 230 }],
      });
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.touchEnd(scrollEl, {
        changedTouches: [{ clientX: 0, clientY: 230 }],
      });
      await Promise.resolve();
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('does not trigger when disabled', async () => {
    const onRefresh = vi.fn();
    const { container } = render(
      <PullToRefresh onRefresh={onRefresh} disabled>
        <div>Content</div>
      </PullToRefresh>
    );
    const scrollEl = container.querySelector('[class*="overflow-auto"]');
    if (!scrollEl) return;
    Object.defineProperty(scrollEl, 'scrollTop', {
      value: 0,
      configurable: true,
    });
    await act(async () => {
      scrollEl.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [{ clientY: 50 } as Touch],
        })
      );
      scrollEl.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [{ clientY: 120 } as Touch],
        })
      );
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
