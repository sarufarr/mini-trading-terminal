import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import {
  type PresetAccent,
  PRESET_ACCENT_MAX_BUTTON,
  PRESET_ACCENT_FOCUS_RING,
} from '@/constants/preset-accent';

const INPUT_BASE_CLASS =
  'h-12 py-3 px-4 text-base rounded-lg rounded-r-none border-r-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input';

const INPUT_PADDING_RIGHT = {
  single: 'pr-24',
  halfAndMax: 'pr-28',
} as const;

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
  /** Max button label, default "Max" */
  maxLabel?: string;
  /** Half: fill 50% of available (after gas reserve). When set, shows half button */
  onHalf?: () => void;
  halfDisabled?: boolean;
  isAtHalf?: boolean;
  halfAriaLabel?: string;
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
  maxLabel = 'Max',
  onHalf,
  halfDisabled = true,
  isAtHalf = false,
  halfAriaLabel = 'Set to 50%',
}: AmountInputWithMaxProps) {
  const showHalf = onHalf != null;
  return (
    <div
      className={cn(
        'relative flex items-center rounded-lg focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background',
        PRESET_ACCENT_FOCUS_RING[accent]
      )}
    >
      <Input
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min="0"
        step={step}
        className={cn(
          INPUT_BASE_CLASS,
          showHalf ? INPUT_PADDING_RIGHT.halfAndMax : INPUT_PADDING_RIGHT.single
        )}
      />
      <div className="absolute right-0 flex items-center h-12 border border-input rounded-r-lg bg-muted/30">
        {showHalf && (
          <button
            type="button"
            onClick={onHalf}
            disabled={halfDisabled}
            aria-label={halfAriaLabel}
            className={cn(
              'h-full px-2.5 text-xs font-semibold transition-colors border-r border-input',
              halfDisabled
                ? 'cursor-not-allowed text-muted-foreground/50 pointer-events-none'
                : isAtHalf
                  ? PRESET_ACCENT_MAX_BUTTON[accent]
                  : 'text-foreground hover:bg-muted/60'
            )}
          >
            50%
          </button>
        )}
        <button
          type="button"
          onClick={onMax}
          disabled={maxDisabled}
          aria-label={maxAriaLabel}
          className={cn(
            'h-full px-3 text-xs font-semibold transition-colors',
            showHalf && 'border-r border-input',
            maxDisabled
              ? 'cursor-not-allowed text-muted-foreground/50 pointer-events-none'
              : isAtMax
                ? PRESET_ACCENT_MAX_BUTTON[accent]
                : 'text-foreground hover:bg-muted/60'
          )}
        >
          {maxLabel}
        </button>
        <span className="pr-3 text-base text-muted-foreground border-l border-input pl-2">
          {unitLabel}
        </span>
      </div>
    </div>
  );
});

AmountInputWithMax.displayName = 'AmountInputWithMax';
