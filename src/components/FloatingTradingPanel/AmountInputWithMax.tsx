import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  type PresetAccent,
  PRESET_ACCENT_MAX_BUTTON,
} from '@/constants/preset-accent';

const INPUT_BASE_CLASS =
  'h-12 py-3 px-4 pr-24 text-base rounded-md rounded-r-none border-r-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

interface AmountInputWithMaxProps {
  value: string;
  onChange: (value: string) => void;
  onMax: () => void;
  maxDisabled: boolean;
  isAtMax: boolean;
  unitLabel: string;
  accent: PresetAccent;
  step?: string;
  placeholder?: string;
  maxAriaLabel?: string;
}

export const AmountInputWithMax = memo(function AmountInputWithMax({
  value,
  onChange,
  onMax,
  maxDisabled,
  isAtMax,
  unitLabel,
  accent,
  step = 'any',
  placeholder = '0.00',
  maxAriaLabel = 'Set to max',
}: AmountInputWithMaxProps) {
  return (
    <div className="relative flex items-center">
      <Input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min="0"
        step={step}
        className={INPUT_BASE_CLASS}
      />
      <div className="absolute right-0 flex items-center h-12 border border-input rounded-r-md bg-muted/30">
        <button
          type="button"
          onClick={onMax}
          disabled={maxDisabled}
          aria-label={maxAriaLabel}
          className={cn(
            'h-full px-3 text-xs font-semibold transition-colors',
            maxDisabled
              ? 'cursor-not-allowed text-muted-foreground/50 pointer-events-none'
              : isAtMax
                ? PRESET_ACCENT_MAX_BUTTON[accent]
                : 'text-foreground hover:bg-muted/60'
          )}
        >
          Max
        </button>
        <span className="pr-3 text-base text-muted-foreground border-l border-input pl-2">
          {unitLabel}
        </span>
      </div>
    </div>
  );
});
