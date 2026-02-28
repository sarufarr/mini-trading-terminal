import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { type TradePhase, ETradePhaseStatus } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { SOLSCAN_TX_URL } from '@/constants/trade';

interface Props {
  phase: TradePhase;
  mode: ETradeDirection;
  tokenSymbol?: string;
  disabled?: boolean;
  onClick: () => void;
}

export const TradeButton = memo(
  ({ phase, mode, tokenSymbol, disabled, onClick }: Props) => {
    const isLoading = [
      ETradePhaseStatus.AWAITING_SIGNATURE,
      ETradePhaseStatus.SENDING,
      ETradePhaseStatus.CONFIRMING,
    ].includes(phase.status);
    const isSuccess = phase.status === ETradePhaseStatus.SUCCESS;

    const label = (() => {
      switch (phase.status) {
        case ETradePhaseStatus.AWAITING_SIGNATURE:
          return 'Signing...';
        case ETradePhaseStatus.SENDING:
          return 'Sending...';
        case ETradePhaseStatus.CONFIRMING:
          return 'Confirming...';
        case ETradePhaseStatus.SUCCESS:
          return 'Success!';
        default:
          return mode === ETradeDirection.BUY
            ? `Buy ${tokenSymbol ?? ''}`
            : `Sell ${tokenSymbol ?? ''}`;
      }
    })();

    return (
      <div className="space-y-2">
        <motion.button
          className={cn(
            'w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors',
            mode === ETradeDirection.BUY
              ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/30 disabled:text-green-500/50'
              : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/30 disabled:text-red-500/50',
            'disabled:cursor-not-allowed'
          )}
          onClick={onClick}
          disabled={disabled || isLoading || isSuccess}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.1 }}
          aria-label={label}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={phase.status}
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSuccess && <CheckCircle2 className="w-3.5 h-3.5" />}
              {label}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {phase.status === ETradePhaseStatus.SUCCESS && (
          <motion.a
            href={`${SOLSCAN_TX_URL}/${phase.txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            aria-label="View transaction on Solscan"
          >
            View on Solscan <ExternalLink className="w-3 h-3" />
          </motion.a>
        )}
      </div>
    );
  }
);

TradeButton.displayName = 'TradeButton';
