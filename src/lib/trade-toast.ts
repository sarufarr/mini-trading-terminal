import { toast } from 'sonner';
import { SOLSCAN_TX_URL } from '@/constants/trade';
import { ETradeDirection } from '@/types/trade';
import type { TradeExecuteParams } from '@/service/trade-service';
import { PhishingDetectedError } from '@/service/trade-service';
import { getErrorMessage, getTradeErrorDisplay } from '@/lib/get-error-message';

const TX_ID_SHORT_LEN = 8;

export function showTradeSuccess(
  direction: ETradeDirection,
  txid: string
): void {
  const title =
    direction === ETradeDirection.BUY ? 'Buy successful' : 'Sell successful';
  const shortId = `${txid.slice(0, TX_ID_SHORT_LEN)}…`;
  toast.success(title, {
    description: `Transaction confirmed (${shortId})`,
    action: {
      label: 'View on Solscan',
      onClick: () => window.open(`${SOLSCAN_TX_URL}/${txid}`, '_blank'),
    },
    duration: 10000,
    classNames: {
      toast: 'trade-toast trade-toast-success',
      title: 'trade-toast-title',
      description: 'trade-toast-description',
      actionButton: 'trade-toast-action',
    },
  });
}

/**
 * Run execute() and show success/error toasts.
 */
export async function executeTradeWithToast(
  execute: (params: TradeExecuteParams) => Promise<string>,
  params: TradeExecuteParams
): Promise<string | void> {
  try {
    const txid = await execute(params);
    showTradeSuccess(params.direction, txid);
    return txid;
  } catch (err) {
    if (err instanceof PhishingDetectedError) {
      showPhishingWarning(err.reason ?? err.message);
      return;
    }
    showTradeError(err);
  }
}

const MAX_ERROR_DESCRIPTION_LENGTH = 500;

function normalizeMessage(messageOrErr: string | unknown): {
  title: string;
  description: string;
} {
  if (typeof messageOrErr === 'string') {
    const trimmed =
      messageOrErr.length > MAX_ERROR_DESCRIPTION_LENGTH
        ? `${messageOrErr.slice(0, MAX_ERROR_DESCRIPTION_LENGTH).trim()}…`
        : messageOrErr;
    return { title: 'Trade failed', description: trimmed };
  }
  return getTradeErrorDisplay(messageOrErr);
}

export function showTradeError(messageOrErr: string | unknown): void {
  const { title, description } = normalizeMessage(messageOrErr);
  const raw =
    typeof messageOrErr === 'string'
      ? messageOrErr
      : getErrorMessage(messageOrErr);
  const showCopy =
    raw.length > MAX_ERROR_DESCRIPTION_LENGTH || description !== raw;
  toast.error(title, {
    description,
    action: showCopy
      ? {
          label: 'Copy details',
          onClick: () => {
            void navigator.clipboard.writeText(raw);
          },
        }
      : undefined,
    duration: Number.POSITIVE_INFINITY,
    classNames: {
      toast: 'trade-toast trade-toast-error',
      title: 'trade-toast-title',
      description: 'trade-toast-description',
      actionButton: 'trade-toast-action',
    },
  });
}

/** Anti-phishing: intercept and warn on unexpected fund outflow */
export function showPhishingWarning(detail?: string): void {
  toast.error(
    'Unexpected fund outflow detected; possible malicious contract.',
    {
      description:
        detail ??
        'Simulation shows SOL or token change far from expected; tx blocked. Do not retry or approve unknown contracts.',
      duration: Number.POSITIVE_INFINITY,
      classNames: {
        toast: 'trade-toast trade-toast-error trade-toast-phishing',
        title: 'trade-toast-title',
        description: 'trade-toast-description',
      },
    }
  );
}

/** Prompt to switch when Jupiter has better price */
export function showBetterPriceToast(onSwitch: () => void): void {
  toast.warning('Jupiter has better price', {
    description: 'Switch to Jupiter route for better execution?',
    action: {
      label: 'Switch',
      onClick: onSwitch,
    },
    duration: 12_000,
    classNames: {
      toast: 'trade-toast',
      title: 'trade-toast-title',
      description: 'trade-toast-description',
      actionButton: 'trade-toast-action',
    },
  });
}
