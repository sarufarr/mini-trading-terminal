'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const DEFAULT_ITEM_HEIGHT = 64;
const DEFAULT_MAX_HEIGHT = 320;
const OVERSCAN = 5;
const PULL_REFRESH_THRESHOLD = 56;
/** Max scrollTop at which pull-to-refresh can trigger (also when overscrolling past top). */
const SCROLL_TOP_THRESHOLD = 15;

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  maxHeight?: number | string;
  getItemKey: (item: T, index: number) => string | number;
  children: (item: T, index: number) => React.ReactNode;
  className?: string;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function VirtualList<T>({
  items,
  estimateSize = DEFAULT_ITEM_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  getItemKey,
  children,
  className = '',
  onRefresh,
  refreshing = false,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pullStart = useRef(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

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
    <>
      {refreshing && onRefresh && (
        <div className="border-b border-border bg-muted/30 px-2 py-1.5 text-center text-xs text-muted-foreground">
          Refreshing...
        </div>
      )}
      <div
        ref={parentRef}
        className={`overflow-auto overscroll-contain ${className}`}
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
            height: totalSize,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => (
            <div
              key={getItemKey(items[virtualRow.index], virtualRow.index)}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {children(items[virtualRow.index], virtualRow.index)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
