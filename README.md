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

- **axios** upgraded to ^1.13.6 to address **CVE-2026-25639**. In versions prior to 1.13.5, the `mergeConfig` function could throw a TypeError when processing config objects that contain `__proto__` as an own property, allowing denial-of-service via malicious JSON-parsed input. Upgrading mitigates this vulnerability.

### Trading & Swap

- **Raydium CLMM**: `src/lib/raydium-clmm/*`; `findClmmPool(tokenMint, quoteMint?)` defaults to SOL/WSOL as quote (`NATIVE_MINT`); pool cache with 5-minute TTL; pool state layout and tick-array PDA (60 ticks, i32 big-endian start index) aligned with on-chain structs; swap uses `swap_v2` instruction (Token2022).
  - **Pool** (`pool.ts`): `fetchPoolState(poolId)` parses account with layout matching chain `PoolState` (no padding between `tick_spacing` and `liquidity`). `findClmmPool` filters by `dataSize` + mint memcmp, picks highest-liquidity pool per token pair.
  - **Instruction** (`instruction.ts`): 41-byte data = discriminator (8) + amount (8) + other_amount_threshold (8) + sqrt_price_limit (16) + is_base_input (1). Account order: payer, amm_config, pool_state, input/output ATAs, vaults, observation, token programs, memo, mints, 3 tick arrays. Token program (SPL vs Token-2022) resolved per mint.
  - **Tick array** (`tick-array.ts`): PDA seeds `["tick_array", poolId, i32ToBeBytes(startIndex)]`; `getSwapTickArrays` returns 3 PDAs for current ± step; start index = `floor(tick / (tickSpacing*60)) * (tickSpacing*60)`.
  - **Math** (`math.ts`): `sqrtPriceX64ToPrice` (Q64.64 → token1/token0); `calcMinAmountOut(amountIn, price, slippageBps)` = amountIn × price × (1 − slippageBps/10000), rounded down.
- **Swap layer**: `src/lib/swap/`; `buildSwapTransaction` → `resolveSwapProvider` (Raydium first, then Jupiter). `BuildTransactionParams.amount` is always **input**; provider computes min out and passes to instruction builder.
- **Jito**: `src/lib/jito.ts`; axios 15s timeout; tip account string trimmed; bundle id logged for debug.
- **Env**: Jito env vars transform empty strings to `undefined` via zod.
- **Connection**: `src/lib/solana.ts` — `Connection(env.VITE_HELIUS_RPC_URL)`; keypair from Base58 private key; `sendTransaction`, `simulateTransaction` (commitment `processed`, sigVerify), `confirmTransaction` (commitment `confirmed`).

### Caching

- **Pool address cache** (`src/lib/raydium-clmm/pool.ts`): Results of `findClmmPool` are cached by `tokenMint:quoteMint`. `CachedPoolEntry = { value: PublicKey | null, expiresAt }`; TTL 5 minutes (`POOL_CACHE_TTL_MS`). On cache hit (if not expired), return immediately; on miss or expiry, call `getProgramAccounts`, pick the highest-liquidity pool and write to cache; also cache `null` when no pool exists to avoid repeated chain scans.
- **Token program cache** (`src/lib/raydium-clmm/instruction.ts`): `getTokenProgramId(mint)` caches SPL vs Token-2022 program ID by mint address. `Map<mint.toString(), PublicKey>`, no TTL, valid for the session; populated after resolving via `getAccountInfo(mint).owner`.

### UI & Store

- **Slippage**: `SlippageSelector` component with presets and manual input (0.1%–50%); `slippageBps` persisted in store (persist key `floating-trade-panel`).
- **FloatingTradingPanel**: Draggable and resizable; position, size, and slippage persisted via Zustand `persist`; selectors split to avoid `Maximum update depth exceeded`. Rehydrate clamps position to viewport using `getViewportSize()`.
- **Viewport**: Rehydrate uses `getViewportSize()` (`src/lib/dom.ts`: `visualViewport` → `documentElement.clientWidth/Height` → `window.innerWidth/innerHeight` fallback) instead of raw `window.innerWidth`/`innerHeight`.
- **Trade phase**: `useTrade` exposes `phase` (idle / building / awaiting-signature / sending / confirming / success / error) and `execute(params)`; success resets to idle after 4s.

### Environment Variables

- Validated at app load via `src/env.ts` (Zod); `import.meta.env`; invalid config throws an error. Type `Env` is exported for type reuse.

| Variable                        | Required | Description                                                                                                                                                      |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_CODEX_API_KEY`            | ✓        | Codex API key                                                                                                                                                    |
| `VITE_HELIUS_RPC_URL`           | ✓        | Helius RPC URL                                                                                                                                                   |
| `VITE_SOLANA_PRIVATE_KEY`       | ✓        | Wallet private key (Base58)                                                                                                                                      |
| `VITE_JUPITER_REFERRAL_ACCOUNT` |          | Jupiter referral account                                                                                                                                         |
| `VITE_JITO_BLOCK_ENGINE_URL`    |          | Jito Block Engine URL; leave empty to use direct RPC                                                                                                             |
| `VITE_JITO_TIP_ACCOUNT`         |          | Jito tip account; leave empty to pick randomly from `getTipAccounts`                                                                                             |
| `VITE_JITO_TIP_LAMPORTS`        |          | Lamports per tip; default 10000                                                                                                                                  |
| `VITE_DRY_RUN`                  |          | Set to `true` or `1` to only simulate trades (no send). No SOL spent. Success/error toasts still show.                                                           |
| `VITE_DRY_RUN_RESULT`           |          | When `VITE_DRY_RUN` is set: `success` (default) = simulate success and show success toast; `fail` or `failure` = simulate on-chain failure and show error toast. |

### Trading UI

- **Inline panel**: `TradingPanel` on the token page (`TokenPage`); Buy mode = SOL amount input; Sell mode = percentage of token balance (0–100).
- **Floating panel**: Draggable, resizable `FloatingTradingPanel` with Buy/Sell tabs; position and size persisted; same slippage and phase as inline.
- **Slippage**: Presets 0.5%, 1%, 2% (`SLIPPAGE_PRESETS_BPS` [50, 100, 200]); manual range 0.1%–50%; default 1% (`DEFAULT_SLIPPAGE_BPS`). Persisted in store.

### Trading Pipeline

- **Raydium CLMM (in-house)**: Connects directly to the chain via Helius RPC, parses pool state, and builds swap instructions in **Base Input** mode without the Raydium SDK. There is no separate on-chain `swap_base_input` instruction: we use the `swap_v2` instruction and set `is_base_input = true` (last byte of instruction data). The user specifies “how much to spend” (amount in); we precompute “minimum amount out” (`other_amount_threshold`) for slippage protection via `calcMinAmountOut`. Both **Buy** (spend SOL) and **Sell** (spend token) flows use this base-input semantics. Only SOL↔Token pools; falls back to Jupiter when no pool exists.
- **Jupiter**: Fallback aggregator when `findClmmPool` returns null for the token.
- **Pre-flight**: `executeTrade` calls `simulateTransaction(signed)` (commitment `processed`, `sigVerify: true`) before sending; on error, parses `InstructionError` index and looks for slippage/error lines in logs to surface a readable message.
- **Dry run**: When `VITE_DRY_RUN` is `true` or `1`, after a successful simulation the transaction is **not** sent. A fake txid is returned and `onAfterSend` is called, so the UI still shows the **success toast**. Use `VITE_DRY_RUN_RESULT=fail` (or `failure`) to simulate an on-chain failure and test the **error toast** path. Console warns `[trade] DRY RUN: ...` accordingly.
- **Jito Bundle (optional)**: When `VITE_JITO_BLOCK_ENGINE_URL` is set, swap tx and a tip tx (lamports to `getRandomJitoTipAccount()`, default 10000 if `VITE_JITO_TIP_LAMPORTS` unset) are sent via `sendJitoBundle([signed, tipTx])`; txid is taken from the first signature; confirmation uses `confirmTransaction(txid, blockhashCtx)` with `confirmed`.
- **Execution flow** (`src/service/trade-service.ts`): `executeTrade` → `calculateTradeAtomicAmount` (BUY: value × LAMPORTS_PER_SOL; SELL: tokenAtomicBalance × value/100) → `buildSwapTransaction` → sign with keypair from `VITE_SOLANA_PRIVATE_KEY` → simulate → send (direct RPC or Jito bundle) → confirm. Callbacks: `onBeforeSend`, `onAfterSend(txid)`, `onSuccess` (optional, e.g. refresh balance).
- **SOL handling** (`buildClmmSwapTransaction`): If input is SOL: create WSOL ATA (idempotent), transfer lamports, `createSyncNativeInstruction`. Always create output token ATA (idempotent). After swap instruction: if input or output is SOL, add `createCloseAccountInstruction(wsolATA)` to return rent.

### Balance (display vs validation)

- **Display (UI)**: `useBalance` (`src/hooks/use-balance.ts`) fetches **Codex API** (`codexClient.queries.balances`) by `networkId` + `walletAddress`; native and token balances come from `response.balances.items` (tokenId `native:${networkId}` and `${tokenAddress}:${networkId}`). Refreshed on mount/deps change and manually after trade success (`refreshBalance`). No polling; Codex may have indexing delay.
- **Validation (pre-send, non–dry-run only)**: In `executeTrade`, before building the tx, balances are checked via **RPC** (`src/lib/solana.ts`): `getSolanaBalance` = `connection.getBalance`, `getTokenBalance` = mint’s token program from `getAccountInfo(mint).owner` → ATA via `getAssociatedTokenAddressSync` → `getTokenAccountBalance`. **BUY**: require `solBalance >= amount (lamports) + FEE_RESERVE_LAMPORTS + Jito tip (if enabled)`. `FEE_RESERVE_LAMPORTS` (1M = 0.001 SOL) is in `src/constants/trade.ts`, also used by BuyPanel "Max". **SELL**: require token ATA balance >= sell amount (atoms). Using RPC for validation ensures the check reflects on-chain state before send; UI may show Codex-cached values that lag slightly.

### Service

- **Trade service** (`src/service/trade-service.ts`): Entry point `executeTrade(options)`; orchestrates build, sign, simulate, send, and confirm; used by the UI (e.g. `useTrade`).
  - **Input**: `ExecuteTradeOptions`: `tokenAddress`, `networkId`, `params` (`TradeExecuteParams`), `onBeforeSend`, `onAfterSend`, `onSuccess` (optional, called on success including dry run; e.g. refresh balance). `params` distinguishes BUY (`value` = SOL amount) from SELL (`value` = percentage 0–100, `tokenAtomicBalance` required); optional `slippageBps`, default `DEFAULT_SLIPPAGE_BPS`.
  - **Atomic amount**: `calculateTradeAtomicAmount(params)` — BUY = `value × LAMPORTS_PER_SOL`; SELL = `tokenAtomicBalance × value / 100`. Exported for use in the UI for estimates and similar.
  - **Flow**: Build unsigned tx via `buildSwapTransaction` → `signTransaction(keypair, transaction)` → `simulateTransaction(signed)`; if `simulation.err`, detect slippage (Jupiter 6001 / regex) or parse logs (InstructionError, slippage/error lines) into a readable message and throw without sending. After a successful simulation: if `VITE_DRY_RUN`, then if `VITE_DRY_RUN_RESULT=fail` throw (error toast), else return fake txid and skip send (success toast); else if Jito is configured, get tip account, build tip tx, `sendJitoBundle([signed, tipTx])`; otherwise `sendTransaction(signed)`. Txid from signatures (first tx when using Jito); `confirmAndNotify(txid, blockhashCtx, onAfterSend)` calls `onAfterSend(txid)` then `confirmTransaction`; throws if chain returns `result.value.err`.
  - **Exports**: `ETradeDirection` (BUY/SELL), `TradeExecuteParams`, `ExecuteTradeOptions`, `calculateTradeAtomicAmount`, `executeTrade`. Unit tests: `trade-service.spec.ts`.

### Scripts & quality

- **Test**: `npm test` runs `vitest run` (single run, CI-friendly); `npm run test:watch` runs `vitest` in watch mode.
- **Format**: `npm run format` (Prettier write); `npm run format:check` (check only). Pre-commit: run Prettier on changed files before commit.
- **Lint**: `npm run lint` (ESLint, ts/tsx).
