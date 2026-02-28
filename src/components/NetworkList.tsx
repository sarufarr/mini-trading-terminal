import { Link } from 'react-router-dom';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

type Network = {
  id: number;
  name: string;
};

interface NetworkListProps {
  topNetworks: Network[];
  restNetworks: Network[];
  initialError: string | null;
}

export function NetworkList({
  topNetworks,
  restNetworks,
  initialError,
}: NetworkListProps) {
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
    <Command className="border h-full">
      <CommandInput placeholder="Search networks..." />
      <CommandList className="h-full">
        {' '}
        <CommandEmpty>No networks found.</CommandEmpty>
        {topNetworks.length > 0 && (
          <CommandGroup heading="Top">
            {topNetworks.map((network) => (
              <Link to={`/networks/${network.id}`} key={network.id}>
                <CommandItem value={network.name} className="cursor-pointer">
                  {network.name}
                </CommandItem>
              </Link>
            ))}
          </CommandGroup>
        )}
        {restNetworks.length > 0 && (
          <CommandGroup heading="Rest">
            {restNetworks.map((network) => (
              <Link to={`/networks/${network.id}`} key={network.id}>
                <CommandItem value={network.name} className="cursor-pointer">
                  {network.name}
                </CommandItem>
              </Link>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
