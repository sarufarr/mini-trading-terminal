/**
 * Trade slice: amount, slippage, preferred path, trade phase.
 *
 * ## Limit re-renders with selectors
 *
 * 1. **Single-field selector**: only that field triggers re-render
 * 2. **Multiple fields with useShallow**: avoid reference churn from setState
 * 3. **subscribe + useSyncExternalStore**: when you need non-React subscription or
 *    updates only when a slice changes (e.g. SlippageSelector only cares about slippageBps)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SLIPPAGE_BPS } from '@/constants/trade';
import { ETradePhaseStatus, type TradePhase } from '@/types/trade';

export interface AmountByToken {
  buyAmount: string;
  sellPercentage: string;
}

interface TradeStore {
  slippageBps: number;
  preferredSwapProvider: 'Raydium CLMM' | 'Jupiter' | null;
  amountByToken: Record<string, AmountByToken>;
  /** Current trade phase (global singleton, one trade at a time) */
  tradePhase: TradePhase;

  setSlippageBps: (bps: number) => void;
  setPreferredSwapProvider: (
    provider: 'Raydium CLMM' | 'Jupiter' | null
  ) => void;
  setBuyAmount: (tokenAddress: string, value: string) => void;
  setSellPercentage: (tokenAddress: string, value: string) => void;
  setTradePhase: (phase: TradePhase) => void;
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set) => ({
      slippageBps: DEFAULT_SLIPPAGE_BPS,
      preferredSwapProvider: null,
      amountByToken: {},
      tradePhase: { status: ETradePhaseStatus.IDLE } as TradePhase,

      setSlippageBps: (slippageBps) => set({ slippageBps }),
      setPreferredSwapProvider: (preferredSwapProvider) =>
        set({ preferredSwapProvider }),
      setBuyAmount: (tokenAddress, value) =>
        set((s) => ({
          amountByToken: {
            ...s.amountByToken,
            [tokenAddress]: {
              ...s.amountByToken[tokenAddress],
              buyAmount: value,
              sellPercentage:
                s.amountByToken[tokenAddress]?.sellPercentage ?? '',
            },
          },
        })),
      setSellPercentage: (tokenAddress, value) =>
        set((s) => ({
          amountByToken: {
            ...s.amountByToken,
            [tokenAddress]: {
              ...s.amountByToken[tokenAddress],
              buyAmount: s.amountByToken[tokenAddress]?.buyAmount ?? '',
              sellPercentage: value,
            },
          },
        })),
      setTradePhase: (tradePhase) => set({ tradePhase }),
    }),
    {
      name: 'trade-store',
      partialize: (s) => ({ slippageBps: s.slippageBps }),
    }
  )
);
