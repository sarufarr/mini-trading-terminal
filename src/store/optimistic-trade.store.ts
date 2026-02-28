/**
 * Optimistic update: apply to UI on send; keep on confirmed; caller clears on fail/timeout to rollback.
 */
import { create } from 'zustand';

export type OptimisticDirection = 'buy' | 'sell';

export interface OptimisticTradeState {
  tokenAddress: string;
  txid: string;
  direction: OptimisticDirection;
  solDelta: number;
  tokenDelta: number;
}

interface OptimisticTradeStore {
  optimistic: OptimisticTradeState | null;
  setOptimistic: (state: OptimisticTradeState) => void;
  clearOptimistic: () => void;
}

export const useOptimisticTradeStore = create<OptimisticTradeStore>((set) => ({
  optimistic: null,

  setOptimistic: (state) => set({ optimistic: state }),
  clearOptimistic: () => set({ optimistic: null }),
}));
