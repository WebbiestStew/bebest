import { PsychTestDefinition, TestResponses, TestResult, SubscaleResult, TestSubscale } from './types';

function scoreSubscale(def: PsychTestDefinition, sub: TestSubscale, responses: TestResponses): SubscaleResult {
  let raw = 0;
  for (const itemId of sub.itemIds) {
    const item = def.items.find((i) => i.id === itemId);
    const choice = responses[itemId];
    if (item && choice !== undefined && item.options[choice]) {
      raw += item.options[choice].points;
    }
  }
  const range = sub.max - sub.min;
  const percent = range > 0 ? (raw - sub.min) / range : 0;
  const band = def.bands ? pickBand(def.bands, percent) : undefined;
  const tScore = sub.transform ? (raw - sub.transform.mean) / sub.transform.sd * 10 + 50 : undefined;
  return {
    id: sub.id,
    label: sub.label,
    raw,
    min: sub.min,
    max: sub.max,
    percent,
    tScore: tScore !== undefined ? Math.round(tScore * 10) / 10 : undefined,
    band,
    highText: sub.highText,
    lowText: sub.lowText,
  };
}

// Matches the source spreadsheets' own nested IF(percent<x, ..., IF(percent<y, ...))
// bands exactly: strict less-than on every threshold except the last, which
// catches everything at or above the previous one.
function pickBand(bands: PsychTestDefinition['bands'], percent: number): string | undefined {
  if (!bands || bands.length === 0) return undefined;
  const clamped = Math.max(0, Math.min(1, percent));
  for (let i = 0; i < bands.length - 1; i++) {
    if (clamped < bands[i].max) return bands[i].label;
  }
  return bands[bands.length - 1].label;
}

export function scoreTest(def: PsychTestDefinition, responses: TestResponses): TestResult {
  const subscales = def.subscales.map((s) => scoreSubscale(def, s, responses));

  let total: SubscaleResult | undefined;
  if (def.totalItemIds) {
    // Sum each item's own min/max points — NOT itemCount * 1 — since most of
    // these instruments score items starting at 0 (Coopersmith, COPE, and
    // BIS-11's direct-keyed items all have a 0-point option) and only DERS
    // happens to start at 1; itemCount would silently be wrong for the rest.
    const totalMin = def.totalItemIds.reduce((sum, id) => {
      const item = def.items.find((i) => i.id === id);
      const minPoints = item ? Math.min(...item.options.map((o) => o.points)) : 0;
      return sum + minPoints;
    }, 0);
    const totalMax = def.totalItemIds.reduce((sum, id) => {
      const item = def.items.find((i) => i.id === id);
      const maxPoints = item ? Math.max(...item.options.map((o) => o.points)) : 0;
      return sum + maxPoints;
    }, 0);
    total = scoreSubscale(
      def,
      { id: 'total', label: def.totalLabel || 'Total', itemIds: def.totalItemIds, min: totalMin, max: totalMax },
      responses
    );
  }

  const complete = def.items.every((i) => responses[i.id] !== undefined);

  const lines = subscales.map((s) => {
    const scoreText = s.tScore !== undefined ? `T=${s.tScore}` : `${s.raw}/${s.max}`;
    return `${s.label}=${scoreText}${s.band ? ` (${s.band})` : ''}`;
  });
  const totalLine = total
    ? `${total.label} = ${total.raw}/${total.max}${total.band ? ` (${total.band})` : ''}. `
    : '';
  const summary = complete
    ? `${totalLine}Perfil por subescala: ${lines.join(', ')}.`
    : `Prueba incompleta — faltan respuestas. ${totalLine}Perfil parcial: ${lines.join(', ')}.`;

  return { subscales, total, complete, summary };
}
