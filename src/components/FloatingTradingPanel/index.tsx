import {
  AnimatePresence,
  motion,
  useMotionValue,
  animate,
} from 'framer-motion';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { ETradeDirection } from '@/types/trade';
import { useDraggable } from '@/hooks/use-draggable';
import { useResizable } from '@/hooks/use-resizable';
import { usePanelBounds } from '@/hooks/use-panel-bounds';
import {
  RESIZE_THROTTLE_MS,
  PANEL_SPRING_STIFFNESS,
  PANEL_SPRING_DAMPING,
} from '@/constants/ui';
import { getViewportSize } from '@/lib/dom';
import { connection } from '@/lib/solana';
import { warmClmmPoolCache } from '@/lib/raydium-clmm';
import { PanelHeader } from './PanelHeader';
import { BuyPanel } from './BuyPanel';
import { SellPanel } from './SellPanel';
import type { EnhancedToken } from '@/lib/codex';

interface Props {
  token: EnhancedToken;
}

export const FloatingTradingPanel = memo(function FloatingTradingPanel({
  token,
}: Props) {
  const {
    isOpen,
    position,
    size,
    activeTab,
    setPosition,
    setSize,
    setActiveTab,
    open,
    close,
  } = useTradePanelStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      position: s.position,
      size: s.size,
      activeTab: s.activeTab,
      setPosition: s.setPosition,
      setSize: s.setSize,
      setActiveTab: s.setActiveTab,
      open: s.open,
      close: s.close,
    }))
  );

  const executeRef = useRef<{ canTrade: boolean; execute: () => void } | null>(
    null
  );
  const registerExecute = useCallback(
    (canTrade: boolean, execute: () => void) => {
      executeRef.current = { canTrade, execute };
    },
    []
  );

  const { clampPosition } = usePanelBounds();

  const motionX = useMotionValue(position.x);
  const motionY = useMotionValue(position.y);
  const viewportRef = useRef<{ width: number; height: number } | null>(null);
  const resizeThrottleRef = useRef<number | null>(null);
  const lastResizeRunRef = useRef(0);

  const runResize = useCallback(() => {
    lastResizeRunRef.current = Date.now();
    const prev = viewportRef.current;
    const next = getViewportSize();
    viewportRef.current = next;
    const { position: pos, size: sz } = useTradePanelStore.getState();
    let nextPosition = pos;
    if (prev && prev.width > 0 && prev.height > 0) {
      const scaleX = next.width / prev.width;
      const scaleY = next.height / prev.height;
      nextPosition = { x: pos.x * scaleX, y: pos.y * scaleY };
    }
    const clamped = clampPosition(nextPosition, sz);
    motionX.set(clamped.x);
    motionY.set(clamped.y);
    useTradePanelStore.getState().setPosition(clamped);
    // runResize intentionally omits full deps to avoid re-running on every position/size change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- position/size intentionally omitted
  }, [clampPosition]);

  const { handlePointerDown } = useDraggable(
    position,
    (pos) => {
      motionX.set(pos.x);
      motionY.set(pos.y);
    },
    {
      onDragEnd: (pos) => {
        const clamped = clampPosition(pos, size);
        const needsSnap = clamped.x !== pos.x || clamped.y !== pos.y;
        if (needsSnap) {
          animate(motionX, clamped.x, {
            type: 'spring',
            stiffness: PANEL_SPRING_STIFFNESS,
            damping: PANEL_SPRING_DAMPING,
          });
          animate(motionY, clamped.y, {
            type: 'spring',
            stiffness: PANEL_SPRING_STIFFNESS,
            damping: PANEL_SPRING_DAMPING,
          });
        }
        setPosition(clamped);
      },
    }
  );

  const { handleResizeMouseDown } = useResizable(
    size,
    useCallback((s) => setSize(s), [setSize])
  );

  useEffect(() => {
    motionX.set(position.x);
    motionY.set(position.y);
    if (typeof window !== 'undefined') {
      viewportRef.current = getViewportSize();
    }
    // Sync motion values and viewport ref once on mount; position/size come from store.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only sync
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const handleResize = () => {
      const now = Date.now();
      if (resizeThrottleRef.current != null) return;
      if (now - lastResizeRunRef.current < RESIZE_THROTTLE_MS) {
        resizeThrottleRef.current = window.setTimeout(
          () => {
            resizeThrottleRef.current = null;
            runResize();
          },
          RESIZE_THROTTLE_MS - (now - lastResizeRunRef.current)
        );
        return;
      }
      runResize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (resizeThrottleRef.current != null) {
        clearTimeout(resizeThrottleRef.current);
        resizeThrottleRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, clampPosition, runResize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Node | null;
      const isInput =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          close();
        }
        return;
      }
      if (isInput) return;
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        if (!isOpen) open();
        setActiveTab(ETradeDirection.BUY);
        return;
      }
      if (key === 's') {
        e.preventDefault();
        if (!isOpen) open();
        setActiveTab(ETradeDirection.SELL);
        return;
      }
      if (e.key === 'Enter' && isOpen && executeRef.current?.canTrade) {
        e.preventDefault();
        executeRef.current.execute();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, open, close, setActiveTab]);

  // Warm CLMM pool cache so getLocalClmmQuote returns getAmountOut instantly when user types amount
  useEffect(() => {
    warmClmmPoolCache(connection, token.address).catch(() => {});
  }, [token.address]);

  useEffect(() => {
    if (!isOpen) return;
    const clamped = clampPosition(position, size);
    if (clamped.x !== position.x || clamped.y !== position.y) {
      motionX.set(clamped.x);
      motionY.set(clamped.y);
      setPosition(clamped);
    }
    // Only re-run when panel opens or size changes; position from store to avoid feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isOpen and size only
  }, [isOpen, size.width, size.height]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed z-50 flex flex-col rounded-xl border border-border/60 bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden"
          style={{
            left: 0,
            top: 0,
            x: motionX,
            y: motionY,
            width: size.width,
            height: size.height,
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          <PanelHeader token={token} onDragPointerDown={handlePointerDown} />

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                className="h-full"
                initial={{
                  opacity: 0,
                  x: activeTab === ETradeDirection.BUY ? -10 : 10,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: activeTab === ETradeDirection.BUY ? 10 : -10,
                }}
                transition={{ duration: 0.12 }}
              >
                {activeTab === ETradeDirection.BUY ? (
                  <BuyPanel token={token} onRegisterExecute={registerExecute} />
                ) : (
                  <SellPanel
                    token={token}
                    onRegisterExecute={registerExecute}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-30 hover:opacity-70 transition-opacity"
            onMouseDown={handleResizeMouseDown}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, white 50%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
FloatingTradingPanel.displayName = 'FloatingTradingPanel';
