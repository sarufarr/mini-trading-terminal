import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { showTradeSuccess, showTradeError } from '@/lib/trade-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import type { EnhancedToken } from '@/lib/codex';
import { useBalance } from '@/hooks/use-balance';
import { useTrade, ETradePhaseStatus } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { SOL_PRESETS, SELL_PCT_PRESETS } from '@/constants/trade';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { SlippageSelector } from '@/components/FloatingTradingPanel/SlippageSelector';
import { TradeErrorDismiss } from '@/components/TradeErrorDismiss';

interface TradingPanelProps {
  token: EnhancedToken;
}

export const TradingPanel = memo(function TradingPanel({
  token,
}: TradingPanelProps) {
  const [tradeMode, setTradeMode] = useState<ETradeDirection>(
    ETradeDirection.BUY
  );
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPercentage, setSellPercentage] = useState('');

  const parsedBuyAmount = parseFloat(buyAmount);
  const parsedSellPercentage = parseFloat(sellPercentage);

  const {
    nativeBalance: solBalance,
    tokenBalance,
    tokenAtomicBalance,
    loading,
    refreshBalance,
  } = useBalance(
    token.address,
    Number(token.decimals),
    9,
    Number(token.networkId)
  );

  const { phase, execute, reset, signer } = useTrade({
    tokenAddress: token.address,
    networkId: Number(token.networkId),
    onSuccess: refreshBalance,
  });

  const slippageBps = useTradePanelStore((s) => s.slippageBps);

  const isProcessing =
    phase.status !== ETradePhaseStatus.IDLE &&
    phase.status !== ETradePhaseStatus.ERROR;

  const handleTrade = useCallback(async () => {
    try {
      if (tradeMode === ETradeDirection.BUY) {
        if (!Number.isFinite(parsedBuyAmount) || parsedBuyAmount <= 0) return;
        const txid = await execute({
          direction: ETradeDirection.BUY,
          value: parsedBuyAmount,
          slippageBps,
        });
        showTradeSuccess('buy', txid);
      } else {
        if (!Number.isFinite(parsedSellPercentage) || parsedSellPercentage <= 0)
          return;
        const txid = await execute({
          direction: ETradeDirection.SELL,
          value: parsedSellPercentage,
          tokenAtomicBalance,
          slippageBps,
        });
        showTradeSuccess('sell', txid);
      }
    } catch (err) {
      showTradeError(getErrorMessage(err));
    }
  }, [
    tradeMode,
    parsedBuyAmount,
    parsedSellPercentage,
    execute,
    tokenAtomicBalance,
    slippageBps,
  ]);

  const canTrade =
    !loading &&
    !isProcessing &&
    (tradeMode === ETradeDirection.BUY
      ? Number.isFinite(parsedBuyAmount) && parsedBuyAmount > 0
      : Number.isFinite(parsedSellPercentage) && parsedSellPercentage > 0);

  if (
    !import.meta.env.VITE_SOLANA_PRIVATE_KEY ||
    !import.meta.env.VITE_HELIUS_RPC_URL
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade {token.symbol || 'Token'}</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trade {token.symbol || 'Token'}</CardTitle>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(signer.toBase58());
              toast.success('Wallet address copied!');
            }}
            className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors cursor-pointer"
            aria-label="Copy wallet address"
          >
            {signer.toBase58().slice(0, 4)}...{signer.toBase58().slice(-4)}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">SOL Balance</span>
          <span className="font-semibold">{solBalance.toFixed(4)} SOL</span>
        </div>

        {token.symbol && (
          <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">
              {token.symbol} Balance
            </span>
            <span className="font-semibold">
              {tokenBalance.toLocaleString()} {token.symbol}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {[ETradeDirection.BUY, ETradeDirection.SELL].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setTradeMode(mode);
                reset();
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg font-medium capitalize transition-all',
                tradeMode === mode
                  ? mode === ETradeDirection.BUY
                    ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                    : 'bg-red-500/20 text-red-500 border border-red-500/50'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
              aria-label={mode === ETradeDirection.BUY ? 'Buy' : 'Sell'}
            >
              {mode === ETradeDirection.BUY ? 'Buy' : 'Sell'}
            </button>
          ))}
        </div>

        {tradeMode === ETradeDirection.BUY ? (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Amount in SOL
            </label>
            <div className="flex gap-2">
              {SOL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBuyAmount(String(preset))}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all',
                    buyAmount === String(preset)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                  aria-label={`Set amount to ${preset} SOL`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Available: {solBalance.toFixed(4)} SOL
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              Sell Percentage
            </label>
            <div className="flex gap-2">
              {SELL_PCT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSellPercentage(String(preset))}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all',
                    sellPercentage === String(preset)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                  aria-label={`Sell ${preset}%`}
                >
                  {preset}%
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="0"
              value={sellPercentage}
              onChange={(e) => setSellPercentage(e.target.value)}
              min="0"
              max="100"
              step="1"
            />
            {sellPercentage && tokenBalance > 0 && (
              <p className="text-xs text-muted-foreground">
                Selling:{' '}
                {((tokenBalance * parsedSellPercentage) / 100).toLocaleString()}{' '}
                {token.symbol}
              </p>
            )}
          </div>
        )}

        <SlippageSelector direction={tradeMode} />

        {isProcessing && (
          <p className="text-xs text-muted-foreground text-center animate-pulse">
            {phase.status === ETradePhaseStatus.AWAITING_SIGNATURE &&
              'Awaiting signature...'}
            {phase.status === ETradePhaseStatus.SENDING &&
              'Sending transaction...'}
            {phase.status === ETradePhaseStatus.CONFIRMING &&
              'Confirming on-chain...'}
            {phase.status === ETradePhaseStatus.SUCCESS &&
              'Transaction confirmed!'}
          </p>
        )}

        {import.meta.env.DEV && phase.status === ETradePhaseStatus.ERROR && (
          <TradeErrorDismiss
            message={phase.message}
            onDismiss={reset}
            className="text-center"
          />
        )}

        <button
          onClick={handleTrade}
          disabled={!canTrade}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-semibold transition-all disabled:cursor-not-allowed',
            tradeMode === ETradeDirection.BUY
              ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/30 disabled:text-green-500/50'
              : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/30 disabled:text-red-500/50'
          )}
          aria-label={
            isProcessing
              ? 'Processing'
              : tradeMode === ETradeDirection.BUY
                ? `Buy ${token.symbol || 'Token'}`
                : `Sell ${token.symbol || 'Token'}`
          }
        >
          {isProcessing
            ? 'Processing...'
            : `${tradeMode === ETradeDirection.BUY ? 'Buy' : 'Sell'} ${token.symbol || 'Token'}`}
        </button>
      </CardContent>
    </Card>
  );
});
TradingPanel.displayName = 'TradingPanel';
