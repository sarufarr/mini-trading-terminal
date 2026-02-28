import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VirtualList } from '@/components/VirtualList';
import type { PairFilterResult } from '@/lib/codex';

interface TokenPagePoolsCardProps {
  pairs: PairFilterResult[];
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

function getPairKey(pair: PairFilterResult, index: number): string {
  return pair.pair?.address ?? `${pair.exchange?.id ?? 'exchange'}-${index}`;
}

export function TokenPagePoolsCard({
  pairs,
  onRefresh,
  refreshing = false,
}: TokenPagePoolsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-4">
        <CardTitle>Pools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pairs.length > 0 ? (
          <VirtualList<PairFilterResult>
            items={pairs}
            estimateSize={72}
            maxHeight={320}
            getItemKey={getPairKey}
            onRefresh={onRefresh}
            refreshing={refreshing}
          >
            {(pair) => (
              <div className="text-sm space-y-1 pr-2 pb-2 border-b border-border/30">
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
                  className="font-mono block break-all text-xs"
                  title={pair.pair?.address || ''}
                >
                  {pair.pair?.address || ''}
                </span>
              </div>
            )}
          </VirtualList>
        ) : (
          <p className="text-muted-foreground">
            No pools found for this token.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
