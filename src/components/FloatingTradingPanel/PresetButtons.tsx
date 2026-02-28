import { memo } from 'react';
import { cn } from '@/lib/cn';
import {
  type PresetAccent,
  PRESET_ACCENT_BUTTON,
} from '@/constants/preset-accent';

export type { PresetAccent };

interface PresetButtonsProps<T extends number> {
  presets: readonly T[];
  formatLabel: (preset: T) => string;
  isSelected: (preset: T) => boolean;
  onSelect: (preset: T) => void;
  accent: PresetAccent;
  disabled?: boolean;
  ariaLabel?: (preset: T) => string;
}

export const PresetButtons = memo(function PresetButtons<T extends number>({
  presets,
  formatLabel,
  isSelected,
  onSelect,
  accent,
  disabled = false,
  ariaLabel,
}: PresetButtonsProps<T>) {
  const style = PRESET_ACCENT_BUTTON[accent];
  return (
    <div className="flex gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onSelect(preset)}
          disabled={disabled}
          aria-label={ariaLabel?.(preset)}
          className={cn(
            'flex-1 min-h-9 py-2 rounded-md text-xs font-medium transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
            isSelected(preset)
              ? style
              : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
          )}
        >
          {formatLabel(preset)}
        </button>
      ))}
    </div>
  );
});
