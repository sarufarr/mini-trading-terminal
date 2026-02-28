import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { SELL_PCT_PRESETS } from '@/constants/trade';
import { cn } from '@/lib/cn';

interface TradingPanelSellFormProps {
  sellPercentage: string;
  onSellPercentageChange: (value: string) => void;
  tokenBalance: number;
  tokenSymbol: string;
  parsedSellPercentage: number;
}

export const TradingPanelSellForm = memo(function TradingPanelSellForm({
  sellPercentage,
  onSellPercentageChange,
  tokenBalance,
  tokenSymbol,
  parsedSellPercentage,
}: TradingPanelSellFormProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-muted-foreground">Sell Percentage</label>
      <div className="flex gap-2">
        {SELL_PCT_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onSellPercentageChange(String(preset))}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all',
              sellPercentage === String(preset)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
            aria-label={`Sell ${preset}%`}
          >
            {preset}%
          </button>
        ))}
      </div>
      <Input
        type="number"
        placeholder="0"
        value={sellPercentage}
        onChange={(e) => onSellPercentageChange(e.target.value)}
        min="0"
        max="100"
        step="1"
      />
      {sellPercentage && tokenBalance > 0 && (
        <p className="text-xs text-muted-foreground">
          Selling:{' '}
          {((tokenBalance * parsedSellPercentage) / 100).toLocaleString()}{' '}
          {tokenSymbol}
        </p>
      )}
    </div>
  );
});

TradingPanelSellForm.displayName = 'TradingPanelSellForm';
