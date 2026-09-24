import { PsychTestDefinition, TestItem, TestSubscale } from '../types';

// ISRA — Inventario de Situaciones y Respuestas de Ansiedad (Miguel Tobal &
// Cano Vindel, TEA Ediciones). Transcribed from Diego's physical protocol
// (photos, 2026-09-24, second clearer pass).
//
// Structure: 23 "situaciones" crossed with 3 sheets of "respuestas"
// (F = Fisiológico, 10 response phrases; C = Cognitivo, 7; M = Motor, 7),
// each rated 0-4 (Casi nunca..Casi siempre). Not every situación×respuesta
// cell is scored — the physical form pre-shades (grays out) the cells that
// AREN'T, confirmed from the form's own instructions ("...la columna en que
// HAY CASILLAS EN BLANCO" — the blank ones are what you answer). ITEM_MAP
// below is the blank-cell (scored) pattern read directly off Diego's photos,
// row by row, per subscale — confirmed with him after an initial read
// (2026-09-24) flagged an unusual all-shaded stretch in situaciones 12-22,
// which he confirmed is genuinely how the physical form looks, not a photo
// artifact. Situación 23 ("escriba una situación...") is a free-write row
// with no shaded/blank pattern at all — not part of the scored 133 items.
//
// No official norm/cutoff table came with this protocol, so bands below are
// the same generic orientative percent-of-range convention used elsewhere
// in this module (DERS, PSQ) — swap out if a real ISRA norm table turns up.

export const ISRA_SITUACIONES: string[] = [
  'Ante un examen en el que me juego mucho, o si voy a ser entrevistado para un trabajo importante.',
  'Cuando voy a llegar tarde a una cita.',
  'Cuando pienso en las muchas cosas que tengo que hacer.',
  'A la hora de tomar una decisión o resolver un problema difícil.',
  'En mi trabajo o cuando estudio.',
  'Cuando espero a alguien en un lugar concurrido.',
  'Si una persona del otro sexo está muy cerca de mí, rozándome, o si estoy en una situación sexual íntima.',
  'Cuando alguien me molesta o cuando discuto.',
  'Cuando soy observado o mi trabajo es supervisado, cuando recibo críticas, o siempre que pueda ser evaluado negativamente.',
  'Si tengo que hablar en público.',
  'Cuando pienso en experiencias recientes en las que me he sentido ridículo, tímido, humillado, solo o rechazado.',
  'Cuando tengo que viajar en avión o en barco.',
  'Después de haber cometido algún error.',
  'Ante la consulta del dentista, las inyecciones, las heridas o la sangre.',
  'Cuando voy a una cita con una persona del otro sexo.',
  'Cuando pienso en mi futuro o en dificultades y problemas futuros.',
  'En medio de multitudes o en espacios cerrados.',
  'Cuando tengo que asistir a una reunión social o conocer gente nueva.',
  'En lugares altos, o ante aguas profundas.',
  'Al observar escenas violentas.',
  'Por nada en concreto.',
  'A la hora de dormir.',
  'Escriba una situación en la que usted manifieste frecuentemente alguna de estas respuestas o conductas.',
];

const RESPUESTAS_F: string[] = [
  'Siento molestias en el estómago.',
  'Me sudan las manos u otra parte del cuerpo hasta en días fríos.',
  'Me tiemblan las manos o las piernas.',
  'Me duele la cabeza.',
  'Mi cuerpo está en tensión.',
  'Tengo palpitaciones, el corazón me late muy deprisa.',
  'Me falta el aire y mi respiración es agitada.',
  'Siento náuseas o mareo.',
  'Se me seca la boca y tengo dificultades para tragar.',
  'Tengo escalofríos y tirito aunque no haga mucho frío.',
];

const RESPUESTAS_C: string[] = [
  'Me preocupo fácilmente.',
  'Tengo pensamientos o sentimientos negativos sobre mí, tales como me siento «inferior» a los demás, etc.',
  'Me siento inseguro de mí mismo.',
  'Doy demasiadas vueltas a las cosas sin llegar a decidirme.',
  'Siento miedo.',
  'Me cuesta concentrarme.',
  'Pienso que la gente se dará cuenta de mis problemas o de la torpeza de mis actos.',
];

const RESPUESTAS_M: string[] = [
  'Lloro con facilidad.',
  'Realizo algún movimiento repetitivo con alguna parte de mi cuerpo (rascarme, tocarme, movimientos rítmicos con pies o manos, etc.).',
  'Fumo, como o bebo demasiado.',
  'Trato de evitar o rehuir la situación.',
  'Me muevo y hago cosas sin una finalidad concreta.',
  'Quedo paralizado o mis movimientos son torpes.',
  'Tartamudeo o tengo otras dificultades de expresión verbal.',
];

// Which respuesta numbers (1-based, per subscale's own column order) are
// scored for each situación (1-based) — i.e. the blank/unshaded cells.
// Situación 23 is intentionally absent: it's the free-write row, never
// shaded/scored like the other 22.
const F_ITEM_MAP: Record<number, number[]> = {
  1: [4, 5, 7, 8, 9, 10],
  2: [1, 2, 3, 4, 6, 7, 8, 10],
  3: [1, 2, 3, 4, 6, 8, 10],
  4: [4],
  5: [1, 3, 4, 5, 8, 9, 10],
  6: [1, 2, 4, 7, 9, 10],
  7: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  8: [2, 3, 4, 5, 6, 7, 9, 10],
  9: [2, 4, 6, 7, 9, 10],
  10: [1, 2, 3, 6, 7, 8, 9, 10],
  11: [1, 2, 3, 4, 5, 7, 9, 10],
  12: [5, 9],
  13: [9],
  14: [9, 10],
  15: [9, 10],
  16: [],
  17: [],
  18: [8],
  19: [],
  20: [8, 9],
  21: [],
  22: [8],
};

const C_ITEM_MAP: Record<number, number[]> = {
  1: [3, 5, 7],
  2: [2, 5, 7],
  3: [4, 7],
  4: [],
  5: [3, 7],
  6: [4, 6],
  7: [5, 7],
  8: [6],
  9: [5],
  10: [],
  11: [6],
  12: [4],
  13: [4, 7],
  14: [3, 6, 7],
  15: [5, 7],
  16: [],
  17: [],
  18: [4, 6, 7],
  19: [],
  20: [],
  21: [],
  22: [4, 6],
};

const M_ITEM_MAP: Record<number, number[]> = {
  1: [2, 5, 7],
  2: [2, 6, 7],
  3: [4, 7],
  4: [7],
  5: [7],
  6: [],
  7: [],
  8: [],
  9: [],
  10: [],
  11: [],
  12: [3, 7],
  13: [7],
  14: [7],
  15: [7],
  16: [4],
  17: [4],
  18: [5],
  19: [],
  20: [],
  21: [],
  22: [],
};

const OPTIONS_0_4 = [
  { label: 'Casi nunca', points: 0 },
  { label: 'Pocas veces', points: 1 },
  { label: 'Unas veces sí y otras no', points: 2 },
  { label: 'Muchas veces', points: 3 },
  { label: 'Casi siempre', points: 4 },
];

// sheetBase keeps F/C/M item ids from colliding — max situación*100+respuesta
// is 2310, well under the 10000 gap between bases.
function buildSheetItems(sheetBase: number, respuestas: string[], itemMap: Record<number, number[]>): TestItem[] {
  const items: TestItem[] = [];
  for (const situacionNum of Object.keys(itemMap).map(Number).sort((a, b) => a - b)) {
    const situacionText = ISRA_SITUACIONES[situacionNum - 1];
    for (const respuestaNum of itemMap[situacionNum]) {
      items.push({
        id: sheetBase + situacionNum * 100 + respuestaNum,
        text: `${situacionNum}. ${situacionText} — ${respuestas[respuestaNum - 1]}`,
        options: OPTIONS_0_4,
      });
    }
  }
  return items;
}

const F_BASE = 10000;
const C_BASE = 20000;
const M_BASE = 30000;

const fItems = buildSheetItems(F_BASE, RESPUESTAS_F, F_ITEM_MAP);
const cItems = buildSheetItems(C_BASE, RESPUESTAS_C, C_ITEM_MAP);
const mItems = buildSheetItems(M_BASE, RESPUESTAS_M, M_ITEM_MAP);

function subscale(id: string, label: string, items: TestItem[]): TestSubscale {
  return { id, label, itemIds: items.map((i) => i.id), min: 0, max: items.length * 4 };
}

const fSubscale = subscale('fisiologico', 'Fisiológico', fItems);
const cSubscale = subscale('cognitivo', 'Cognitivo', cItems);
const mSubscale = subscale('motor', 'Motor', mItems);

export const isra: PsychTestDefinition = {
  id: 'ISRA',
  name: 'ISRA — Inventario de Situaciones y Respuestas de Ansiedad',
  reference: 'Miguel Tobal, J.J. y Cano Vindel, A.R. (1986). ISRA. TEA Ediciones.',
  note:
    '133 de los 552 posibles cruces situación×respuesta están realmente ' +
    'calificados (85 Fisiológico, 30 Cognitivo, 18 Motor) — el resto están ' +
    'sombreados en el protocolo físico y no se contestan.',
  items: [...fItems, ...cItems, ...mItems],
  subscales: [fSubscale, cSubscale, mSubscale],
  bands: [
    { max: 0.26, label: 'Bajo' },
    { max: 0.51, label: 'Leve-moderado' },
    { max: 0.76, label: 'Moderado-alto' },
    { max: 1, label: 'Alto' },
  ],
  totalItemIds: [...fItems, ...cItems, ...mItems].map((i) => i.id),
  totalLabel: 'Índice Total de Ansiedad (ISRA)',
};
