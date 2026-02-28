import { useCallback, useEffect, useState } from 'react';
import { useLatest } from '@/hooks/common/use-latest';
import type { PublicKey } from '@solana/web3.js';
import { keypair } from '@/lib/solana';
import {
  executeTrade,
  type TradeExecuteParams,
  type PrepareTradeResult,
} from '@/service/trade-service';
import { useTradeStore } from '@/store/trade.store';
import { getErrorMessage } from '@/lib/get-error-message';
import { BALANCE_REFRESH_DELAY_MS, SUCCESS_RESET_MS } from '@/constants/ui';
import { ETradePhaseStatus, type TradePhase } from '@/types/trade';

export { ETradePhaseStatus, type TradePhase };

interface UseTradeOptions {
  tokenAddress: string;
  networkId: number;
  onSuccess?: () => void;
  onSent?: (txid: string) => void;
}

type TUseTrade = (options: UseTradeOptions) => {
  phase: TradePhase;
  execute: (
    params: TradeExecuteParams,
    preBuilt?: PrepareTradeResult
  ) => Promise<string>;
  reset: () => void;
  signer: PublicKey;
};

export const useTrade: TUseTrade = ({
  tokenAddress,
  networkId,
  onSuccess,
  onSent,
}) => {
  const [phase, setPhase] = useState<TradePhase>({
    status: ETradePhaseStatus.IDLE,
  });

  const tokenAddressRef = useLatest(tokenAddress);
  const preferredSwapProvider = useTradeStore((s) => s.preferredSwapProvider);
  const setTradePhaseStore = useTradeStore((s) => s.setTradePhase);

  const setPhaseAndStore = useCallback(
    (next: TradePhase) => {
      setPhase(next);
      setTradePhaseStore(next);
    },
    [setTradePhaseStore]
  );

  const execute = useCallback(
    async (
      params: TradeExecuteParams,
      preBuilt?: PrepareTradeResult
    ): Promise<string> => {
      try {
        setPhaseAndStore({ status: ETradePhaseStatus.AWAITING_SIGNATURE });

        const { txid } = await executeTrade({
          tokenAddress: tokenAddressRef.current,
          networkId,
          params,
          preferredSwapProvider,
          ...(preBuilt && { preBuilt }),
          onBeforeSend: () => {
            setPhaseAndStore({ status: ETradePhaseStatus.SENDING });
          },
          onAfterSend: (sentTxid) => {
            setPhaseAndStore({
              status: ETradePhaseStatus.CONFIRMING,
              txid: sentTxid,
            });
            onSent?.(sentTxid);
          },
          onSuccess: onSuccess
            ? () => setTimeout(onSuccess, BALANCE_REFRESH_DELAY_MS)
            : undefined,
        });

        setPhaseAndStore({ status: ETradePhaseStatus.SUCCESS, txid });
        return txid;
      } catch (err) {
        const message = getErrorMessage(err);
        setPhaseAndStore({ status: ETradePhaseStatus.ERROR, message });
        throw err;
      }
    },
    [
      networkId,
      tokenAddressRef,
      onSuccess,
      onSent,
      preferredSwapProvider,
      setPhaseAndStore,
    ]
  );

  const reset = useCallback(() => {
    const idle: TradePhase = { status: ETradePhaseStatus.IDLE };
    setPhase(idle);
    setTradePhaseStore(idle);
  }, [setTradePhaseStore]);

  useEffect(() => {
    if (phase.status !== ETradePhaseStatus.SUCCESS) return;
    const idle: TradePhase = { status: ETradePhaseStatus.IDLE };
    const timer = setTimeout(() => {
      setPhase(idle);
      setTradePhaseStore(idle);
    }, SUCCESS_RESET_MS);
    return () => clearTimeout(timer);
  }, [phase.status, setTradePhaseStore]);

  return { phase, execute, reset, signer: keypair.publicKey };
};
