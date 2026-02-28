import { useCallback, useEffect, useState } from 'react';
import type { ChartDataPoint } from '@/components/TokenChart';
import type { EnhancedToken } from '@/lib/codex';
import {
  type PairFilterResult,
  PairRankingAttribute,
  RankingDirection,
  isPairFilterResult,
} from '@/lib/codex';
import type { CodexClient } from '@/lib/codex';
import {
  SECONDS_PER_DAY,
  CHART_RESOLUTION_MINUTES,
  DEFAULT_TOKEN_EVENTS_LIMIT,
  DEFAULT_TOKEN_PAIRS_LIMIT,
} from '@/constants/trade';
import { devLog } from '@/lib/dev-log';
import type { TokenEvent } from '@/types/token';

/** Shape of event item from Codex getTokenEvents used for mapping to TokenEvent. */
interface TokenEventItemRaw {
  id: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash: string;
  eventDisplayType?: string;
  token0SwapValueUsd?: string;
}

export interface UseTokenPageDataResult {
  details: EnhancedToken | undefined;
  pairs: PairFilterResult[];
  bars: ChartDataPoint[];
  events: TokenEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshing: boolean;
  refreshPools: () => Promise<void>;
  refreshingPools: boolean;
  refreshEvents: () => Promise<void>;
  refreshingEvents: boolean;
}

export function useTokenPageData(
  networkIdNum: number,
  tokenId: string | undefined,
  codexClient: CodexClient
): UseTokenPageDataResult {
  const [details, setDetails] = useState<EnhancedToken | undefined>(undefined);
  const [pairs, setPairs] = useState<PairFilterResult[]>([]);
  const [bars, setBars] = useState<ChartDataPoint[]>([]);
  const [events, setEvents] = useState<TokenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingPools, setRefreshingPools] = useState(false);
  const [refreshingEvents, setRefreshingEvents] = useState(false);

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
          const items = (eventsResult.value.getTokenEvents?.items ?? []) as (
            | TokenEventItemRaw
            | null
            | undefined
          )[];
          setEvents(
            items
              .filter(
                (ev): ev is TokenEventItemRaw =>
                  ev != null && typeof ev === 'object'
              )
              .map((ev: TokenEventItemRaw, i: number) => ({
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
        devLog.error('[TokenPage] fetchData failed:', err);
        setError('Failed to load token data');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [codexClient, networkIdNum, tokenId]
  );

  const fetchPoolsOnly = useCallback(
    async (signal: AbortSignal) => {
      if (isNaN(networkIdNum) || !tokenId) return;
      try {
        const pairsResult = await codexClient.queries.filterPairs({
          filters: { tokenAddress: [tokenId] },
          rankings: [
            {
              attribute: PairRankingAttribute.VolumeUsd24,
              direction: RankingDirection.Desc,
            },
          ],
          limit: DEFAULT_TOKEN_PAIRS_LIMIT,
        });
        if (signal.aborted) return;
        if (pairsResult.filterPairs?.results) {
          setPairs(pairsResult.filterPairs.results.filter(isPairFilterResult));
        }
      } catch (err) {
        if (!signal.aborted)
          devLog.error('[TokenPage] fetchPools failed:', err);
      }
    },
    [codexClient, networkIdNum, tokenId]
  );

  const fetchEventsOnly = useCallback(
    async (signal: AbortSignal) => {
      if (isNaN(networkIdNum) || !tokenId) return;
      try {
        const eventsResult = await codexClient.queries.getTokenEvents({
          query: { networkId: networkIdNum, address: tokenId },
          limit: DEFAULT_TOKEN_EVENTS_LIMIT,
        });
        if (signal.aborted) return;
        const items = (eventsResult.getTokenEvents?.items ?? []) as (
          | TokenEventItemRaw
          | null
          | undefined
        )[];
        setEvents(
          items
            .filter(
              (ev): ev is TokenEventItemRaw =>
                ev != null && typeof ev === 'object'
            )
            .map((ev: TokenEventItemRaw, i: number) => ({
              id: ev.id,
              timestamp: ev.timestamp,
              uniqueId: `${ev.id}-${ev.blockNumber ?? 0}-${i}`,
              transactionHash: ev.transactionHash,
              eventDisplayType: ev.eventDisplayType,
              amountUsd: parseFloat(ev.token0SwapValueUsd || '0'),
            }))
        );
      } catch (err) {
        if (!signal.aborted)
          devLog.error('[TokenPage] fetchEvents failed:', err);
      }
    },
    [codexClient, networkIdNum, tokenId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    setRefreshing(true);
    setError(null);
    try {
      await fetchData(controller.signal);
      if (!controller.signal.aborted) setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  const refreshPools = useCallback(async () => {
    const controller = new AbortController();
    setRefreshingPools(true);
    try {
      await fetchPoolsOnly(controller.signal);
    } finally {
      setRefreshingPools(false);
    }
  }, [fetchPoolsOnly]);

  const refreshEvents = useCallback(async () => {
    const controller = new AbortController();
    setRefreshingEvents(true);
    try {
      await fetchEventsOnly(controller.signal);
    } finally {
      setRefreshingEvents(false);
    }
  }, [fetchEventsOnly]);

  return {
    details,
    pairs,
    bars,
    events,
    loading,
    error,
    refresh,
    refreshing,
    refreshPools,
    refreshingPools,
    refreshEvents,
    refreshingEvents,
  };
}
