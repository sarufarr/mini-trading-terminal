import { toast } from 'sonner';
import { SOLSCAN_TX_URL } from '@/constants/trade';

const TX_ID_SHORT_LEN = 8;

export type TradeType = 'buy' | 'sell';

export function showTradeSuccess(type: TradeType, txid: string): void {
  const title = type === 'buy' ? 'Buy successful' : 'Sell successful';
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

const MAX_ERROR_DESCRIPTION_LENGTH = 500;

export function showTradeError(message: string): void {
  const trimmed =
    message.length > MAX_ERROR_DESCRIPTION_LENGTH
      ? `${message.slice(0, MAX_ERROR_DESCRIPTION_LENGTH).trim()}…`
      : message;
  toast.error('Trade failed', {
    description: trimmed,
    action:
      message.length > MAX_ERROR_DESCRIPTION_LENGTH
        ? {
            label: 'Copy',
            onClick: () => {
              void navigator.clipboard.writeText(message);
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
