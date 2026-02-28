import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executeTradeWithToast } from '@/lib/trade-toast';
import type { EnhancedToken } from '@/lib/codex';
import { useBalance } from '@/hooks/use-balance';
import { useTrade, ETradePhaseStatus } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { NATIVE_DECIMALS } from '@/constants/trade';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { useTradeStore } from '@/store/trade.store';
import { TradingPanelHeader } from './TradingPanelHeader';
import { TradingPanelBalance } from './TradingPanelBalance';
import { TradingPanelTabs } from './TradingPanelTabs';
import { TradingPanelBuyForm } from './TradingPanelBuyForm';
import { TradingPanelSellForm } from './TradingPanelSellForm';
import { TradingPanelFooter } from './TradingPanelFooter';

interface TradingPanelProps {
  token: EnhancedToken;
}

export const TradingPanel = memo(function TradingPanel({
  token,
}: TradingPanelProps) {
  const activeTab = useTradePanelStore((s) => s.activeTab);
  const setActiveTab = useTradePanelStore((s) => s.setActiveTab);
  const buyAmount = useTradeStore(
    (s) => s.amountByToken[token.address]?.buyAmount ?? ''
  );
  const sellPercentage = useTradeStore(
    (s) => s.amountByToken[token.address]?.sellPercentage ?? ''
  );
  const setBuyAmountStore = useTradeStore((s) => s.setBuyAmount);
  const setSellPercentageStore = useTradeStore((s) => s.setSellPercentage);
  const setBuyAmount = useCallback(
    (v: string) => setBuyAmountStore(token.address, v),
    [token.address, setBuyAmountStore]
  );
  const setSellPercentage = useCallback(
    (v: string) => setSellPercentageStore(token.address, v),
    [token.address, setSellPercentageStore]
  );

  const parsedBuyAmount = Number.parseFloat(buyAmount);
  const parsedSellPercentage = Number.parseFloat(sellPercentage);

  const {
    nativeBalance: solBalance,
    tokenBalance,
    tokenAtomicBalance,
    loading,
    refreshBalance,
  } = useBalance(
    token.address,
    Number(token.decimals),
    NATIVE_DECIMALS,
    Number(token.networkId)
  );

  const { phase, execute, reset, signer } = useTrade({
    tokenAddress: token.address,
    networkId: Number(token.networkId),
    onSuccess: refreshBalance,
  });

  const slippageBps = useTradeStore((s) => s.slippageBps);

  const isProcessing =
    phase.status !== ETradePhaseStatus.IDLE &&
    phase.status !== ETradePhaseStatus.ERROR;

  const handleTrade = useCallback(async () => {
    if (activeTab === ETradeDirection.BUY) {
      if (!Number.isFinite(parsedBuyAmount) || parsedBuyAmount <= 0) return;
      await executeTradeWithToast(execute, {
        direction: ETradeDirection.BUY,
        value: parsedBuyAmount,
        slippageBps,
      });
    } else {
      if (!Number.isFinite(parsedSellPercentage) || parsedSellPercentage <= 0)
        return;
      await executeTradeWithToast(execute, {
        direction: ETradeDirection.SELL,
        value: parsedSellPercentage,
        tokenAtomicBalance,
        slippageBps,
      });
    }
  }, [
    activeTab,
    parsedBuyAmount,
    parsedSellPercentage,
    execute,
    tokenAtomicBalance,
    slippageBps,
  ]);

  const canTrade =
    !loading &&
    !isProcessing &&
    (activeTab === ETradeDirection.BUY
      ? Number.isFinite(parsedBuyAmount) && parsedBuyAmount > 0
      : Number.isFinite(parsedSellPercentage) && parsedSellPercentage > 0);

  const handleTabChange = useCallback(
    (tab: ETradeDirection) => {
      setActiveTab(tab);
      reset();
    },
    [setActiveTab, reset]
  );

  const tokenSymbol = token.symbol ?? 'Token';

  return (
    <Card>
      <TradingPanelHeader tokenSymbol={tokenSymbol} signer={signer} />
      <CardContent className="space-y-4">
        <TradingPanelBalance
          solBalance={solBalance}
          tokenBalance={tokenBalance}
          tokenSymbol={token.symbol ?? null}
        />
        <TradingPanelTabs activeTab={activeTab} onTabChange={handleTabChange} />
        {activeTab === ETradeDirection.BUY ? (
          <TradingPanelBuyForm
            buyAmount={buyAmount}
            onBuyAmountChange={setBuyAmount}
            solBalance={solBalance}
          />
        ) : (
          <TradingPanelSellForm
            sellPercentage={sellPercentage}
            onSellPercentageChange={setSellPercentage}
            tokenBalance={tokenBalance}
            tokenSymbol={tokenSymbol}
            parsedSellPercentage={parsedSellPercentage}
          />
        )}
        <TradingPanelFooter
          direction={activeTab}
          phase={phase}
          canTrade={canTrade}
          isProcessing={isProcessing}
          tokenSymbol={tokenSymbol}
          onExecute={handleTrade}
          onErrorDismiss={reset}
        />
      </CardContent>
    </Card>
  );
});
TradingPanel.displayName = 'TradingPanel';

/** Placeholder when trade env (VITE_SOLANA_PRIVATE_KEY, VITE_HELIUS_RPC_URL) is missing. Use at call site instead of TradingPanel. */
export function TradeEnvRequiredCard({ token }: { token: EnhancedToken }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade {token.symbol ?? 'Token'}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Required: VITE_SOLANA_PRIVATE_KEY, VITE_HELIUS_RPC_URL. Jupiter
          referral (VITE_JUPITER_REFERRAL_ACCOUNT) is optional.
        </p>
      </CardContent>
    </Card>
  );
}
