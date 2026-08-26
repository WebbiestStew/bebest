// Validated categorical palette (dataviz skill reference instance).
// Fixed hue order — never reassign per-chart, never cycle past slot 8.
export const CATEGORICAL = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
] as const;

// Sequential / ordinal blue ramp, light -> dark (steps 250-550, safe for ordinal use).
export const BLUE_ORDINAL_RAMP = [
  '#86b6ef', // 250
  '#6da7ec', // 300
  '#5598e7', // 350
  '#3987e5', // 400
  '#2a78d6', // 450
  '#256abf', // 500
  '#1c5cab', // 550
] as const;

export const MUTED_GRAY = '#c3c2b7';

export function ordinalStep(index: number, total: number): string {
  if (total <= 1) return BLUE_ORDINAL_RAMP[BLUE_ORDINAL_RAMP.length - 1];
  const pos = Math.round((index / (total - 1)) * (BLUE_ORDINAL_RAMP.length - 1));
  return BLUE_ORDINAL_RAMP[pos];
}
