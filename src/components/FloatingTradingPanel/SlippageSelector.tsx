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
import {
  PRESET_ACCENT_BUTTON,
  PRESET_ACCENT_INPUT_FOCUS_RING,
  PRESET_BADGE_CUSTOM,
  PRESET_BADGE_PRESET,
} from '@/constants/preset-accent';
import { useTradeStore } from '@/store/trade.store';
import { ETradeDirection } from '@/types/trade';

interface SlippageSelectorProps {
  direction: ETradeDirection;
}

function getSlippageBpsSnapshot() {
  return useTradeStore.getState().slippageBps;
}

function subscribeToSlippageBps(callback: () => void) {
  return useTradeStore.subscribe(callback);
}

function formatSlippagePercent(bps: number): string {
  return String(bps / 100);
}

export const SlippageSelector = memo(function SlippageSelector({
  direction,
}: SlippageSelectorProps) {
  const slippageBps = useSyncExternalStore(
    subscribeToSlippageBps,
    getSlippageBpsSnapshot,
    () => DEFAULT_SLIPPAGE_BPS
  );
  const setSlippageBps = useTradeStore((s) => s.setSlippageBps);
  const isBuy = direction === ETradeDirection.BUY;

  const [inputValue, setInputValue] = useState(() =>
    formatSlippagePercent(slippageBps)
  );

  useEffect(() => {
    setInputValue(formatSlippagePercent(slippageBps));
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
      setInputValue(formatSlippagePercent(slippageBps));
      return;
    }
    const clamped = Math.min(
      SLIPPAGE_MAX_BPS / 100,
      Math.max(SLIPPAGE_MIN_BPS / 100, parsed)
    );
    const bps = Math.round(clamped * 100);
    setSlippageBps(bps);
    setInputValue(formatSlippagePercent(bps));
  }, [inputValue, slippageBps, setSlippageBps]);

  const handlePresetClick = useCallback(
    (preset: number) => {
      setSlippageBps(preset);
      setInputValue(formatSlippagePercent(preset));
    },
    [setSlippageBps]
  );

  const isCustomSlippage = !SLIPPAGE_PRESETS_BPS.includes(slippageBps);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Slippage
          <span
            className={cn(
              'px-1.5 py-0.5 rounded-xl text-[10px] font-medium',
              isCustomSlippage ? PRESET_BADGE_CUSTOM : PRESET_BADGE_PRESET
            )}
          >
            {isCustomSlippage ? 'Custom' : 'Preset'}
          </span>
        </span>
        <span className="font-medium text-foreground">
          {formatSlippagePercent(slippageBps)}%
        </span>
      </div>
      <div className="flex gap-2">
        {SLIPPAGE_PRESETS_BPS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={cn(
              'flex-1 min-h-10 py-2.5 rounded-lg text-sm font-medium transition-colors',
              slippageBps === preset
                ? PRESET_ACCENT_BUTTON[isBuy ? 'green' : 'red']
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
            )}
            aria-label={`Set slippage to ${formatSlippagePercent(preset)}%`}
          >
            {formatSlippagePercent(preset)}%
          </button>
        ))}
      </div>
      <div className="relative flex min-w-0 mt-4">
        <Input
          type="number"
          inputMode="decimal"
          placeholder={`${SLIPPAGE_MIN_BPS / 100}-${SLIPPAGE_MAX_BPS / 100}%`}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={SLIPPAGE_MIN_BPS / 100}
          max={SLIPPAGE_MAX_BPS / 100}
          step={0.1}
          aria-valuemin={SLIPPAGE_MIN_BPS / 100}
          aria-valuemax={SLIPPAGE_MAX_BPS / 100}
          className={cn(
            'w-full h-10 py-2 px-4 pr-6 text-sm text-center rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-input',
            PRESET_ACCENT_INPUT_FOCUS_RING[isBuy ? 'green' : 'red'],
            isCustomSlippage &&
              'ring-1 ring-amber-500/50 dark:ring-amber-400/50 bg-amber-500/5 dark:bg-amber-500/10'
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          %
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Min {SLIPPAGE_MIN_BPS / 100}% · Max {SLIPPAGE_MAX_BPS / 100}%
      </p>
    </div>
  );
});

SlippageSelector.displayName = 'SlippageSelector';
