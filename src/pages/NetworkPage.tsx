import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCodexClient } from '@/contexts/use-codex-client';
import { VirtualTable } from '@/components/VirtualTable';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LIST_VIEW_MAX_HEIGHT,
  TOKENS_GRID_ESTIMATED_ROW_HEIGHT,
  TOKENS_GRID_COLUMNS,
} from '@/constants/ui';
import {
  TokenRankingAttribute,
  RankingDirection,
  type TokenFilterResult,
} from '@/lib/codex-types';
import { getErrorMessage } from '@/lib/get-error-message';
import { devLog } from '@/lib/dev-log';
import { isNetwork, type Network } from '@/types/network';

/** Type guard: item and item.token are non-null (Codex may return partial results). */
function hasTokenResult(
  item: TokenFilterResult | null | undefined
): item is TokenFilterResult & {
  token: NonNullable<TokenFilterResult['token']>;
} {
  return item != null && item.token != null;
}

export function NetworkPage() {
  const { networkId } = useParams<{ networkId: string }>();
  const networkIdNum = parseInt(networkId || '', 10);
  const codexClient = useCodexClient();

  const [tokenListItems, setTokenListItems] = useState<TokenFilterResult[]>([]);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (isNaN(networkIdNum)) {
      setFetchError('Invalid Network ID');
      setLoading(false);
      return;
    }
    try {
      const [networksResult, tokensResponse] = await Promise.all([
        codexClient.queries.getNetworks({}).catch((err: Error) => {
          devLog.error(`Error fetching all networks:`, err);
          return null;
        }),
        codexClient.queries
          .filterTokens({
            filters: { network: [networkIdNum] },
            rankings: [
              {
                attribute: TokenRankingAttribute.TrendingScore,
                direction: RankingDirection.Desc,
              },
            ],
            limit: 50,
          })
          .catch((err: Error) => {
            devLog.error(
              `Error fetching tokens for network ${networkIdNum}:`,
              err
            );
            throw new Error(
              `Failed to load tokens for network ${networkIdNum}.`
            );
          }),
      ]);

      if (networksResult?.getNetworks) {
        const networks = networksResult.getNetworks.filter(isNetwork);
        const currentNetwork = networks.find(
          (n: Network) => n.id === networkIdNum
        );
        setNetworkName(currentNetwork?.name || `Network ${networkId}`);
      } else {
        setNetworkName(`Network ${networkId}`);
      }

      const resultsArray = tokensResponse.filterTokens?.results;
      if (resultsArray) {
        const filteredItems = resultsArray.filter(hasTokenResult);
        setTokenListItems(filteredItems);
      }
    } catch (err: unknown) {
      devLog.error('Error loading network page data:', err);
      setFetchError(getErrorMessage(err));
      if (!networkName) setNetworkName(`Network ${networkId}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- networkName only used in catch for fallback, omit to avoid churn
  }, [codexClient, networkIdNum, networkId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only for this route
  }, [codexClient, networkIdNum, networkId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setFetchError(null);
    await fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <main
        className="flex min-h-screen flex-col items-center p-12 md:p-24"
        aria-busy="true"
        aria-label="Loading"
      >
        <p>Loading...</p>
      </main>
    );
  }

  const pageTitle =
    fetchError && !tokenListItems.length
      ? `Error loading tokens for ${networkName}`
      : networkName || `Tokens on Network ${networkId}`;

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <PullToRefresh onRefresh={refresh} className="flex-1 min-h-0">
        <main className="flex min-h-full flex-col items-center p-6 md:p-12">
          <div className="w-full max-w-4xl flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{pageTitle}</h1>
            <Link to="/" className="hover:underline">
              &lt; Back to Networks
            </Link>
          </div>

          <div className="w-full max-w-4xl">
            {fetchError && (
              <p className="text-destructive mb-4">{fetchError}</p>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                {tokenListItems.length > 0 ? (
                  <div
                    className="min-h-0 flex flex-col"
                    style={{ height: LIST_VIEW_MAX_HEIGHT }}
                  >
                    <VirtualTable<TokenFilterResult>
                      items={tokenListItems}
                      estimatedRowHeight={TOKENS_GRID_ESTIMATED_ROW_HEIGHT}
                      maxHeight={LIST_VIEW_MAX_HEIGHT}
                      gridTemplateColumns={TOKENS_GRID_COLUMNS}
                      getItemKey={(item) => item.token?.address ?? ''}
                      className="border border-border rounded-md h-full"
                      onRefresh={refresh}
                      refreshing={refreshing}
                      header={
                        <>
                          <span className="w-[60px]">Icon</span>
                          <span>Name</span>
                          <span>Symbol</span>
                          <span>Exchanges</span>
                        </>
                      }
                    >
                      {(item) => {
                        const token = item.token;
                        const href = `/networks/${networkId}/tokens/${token?.address}`;
                        const name = token?.name ?? 'Unknown Name';
                        const symbol = token?.symbol ?? '-';
                        const exchanges =
                          token?.exchanges?.map((e) => e.name).join(', ') ??
                          '-';
                        return (
                          <>
                            <div className="flex items-center justify-center">
                              {token?.info?.imageThumbUrl ? (
                                <img
                                  src={token.info.imageThumbUrl}
                                  alt={`${name} icon`}
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                  {symbol !== '-' ? symbol[0] : 'T'}
                                </div>
                              )}
                            </div>
                            <Link
                              to={href}
                              className="block w-full h-full hover:underline truncate"
                            >
                              {name}
                            </Link>
                            <Link
                              to={href}
                              className="block w-full h-full hover:underline truncate"
                            >
                              {symbol}
                            </Link>
                            <Link
                              to={href}
                              className="block w-full h-full hover:underline truncate"
                            >
                              {exchanges}
                            </Link>
                          </>
                        );
                      }}
                    </VirtualTable>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No tokens found on this network.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
}
