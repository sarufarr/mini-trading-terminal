import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VirtualTable } from '@/components/VirtualTable';
import {
  EVENTS_VIEW_MAX_HEIGHT,
  EVENTS_GRID_ESTIMATED_ROW_HEIGHT,
  EVENTS_GRID_COLUMNS,
} from '@/constants/ui';
import type { TokenEvent } from '@/types/token';

interface TokenPageEventsCardProps {
  events: TokenEvent[];
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export function TokenPageEventsCard({
  events,
  onRefresh,
  refreshing = false,
}: TokenPageEventsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div
            className="min-h-0 flex flex-col"
            style={{ height: EVENTS_VIEW_MAX_HEIGHT }}
          >
            <VirtualTable<TokenEvent>
              items={events}
              estimatedRowHeight={EVENTS_GRID_ESTIMATED_ROW_HEIGHT}
              maxHeight={EVENTS_VIEW_MAX_HEIGHT}
              gridTemplateColumns={EVENTS_GRID_COLUMNS}
              getItemKey={(e) => e.uniqueId || e.id}
              onRefresh={onRefresh}
              refreshing={refreshing}
              className="h-full"
              header={
                <>
                  <span>Type</span>
                  <span>Time</span>
                  <span>Value (USD)</span>
                  <span>Tx Hash</span>
                </>
              }
            >
              {(event) => (
                <>
                  <span>{event.eventDisplayType || 'N/A'}</span>
                  <span>
                    {new Date(event.timestamp * 1000).toLocaleString()}
                  </span>
                  <span>
                    {event.amountUsd ? `$${event.amountUsd.toFixed(2)}` : 'N/A'}
                  </span>
                  <span className="truncate" title={event.transactionHash}>
                    {event.transactionHash.substring(0, 8)}...
                  </span>
                </>
              )}
            </VirtualTable>
          </div>
        ) : (
          <p className="text-muted-foreground">
            No recent transaction data available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
