## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Security & deployment

This app loads the wallet private key from `VITE_SOLANA_PRIVATE_KEY` (env) in the frontend. **Use only for development or internal tools.** For production, do not expose the key in the client: run signing and RPC calls in a backend service and have the frontend call your API instead.

## Update

- **axios** ^1.13.6 - fixes CVE-2026-25639 (mergeConfig DoS via `__proto__` in config).
- **@codex-data/sdk** ^1.0.6 - token data, pairs, charts via Codex API.

### Trading & Swap

- **Raydium CLMM** (`src/lib/raydium-clmm/*`): `findClmmPool` (quote default SOL/WSOL), 5min pool cache, `swap_v2` + Token2022. Pool/instruction/tick-array/math aligned with on-chain layout.
- **Swap** (`src/lib/swap/`): `resolveSwapProvider` tries Raydium first, then Jupiter; `BuildTransactionParams.amount` = input.
- **Jito** (`src/lib/jito.ts`), **Connection** (`src/lib/solana.ts`): env via Zod; keypair Base58; send/simulate/confirm.

### Caching

- Pool: `tokenMint:quoteMint` → 5min TTL; cache `null` to avoid repeated scans.
- Token program: SPL vs Token-2022 by mint, session-scoped.

### UI & Store

- Slippage 0.1%-50% (10–5000 bps), presets 0.5%/1%/2%, default 1%; persisted (`floating-trade-panel`). Floating panel: draggable/resizable; position/size/slippage persisted; rehydrate clamps to viewport (`getViewportSize()`). `useTrade`: `phase` + `execute(params)`.
- **Floating bounds**: Position kept inside viewport with margin (`PANEL_BOUNDS_MARGIN` 12px); drag/size/rehydrate and window resize all use `clampPosition` so the panel never goes off-screen. Resize: min 280×400, max 520×680 (`useResizable`); default 320×480; on window resize, position is scaled by viewport ratio then re-clamped.

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
| `VITE_JITO_TIP_LAMPORTS`        |          | Tip lamports; default 10000                                                |
| `VITE_DRY_RUN`                  |          | `true`/`1` = simulate only (no send)                                       |
| `VITE_DRY_RUN_RESULT`           |          | With DRY_RUN: `success` (default) or `fail`/`failure` for error-toast test |

### Codex

- **CodexContext** (`src/contexts/CodexContext.tsx`): `CodexProvider`, `useCodexClient`; supports injected client/apiKey for tests.
- **lib/codex.ts**: `getCodexClient`, `isPairFilterResult`; re-exports `EnhancedToken`, `PairFilterResult`, `PairRankingAttribute`, `RankingDirection`.

### Trading UI

Inline `TradingPanel` (Buy = SOL amount, Sell = % balance). Floating panel: same slippage/phase; presets 0.5%/1%/2%, default 1%. **Buy**: SOL presets 0.0001/0.001/0.01/0.1; `AmountInputWithMax`, `PresetButtons`, `BalanceRowWithPresetBadge`. **Sell**: % presets 25/50/75/100.

### Trading Pipeline

- **Raydium**: Base input (`swap_v2` + `is_base_input`), `calcMinAmountOut` for slippage; SOL↔Token only; fallback Jupiter.
- **Pre-flight**: simulate → parse slippage (6001/6010) or logs → user message.
- **Dry run**: no send; fake txid + toasts; `VITE_DRY_RUN_RESULT=fail` for error path.
- **Jito**: optional bundle (swap + tip tx); txid from first sig.
- **Flow**: `executeTrade` → atomic amount (SELL: cap to on-chain balance) → build → sign → simulate → send → confirm. Callbacks: `onBeforeSend`, `onAfterSend(txid)`, `onSuccess`. SOL: WSOL ATA + sync + close after swap.

### Balance

- **UI**: Codex API (`useBalance`), refresh on trade success; may lag.
- **Pre-send**: RPC balance check; BUY = sol >= amount + fee + tip; SELL = fetch balance, cap amount, then check.

### Service

`executeTrade(options)` in `src/service/trade-service.ts`: build → sign → simulate → send (RPC or Jito) → confirm. Exports: `TradeExecuteParams`, `calculateTradeAtomicAmount`, `getTradeConfig`, etc. Tests: `trade-service.spec.ts`.

### Scripts & quality

- `npm test` / `npm run test:watch` (Vitest)
- `npm run format` / `npm run format:check` (Prettier); pre-commit: format changed files.
- `npm run lint` (ESLint)
