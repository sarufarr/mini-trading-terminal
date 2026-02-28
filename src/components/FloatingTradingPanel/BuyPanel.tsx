import { memo, useCallback, useMemo } from 'react';
import { useBalance } from '@/hooks/use-balance';
import { useTradePanelForm } from '@/hooks/use-trade-panel-form';
import { showTradeError } from '@/lib/trade-toast';
import { prepareTrade } from '@/service/trade-service';
import type { EnhancedToken } from '@/lib/codex';
import { useTradeStore } from '@/store/trade.store';
import { useOptimisticTradeStore } from '@/store/optimistic-trade.store';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import Decimal from 'decimal.js';
import {
  SOL_PRESETS,
  FEE_RESERVE_SOL,
  AMOUNT_EPSILON,
  MAX_AMOUNT_EPSILON,
  NATIVE_DECIMALS,
  SOL_DISPLAY_DECIMALS,
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

export const BuyPanel = memo(function BuyPanel({
  token,
  onRegisterExecute,
}: Props) {
  const amount = useTradeStore(
    (s) => s.amountByToken[token.address]?.buyAmount ?? ''
  );
  const setAmountStore = useTradeStore((s) => s.setBuyAmount);
  const setAmount = useCallback(
    (v: string) => setAmountStore(token.address, v),
    [token.address, setAmountStore]
  );

  const parsedAmount = Number.parseFloat(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const {
    nativeBalance,
    refreshBalance,
    loading: balanceLoading,
    error: balanceError,
  } = useBalance(
    token.address,
    Number(token.decimals),
    NATIVE_DECIMALS,
    Number(token.networkId)
  );

  const optimistic = useOptimisticTradeStore((s) => s.optimistic);

  const tradeParams = useMemo(
    () => ({
      direction: ETradeDirection.BUY as const,
      value: parsedAmount,
      slippageBps: 0,
    }),
    [parsedAmount]
  );

  const amountInAtomic =
    hasValidAmount && Number.isFinite(parsedAmount)
      ? new Decimal(parsedAmount).mul(LAMPORTS_PER_SOL).toFixed(0)
      : '0';

  const buildOptimisticPayload = useCallback(
    (quote: { estimatedOut: string }, txid: string) => ({
      tokenAddress: token.address,
      txid,
      direction: 'buy' as const,
      solDelta: -parsedAmount,
      tokenDelta: Number(quote.estimatedOut) || 0,
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
    direction: ETradeDirection.BUY,
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

  const handleBuy = useCallback(async () => {
    if (!hasValidAmount) return;
    try {
      const built = await prepareTrade({
        tokenAddress: token.address,
        networkId: Number(token.networkId),
        params: { ...tradeParams, slippageBps },
        preferredSwapProvider,
      });
      openConfirm(built, {
        direction: ETradeDirection.BUY,
        sendAmount: String(parsedAmount),
        sendUnit: 'SOL',
        receiveEstimated: quote.estimatedOut,
        receiveMin: quote.minReceive,
        receiveUnit: token.symbol ?? 'Token',
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
    parsedAmount,
    openConfirm,
  ]);

  const handleConfirmTrade = useCallback(async () => {
    await handleConfirm(execute, { ...tradeParams, slippageBps });
  }, [handleConfirm, execute, tradeParams, slippageBps]);

  const handleCancelConfirm = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const maxSpendableSol = Math.max(0, nativeBalance - FEE_RESERVE_SOL);
  const displaySol =
    optimistic?.tokenAddress === token.address
      ? nativeBalance + optimistic.solDelta
      : nativeBalance;
  const halfSpendableSol = maxSpendableSol / 2;
  const isMaxSpendable = maxSpendableSol > 0;
  const isAtMax =
    isMaxSpendable &&
    Number.isFinite(parsedAmount) &&
    Math.abs(parsedAmount - maxSpendableSol) < MAX_AMOUNT_EPSILON;
  const isAtHalf =
    isMaxSpendable &&
    Number.isFinite(parsedAmount) &&
    Math.abs(parsedAmount - halfSpendableSol) < MAX_AMOUNT_EPSILON;

  const handleMax = useCallback(() => {
    if (!isMaxSpendable) return;
    setAmount(maxSpendableSol.toFixed(SOL_DISPLAY_DECIMALS));
  }, [isMaxSpendable, maxSpendableSol, setAmount]);

  const handleHalf = useCallback(() => {
    if (!isMaxSpendable) return;
    setAmount(halfSpendableSol.toFixed(SOL_DISPLAY_DECIMALS));
  }, [isMaxSpendable, halfSpendableSol, setAmount]);

  const isPresetAmount =
    amount === '' ||
    SOL_PRESETS.some(
      (p) =>
        amount === String(p) ||
        (Number.isFinite(parsedAmount) &&
          Math.abs(parsedAmount - p) < AMOUNT_EPSILON)
    );
  const isCustomAmount = !isPresetAmount;

  const isPresetSelected = useCallback(
    (p: number) =>
      Number.isFinite(parsedAmount) &&
      Math.abs(parsedAmount - p) < AMOUNT_EPSILON,
    [parsedAmount]
  );

  const balanceRow = useMemo(
    () => (
      <BalanceRowWithPresetBadge
        loading={balanceLoading}
        error={balanceError}
        onRetry={refreshBalance}
        hasValue={amount !== ''}
        isCustomAmount={isCustomAmount}
        balanceContent={`${displaySol.toFixed(SOL_DISPLAY_DECIMALS)} SOL`}
      />
    ),
    [
      balanceLoading,
      balanceError,
      refreshBalance,
      amount,
      isCustomAmount,
      displaySol,
    ]
  );

  const formatPresetLabel = useCallback((p: number) => String(p), []);
  const presetAriaLabel = useCallback(
    (p: number) => `Set amount to ${p} SOL`,
    []
  );
  const handlePresetSelect = useCallback(
    (p: number) => setAmount(String(p)),
    [setAmount]
  );

  const quoteRow = useMemo(
    () => (
      <QuoteInfo
        estimatedOut={quote.estimatedOut}
        minReceive={quote.minReceive}
        outUnit={quote.outUnit}
        outUnitLabel={token.symbol ?? 'Token'}
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

  return (
    <>
      <TradePanelLayout
        balanceRow={balanceRow}
        quoteRow={quoteRow}
        phase={phase}
        direction={ETradeDirection.BUY}
        canTrade={canTrade}
        onExecute={handleBuy}
        onErrorDismiss={reset}
        tokenSymbol={token.symbol ?? undefined}
        onRegisterExecute={onRegisterExecute}
      >
        <PresetButtons
          presets={SOL_PRESETS}
          formatLabel={formatPresetLabel}
          isSelected={isPresetSelected}
          onSelect={handlePresetSelect}
          accent="green"
          ariaLabel={presetAriaLabel}
        />
        <AmountInputWithMax
          value={amount}
          onChange={setAmount}
          onMax={handleMax}
          onHalf={handleHalf}
          maxDisabled={!isMaxSpendable}
          halfDisabled={!isMaxSpendable}
          isAtMax={isAtMax}
          isAtHalf={isAtHalf}
          unitLabel="SOL"
          accent="green"
          step="0.001"
          maxLabel="Max"
          maxAriaLabel="Fill 100% of available SOL (after gas reserve)"
          halfAriaLabel="Fill 50% of available SOL (after gas reserve)"
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

BuyPanel.displayName = 'BuyPanel';
