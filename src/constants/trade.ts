export const DEFAULT_SLIPPAGE_BPS = 100;
export const SLIPPAGE_PRESETS_BPS = [50, 100, 200];
export const SLIPPAGE_MIN_BPS = 10;
export const SLIPPAGE_MAX_BPS = 5000;

export const FEE_RESERVE_LAMPORTS = 1_000_000;
export const FEE_RESERVE_SOL = FEE_RESERVE_LAMPORTS / 1e9;

/** Native token (SOL) decimals for display and balance. */
export const NATIVE_DECIMALS = 9;

/** Decimal places for SOL amount display (e.g. toFixed). */
export const SOL_DISPLAY_DECIMALS = 4;

export const SOLSCAN_TX_URL = 'https://solscan.io/tx';

export const SOL_PRESETS = [0.0001, 0.001, 0.01, 0.1];

export const SELL_PCT_PRESETS = [25, 50, 75, 100];

export const DEFAULT_JITO_TIP_LAMPORTS = 10_000;

/** Seconds in one day, for chart/range queries */
export const SECONDS_PER_DAY = 86400;

/** Epsilon for amount equality (e.g. preset vs input). */
export const AMOUNT_EPSILON = 1e-9;

/** Epsilon for "at max" SOL amount comparison. */
export const MAX_AMOUNT_EPSILON = 1e-6;

/** Threshold above which to show sell amount in exponential form */
export const SELL_AMOUNT_EXP_THRESHOLD_HIGH = 1e9;
export const SELL_AMOUNT_EXP_THRESHOLD_LOW = 1e-9;

/** Chart bar resolution in minutes (Codex getBars). */
export const CHART_RESOLUTION_MINUTES = '30';

/** Default limit for token events and pairs on token page. */
export const DEFAULT_TOKEN_EVENTS_LIMIT = 50;
export const DEFAULT_TOKEN_PAIRS_LIMIT = 50;

/** InstructionError Custom codes for slippage (Jupiter 6001, Raydium CLMM 6010, 0x1771). */
export const SLIPPAGE_ERROR_CODES = [6001, 6010, 0x1771] as const;

/** Regex to detect slippage-related error messages (codes + SlippageToleranceExceeded). */
export const SLIPPAGE_ERROR_PATTERN =
  /0x1771|6001|6010|SlippageToleranceExceeded/i;

/** Price impact (from quote) above this % triggers a warning. */
export const PRICE_IMPACT_WARN_PCT = 3;

/** Price impact above this % blocks trade (user must reduce amount or wait). */
export const PRICE_IMPACT_BLOCK_PCT = 5;

/** Jupiter must be at least this much better than Raydium (bps) to suggest switch. 50 = 0.5% */
export const BETTER_PRICE_THRESHOLD_BPS = 50;

/** Anti-phishing: max allowed SOL outflow (lamports); above = anomaly. ~0.05 SOL */
export const PHISHING_FEE_TOLERANCE_LAMPORTS = 50_000_000;

/** Anti-phishing: extra slippage bps allowed beyond user setting (e.g. 500 = 5%); above = block */
export const PHISHING_EXTRA_SLIPPAGE_BPS = 500;
