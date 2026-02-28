import { memo } from 'react';
import { toast } from 'sonner';
import { CardHeader, CardTitle } from '@/components/ui/card';
import type { PublicKey } from '@solana/web3.js';

interface TradingPanelHeaderProps {
  tokenSymbol: string;
  signer: PublicKey;
}

export const TradingPanelHeader = memo(function TradingPanelHeader({
  tokenSymbol,
  signer,
}: TradingPanelHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Trade {tokenSymbol}</CardTitle>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(signer.toBase58());
            toast.success('Wallet address copied!');
          }}
          className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors cursor-pointer"
          aria-label="Copy wallet address"
        >
          {signer.toBase58().slice(0, 4)}...{signer.toBase58().slice(-4)}
        </button>
      </div>
    </CardHeader>
  );
});

TradingPanelHeader.displayName = 'TradingPanelHeader';
