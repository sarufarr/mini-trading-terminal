import { memo } from 'react';
import { SOL_DISPLAY_DECIMALS } from '@/constants/trade';

interface TradingPanelBalanceProps {
  solBalance: number;
  tokenBalance: number;
  tokenSymbol: string | null;
}

export const TradingPanelBalance = memo(function TradingPanelBalance({
  solBalance,
  tokenBalance,
  tokenSymbol,
}: TradingPanelBalanceProps) {
  return (
    <>
      <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
        <span className="text-sm text-muted-foreground">SOL Balance</span>
        <span className="font-semibold">
          {solBalance.toFixed(SOL_DISPLAY_DECIMALS)} SOL
        </span>
      </div>
      {tokenSymbol && (
        <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {tokenSymbol} Balance
          </span>
          <span className="font-semibold">
            {tokenBalance.toLocaleString()} {tokenSymbol}
          </span>
        </div>
      )}
    </>
  );
});

TradingPanelBalance.displayName = 'TradingPanelBalance';
