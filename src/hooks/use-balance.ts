import { useCallback, useEffect, useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import { useCodexClient } from '@/contexts/CodexContext';
import { keypair } from '@/lib/solana';
import { MIN_LOADING_MS } from '@/constants/ui';

interface UseBalanceReturn {
  nativeBalance: number;
  nativeAtomicBalance: Decimal;
  tokenBalance: number;
  tokenAtomicBalance: Decimal;
  loading: boolean;
  error: Error | null;
  refreshBalance: () => Promise<void>;
}

type TUseBalance = (
  tokenAddress: string,
  tokenDecimals: number,
  nativeDecimals: number,
  networkId: number
) => UseBalanceReturn;
export const useBalance: TUseBalance = (
  tokenAddress,
  tokenDecimals,
  nativeDecimals,
  networkId
) => {
  const [nativeBalance, setNativeBalance] = useState(0);
  const [nativeAtomicBalance, setNativeAtomicBalance] = useState(
    new Decimal(0)
  );
  const [tokenBalance, setTokenBalance] = useState(0);
  const [tokenAtomicBalance, setTokenAtomicBalance] = useState(new Decimal(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const walletAddress = useMemo(() => keypair.publicKey.toBase58(), []);
  const codexClient = useCodexClient();

  const refreshBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const response = await codexClient.queries.balances({
        input: {
          networks: [networkId],
          walletAddress,
          includeNative: true,
        },
      });

      const items = response?.balances?.items ?? [];

      const native = items.find((i) => i.tokenId === `native:${networkId}`);
      if (native) {
        const atomic = new Decimal(native.balance);
        setNativeAtomicBalance(atomic);
        setNativeBalance(atomic.div(10 ** nativeDecimals).toNumber());
      } else {
        setNativeAtomicBalance(new Decimal(0));
        setNativeBalance(0);
      }

      const token = items.find(
        (i) => i.tokenId === `${tokenAddress}:${networkId}`
      );
      if (token) {
        const atomic = new Decimal(token.balance);
        setTokenAtomicBalance(atomic);
        setTokenBalance(atomic.div(10 ** tokenDecimals).toNumber());
      } else {
        setTokenAtomicBalance(new Decimal(0));
        setTokenBalance(0);
      }
    } catch (err) {
      const next = err instanceof Error ? err : new Error(String(err));
      setError(next);
      console.error('[useBalance] Failed to fetch balances:', next);
    } finally {
      if (import.meta.env.DEV) {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOADING_MS) {
          await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
        }
      }
      setLoading(false);
    }
  }, [
    codexClient,
    tokenAddress,
    networkId,
    nativeDecimals,
    tokenDecimals,
    walletAddress,
  ]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    nativeBalance,
    nativeAtomicBalance,
    tokenBalance,
    tokenAtomicBalance,
    loading,
    error,
    refreshBalance,
  };
};
