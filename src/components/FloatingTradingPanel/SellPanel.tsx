import { memo, useCallback, useState } from 'react';
import { useBalance } from '@/hooks/use-balance';
import { ETradePhaseStatus, useTrade } from '@/hooks/use-trade';
import { ETradeDirection } from '@/types/trade';
import { showTradeSuccess, showTradeError } from '@/lib/trade-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import type { EnhancedToken } from '@/lib/codex';
import Decimal from 'decimal.js';
import { useTradePanelStore } from '@/store/trade-panel.store';
import {
  SELL_PCT_PRESETS,
  AMOUNT_EPSILON,
  SELL_AMOUNT_EXP_THRESHOLD_HIGH,
  SELL_AMOUNT_EXP_THRESHOLD_LOW,
} from '@/constants/trade';
import { BalanceRowWithPresetBadge } from './BalanceRowWithPresetBadge';
import { PresetButtons } from './PresetButtons';
import { AmountInputWithMax } from './AmountInputWithMax';
import { TradePanelLayout } from './TradePanelLayout';

interface Props {
  token: EnhancedToken;
}

function formatPresetAmount(tokenBalance: number, pct: number): string {
  const val = new Decimal(tokenBalance).mul(pct).div(100).toNumber();
  if (
    val >= SELL_AMOUNT_EXP_THRESHOLD_HIGH ||
    (val > 0 && val < SELL_AMOUNT_EXP_THRESHOLD_LOW)
  )
    return val.toExponential(4);
  return val.toFixed(9).replace(/\.?0+$/, '') || '0';
}

export const SellPanel = memo(function SellPanel({ token }: Props) {
  const [amount, setAmount] = useState('');

  const decimals = Number(token.decimals);
  const {
    tokenBalance,
    tokenAtomicBalance,
    refreshBalance,
    loading: balanceLoading,
    error: balanceError,
  } = useBalance(token.address, decimals, 9, Number(token.networkId));

  const { phase, execute, reset } = useTrade({
    tokenAddress: token.address,
    networkId: Number(token.networkId),
    onSuccess: refreshBalance,
  });

  const parsedAmount = Number.parseFloat(amount);
  const hasValidAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= tokenBalance;

  const slippageBps = useTradePanelStore((s) => s.slippageBps);

  const pctForExecute =
    tokenBalance > 0 && hasValidAmount
      ? new Decimal(parsedAmount)
          .mul(10 ** decimals)
          .div(tokenAtomicBalance)
          .mul(100)
          .toNumber()
      : 0;

  const handleSell = useCallback(async () => {
    if (!hasValidAmount) return;
    try {
      const txid = await execute({
        direction: ETradeDirection.SELL,
        value: pctForExecute,
        tokenAtomicBalance,
        slippageBps,
      });
      showTradeSuccess('sell', txid);
    } catch (err) {
      showTradeError(getErrorMessage(err));
    }
  }, [hasValidAmount, pctForExecute, execute, tokenAtomicBalance, slippageBps]);

  const canTrade =
    hasValidAmount &&
    (phase.status === ETradePhaseStatus.IDLE ||
      phase.status === ETradePhaseStatus.ERROR);

  const handleMax = useCallback(() => {
    if (tokenBalance <= 0) return;
    setAmount(formatPresetAmount(tokenBalance, 100));
  }, [tokenBalance]);

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

  const balanceRow = (
    <BalanceRowWithPresetBadge
      loading={balanceLoading}
      error={balanceError}
      onRetry={refreshBalance}
      isCustomAmount={isCustomAmount}
      balanceContent={
        <>
          {tokenBalance.toLocaleString()} {token.symbol ?? 'Token'}
        </>
      }
    />
  );

  return (
    <TradePanelLayout
      balanceRow={balanceRow}
      phase={phase}
      direction={ETradeDirection.SELL}
      canTrade={canTrade}
      onExecute={handleSell}
      onErrorDismiss={reset}
      tokenSymbol={token.symbol ?? undefined}
    >
      <PresetButtons
        presets={SELL_PCT_PRESETS}
        formatLabel={(p) => `${p}%`}
        isSelected={isPresetSelected}
        onSelect={(p) => setAmount(formatPresetAmount(tokenBalance, p))}
        accent="red"
        disabled={tokenBalance <= 0}
        ariaLabel={(p) => `Sell ${p}%`}
      />
      <AmountInputWithMax
        value={amount}
        onChange={setAmount}
        onMax={handleMax}
        maxDisabled={tokenBalance <= 0}
        isAtMax={isPresetSelected(100)}
        unitLabel={token.symbol ?? 'Token'}
        accent="red"
        maxAriaLabel="Sell 100% of token balance"
      />
    </TradePanelLayout>
  );
});

SellPanel.displayName = 'SellPanel';
