import {
  memo,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  SLIPPAGE_PRESETS_BPS,
  SLIPPAGE_MIN_BPS,
  SLIPPAGE_MAX_BPS,
  DEFAULT_SLIPPAGE_BPS,
} from '@/constants/trade';
import { PRESET_ACCENT_BUTTON } from '@/constants/preset-accent';
import { useTradePanelStore } from '@/store/trade-panel.store';
import { ETradeDirection } from '@/types/trade';

interface SlippageSelectorProps {
  direction: ETradeDirection;
}

function getSlippageBpsSnapshot() {
  return useTradePanelStore.getState().slippageBps;
}

function subscribeToSlippageBps(callback: () => void) {
  return useTradePanelStore.subscribe(callback);
}

export const SlippageSelector = memo(function SlippageSelector({
  direction,
}: SlippageSelectorProps) {
  const slippageBps = useSyncExternalStore(
    subscribeToSlippageBps,
    getSlippageBpsSnapshot,
    () => DEFAULT_SLIPPAGE_BPS
  );
  const setSlippageBps = useTradePanelStore((s) => s.setSlippageBps);
  const isBuy = direction === ETradeDirection.BUY;

  const [inputValue, setInputValue] = useState(() => String(slippageBps / 100));

  useEffect(() => {
    setInputValue(String(slippageBps / 100));
  }, [slippageBps]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    []
  );

  const handleInputBlur = useCallback(() => {
    const parsed = Number.parseFloat(inputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setInputValue(String(slippageBps / 100));
      return;
    }
    const clamped = Math.min(
      SLIPPAGE_MAX_BPS / 100,
      Math.max(SLIPPAGE_MIN_BPS / 100, parsed)
    );
    const bps = Math.round(clamped * 100);
    setSlippageBps(bps);
    setInputValue(String(bps / 100));
  }, [inputValue, slippageBps, setSlippageBps]);

  const handlePresetClick = useCallback(
    (preset: number) => {
      setSlippageBps(preset);
      setInputValue(String(preset / 100));
    },
    [setSlippageBps]
  );

  const isCustomSlippage = !SLIPPAGE_PRESETS_BPS.includes(slippageBps);

  return (
    <div className="flex flex-col gap-1 px-1">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Slippage
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-medium',
              isCustomSlippage
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-muted/60 text-muted-foreground'
            )}
          >
            {isCustomSlippage ? 'Custom' : 'Preset'}
          </span>
        </span>
        <span className="font-medium text-foreground">
          {(slippageBps / 100).toString()}%
        </span>
      </div>
      <div className="flex gap-1.5">
        {SLIPPAGE_PRESETS_BPS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'flex-1 min-h-9 py-2 rounded-md text-xs font-medium transition-colors',
              slippageBps === preset
                ? PRESET_ACCENT_BUTTON[isBuy ? 'green' : 'red']
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
            )}
            aria-label={`Set slippage to ${(preset / 100).toString()}%`}
          >
            {(preset / 100).toString()}%
          </button>
        ))}
      </div>
      <div className="relative flex min-w-0 mt-3">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Custom %"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={SLIPPAGE_MIN_BPS / 100}
          max={SLIPPAGE_MAX_BPS / 100}
          step={0.1}
          className={cn(
            'w-full h-10 py-2 px-4 pr-6 text-sm text-center rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            isCustomSlippage &&
              'ring-1 ring-amber-500/50 dark:ring-amber-400/50 bg-amber-500/5 dark:bg-amber-500/10'
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          %
        </span>
      </div>
    </div>
  );
});

SlippageSelector.displayName = 'SlippageSelector';
