import { memo } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ETradeDirection } from '@/types/trade';
import { cn } from '@/lib/cn';

export interface TradeConfirmSummary {
  direction: ETradeDirection;
  /** Amount sent (formatted string, e.g. "0.1" or "50%") */
  sendAmount: string;
  /** Unit sent, e.g. "SOL" or token symbol */
  sendUnit: string;
  /** Estimated amount received (formatted) */
  receiveEstimated: string;
  /** Minimum received (after slippage) */
  receiveMin: string;
  /** Unit received, e.g. "SOL" or token symbol */
  receiveUnit: string;
  tokenSymbol?: string;
}

interface TradeConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: TradeConfirmSummary;
  onConfirm: () => void;
  onCancel: () => void;
  /** Confirm button loading (signing/sending) */
  confirming?: boolean;
}

export const TradeConfirmModal = memo(function TradeConfirmModal({
  open,
  onOpenChange,
  summary,
  onConfirm,
  onCancel,
  confirming = false,
}: TradeConfirmModalProps) {
  const isBuy = summary.direction === ETradeDirection.BUY;

  const handleCancel = () => {
    onOpenChange(false);
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={handleCancel}
        onEscapeKeyDown={handleCancel}
      >
        <DialogHeader>
          <DialogTitle>Confirm trade</DialogTitle>
          <DialogDescription>
            Review the fund flow below before signing and sending.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'rounded-lg border p-4 space-y-3',
            isBuy
              ? 'border-green-500/30 bg-green-500/5 dark:bg-green-500/10'
              : 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10'
          )}
          aria-label="Fund flow summary"
        >
          <div className="text-sm font-medium text-muted-foreground">
            Fund flow summary
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className={cn(
                'flex-1 min-w-0 rounded-lg bg-background/80 px-3 py-2 border',
                isBuy ? 'border-green-500/20' : 'border-red-500/20'
              )}
            >
              <span className="text-xs text-muted-foreground block mb-0.5">
                Send
              </span>
              <span className="font-semibold text-foreground">
                {summary.sendAmount} {summary.sendUnit}
              </span>
            </div>
            <ArrowRight
              className="w-5 h-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div
              className={cn(
                'flex-1 min-w-0 rounded-lg bg-background/80 px-3 py-2 border',
                isBuy ? 'border-green-500/20' : 'border-red-500/20'
              )}
            >
              <span className="text-xs text-muted-foreground block mb-0.5">
                Estimated receive
              </span>
              <span className="font-semibold text-foreground">
                {summary.receiveEstimated} {summary.receiveUnit}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Min. receive: {summary.receiveMin} {summary.receiveUnit} (with
            slippage)
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={confirming}
            className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className={cn(
              'inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-white disabled:opacity-50',
              isBuy
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            )}
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Signing & sending…
              </>
            ) : (
              'Confirm & sign'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

TradeConfirmModal.displayName = 'TradeConfirmModal';
