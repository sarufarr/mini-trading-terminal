import { memo, useCallback, useMemo } from 'react';
import { useBalance } from '@/hooks/use-balance';
import { useTradePanelForm } from '@/hooks/use-trade-panel-form';
import { showTradeError } from '@/lib/trade-toast';
import { prepareTrade } from '@/service/trade-service';
import type { EnhancedToken } from '@/lib/codex';
import Decimal from 'decimal.js';
import { useTradeStore } from '@/store/trade.store';
import { useOptimisticTradeStore } from '@/store/optimistic-trade.store';
import { formatSellPresetAmount } from '@/lib/format-sell-amount';
import {
  SELL_PCT_PRESETS,
  AMOUNT_EPSILON,
  NATIVE_DECIMALS,
} from '@/constants/trade';
import { BalanceRowWithPresetBadge } from './BalanceRowWithPresetBadge';
import { PresetButtons } from './PresetButtons';
import { AmountInputWithMax } from './AmountInputWithMax';
import { TradePanelLayout } from './TradePanelLayout';
import { QuoteInfo } from './QuoteInfo';
import { TradeConfirmModal } from './TradeConfirmModal';
import { ETradeDirection } from '@/types/trade';

interface Props {
  token: EnhancedToken;
  /** Register canTrade + onExecute for global shortcuts */
  onRegisterExecute?: (canTrade: boolean, execute: () => void) => void;
}

export const SellPanel = memo(function SellPanel({
  token,
  onRegisterExecute,
}: Props) {
  const sellPercentage = useTradeStore(
    (s) => s.amountByToken[token.address]?.sellPercentage ?? ''
  );
  const setSellPercentageStore = useTradeStore((s) => s.setSellPercentage);
  const setSellPercentage = useCallback(
    (v: string) => setSellPercentageStore(token.address, v),
    [token.address, setSellPercentageStore]
  );

  const decimals = Number(token.decimals);
  const {
    tokenBalance,
    tokenAtomicBalance,
    refreshBalance,
    loading: balanceLoading,
    error: balanceError,
  } = useBalance(
    token.address,
    decimals,
    NATIVE_DECIMALS,
    Number(token.networkId)
  );

  const optimistic = useOptimisticTradeStore((s) => s.optimistic);

  const pctNum = Number.parseFloat(sellPercentage) || 0;
  const amount =
    tokenBalance > 0
      ? sellPercentage === ''
        ? ''
        : formatSellPresetAmount(
            tokenBalance,
            Math.min(100, Math.max(0, pctNum))
          )
      : '';
  const parsedAmount = Number.parseFloat(amount);
  const hasValidAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= tokenBalance;

  const pctForExecute =
    tokenBalance > 0 && hasValidAmount
      ? new Decimal(parsedAmount)
          .mul(10 ** decimals)
          .div(tokenAtomicBalance)
          .mul(100)
          .toNumber()
      : 0;

  const tradeParams = useMemo(
    () => ({
      direction: ETradeDirection.SELL as const,
      value: pctForExecute,
      tokenAtomicBalance,
      slippageBps: 0,
    }),
    [pctForExecute, tokenAtomicBalance]
  );

  const amountInAtomic =
    hasValidAmount && Number.isFinite(parsedAmount) && parsedAmount > 0
      ? new Decimal(parsedAmount).mul(10 ** decimals).toFixed(0)
      : '0';

  const buildOptimisticPayload = useCallback(
    (quote: { estimatedOut: string }, txid: string) => ({
      tokenAddress: token.address,
      txid,
      direction: 'sell' as const,
      solDelta: Number(quote.estimatedOut) || 0,
      tokenDelta: -parsedAmount,
    }),
    [token.address, parsedAmount]
  );

  const {
    quote,
    phase,
    execute,
    reset,
    slippageBps,
    preferredSwapProvider,
    confirmFlow,
    priceImpactStatus,
    canTrade,
  } = useTradePanelForm({
    token,
    direction: ETradeDirection.SELL,
    amountInAtomic,
    hasValidAmount,
    buildOptimisticPayload,
    onSuccess: refreshBalance,
  });

  const {
    confirmOpen,
    setConfirmOpen,
    confirming,
    confirmSummary,
    openConfirm,
    handleConfirm,
    handleCancel,
  } = confirmFlow;

  const handleSell = useCallback(async () => {
    if (!hasValidAmount) return;
    try {
      const built = await prepareTrade({
        tokenAddress: token.address,
        networkId: Number(token.networkId),
        params: { ...tradeParams, slippageBps },
        preferredSwapProvider,
      });
      openConfirm(built, {
        direction: ETradeDirection.SELL,
        sendAmount: amount,
        sendUnit: token.symbol ?? 'Token',
        receiveEstimated: quote.estimatedOut,
        receiveMin: quote.minReceive,
        receiveUnit: 'SOL',
        tokenSymbol: token.symbol ?? undefined,
      });
    } catch (err) {
      showTradeError(err);
    }
  }, [
    hasValidAmount,
    token.address,
    token.networkId,
    token.symbol,
    tradeParams,
    slippageBps,
    preferredSwapProvider,
    quote.estimatedOut,
    quote.minReceive,
    amount,
    openConfirm,
  ]);

  const handleConfirmTrade = useCallback(async () => {
    await handleConfirm(execute, { ...tradeParams, slippageBps });
  }, [handleConfirm, execute, tradeParams, slippageBps]);

  const handleCancelConfirm = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const quoteRow = useMemo(
    () => (
      <QuoteInfo
        estimatedOut={quote.estimatedOut}
        minReceive={quote.minReceive}
        outUnit={quote.outUnit}
        outUnitLabel="SOL"
        pricePerUnit={quote.pricePerUnit}
        tokenSymbol={token.symbol ?? undefined}
        priceImpactPct={quote.priceImpactPct}
        simulatedSlippageBps={quote.simulatedSlippageBps}
        priceImpactStatus={priceImpactStatus}
        slippageBps={slippageBps}
        loading={quote.loading}
        error={quote.error}
      />
    ),
    [
      quote.estimatedOut,
      quote.minReceive,
      quote.outUnit,
      quote.pricePerUnit,
      quote.priceImpactPct,
      quote.simulatedSlippageBps,
      quote.loading,
      quote.error,
      token.symbol,
      priceImpactStatus,
      slippageBps,
    ]
  );

  const handleMax = useCallback(() => {
    if (tokenBalance <= 0) return;
    setSellPercentage('100');
  }, [tokenBalance, setSellPercentage]);

  const isPresetAmount =
    amount === '' ||
    SELL_PCT_PRESETS.some((p) => {
      const expected = new Decimal(tokenBalance).mul(p).div(100).toNumber();
      return (
        Number.isFinite(parsedAmount) &&
        Math.abs(parsedAmount - expected) < AMOUNT_EPSILON
      );
    });
  const isCustomAmount = !isPresetAmount;

  const isPresetSelected = useCallback(
    (preset: number) => {
      const expected = new Decimal(tokenBalance)
        .mul(preset)
        .div(100)
        .toNumber();
      return (
        Number.isFinite(parsedAmount) &&
        Math.abs(parsedAmount - expected) < AMOUNT_EPSILON
      );
    },
    [tokenBalance, parsedAmount]
  );

  const formatPresetLabel = useCallback((p: number) => `${p}%`, []);
  const presetAriaLabel = useCallback((p: number) => `Sell ${p}%`, []);
  const handlePresetSelect = useCallback(
    (p: number) => setSellPercentage(String(p)),
    [setSellPercentage]
  );

  const displayTokenBalance =
    optimistic?.tokenAddress === token.address
      ? tokenBalance + optimistic.tokenDelta
      : tokenBalance;

  const balanceRow = useMemo(
    () => (
      <BalanceRowWithPresetBadge
        loading={balanceLoading}
        error={balanceError}
        onRetry={refreshBalance}
        hasValue={amount !== ''}
        isCustomAmount={isCustomAmount}
        balanceContent={
          <>
            {displayTokenBalance.toLocaleString()} {token.symbol ?? 'Token'}
          </>
        }
      />
    ),
    [
      balanceLoading,
      balanceError,
      refreshBalance,
      amount,
      isCustomAmount,
      displayTokenBalance,
      token.symbol,
    ]
  );

  const handleAmountChange = useCallback(
    (raw: string) => {
      if (tokenBalance <= 0) {
        setSellPercentage(raw);
        return;
      }
      const parsed = Number.parseFloat(raw);
      if (!Number.isFinite(parsed)) {
        setSellPercentage(raw);
        return;
      }
      const pct = Math.min(100, Math.max(0, (parsed / tokenBalance) * 100));
      setSellPercentage(String(pct));
    },
    [tokenBalance, setSellPercentage]
  );

  return (
    <>
      <TradePanelLayout
        balanceRow={balanceRow}
        quoteRow={quoteRow}
        phase={phase}
        direction={ETradeDirection.SELL}
        canTrade={canTrade}
        onExecute={handleSell}
        onErrorDismiss={reset}
        tokenSymbol={token.symbol ?? undefined}
        onRegisterExecute={onRegisterExecute}
      >
        <PresetButtons
          presets={SELL_PCT_PRESETS}
          formatLabel={formatPresetLabel}
          isSelected={isPresetSelected}
          onSelect={handlePresetSelect}
          accent="red"
          disabled={tokenBalance <= 0}
          ariaLabel={presetAriaLabel}
        />
        <AmountInputWithMax
          value={amount}
          onChange={handleAmountChange}
          onMax={handleMax}
          maxDisabled={tokenBalance <= 0}
          isAtMax={isPresetSelected(100)}
          unitLabel={token.symbol ?? 'Token'}
          accent="red"
          maxAriaLabel="Sell 100% of token balance"
        />
      </TradePanelLayout>
      {confirmSummary && (
        <TradeConfirmModal
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          summary={confirmSummary}
          onConfirm={handleConfirmTrade}
          onCancel={handleCancelConfirm}
          confirming={confirming}
        />
      )}
    </>
  );
});

SellPanel.displayName = 'SellPanel';
