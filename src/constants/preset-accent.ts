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
