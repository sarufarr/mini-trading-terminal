/**
 * Flatten error message, optionally following Error.cause chain (up to maxDepth).
 * Uses Error.cause when available (ES2022); safe on older runtimes via type cast.
 */
import {
  TRADE_ERROR_RULES,
  DEFAULT_DESCRIPTION_MAX,
} from '@/lib/trade-error-rules';

export function getErrorMessage(err: unknown, maxCauseDepth = 5): string {
  if (err instanceof Error) {
    const errWithCause = err as Error & { cause?: unknown };
    let msg = err.message;
    let cause: unknown = errWithCause.cause;
    let depth = 0;
    while (cause != null && depth < maxCauseDepth) {
      const part =
        cause instanceof Error
          ? cause.message
          : typeof cause === 'string'
            ? cause
            : String(cause);
      if (part) msg = `${msg} — ${part}`;
      cause =
        cause instanceof Error
          ? (cause as Error & { cause?: unknown }).cause
          : undefined;
      depth += 1;
    }
    return msg;
  }
  if (typeof err === 'string') return err;
  return String(err);
}

export interface TradeErrorDisplay {
  title: string;
  description: string;
}

export function getTradeErrorDisplay(err: unknown): TradeErrorDisplay {
  const raw = getErrorMessage(err);
  const lower = raw.toLowerCase();

  for (const rule of TRADE_ERROR_RULES) {
    if (rule.match(lower)) {
      const description =
        typeof rule.description === 'function'
          ? rule.description(raw)
          : rule.description;
      return { title: rule.title, description };
    }
  }

  return {
    title: 'Trade failed',
    description:
      raw.length > DEFAULT_DESCRIPTION_MAX
        ? `${raw.slice(0, DEFAULT_DESCRIPTION_MAX).trim()}…`
        : raw,
  };
}
