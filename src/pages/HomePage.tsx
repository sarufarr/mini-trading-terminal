import { useCallback, useEffect, useState } from 'react';
import { NetworkList } from '@/components/NetworkList';
import { useCodexClient } from '@/contexts/use-codex-client';
import { TOP_NETWORK_NAMES } from '@/constants/ui';
import { devLog } from '@/lib/dev-log';
import { isNetwork, type Network } from '@/types/network';

export function HomePage() {
  const codexClient = useCodexClient();
  const [topNetworks, setTopNetworks] = useState<Network[]>([]);
  const [restNetworks, setRestNetworks] = useState<Network[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNetworks = useCallback(async () => {
    try {
      const result = await codexClient.queries.getNetworks({});
      const allNetworks = result.getNetworks?.filter(isNetwork) ?? [];
      const topMap = new Map<string, Network>();
      const rest: Network[] = [];
      for (const network of allNetworks) {
        if ((TOP_NETWORK_NAMES as readonly string[]).includes(network.name)) {
          topMap.set(network.name, network);
        } else {
          rest.push(network);
        }
      }
      const top = TOP_NETWORK_NAMES.map((name) => topMap.get(name)).filter(
        (n): n is Network => n != null
      );

      rest.sort((a, b) => a.name.localeCompare(b.name));
      setTopNetworks(top);
      setRestNetworks(rest);
      setError(null);
    } catch (err) {
      devLog.error('Error fetching networks:', err);
      setError('Failed to load networks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [codexClient]);

  useEffect(() => {
    setLoading(true);
    fetchNetworks();
  }, [fetchNetworks]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    await fetchNetworks();
  }, [fetchNetworks]);

  return (
    <main className="flex min-h-screen flex-col p-12 md:p-24">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Tokedex</h1>
        <p className="text-lg text-center mb-8">
          Welcome to Tokedex! Your mini trading terminal.
          <br />
          Discover, analyze, and track tokens across various networks.
        </p>
      </div>

      <div
        className="w-full max-w-md mx-auto flex-grow flex flex-col"
        aria-busy={loading}
        aria-label={loading ? 'Loading networks' : undefined}
      >
        {loading ? (
          <p className="text-center">Loading networks...</p>
        ) : (
          <NetworkList
            topNetworks={topNetworks}
            restNetworks={restNetworks}
            initialError={error}
            onRefresh={refresh}
            refreshing={refreshing}
          />
        )}
      </div>
    </main>
  );
}
