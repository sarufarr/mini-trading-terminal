'use client';

import { useCallback, useRef, useState } from 'react';

const PULL_THRESHOLD = 60;
const RESISTANCE = 2.5;
/** Max scrollTop at which pull-to-refresh can trigger (also when overscrolling past top). */
const SCROLL_TOP_THRESHOLD = 15;

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
  className = '',
}: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return;
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollTop <= SCROLL_TOP_THRESHOLD) {
        pulling.current = true;
        startY.current = e.touches[0].clientY;
        e.stopPropagation();
      }
    },
    [disabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || disabled || refreshing) return;
      const el = scrollRef.current;
      if (!el || el.scrollTop > SCROLL_TOP_THRESHOLD) {
        pulling.current = false;
        setPullY(0);
        return;
      }
      e.stopPropagation();
      const y = e.touches[0].clientY;
      const delta = (y - startY.current) / RESISTANCE;
      if (delta > 0) {
        setPullY(Math.min(delta, PULL_THRESHOLD * 1.2));
      }
    },
    [disabled, refreshing]
  );

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      if (!pulling.current) return;
      e.stopPropagation();
      pulling.current = false;
      if (pullY >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullY(0);
        try {
          await Promise.resolve(onRefresh());
        } finally {
          setRefreshing(false);
        }
      } else {
        setPullY(0);
      }
    },
    [onRefresh, pullY]
  );

  return (
    <div className={`relative ${className}`}>
      {(pullY > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center bg-muted/80 text-muted-foreground text-sm transition-all duration-150"
          style={{
            height: Math.max(44, Math.min(pullY, PULL_THRESHOLD * 1.2)),
          }}
        >
          {refreshing ? (
            <span>Refreshing...</span>
          ) : pullY >= PULL_THRESHOLD ? (
            <span>Release to refresh</span>
          ) : (
            <span>Pull to refresh</span>
          )}
        </div>
      )}
      <div
        ref={scrollRef}
        className="h-full overflow-auto overscroll-contain"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={
          pullY > 0
            ? { transform: `translateY(${Math.min(pullY, PULL_THRESHOLD)}px)` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
