import { useCallback, useEffect, useState } from 'react';
import { useLatest } from '@/hooks/common/use-latest';
import type { PublicKey } from '@solana/web3.js';
import { keypair } from '@/lib/solana';
import { executeTrade, type TradeExecuteParams } from '@/service/trade-service';
import { getErrorMessage } from '@/lib/get-error-message';
import { BALANCE_REFRESH_DELAY_MS, SUCCESS_RESET_MS } from '@/constants/ui';
import { ETradePhaseStatus, type TradePhase } from '@/types/trade';

export { ETradePhaseStatus, type TradePhase };

interface UseTradeOptions {
  tokenAddress: string;
  networkId: number;
  onSuccess?: () => void;
}

type TUseTrade = (options: UseTradeOptions) => {
  phase: TradePhase;
  execute: (params: TradeExecuteParams) => Promise<string>;
  reset: () => void;
  signer: PublicKey;
};

export const useTrade: TUseTrade = ({ tokenAddress, networkId, onSuccess }) => {
  const [phase, setPhase] = useState<TradePhase>({
    status: ETradePhaseStatus.IDLE,
  });

  const tokenAddressRef = useLatest(tokenAddress);

  const execute = useCallback(
    async (params: TradeExecuteParams): Promise<string> => {
      try {
        setPhase({ status: ETradePhaseStatus.AWAITING_SIGNATURE });

        const { txid } = await executeTrade({
          tokenAddress: tokenAddressRef.current,
          networkId,
          params,
          onBeforeSend: () => {
            setPhase({ status: ETradePhaseStatus.SENDING });
          },
          onAfterSend: (sentTxid) => {
            setPhase({ status: ETradePhaseStatus.CONFIRMING, txid: sentTxid });
          },
          onSuccess: onSuccess
            ? () => setTimeout(onSuccess, BALANCE_REFRESH_DELAY_MS)
            : undefined,
        });

        setPhase({ status: ETradePhaseStatus.SUCCESS, txid });
        return txid;
      } catch (err) {
        const message = getErrorMessage(err);
        setPhase({ status: ETradePhaseStatus.ERROR, message });
        throw err;
      }
    },
    [networkId, tokenAddressRef, onSuccess]
  );

  const reset = useCallback(
    () => setPhase({ status: ETradePhaseStatus.IDLE }),
    []
  );

  useEffect(() => {
    if (phase.status !== ETradePhaseStatus.SUCCESS) return;
    const timer = setTimeout(
      () => setPhase({ status: ETradePhaseStatus.IDLE }),
      SUCCESS_RESET_MS
    );
    return () => clearTimeout(timer);
  }, [phase.status]);

  return { phase, execute, reset, signer: keypair.publicKey };
};
