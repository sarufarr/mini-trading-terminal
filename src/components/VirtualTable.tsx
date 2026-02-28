'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const DEFAULT_ROW_HEIGHT = 52;
const DEFAULT_MAX_HEIGHT = 400;
const PULL_REFRESH_THRESHOLD = 56;
/** Max scrollTop at which pull-to-refresh can trigger (also when overscrolling past top). */
const SCROLL_TOP_THRESHOLD = 15;
const LOAD_MORE_THRESHOLD = 80;
const LOAD_MORE_FOOTER_HEIGHT = 44;

interface VirtualTableProps<T> {
  items: T[];
  estimatedRowHeight?: number;
  maxHeight?: number | string;
  header: React.ReactNode;
  children: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  /** CSS grid template columns, e.g. '60px 1fr 1fr 1fr' */
  gridTemplateColumns: string;
  className?: string;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadMoreThreshold?: number;
}

export function VirtualTable<T>({
  items,
  estimatedRowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  header,
  children,
  getItemKey,
  gridTemplateColumns,
  className = '',
  onRefresh,
  refreshing = false,
  onLoadMore,
  hasMore = false,
  loadMoreThreshold = LOAD_MORE_THRESHOLD,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pullStart = useRef(false);
  const loadMoreFired = useRef(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const showLoadMoreFooter = Boolean(onLoadMore && hasMore);
  const totalContentHeight =
    totalSize + (showLoadMoreFooter ? LOAD_MORE_FOOTER_HEIGHT : 0);

  const handleScroll = useCallback(() => {
    if (!onLoadMore) return;
    if (!hasMore) {
      loadMoreFired.current = false;
      return;
    }
    const el = parentRef.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight } = el;
    const nearBottom =
      scrollTop + clientHeight >= scrollHeight - loadMoreThreshold;
    if (nearBottom && !loadMoreFired.current) {
      loadMoreFired.current = true;
      onLoadMore();
    }
    if (!nearBottom) {
      loadMoreFired.current = false;
    }
  }, [onLoadMore, hasMore, loadMoreThreshold]);

  useEffect(() => {
    loadMoreFired.current = false;
  }, [items.length]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    let rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => handleScroll());
    });
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!onRefresh || refreshing) return;
      const el = parentRef.current;
      if (el && el.scrollTop <= SCROLL_TOP_THRESHOLD) {
        pullStart.current = true;
        touchStartY.current = e.touches[0].clientY;
        e.stopPropagation();
      }
    },
    [onRefresh, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pullStart.current || !onRefresh) return;
      const el = parentRef.current;
      if (!el || el.scrollTop > SCROLL_TOP_THRESHOLD) {
        pullStart.current = false;
        return;
      }
      const y = e.touches[0].clientY;
      const delta = y - touchStartY.current;
      if (delta > 0) {
        e.preventDefault();
      }
    },
    [onRefresh]
  );

  const handleTouchMoveNative = useCallback((e: TouchEvent) => {
    if (!pullStart.current) return;
    const el = parentRef.current;
    if (!el || el.scrollTop > SCROLL_TOP_THRESHOLD) {
      pullStart.current = false;
      return;
    }
    const y = e.touches[0].clientY;
    const delta = y - touchStartY.current;
    if (delta > 0) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const el = parentRef.current;
    if (!el || !onRefresh) return;
    el.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMoveNative);
  }, [onRefresh, handleTouchMoveNative]);

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      if (!pullStart.current || !onRefresh) return;
      e.stopPropagation();
      const y = e.changedTouches[0].clientY;
      const delta = y - touchStartY.current;
      pullStart.current = false;
      if (delta >= PULL_REFRESH_THRESHOLD) {
        await Promise.resolve(onRefresh());
      }
    },
    [onRefresh]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className="grid border-b border-border bg-muted/50 font-semibold text-left text-sm [&>*]:p-2 [&>*]:truncate shrink-0"
        style={{ gridTemplateColumns }}
      >
        {header}
      </div>
      {refreshing && onRefresh && (
        <div className="border-b border-border bg-muted/30 px-2 py-1.5 text-center text-xs text-muted-foreground shrink-0">
          Refreshing...
        </div>
      )}
      <div
        ref={parentRef}
        className="overflow-auto overscroll-contain min-h-0 flex-1"
        style={{ maxHeight }}
        onTouchStart={handleTouchStart}
        onTouchStartCapture={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchMoveCapture={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchEndCapture={handleTouchEnd}
      >
        <div
          style={{
            height: totalContentHeight,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => (
            <div
              key={getItemKey(items[virtualRow.index], virtualRow.index)}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="grid border-b border-dashed border-border/30 hover:bg-muted/30 text-sm [&>*]:p-2 [&>*]:truncate [&>*]:align-middle"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns,
              }}
            >
              {children(items[virtualRow.index], virtualRow.index)}
            </div>
          ))}
          {showLoadMoreFooter && (
            <div
              className="absolute left-0 right-0 flex items-center justify-center border-t border-dashed border-border/30 py-2 text-xs text-muted-foreground"
              style={{ top: totalSize }}
            >
              Load more...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
