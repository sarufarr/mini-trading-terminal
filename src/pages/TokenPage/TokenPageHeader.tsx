import { Link } from 'react-router-dom';

interface TokenPageHeaderProps {
  tokenName: string;
  tokenSymbol: string;
  networkId: string;
}

export function TokenPageHeader({
  tokenName,
  tokenSymbol,
  networkId,
}: TokenPageHeaderProps) {
  return (
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
  );
}
