import { useCallback, useState } from 'react';
import { executeTradeWithToast } from '@/lib/trade-toast';
import type { PrepareTradeResult } from '@/service/trade-service';
import type { TradeExecuteParams } from '@/service/trade-service';
import type { TradeConfirmSummary } from '@/components/FloatingTradingPanel/TradeConfirmModal';

export interface UseTradeConfirmFlowOptions {
  onClearOptimistic?: () => void;
}

export interface UseTradeConfirmFlowReturn {
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  confirming: boolean;
  preBuilt: PrepareTradeResult | null;
  confirmSummary: TradeConfirmSummary | null;
  openConfirm: (
    preBuilt: PrepareTradeResult,
    summary: TradeConfirmSummary
  ) => void;
  handleConfirm: (
    execute: (
      params: TradeExecuteParams,
      preBuilt: PrepareTradeResult
    ) => Promise<string>,
    params: TradeExecuteParams
  ) => Promise<void>;
  handleCancel: () => void;
}

export function useTradeConfirmFlow(
  options: UseTradeConfirmFlowOptions = {}
): UseTradeConfirmFlowReturn {
  const { onClearOptimistic } = options;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preBuilt, setPreBuilt] = useState<PrepareTradeResult | null>(null);
  const [confirmSummary, setConfirmSummary] =
    useState<TradeConfirmSummary | null>(null);

  const openConfirm = useCallback(
    (built: PrepareTradeResult, summary: TradeConfirmSummary) => {
      setPreBuilt(built);
      setConfirmSummary(summary);
      setConfirmOpen(true);
    },
    []
  );

  const handleConfirm = useCallback(
    async (
      execute: (
        params: TradeExecuteParams,
        preBuilt: PrepareTradeResult
      ) => Promise<string>,
      params: TradeExecuteParams
    ) => {
      if (!preBuilt || !confirmSummary) return;
      setConfirming(true);
      try {
        const txid = await executeTradeWithToast(
          (p) => execute(p, preBuilt),
          params
        );
        if (!txid) onClearOptimistic?.();
        setConfirmOpen(false);
        setPreBuilt(null);
        setConfirmSummary(null);
      } finally {
        setConfirming(false);
      }
    },
    [preBuilt, confirmSummary, onClearOptimistic]
  );

  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
    setPreBuilt(null);
    setConfirmSummary(null);
  }, []);

  return {
    confirmOpen,
    setConfirmOpen,
    confirming,
    preBuilt,
    confirmSummary,
    openConfirm,
    handleConfirm,
    handleCancel,
  };
}
