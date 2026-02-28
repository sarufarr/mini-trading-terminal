import { memo, useCallback, useState } from 'react';
import { useBalance } from '@/hooks/use-balance';
import { ETradePhaseStatus, useTrade } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { showTradeSuccess, showTradeError } from '@/lib/trade-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import type { EnhancedToken } from '@/lib/codex';
import { useTradePanelStore } from '@/store/trade-panel.store';
import {
  SOL_PRESETS,
  FEE_RESERVE_SOL,
  AMOUNT_EPSILON,
  MAX_AMOUNT_EPSILON,
} from '@/constants/trade';
import { BalanceRowWithPresetBadge } from './BalanceRowWithPresetBadge';
import { PresetButtons } from './PresetButtons';
import { AmountInputWithMax } from './AmountInputWithMax';
import { TradePanelLayout } from './TradePanelLayout';

interface Props {
  token: EnhancedToken;
}

export const BuyPanel = memo(function BuyPanel({ token }: Props) {
  const [amount, setAmount] = useState('');

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
    9,
    Number(token.networkId)
  );

  const { phase, execute, reset } = useTrade({
    tokenAddress: token.address,
    networkId: Number(token.networkId),
    onSuccess: refreshBalance,
  });

  const slippageBps = useTradePanelStore((s) => s.slippageBps);

  const handleBuy = useCallback(async () => {
    if (!hasValidAmount) return;
    try {
      const txid = await execute({
        direction: ETradeDirection.BUY,
        value: parsedAmount,
        slippageBps,
      });
      showTradeSuccess('buy', txid);
    } catch (err) {
      showTradeError(getErrorMessage(err));
    }
  }, [execute, hasValidAmount, parsedAmount, slippageBps]);

  const canTrade =
    hasValidAmount &&
    (phase.status === ETradePhaseStatus.IDLE ||
      phase.status === ETradePhaseStatus.ERROR);

  const maxSpendableSol = Math.max(0, nativeBalance - FEE_RESERVE_SOL);
  const isMaxSpendable = maxSpendableSol > 0;
  const isAtMax =
    isMaxSpendable &&
    Number.isFinite(parsedAmount) &&
    Math.abs(parsedAmount - maxSpendableSol) < MAX_AMOUNT_EPSILON;

  const handleMax = useCallback(() => {
    if (!isMaxSpendable) return;
    setAmount(maxSpendableSol.toFixed(4));
  }, [isMaxSpendable, maxSpendableSol]);

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

  const balanceRow = (
    <BalanceRowWithPresetBadge
      loading={balanceLoading}
      error={balanceError}
      onRetry={refreshBalance}
      isCustomAmount={isCustomAmount}
      balanceContent={`${nativeBalance.toFixed(4)} SOL`}
    />
  );

  return (
    <TradePanelLayout
      balanceRow={balanceRow}
      phase={phase}
      direction={ETradeDirection.BUY}
      canTrade={canTrade}
      onExecute={handleBuy}
      onErrorDismiss={reset}
      tokenSymbol={token.symbol ?? undefined}
    >
      <PresetButtons
        presets={SOL_PRESETS}
        formatLabel={(p) => String(p)}
        isSelected={isPresetSelected}
        onSelect={(p) => setAmount(String(p))}
        accent="green"
        ariaLabel={(p) => `Set amount to ${p} SOL`}
      />
      <AmountInputWithMax
        value={amount}
        onChange={setAmount}
        onMax={handleMax}
        maxDisabled={!isMaxSpendable}
        isAtMax={isAtMax}
        unitLabel="SOL"
        accent="green"
        step="0.001"
        maxAriaLabel="Set to max spendable SOL"
      />
    </TradePanelLayout>
  );
});

BuyPanel.displayName = 'BuyPanel';
