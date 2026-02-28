import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FloatingTradingPanel } from '@/components/FloatingTradingPanel';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useCodexClient } from '@/contexts/use-codex-client';
import { env } from '@/env';
import { useTokenPageData } from '@/hooks/useTokenPageData';
import { warmClmmPoolCache } from '@/lib/raydium-clmm';
import { connection } from '@/lib/solana';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { TokenPageChartSection } from './TokenPageChartSection';
import { TokenPageEventsCard } from './TokenPageEventsCard';
import { TokenPageHeader } from './TokenPageHeader';
import { TokenPageSidebar } from './TokenPageSidebar';
import { TokenPageTradeButton } from './TokenPageTradeButton';

export function TokenPage() {
  const codexClient = useCodexClient();
  const { networkId, tokenId } = useParams<{
    networkId: string;
    tokenId: string;
  }>();
  const networkIdNum = parseInt(networkId || '', 10);

  const {
    details,
    pairs,
    bars,
    events,
    loading,
    error,
    refresh,
    refreshPools,
    refreshingPools,
    refreshEvents,
    refreshingEvents,
  } = useTokenPageData(networkIdNum, tokenId, codexClient);

  const isOpen = useTradePanelStore((s) => s.isOpen);
  const toggle = useTradePanelStore((s) => s.toggle);
  const hasTradeEnv =
    Boolean(env.VITE_SOLANA_PRIVATE_KEY) && Boolean(env.VITE_HELIUS_RPC_URL);

  // Warm CLMM pool cache when token page has trade env so local quote is instant on panel open
  useEffect(() => {
    if (details && hasTradeEnv && details.address) {
      warmClmmPoolCache(connection, details.address).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when address or env changes only
  }, [details?.address, hasTradeEnv]);

  if (loading)
    return (
      <main
        className="flex min-h-screen flex-col items-center p-6 md:p-12"
        aria-busy="true"
        aria-label="Loading token data"
      >
        <p>Loading token data...</p>
      </main>
    );

  if (error)
    return (
      <main className="flex min-h-screen flex-col items-center p-12 md:p-24">
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        <Link to="/" className="mt-4 hover:underline">
          Go back home
        </Link>
      </main>
    );

  const tokenName = details?.name || tokenId || '';
  const tokenSymbol = details?.symbol ? `(${details.symbol})` : '';

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PullToRefresh onRefresh={refresh} className="flex-1 min-h-0">
        <main className="flex min-h-full flex-col items-center p-6 md:p-12 space-y-6">
          <TokenPageHeader
            tokenName={tokenName}
            tokenSymbol={tokenSymbol}
            networkId={networkId || ''}
          />

          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <TokenPageChartSection bars={bars} tokenSymbol={tokenSymbol} />

              <TokenPageTradeButton
                isOpen={isOpen}
                onToggle={toggle}
                visible={Boolean(details && hasTradeEnv)}
              />

              <TokenPageEventsCard
                events={events}
                onRefresh={refreshEvents}
                refreshing={refreshingEvents}
              />
            </div>

            <TokenPageSidebar
              details={details}
              pairs={pairs}
              hasTradeEnv={hasTradeEnv}
              onRefresh={refreshPools}
              refreshing={refreshingPools}
            />
          </div>
        </main>
      </PullToRefresh>

      {details && hasTradeEnv && <FloatingTradingPanel token={details} />}
    </div>
  );
}
