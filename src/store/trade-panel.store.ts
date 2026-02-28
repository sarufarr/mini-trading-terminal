/**
 * Panel slice: floating trade panel UI (open/close, position, size, active tab).
 * Trade input (amount, slippage, phase) lives in useTradeStore; pool data in usePoolStore.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ETradeDirection } from '@/types/trade';
import { getViewportSize } from '@/lib/dom';

export interface Position {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}

interface TradePanelStore {
  isOpen: boolean;
  position: Position;
  size: Size;
  activeTab: ETradeDirection;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setPosition: (position: Position) => void;
  setSize: (size: Size) => void;
  setActiveTab: (activeTab: ETradeDirection) => void;
}

const PANEL_DEFAULT_SIZE: Size = { width: 360, height: 560 };
export const PANEL_BOUNDS_MARGIN = 12;

export const useTradePanelStore = create<TradePanelStore>()(
  persist(
    (set) => ({
      isOpen: false,
      position: { x: 0, y: 0 },
      size: PANEL_DEFAULT_SIZE,
      activeTab: ETradeDirection.BUY,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setPosition: (position) => set({ position }),
      setSize: (size) => set({ size }),
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'trade-panel-store',
      partialize: (s) => ({ position: s.position, size: s.size }),
      // Rehydration: clamp position to viewport so the panel is never off-screen after load or resize.
      onRehydrateStorage: () => (state, error) => {
        if (error || !state || typeof window === 'undefined') return;
        const { width, height } = getViewportSize();
        const maxX = width - state.size.width - PANEL_BOUNDS_MARGIN;
        const maxY = height - state.size.height - PANEL_BOUNDS_MARGIN;
        const clampedX = Math.min(
          Math.max(PANEL_BOUNDS_MARGIN, state.position.x),
          maxX
        );
        const clampedY = Math.min(
          Math.max(PANEL_BOUNDS_MARGIN, state.position.y),
          maxY
        );

        if (clampedX !== state.position.x || clampedY !== state.position.y) {
          useTradePanelStore.setState({
            position: { x: clampedX, y: clampedY },
          });
        }
      },
    }
  )
);
