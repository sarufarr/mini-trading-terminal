import { Link, useParams } from 'react-router-dom';
import { useEffect, useState, Suspense, useCallback, lazy } from 'react';
import type { ChartDataPoint } from '@/components/TokenChart';
import { TradingPanel } from '@/components/TradingPanel';
import { FloatingTradingPanel } from '@/components/FloatingTradingPanel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EnhancedToken } from '@/lib/codex';
import {
  type PairFilterResult,
  PairRankingAttribute,
  RankingDirection,
  isPairFilterResult,
} from '@/lib/codex';
import { useCodexClient } from '@/contexts/CodexContext';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  SECONDS_PER_DAY,
  CHART_RESOLUTION_MINUTES,
  DEFAULT_TOKEN_EVENTS_LIMIT,
  DEFAULT_TOKEN_PAIRS_LIMIT,
} from '@/constants/trade';
import type { TokenEvent } from '@/types/token';

const TokenChart = lazy(() =>
  import('@/components/TokenChart').then((m) => ({ default: m.TokenChart }))
);

export function TokenPage() {
  const codexClient = useCodexClient();
  const { networkId, tokenId } = useParams<{
    networkId: string;
    tokenId: string;
  }>();
  const networkIdNum = parseInt(networkId || '', 10);

  const [details, setDetails] = useState<EnhancedToken | undefined>(undefined);
  const [pairs, setPairs] = useState<PairFilterResult[]>([]);
  const [bars, setBars] = useState<ChartDataPoint[]>([]);
  const [events, setEvents] = useState<TokenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOpen = useTradePanelStore((s) => s.isOpen);
  const toggle = useTradePanelStore((s) => s.toggle);

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      if (isNaN(networkIdNum) || !tokenId) {
        if (signal.aborted) return;
        setError('Invalid Network or Token ID');
        setLoading(false);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - SECONDS_PER_DAY;
      const symbolId = `${tokenId}:${networkIdNum}`;

      try {
        const [detailsResult, barsResult, eventsResult, pairsResult] =
          await Promise.allSettled([
            codexClient.queries.token({
              input: { networkId: networkIdNum, address: tokenId },
            }),
            codexClient.queries.getBars({
              symbol: symbolId,
              from: oneDayAgo,
              to: now,
              resolution: CHART_RESOLUTION_MINUTES,
            }),
            codexClient.queries.getTokenEvents({
              query: { networkId: networkIdNum, address: tokenId },
              limit: DEFAULT_TOKEN_EVENTS_LIMIT,
            }),
            codexClient.queries.filterPairs({
              filters: { tokenAddress: [tokenId] },
              rankings: [
                {
                  attribute: PairRankingAttribute.VolumeUsd24,
                  direction: RankingDirection.Desc,
                },
              ],
              limit: DEFAULT_TOKEN_PAIRS_LIMIT,
            }),
          ]);

        if (signal.aborted) return;

        if (detailsResult.status === 'fulfilled')
          setDetails(detailsResult.value.token);

        if (barsResult.status === 'fulfilled') {
          const b = barsResult.value.getBars;
          if (b?.t && b?.c) {
            setBars(
              b.t.map((time: number, i: number) => ({
                time,
                open: b.o?.[i],
                high: b.h?.[i],
                low: b.l?.[i],
                close: b.c?.[i],
              }))
            );
          }
        }

        if (eventsResult.status === 'fulfilled') {
          const items = eventsResult.value.getTokenEvents?.items ?? [];
          setEvents(
            items
              .filter((ev): ev is NonNullable<typeof ev> => ev != null)
              .map((ev, i) => ({
                id: ev.id,
                timestamp: ev.timestamp,
                uniqueId: `${ev.id}-${ev.blockNumber ?? 0}-${i}`,
                transactionHash: ev.transactionHash,
                eventDisplayType: ev.eventDisplayType,
                amountUsd: parseFloat(ev.token0SwapValueUsd || '0'),
              }))
          );
        }

        if (
          pairsResult.status === 'fulfilled' &&
          pairsResult.value.filterPairs?.results
        ) {
          setPairs(
            pairsResult.value.filterPairs.results.filter(isPairFilterResult)
          );
        }
      } catch (err) {
        if (signal.aborted) return;
        console.error('[TokenPage] fetchData failed:', err);
        setError('Failed to load token data');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [codexClient, networkIdNum, tokenId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

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

  const tokenName = details?.name || tokenId;
  const tokenSymbol = details?.symbol ? `(${details.symbol})` : '';

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 space-y-6">
      <div className="w-full max-w-6xl flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold truncate pr-4">
          {tokenName} {tokenSymbol}
        </h1>
        <Link
          to={`/networks/${networkId}`}
          className="text-sm hover:underline whitespace-nowrap"
        >
          &lt; Back to Network
        </Link>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Suspense
            fallback={
              <Card>
                <CardContent>
                  <p>Loading chart...</p>
                </CardContent>
              </Card>
            }
          >
            <TokenChart
              data={bars}
              title={`${tokenSymbol || 'Token'} Price Chart`}
            />
          </Suspense>

          {details && (
            <div className="flex justify-center">
              <motion.button
                onClick={toggle}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  'border border-border/60 backdrop-blur-sm',
                  isOpen
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
                whileTap={{ scale: 0.96 }}
              >
                <Zap className={cn('w-3.5 h-3.5', isOpen && 'fill-primary')} />
                {isOpen ? 'Close Trade Panel' : 'Instant Trade'}
              </motion.button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Value (USD)</TableHead>
                      <TableHead>Tx Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.uniqueId || event.id}>
                        <TableCell>{event.eventDisplayType || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(event.timestamp * 1000).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {event.amountUsd
                            ? `$${event.amountUsd.toFixed(2)}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="truncate">
                          <span title={event.transactionHash}>
                            {event.transactionHash.substring(0, 8)}...
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">
                  No recent transaction data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {details && <TradingPanel token={details} />}
          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              {details?.info?.imageThumbUrl ? (
                <img
                  src={details.info.imageThumbUrl}
                  alt={`${details.name || 'Token'} icon`}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                  {details?.symbol ? details.symbol[0] : 'T'}
                </div>
              )}
              <div>
                <CardTitle>Information</CardTitle>
                {details?.symbol && (
                  <CardDescription>{details.symbol}</CardDescription>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {details ? (
                <>
                  <p className="text-sm">
                    <strong className="text-muted-foreground">Address:</strong>
                    <span
                      className="font-mono block break-all"
                      title={details.address}
                    >
                      {details.address}
                    </span>
                  </p>
                  {details.info?.description && (
                    <p className="text-sm">
                      <strong className="text-muted-foreground">
                        Description:
                      </strong>{' '}
                      {details.info?.description}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Token details could not be loaded.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              <CardTitle>Pools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pairs.length > 0 ? (
                <div className="space-y-2">
                  {pairs.map((pair, index) => (
                    <div
                      className="text-sm"
                      key={
                        pair.pair?.address ??
                        `${pair.exchange?.id ?? 'exchange'}-${index}`
                      }
                    >
                      <div className="flex justify-between items-start">
                        <strong className="text-muted-foreground">
                          {pair.exchange?.name || 'Unknown Exchange'}
                        </strong>
                        <span className="text-xs text-muted-foreground">
                          24h Volume: $
                          {parseFloat(pair.volumeUSD24 || '0').toLocaleString()}
                        </span>
                      </div>
                      <span
                        className="font-mono block break-all"
                        title={pair.pair?.address || ''}
                      >
                        {pair.pair?.address || ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No pools found for this token.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {details && <FloatingTradingPanel token={details} />}
    </main>
  );
}
