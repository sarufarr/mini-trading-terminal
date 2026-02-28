import { memo } from 'react';
import { cn } from '@/lib/cn';
import { ETradeDirection } from '@/types/trade';

interface TradingPanelTabsProps {
  activeTab: ETradeDirection;
  onTabChange: (tab: ETradeDirection) => void;
}

export const TradingPanelTabs = memo(function TradingPanelTabs({
  activeTab,
  onTabChange,
}: TradingPanelTabsProps) {
  return (
    <div className="flex gap-2">
      {[ETradeDirection.BUY, ETradeDirection.SELL].map((mode) => (
        <button
          key={mode}
          onClick={() => onTabChange(mode)}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg font-medium capitalize transition-all',
            activeTab === mode
              ? mode === ETradeDirection.BUY
                ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                : 'bg-red-500/20 text-red-500 border border-red-500/50'
              : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
          )}
          aria-label={mode === ETradeDirection.BUY ? 'Buy' : 'Sell'}
        >
          {mode === ETradeDirection.BUY ? 'Buy' : 'Sell'}
        </button>
      ))}
    </div>
  );
});

TradingPanelTabs.displayName = 'TradingPanelTabs';
