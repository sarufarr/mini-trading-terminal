import { Link, useParams } from 'react-router-dom';
import { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import { TokenChart, ChartDataPoint } from '@/components/TokenChart';
import { TradingPanel } from '@/components/TradingPanel';
import { FloatingTradingPanel } from '@/components/FloatingTradingPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EnhancedToken } from '@/lib/codex';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getCodexClient } from '@/lib/codex';

type TokenEvent = {
  id: string;
  timestamp: number;
  transactionHash: string;
  eventDisplayType?: string | null;
  amountUsd?: number | null;
  uniqueId?: string;
};

const codexClient = getCodexClient();

export function TokenPage() {
  const { networkId, tokenId } = useParams<{
    networkId: string;
    tokenId: string;
  }>();
  const networkIdNum = parseInt(networkId || '', 10);

  const [details, setDetails] = useState<EnhancedToken | undefined>(undefined);
  const [bars, setBars] = useState<ChartDataPoint[]>([]);
  const [events, setEvents] = useState<TokenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const isOpen = useTradePanelStore((s) => s.isOpen);
  const toggle = useTradePanelStore((s) => s.toggle);

  const fetchData = useCallback(async () => {
    if (isNaN(networkIdNum) || !tokenId) {
      if (!isMountedRef.current) return;
      setError('Invalid Network or Token ID');
      setLoading(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const symbolId = `${tokenId}:${networkIdNum}`;

    try {
      const [detailsResult, barsResult, eventsResult] =
        await Promise.allSettled([
          codexClient.queries.token({
            input: { networkId: networkIdNum, address: tokenId },
          }),
          codexClient.queries.getBars({
            symbol: symbolId,
            from: oneDayAgo,
            to: now,
            resolution: '30',
          }),
          codexClient.queries.getTokenEvents({
            query: { networkId: networkIdNum, address: tokenId },
            limit: 50,
          }),
        ]);

      if (!isMountedRef.current) return;

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
    } catch (_err) {
      if (!isMountedRef.current) return;
      setError('Failed to load token data');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [networkIdNum, tokenId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData]);

  if (loading)
    return (
      <main className="flex min-h-screen flex-col items-center p-6 md:p-12">
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
        </div>
      </div>

      {details && <FloatingTradingPanel token={details} />}
    </main>
  );
}
