import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ETradeDirection } from '@/types/trade';
import { getViewportSize } from '@/lib/dom';
import { DEFAULT_SLIPPAGE_BPS } from '@/constants/trade';

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
  slippageBps: number;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setPosition: (position: Position) => void;
  setSize: (size: Size) => void;
  setActiveTab: (activeTab: ETradeDirection) => void;
  setSlippageBps: (slippageBps: number) => void;
}

const PANEL_DEFAULT_SIZE: Size = { width: 320, height: 480 };
export const PANEL_BOUNDS_MARGIN = 12;

export const useTradePanelStore = create<TradePanelStore>()(
  persist(
    (set) => ({
      isOpen: false,
      position: { x: 0, y: 0 },
      size: PANEL_DEFAULT_SIZE,
      activeTab: ETradeDirection.BUY,
      slippageBps: DEFAULT_SLIPPAGE_BPS,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setPosition: (position) => set({ position }),
      setSize: (size) => set({ size }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setSlippageBps: (slippageBps) => set({ slippageBps }),
    }),
    {
      name: 'floating-trade-panel',
      partialize: (s) => ({
        position: s.position,
        size: s.size,
        slippageBps: s.slippageBps,
      }),
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
