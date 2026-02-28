import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { SOL_PRESETS, SOL_DISPLAY_DECIMALS } from '@/constants/trade';
import { cn } from '@/lib/cn';

interface TradingPanelBuyFormProps {
  buyAmount: string;
  onBuyAmountChange: (value: string) => void;
  solBalance: number;
}

export const TradingPanelBuyForm = memo(function TradingPanelBuyForm({
  buyAmount,
  onBuyAmountChange,
  solBalance,
}: TradingPanelBuyFormProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">Amount in SOL</label>
      <div className="flex gap-2">
        {SOL_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onBuyAmountChange(String(preset))}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-all',
              buyAmount === String(preset)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
            aria-label={`Set amount to ${preset} SOL`}
          >
            {preset}
          </button>
        ))}
      </div>
      <Input
        type="number"
        placeholder="0.00"
        value={buyAmount}
        onChange={(e) => onBuyAmountChange(e.target.value)}
        min="0"
        step="0.01"
      />
      <p className="text-xs text-muted-foreground">
        Available: {solBalance.toFixed(SOL_DISPLAY_DECIMALS)} SOL
      </p>
    </div>
  );
});

TradingPanelBuyForm.displayName = 'TradingPanelBuyForm';
