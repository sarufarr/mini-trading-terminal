export type PresetAccent = 'green' | 'red';

/** Selected preset button style (with ring). Used by PresetButtons and SlippageSelector. */
export const PRESET_ACCENT_BUTTON: Record<PresetAccent, string> = {
  green: 'bg-green-500/20 text-green-500 ring-1 ring-green-500/40',
  red: 'bg-red-500/20 text-red-500 ring-1 ring-red-500/40',
};

/** Max button highlight style (no ring). Used by AmountInputWithMax. */
export const PRESET_ACCENT_MAX_BUTTON: Record<PresetAccent, string> = {
  green: 'bg-green-500/20 text-green-500',
  red: 'bg-red-500/20 text-red-500',
};

/** Focus ring color for amount input. Buy=green, Sell=red. */
export const PRESET_ACCENT_FOCUS_RING: Record<PresetAccent, string> = {
  green: 'focus-within:ring-green-500/50',
  red: 'focus-within:ring-red-500/50',
};

export const PRESET_BADGE_CUSTOM =
  'bg-amber-500/15 text-amber-600 dark:text-amber-400';

export const PRESET_BADGE_PRESET = 'bg-muted text-muted-foreground';

/** Input focus-visible ring (for standalone inputs e.g. Slippage). */
export const PRESET_ACCENT_INPUT_FOCUS_RING: Record<PresetAccent, string> = {
  green: 'focus-visible:ring-green-500/50',
  red: 'focus-visible:ring-red-500/50',
};
