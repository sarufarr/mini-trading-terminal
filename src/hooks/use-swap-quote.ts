import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import Decimal from 'decimal.js';
import {
  getSwapQuote,
  getLocalSwapQuoteAsync,
  getSwapQuoteFromProvider,
} from '@/lib/swap/quote';
import { useTradeStore } from '@/store/trade.store';
import { showBetterPriceToast } from '@/lib/trade-toast';
import { ETradeDirection } from '@/types/trade';
import { BETTER_PRICE_THRESHOLD_BPS } from '@/constants/trade';

/**
 * Debounced swap quote hook. With CLMM cache, getLocalSwapQuoteAsync runs in worker;
 * otherwise async getSwapQuote.
 *
 * Memo strategy for high-frequency price updates:
 * - All derived values (estimatedOut, minReceive, pricePerUnit) are useMemo'd so
 *   reference equality is preserved when inputs haven't changed.
 * - The returned object is useMemo'd so consumers (BuyPanel/SellPanel) get a stable
 *   reference and their useMemo(quoteRow) deps only change when quote content changes.
 * - Combined with usePriceImpactStatus returning stable priceImpactStatus and
 *   QuoteInfo using custom areEqual, QuoteInfo skips re-render when only
 *   priceImpactStatus reference changed but effectivePct/isWarn/isBlock are equal.
 */
const QUOTE_DEBOUNCE_MS = 400;

export interface UseSwapQuoteParams {
  tokenAddress: string;
  tokenDecimals: number;
  networkId: number;
  direction: ETradeDirection;
  amountInAtomic: string;
  slippageBps: number;
}

export interface UseSwapQuoteResult {
  estimatedOut: string;
  minReceive: string;
  outUnit: 'SOL' | 'token';
  priceImpactPct: string | null;
  pricePerUnit: string | null;
  simulatedSlippageBps: number | null;
  loading: boolean;
  error: Error | null;
}

export function useSwapQuote({
  tokenAddress,
  tokenDecimals,
  networkId,
  direction,
  amountInAtomic,
  slippageBps,
}: UseSwapQuoteParams): UseSwapQuoteResult {
  const preferredSwapProvider = useTradeStore((s) => s.preferredSwapProvider);
  const setPreferredSwapProvider = useTradeStore(
    (s) => s.setPreferredSwapProvider
  );

  const [outAmountAtomic, setOutAmountAtomic] = useState<string>('0');
  const [priceImpactPct, setPriceImpactPct] = useState<string | null>(null);
  const [simulatedSlippageBps, setSimulatedSlippageBps] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  const fetchQuoteRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fetchQuote = useCallback(async () => {
    if (!amountInAtomic || amountInAtomic === '0') {
      setOutAmountAtomic('0');
      setPriceImpactPct(null);
      setSimulatedSlippageBps(null);
      setError(null);
      return;
    }
    abortRef.current = false;
    setLoading(true);
    setError(null);
    try {
      const result = await getSwapQuote(
        {
          tokenAddress,
          networkId,
          direction,
          amountInAtomic,
          slippageBps,
        },
        preferredSwapProvider
      );
      if (abortRef.current) return;
      setOutAmountAtomic(result.outAmountAtomic);
      setPriceImpactPct(result.priceImpactPct);
      setSimulatedSlippageBps(result.simulatedSlippageBps);

      // When on Raydium, fetch Jupiter quote in background; toast to suggest switch if better
      if (result.providerName === 'Raydium CLMM') {
        getSwapQuoteFromProvider('Jupiter', {
          tokenAddress,
          networkId,
          direction,
          amountInAtomic,
          slippageBps,
        })
          .then((jupiterResult) => {
            if (!jupiterResult || abortRef.current) return;
            const rayOut = BigInt(result.outAmountAtomic);
            const jupOut = BigInt(jupiterResult.outAmountAtomic);
            if (rayOut === 0n) return;
            const threshold =
              (rayOut * BigInt(10000 + BETTER_PRICE_THRESHOLD_BPS)) / 10000n;
            if (jupOut > threshold) {
              showBetterPriceToast(() => {
                setPreferredSwapProvider('Jupiter');
                fetchQuoteRef.current();
              });
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      if (abortRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setOutAmountAtomic('0');
      setPriceImpactPct(null);
      setSimulatedSlippageBps(null);
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, [
    tokenAddress,
    networkId,
    direction,
    amountInAtomic,
    slippageBps,
    preferredSwapProvider,
    setPreferredSwapProvider,
  ]);

  fetchQuoteRef.current = fetchQuote;

  useEffect(() => {
    if (!amountInAtomic || amountInAtomic === '0') {
      setOutAmountAtomic('0');
      setPriceImpactPct(null);
      setSimulatedSlippageBps(null);
      setError(null);
      setLoading(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    let cancelled = false;
    getLocalSwapQuoteAsync(tokenAddress, amountInAtomic, direction).then(
      (local) => {
        if (cancelled || abortRef.current) return;
        if (local) {
          setOutAmountAtomic(local.outAmountAtomic);
          setPriceImpactPct(local.priceImpactPct);
          setSimulatedSlippageBps(local.simulatedSlippageBps);
        }
      }
    );
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchQuote();
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      abortRef.current = true;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [amountInAtomic, fetchQuote, tokenAddress, direction]);

  // After user clicks "Switch", refetch with new provider
  useEffect(() => {
    if (!preferredSwapProvider || !amountInAtomic || amountInAtomic === '0')
      return;
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when preferred changes to avoid duplicate with main effect
  }, [preferredSwapProvider]);

  // Local quote runs in worker; outAmountAtomic is set when getLocalSwapQuoteAsync resolves or by fetchQuote
  const effectiveOutAmountAtomic = outAmountAtomic;

  const outUnit = useMemo<UseSwapQuoteResult['outUnit']>(
    () => (direction === ETradeDirection.BUY ? 'token' : 'SOL'),
    [direction]
  );

  const estimatedOut = useMemo(() => {
    return direction === ETradeDirection.BUY
      ? new Decimal(effectiveOutAmountAtomic)
          .div(10 ** tokenDecimals)
          .toFixed(9)
          .replace(/\.?0+$/, '') || '0'
      : new Decimal(effectiveOutAmountAtomic)
          .div(LAMPORTS_PER_SOL)
          .toFixed(6)
          .replace(/\.?0+$/, '') || '0';
  }, [effectiveOutAmountAtomic, tokenDecimals, direction]);

  const minReceive = useMemo(() => {
    const minOutAtomic = new Decimal(effectiveOutAmountAtomic)
      .mul(1 - slippageBps / 10000)
      .toFixed(0, Decimal.ROUND_DOWN);
    return direction === ETradeDirection.BUY
      ? new Decimal(minOutAtomic)
          .div(10 ** tokenDecimals)
          .toFixed(9)
          .replace(/\.?0+$/, '') || '0'
      : new Decimal(minOutAtomic)
          .div(LAMPORTS_PER_SOL)
          .toFixed(6)
          .replace(/\.?0+$/, '') || '0';
  }, [effectiveOutAmountAtomic, tokenDecimals, direction, slippageBps]);

  const pricePerUnit = useMemo<string | null>(() => {
    const amountInDecimal = new Decimal(amountInAtomic);
    const amountOutDecimal = new Decimal(effectiveOutAmountAtomic);
    if (
      !amountOutDecimal.gt(0) ||
      !amountInDecimal.gt(0) ||
      (effectiveOutAmountAtomic === '0' && loading)
    )
      return null;
    if (direction === ETradeDirection.BUY) {
      const solIn = amountInDecimal.div(LAMPORTS_PER_SOL);
      const tokenOut = amountOutDecimal.div(10 ** tokenDecimals);
      if (!tokenOut.gt(0)) return null;
      return solIn
        .div(tokenOut)
        .toFixed(8)
        .replace(/\.?0+$/, '');
    }
    const tokenIn = amountInDecimal.div(10 ** tokenDecimals);
    const solOut = amountOutDecimal.div(LAMPORTS_PER_SOL);
    if (!tokenIn.gt(0)) return null;
    return solOut
      .div(tokenIn)
      .toFixed(8)
      .replace(/\.?0+$/, '');
  }, [
    amountInAtomic,
    effectiveOutAmountAtomic,
    tokenDecimals,
    direction,
    loading,
  ]);

  return useMemo(
    () => ({
      estimatedOut,
      minReceive,
      outUnit,
      priceImpactPct,
      pricePerUnit,
      simulatedSlippageBps,
      loading,
      error,
    }),
    [
      estimatedOut,
      minReceive,
      outUnit,
      priceImpactPct,
      pricePerUnit,
      simulatedSlippageBps,
      loading,
      error,
    ]
  );
}
