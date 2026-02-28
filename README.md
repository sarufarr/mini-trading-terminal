# Mini Trading Terminal

A mini trading terminal on Solana: Codex data, Raydium CLMM / Jupiter quotes and orders, floating trade panel, confirm-before-send, optimistic updates.

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Or with yarn (project includes `yarn.lock`):

```bash
yarn
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (port is set to 3000 in `vite.config.ts`).

## Security & deployment

This app reads the wallet private key from the `VITE_SOLANA_PRIVATE_KEY` frontend env. **Use only for development or internal tools.** Do not expose the key in the client in production: perform signing and RPC calls in a backend and have the frontend talk to your API.

## Changelog

- **axios** ^1.13.6 — fixes CVE-2026-25639 (mergeConfig DoS via `__proto__` in config).
- **@codex-data/sdk** ^1.0.6 — token data, pairs, charts via Codex API.
- **Optimistic trade UI**: On confirm, balances update immediately (SOL/token deltas); on confirmed → keep and show success toast; on fail/timeout → revert and show error. `optimistic-trade.store`, `onSent` in `useTrade`, BuyPanel/SellPanel apply deltas to displayed balances.
- **Confirm-before-send**: Floating panel calls `prepareTrade` (build + balance check only), then a confirm modal shows fund-flow summary; on confirm, `executeTrade` is called with `preBuilt` (no second build).
- **Preferred swap provider**: `trade.store` holds `preferredSwapProvider` (Raydium CLMM | Jupiter | null). When quote is from Raydium, Jupiter is fetched in background; if Jupiter is ≥0.5% better, `showBetterPriceToast` offers "Switch". `resolveSwapProvider` uses preferred when set and available, else Raydium then Jupiter.
- **Pull-to-refresh / load more**: Token and Network pages are wrapped in `PullToRefresh`; VirtualTable and VirtualList support `onRefresh`/`refreshing`; VirtualTable also supports `onLoadMore`/`hasMore` with scroll-to-bottom. Pull-to-refresh uses `touchMove` + native `touchmove` with `{ passive: false }` so it triggers reliably at top (not stolen by browser overscroll).
- **Tests**: FloatingTradingPanel, optimistic-trade store, trade-toast, PullToRefresh, VirtualTable, VirtualList, HomePage, NetworkPage, NetworkList specs; full suite: `npm run test`.
- **Web Vitals & Lighthouse**: LCP, FCP, INP, CLS, TTFB reported in `src/lib/report-web-vitals.ts` via `web-vitals` (dev console + optional `gtag`). Lighthouse: `npm run lighthouse` (HTML report), `npm run lighthouse:ci` (JSON); run after `npm run preview`.
- **Route code-splitting & build**: Network and Token pages are lazy-loaded via `React.lazy` + `Suspense`; Vite uses Rollup default chunk strategy (no manualChunks to avoid CJS cross-chunk and circular dependency issues); codex loads with the route. Brotli/gzip and Web Workers optimizations below.
- **Brotli / gzip**: `vite-plugin-compression2` generates `.br` and `.gz` for JS/CSS/HTML (threshold 1KB) on build. Deploy with a server that serves pre-compressed files (e.g. nginx `brotli_static on`, `gzip_static on`) so clients get the smallest response.
- **Web Workers**: CLMM parsing and math (pool parse, quote, `getAmountOut`, `getEndSqrtPrice`, `sqrtPriceX64ToTick`) run in `raydium-clmm.worker.ts`; price-impact status in `compute.worker.ts`. Local quote uses `getLocalClmmQuoteAsync` / `getLocalSwapQuoteAsync` so the main thread stays free for 60fps.
- **React.memo & useMemo**: Quote and price-impact use stable refs: `usePriceImpactStatus` returns memoized `priceImpactStatus` keyed by `effectivePct`/`isWarn`/`isBlock`; `QuoteInfo` uses custom `areEqual`; `useSwapQuote` returns a memoized object; BuyPanel/SellPanel use `useMemo` for `balanceRow`/`quoteRow` and `useCallback` for preset handlers to avoid unnecessary re-renders on high-frequency price updates.
- **Network page**: Token list uses `VirtualTable` inside a Card (same pattern as Recent Transactions); pull-to-refresh at page and table level; empty state "No tokens found on this network."
- **Chart**: TokenChart X/Y axis: Y-domain with padding from data; X-ticks de-duplicated by formatted label; `tickCount` for Y to reduce duplicate labels.

**Docs**: `docs/virtual-list-and-pull-to-refresh.md` — virtual list & pull-to-refresh checklist and usage.

### Trading & Swap

- **Raydium CLMM** (`src/lib/raydium-clmm/*`): `findClmmPool` (quote default SOL/WSOL), 5min pool cache, `swap_v2` + Token2022. Pool/instruction/tick-array/math aligned with on-chain layout.
- **Tick arrays**: `getSwapTickArrays(poolId, tickCurrent, tickSpacing, zeroForOne, endTick)` returns PDAs for all tick arrays crossed by the swap. If `endTick` is known (from `getEndSqrtPriceX64AfterSwapInWorker` → `sqrtPriceX64ToTickInWorker`), uses `getTickArrayStartIndicesInRange` to walk from current to end (direction: zeroForOne → lower ticks, else higher); else returns 3 arrays (current ± step). Max 10 tick arrays per swap; CU limit derived from count (`computeUnitLimitForTickArrays`).
- **Swap** (`src/lib/swap/`): `resolveSwapProvider(connection, tokenAddress, networkId, preferredProvider?)` — when `preferredProvider` is set and that provider is available, use it; otherwise try Raydium then Jupiter. `buildSwapTransaction` uses the resolved provider; `BuildTransactionParams.amount` is the input amount.
- **Workers**: CLMM pool parse, quote, `getAmountOut`, `getEndSqrtPrice`, `sqrtPriceX64ToTick` in `raydium-clmm.worker.ts`; price-impact status in `compute.worker.ts`. Local quote path uses `getLocalClmmQuoteAsync` / `getLocalSwapQuoteAsync` so the main thread stays free.
- **Jito** (`src/lib/jito.ts`), **Connection** (`src/lib/solana.ts`): env validated via Zod; keypair Base58; send/simulate/confirm.

### Caching

- Pool: `tokenMint:quoteMint` → 5min TTL; cache `null` to avoid repeated scans.
- Token program: SPL vs Token-2022 by mint, session-scoped.

### UI & Store

- Slippage 0.1%–50% (10–5000 bps), presets 0.5%/1%/2%, default 1%; persisted (`floating-trade-panel`). Floating panel is draggable/resizable; position/size/slippage persisted; **onRehydrateStorage** clamps position to viewport (`getViewportSize()`) so the panel is never off-screen after load. `useTrade`: `phase` + `execute(params)`.
- **Floating bounds**: Position kept inside viewport with margin (`PANEL_BOUNDS_MARGIN` 12px); drag/size/rehydrate and window resize all use `clampPosition` so the panel never goes off-screen. Resize: min 280×400, max 520×680 (`useResizable`); default 320×480; on window resize, position is scaled by viewport ratio then re-clamped.
- **Memo / useMemo**: BuyPanel and SellPanel use stable `balanceRow`/`quoteRow` (useMemo), stable preset callbacks (useCallback), and `usePriceImpactStatus` + `QuoteInfo` custom areEqual to avoid unnecessary re-renders on frequent quote updates (see Changelog → React.memo & useMemo).

### Environment Variables

Validated at load (`src/env.ts`, Zod). Invalid config throws.

| Variable                        | Required | Description                                                                |
| ------------------------------- | -------- | -------------------------------------------------------------------------- |
| `VITE_CODEX_API_KEY`            | ✓        | Codex API key                                                              |
| `VITE_HELIUS_RPC_URL`           | ✓        | Helius RPC URL                                                             |
| `VITE_SOLANA_PRIVATE_KEY`       | ✓        | Wallet private key (Base58)                                                |
| `VITE_JUPITER_REFERRAL_ACCOUNT` |          | Jupiter referral account                                                   |
| `VITE_JITO_BLOCK_ENGINE_URL`    |          | Jito Block Engine; empty = direct RPC                                      |
| `VITE_JITO_TIP_ACCOUNT`         |          | Jito tip account; empty = random from `getTipAccounts`                     |
| `VITE_JITO_TIP_LAMPORTS`        |          | Tip lamports (parsed as number); default 10000                             |
| `VITE_DRY_RUN`                  |          | `true`/`1` = simulate only (no send)                                       |
| `VITE_DRY_RUN_RESULT`           |          | With DRY_RUN: `success` (default) or `fail`/`failure` for error-toast test |

### Codex

- **Codex provider** (`src/contexts/codex-provider.tsx`): `CodexProvider`; **hook** (`src/contexts/use-codex-client.ts`): `useCodexClient`. Supports injected client/apiKey for tests.
- **lib/codex.ts**: `getCodexClient`, `isPairFilterResult`; re-exports types from `@/lib/codex-types`.
- **lib/codex-types.ts**: Single re-export of Codex SDK types from `@codex-data/sdk/dist/...` (EnhancedToken, PairFilterResult, PairRankingAttribute, RankingDirection, TokenRankingAttribute, TokenFilterResult). Update this file only when the SDK or dist path changes.

### Trading UI

Inline **TradingPanel** (`src/components/TradingPanel/`: Header, Balance, Tabs, BuyForm, SellForm, Footer) for Buy (SOL amount) and Sell (% balance) on the token page sidebar. **FloatingTradingPanel**: same slippage/phase; presets 0.5%/1%/2%, default 1%; **confirm modal** before send (prepareTrade → user confirms → execute with preBuilt). Confirm modal state and handlers live in `useTradeConfirmFlow` (BuyPanel/SellPanel). **Buy**: SOL presets 0.0001/0.001/0.01/0.1; `AmountInputWithMax`, `PresetButtons`, `BalanceRowWithPresetBadge`. **Sell**: % presets 25/50/75/100.

### Trading Pipeline

- **Raydium**: Base input (`swap_v2` + `is_base_input`), `calcMinAmountOut` for slippage; SOL↔Token only; fallback Jupiter.
- **Pre-flight**: simulate → parse slippage (6001/6010/0x1771) or logs → user message.
- **Dry run**: no send; fake txid + toasts; `VITE_DRY_RUN_RESULT=fail` for error path.
- **Jito**: optional bundle (swap + tip tx); txid from first sig.
- **Flow**: `executeTrade` uses **resolveTradeAmountAndMints** for atomic amount (SELL: cap to on-chain balance) and mints; then build (or preBuilt) → sign → simulate → send → confirm. Callbacks: `onBeforeSend`, `onAfterSend(txid)`, `onSuccess`. SOL: WSOL ATA + sync + close after swap.

#### Buy/Sell execution flow (from user action to done)

1. **User input**
   - Buy: SOL amount (presets 0.0001–0.1 or custom). Sell: percentage of token balance (presets 25/50/75/100). Slippage from store (default 1%, presets 0.5%/1%/2%).

2. **Quote**
   - `useSwapQuote`: debounced fetch; `getSwapQuote(…, preferredSwapProvider)`.
   - **Provider resolve**: `resolveSwapProvider(connection, tokenAddress, networkId, preferredSwapProvider)`. If preferred is set (e.g. user clicked "Switch" on better-price toast) and that provider is available → use it; else try Raydium CLMM then Jupiter.
   - **Raydium path**: `findClmmPool(connection, tokenMint, NATIVE_MINT)` (cache 5min); `fetchPoolState` → `sqrtPriceX64`, `liquidity`, `tickCurrent`, `tickSpacing`. Quote: `getClmmQuote` → worker `calcQuoteInWorker` for `minAmountOut`. Build: `getEndSqrtPriceX64AfterSwapInWorker` → `sqrtPriceX64ToTickInWorker` → **tick arrays**: `getSwapTickArrays(poolId, tickCurrent, tickSpacing, zeroForOne, endTick)` → PDAs for tick arrays in swap direction (current to end, or 3 arrays if no end); `buildSwapBaseInputInstruction` with those accounts.
   - **Better price**: When primary quote is Raydium, Jupiter quote is fetched in background; if Jupiter output > Raydium by ≥0.5% (`BETTER_PRICE_THRESHOLD_BPS`), `showBetterPriceToast` offers "Switch"; on click, `setPreferredSwapProvider('Jupiter')` and refetch.

3. **Confirm (Floating panel)**
   - User clicks Buy/Sell → `prepareTrade({ tokenAddress, networkId, params, preferredSwapProvider })`. No sign/send.
   - **prepareTrade**: calls `resolveTradeAmountAndMints` (balance fetch + validate + SELL cap), then `buildSwapTransaction(…, preferredSwapProvider)`. Returns `{ transaction, blockhashCtx }`.
   - Confirm modal (state from `useTradeConfirmFlow`) shows fund-flow summary; user confirms or cancels.

4. **Execute**
   - On confirm: `execute(params, preBuilt)` where `preBuilt = { transaction, blockhashCtx }`.
   - **executeTrade** with `preBuilt`: skip build; sign → get pre-balance state → simulate (slippage/phishing checks) → if dry run, fake txid and exit; else send (RPC or Jito bundle) → `onBeforeSend` → send → `onAfterSend(txid)` → confirm → `onSuccess`. RPC path: on send/confirm failure, retry only rebuilds (fresh blockhash) → sign → send → confirm (no re-simulate).
   - **Optimistic UI**: Panels pass `onSent(txid)` to `useTrade`. On `onAfterSend`, `setOptimistic({ tokenAddress, txid, direction, solDelta, tokenDelta })`; displayed balance = API balance + deltas. On success (`executeTradeWithToast` returns txid), `clearOptimistic` and show success toast; on error/no txid, `clearOptimistic` and show error toast (revert displayed balance).

5. **Phases**
   - `useTrade` phase: IDLE → AWAITING_SIGNATURE (execute called) → SENDING (onBeforeSend) → CONFIRMING (onAfterSend) → SUCCESS or ERROR. Success auto-resets to IDLE after `SUCCESS_RESET_MS`.

### Balance

- **UI**: Codex API (`useBalance`), refresh on trade success; may lag. Floating panel shows balance + optimistic deltas (from `optimistic-trade.store`) while a trade is in flight; reverted on error.
- **Pre-send**: RPC balance check; BUY = sol >= amount + fee + tip; SELL = fetch balance, cap amount, then check.

### Service

`src/service/trade-service.ts`: **resolveTradeAmountAndMints** centralizes balance fetch, validation, and SELL cap; used by both **prepareTrade** and **executeTrade**. **executeTrade(options)**: resolve amount/mints → build (or use preBuilt) → sign → simulate → send (RPC or Jito) → confirm. RPC retry: rebuild (fresh blockhash) → sign → send → confirm only (no duplicate simulate/phishing). Exports: `TradeExecuteParams`, `PrepareTradeResult`, `calculateTradeAtomicAmount`, `getTradeConfig`, `resolveTradeAmountAndMints`, etc. Tests: `trade-service.spec.ts`.

### Scripts & quality

- **Self-test**: `npm run check` — runs Prettier check, ESLint, and Vitest. Use before commit.
- **Pre-commit**: Run `npm run format` or `npx prettier --write .` to format code before commit.
- `npm test` / `npm run test:watch` — Vitest.
- `npm run format` / `npm run format:check` — Prettier.
- `npm run lint` — ESLint.
- **Lighthouse**: `npm run lighthouse` (run after `npm run preview`) — performance audit, HTML report. `npm run lighthouse:ci` — JSON output for CI.

### Performance (Web Vitals & Lighthouse)

- **Web Vitals** (`src/lib/report-web-vitals.ts`): LCP, FCP, INP, CLS, TTFB are reported on load. In dev, metrics are logged to the console `[Web Vitals]`. Optional: set `window.gtag` to send to Google Analytics.
- **Lighthouse**: Build and run a local preview, then audit:
  ```bash
  npm run build && npm run preview
  # In another terminal:
  npm run lighthouse
  ```
  Opens the performance report (HTML). For CI or JSON output: `npm run lighthouse:ci` (expects `http://localhost:4173`).
- **Optimizations**:
  - **Route code-splitting**: A single catch-all route `/*` lazy-loads `AppCodexRoutes` (CodexProvider + nested routes). Home, Network, and Token pages are lazy inside it; Suspense uses shared `LoadingFallback`. Main bundle does not include pages or Codex SDK; FCP/LCP improve via deferred loading.
  - **Chunk strategy**: Rollup default chunk (no manualChunks) so load order matches the dependency graph and avoids cross-chunk undefined and circular refs.
  - **Web Workers**: CLMM and price-impact heavy work run in workers; see Changelog → Web Workers.
  - **React.memo / useMemo**: Stable refs for quote and price-impact to reduce re-renders; see Changelog → React.memo & useMemo.
  - **Chunk size**: `chunkSizeWarningLimit: 600`; consider dynamic import for heavy screens if needed.

## Report

Lighthouse performance audit for the optimized build (route code-splitting, Web Workers, memo/useMemo).

### How to generate

1. Build and serve: `npm run build && npm run preview`
2. In another terminal run Lighthouse: `npm run lighthouse:ci` (writes `lighthouse-report.json`) or `npm run lighthouse` (opens HTML report in browser)
3. Generate table from JSON: `npm run report:lighthouse` — prints a table to stdout; paste it into the **Performance audit** table above to keep the report current.

### Performance audit

| Metric                   | Value                    |
| ------------------------ | ------------------------ |
| **Performance score**    | **94** / 100             |
| First Contentful Paint   | 1.7 s                    |
| Largest Contentful Paint | 3.0 s                    |
| Total Blocking Time      | 30 ms                    |
| Cumulative Layout Shift  | 0                        |
| Speed Index              | 2.2 s                    |
| Time to First Byte       | Root document took 10 ms |

_Generated from `lighthouse-report.json` (run `npm run lighthouse:ci` after `npm run preview`)._
