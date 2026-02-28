import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { VirtualList } from '@/components/VirtualList';
import { cn } from '@/lib/cn';
import type { Network } from '@/types/network';
import { LIST_VIEW_MAX_HEIGHT, LIST_ESTIMATE_SIZE } from '@/constants/ui';

type ListItem =
  | { type: 'heading'; title: string }
  | { type: 'network'; network: Network };

function filterNetworks(
  networks: Network[],
  search: string | undefined
): Network[] {
  if (!search || !search.trim()) return networks;
  const q = search.trim().toLowerCase();
  return networks.filter((n) => n.name.toLowerCase().includes(q));
}

function buildFlattenedList(
  topNetworks: Network[],
  restNetworks: Network[],
  search: string | undefined
): ListItem[] {
  const filteredTop = filterNetworks(topNetworks, search);
  const filteredRest = filterNetworks(restNetworks, search);
  const list: ListItem[] = [];
  if (filteredTop.length > 0) {
    list.push({ type: 'heading', title: 'Top' });
    filteredTop.forEach((network) => list.push({ type: 'network', network }));
  }
  if (filteredRest.length > 0) {
    list.push({ type: 'heading', title: 'Rest' });
    filteredRest.forEach((network) => list.push({ type: 'network', network }));
  }
  return list;
}

function getListItemKey(item: ListItem, index: number): string {
  if (item.type === 'heading') return `heading-${item.title}-${index}`;
  return `network-${item.network.id}`;
}

interface NetworkListProps {
  topNetworks: Network[];
  restNetworks: Network[];
  initialError: string | null;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export const NetworkList = memo(function NetworkList({
  topNetworks,
  restNetworks,
  initialError,
  onRefresh,
  refreshing = false,
}: NetworkListProps) {
  const [search, setSearch] = useState<string | undefined>(undefined);

  const flattenedList = useMemo(
    () => buildFlattenedList(topNetworks, restNetworks, search),
    [topNetworks, restNetworks, search]
  );

  const hasNetworkItems = flattenedList.some((item) => item.type === 'network');

  if (initialError) {
    return (
      <div className="w-full h-full border border-border p-4 flex flex-col items-center justify-center">
        <p className="text-destructive">{initialError}</p>
      </div>
    );
  }

  if (topNetworks.length === 0 && restNetworks.length === 0) {
    return (
      <div className="w-full h-full border border-border p-4 flex flex-col items-center justify-center">
        <p>No networks available.</p>
      </div>
    );
  }

  return (
    <div className="border h-full flex flex-col">
      <div
        data-slot="command-input-wrapper"
        className="flex h-9 shrink-0 items-center gap-2 border-b px-3"
      >
        <SearchIcon className="size-4 shrink-0 opacity-50" />
        <input
          type="text"
          value={search ?? ''}
          onChange={(e) => setSearch(e.target.value || undefined)}
          placeholder="Search networks..."
          className={cn(
            'placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden'
          )}
          aria-label="Search networks"
        />
      </div>
      <Command
        className="flex-1 min-h-0 flex flex-col border-0"
        shouldFilter={false}
      >
        <CommandList className="flex-1 min-h-0 flex flex-col p-1">
          <CommandEmpty>No networks found.</CommandEmpty>
          {hasNetworkItems ? (
            <div
              className="min-h-0 flex-1 flex flex-col"
              style={{ height: LIST_VIEW_MAX_HEIGHT }}
            >
              <VirtualList
                items={flattenedList}
                estimateSize={LIST_ESTIMATE_SIZE}
                maxHeight={LIST_VIEW_MAX_HEIGHT}
                getItemKey={getListItemKey}
                onRefresh={onRefresh}
                refreshing={refreshing}
                className="h-full"
              >
                {(item) =>
                  item.type === 'heading' ? (
                    <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                      {item.title}
                    </div>
                  ) : (
                    <Link to={`/networks/${item.network.id}`}>
                      <CommandItem
                        value={item.network.name}
                        className="cursor-pointer"
                        onSelect={() => {}}
                      >
                        {item.network.name}
                      </CommandItem>
                    </Link>
                  )
                }
              </VirtualList>
            </div>
          ) : null}
        </CommandList>
      </Command>
    </div>
  );
});
NetworkList.displayName = 'NetworkList';
