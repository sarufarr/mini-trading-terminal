/**
 * Trade retry with exponential backoff. On timeout/blockhash expiry etc. rebuild tx (new blockhash + priority fee) and resend.
 */

/** Retry config */
export interface RetryOptions {
  /** Max retries (excluding first attempt), e.g. 3 => 4 total tries */
  maxRetries?: number;
  /** Base delay (ms) */
  baseDelayMs?: number;
  /** Backoff multiplier */
  multiplier?: number;
  /** Max delay (ms) */
  maxDelayMs?: number;
  /** Called before each retry (logging/metrics) */
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> & {
  onRetry?: RetryOptions['onRetry'];
} = {
  maxRetries: 3,
  baseDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 15_000,
};

/** Wait time (ms) before the attempt-th retry */
export function getBackoffDelayMs(
  attempt: number,
  options: RetryOptions = {}
): number {
  const { baseDelayMs, multiplier, maxDelayMs } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const delay = baseDelayMs * Math.pow(multiplier, attempt);
  return Math.min(maxDelayMs, Math.max(0, Math.floor(delay)));
}

/** Keywords for retryable errors (timeout, block expired, network, etc.) */
const RETRYABLE_PATTERNS = [
  /blockhash\s*(has\s*)?expired|block\s*height\s*exceeded|expired/i,
  /blockhash\s*not\s*found|block\s*not\s*available/i,
  /transaction\s*was\s*not\s*confirmed|not\s*confirmed/i,
  /timeout|timed\s*out/i,
  /network|econnreset|enotfound|fetch\s*failed|failed\s*to\s*fetch/i,
  /too\s*many\s*requests|rate\s*limit/i,
];

/**
 * Whether this is a retryable trade/send error. Slippage, insufficient balance etc. are not retried.
 */
export function isRetryableTradeError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : String(err ?? '').toLowerCase();
  if (typeof message !== 'string' || message.length === 0) return false;
  const str = message.toLowerCase();
  for (const re of RETRYABLE_PATTERNS) {
    if (re.test(str)) return true;
  }
  // SendTransactionError may have reason in transactionError.message
  if (typeof err === 'object' && err !== null && 'transactionError' in err) {
    const te = (err as { transactionError?: { message?: string } })
      .transactionError;
    if (te && typeof te.message === 'string') {
      for (const re of RETRYABLE_PATTERNS) {
        if (re.test(te.message)) return true;
      }
    }
  }
  return false;
}

/**
 * Run async fn with exponential backoff. Retries only when isRetryableTradeError(e); otherwise throws.
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, onRetry } = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const canRetry = attempt < maxRetries && isRetryableTradeError(e);
      if (!canRetry) throw e;
      const delayMs = getBackoffDelayMs(attempt, options);
      onRetry?.(attempt + 1, e);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
