# Store slices and re-renders

Zustand slices: `useTradeStore` (trade input / slippage / phase), `usePoolStore` (CLMM pool / Tick cache), `useTradePanelStore` (panel UI). Use **selectors** and **subscribe** so only affected components re-render.

## 1. Single-field selector

Only that field triggers re-render.

```tsx
// Re-render only when slippageBps changes
const slippageBps = useTradeStore((s) => s.slippageBps);

// Re-render only when this token's buy amount changes
const amount = useTradeStore(
  (s) => s.amountByToken[tokenAddress]?.buyAmount ?? ''
);
```

## 2. Multiple fields with useShallow

Use `useShallow` for shallow compare when reading several fields; otherwise every `setState` creates new references and triggers re-renders.

```tsx
import { useShallow } from 'zustand/react/shallow';

const { amount, setBuyAmount } = useTradeStore(
  useShallow((s) => ({
    amount: s.amountByToken[token]?.buyAmount ?? '',
    setBuyAmount: s.setBuyAmount,
  }))
);
```

## 3. subscribe + useSyncExternalStore

When you want to bind Zustand's `subscribe` via React's `useSyncExternalStore` instead of a selector (e.g. for non-React access or SSR snapshot).

```tsx
import { useSyncExternalStore } from 'react';

function getSlippageBpsSnapshot() {
  return useTradeStore.getState().slippageBps;
}

function subscribeToSlippageBps(callback: () => void) {
  return useTradeStore.subscribe(callback);
}

const slippageBps = useSyncExternalStore(
  subscribeToSlippageBps,
  getSlippageBpsSnapshot,
  () => DEFAULT_SLIPPAGE_BPS // SSR
);
```

Note: `subscribe(callback)` runs on **any** store update. To run only when `slippageBps` changes, use `subscribeWithSelector`:

```ts
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create(
  subscribeWithSelector((set) => ({ ... }))
);

useStore.subscribe(
  (s) => s.slippageBps,
  (bps, prevBps) => { if (bps !== prevBps) callback(); }
);
```

## 4. Subscribing to one token's pool (usePoolStore)

```tsx
const pool = usePoolStore((s) => s.pools[tokenAddress]);

const hasPool = usePoolStore(useShallow((s) => !!s.pools[tokenAddress]));
```

## 5. Trade phase (useTradeStore.tradePhase)

`useTrade` syncs phase to `useTradeStore.tradePhase`; any component can subscribe to phase only:

```tsx
const phase = useTradeStore((s) => s.tradePhase);
```

## Files

| File                   | Responsibility                                |
| ---------------------- | --------------------------------------------- |
| `trade.store.ts`       | Amount, slippage, preferred path, trade phase |
| `pool.store.ts`        | CLMM pool snapshot, Tick cache                |
| `trade-panel.store.ts` | Panel open/close, position, size, tab         |
