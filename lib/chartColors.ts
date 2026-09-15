// Bebest-branded categorical palette — recolored from the original
// multi-hue validated set (blue/orange/aqua/yellow/magenta/green/violet/red)
// into one green/lime family at Diego's request ("full lime takeover"),
// trading some cross-category distinguishability for brand consistency.
// Distinguishability within the family comes from spreading both hue
// (yellow-green through teal-green) and lightness across the 8 slots rather
// than using near-identical greens. Fixed hue order — never reassign
// per-chart, never cycle past slot 8.
export const CATEGORICAL = [
  '#89BD0F', // 1 bright lime (hero brand color)
  '#3A631D', // 2 deep olive
  '#B2CA16', // 3 mustard-lime
  '#2A6F41', // 4 deep teal-green
  '#63931F', // 5 mid olive-lime
  '#A58E1D', // 6 dark mustard-brown
  '#1C5441', // 7 dark forest-teal
  '#56C431', // 8 mid mint-green
] as const;

// Sequential / ordinal lime ramp, light -> dark — same hue family as
// CATEGORICAL slot 1, for charts (e.g. Rango de edad) that need a single-hue
// intensity gradient rather than distinct categories.
export const LIME_ORDINAL_RAMP = [
  '#B2DA6C',
  '#A5D454',
  '#98CE3B',
  '#88BC2F',
  '#76A329',
  '#5F8321',
  '#476218',
] as const;

export const MUTED_GRAY = '#c3c2b7';

export function ordinalStep(index: number, total: number): string {
  if (total <= 1) return LIME_ORDINAL_RAMP[LIME_ORDINAL_RAMP.length - 1];
  const pos = Math.round((index / (total - 1)) * (LIME_ORDINAL_RAMP.length - 1));
  return LIME_ORDINAL_RAMP[pos];
}
