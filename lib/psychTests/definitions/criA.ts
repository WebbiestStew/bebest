import { PsychTestDefinition } from '../types';

// Extracted from 'CRI A Automatizado.xlsx' (Resultados sheet formulas) — item
// numbers, subscale groupings, and the T-score constants (mean/sd per
// subscale, from Mikulic & Crespi's 2008 Argentine adaptation) all come
// straight from that file.
//
// NOT verified — needs Diego to confirm against the physical protocol before
// relying on this one clinically:
// - Item wording: the .xlsx has no item text at all, only response cells, so
//   the items below are placeholders ('Ítem N').
// - Response scale: the .xlsx doesn't state the anchor labels either. CRI
//   inventories are conventionally 0-3 ('Nunca'..'Con frecuencia'); that's what's
//   used here, but it is a guess, not something read from this file.
const SCALE_0_3 = [
  { label: 'Nunca', points: 0 },
  { label: 'Rara vez', points: 1 },
  { label: 'Algunas veces', points: 2 },
  { label: 'Con frecuencia', points: 3 },
];

export const criA: PsychTestDefinition = {
  id: 'CRI-A',
  name: 'CRI-A — Inventario de Respuestas de Afrontamiento (Moos)',
  reference: 'Moos, R. H. Trad./Adapt.: Mikulic, I. M. Baremo: Mikulic & Crespi (2008), UBA.',
  note: 'Texto de reactivos y escala de respuesta no confirmados contra el protocolo físico — ver comentario en el código.',
  items: [
    { id: 1, text: 'Ítem 1 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 2, text: 'Ítem 2 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 3, text: 'Ítem 3 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 4, text: 'Ítem 4 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 5, text: 'Ítem 5 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 6, text: 'Ítem 6 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 7, text: 'Ítem 7 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 8, text: 'Ítem 8 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 9, text: 'Ítem 9 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 10, text: 'Ítem 10 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 11, text: 'Ítem 11 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 12, text: 'Ítem 12 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 13, text: 'Ítem 13 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 14, text: 'Ítem 14 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 15, text: 'Ítem 15 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 16, text: 'Ítem 16 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 17, text: 'Ítem 17 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 18, text: 'Ítem 18 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 19, text: 'Ítem 19 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 20, text: 'Ítem 20 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 21, text: 'Ítem 21 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 22, text: 'Ítem 22 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 23, text: 'Ítem 23 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 24, text: 'Ítem 24 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 25, text: 'Ítem 25 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 26, text: 'Ítem 26 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 27, text: 'Ítem 27 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 28, text: 'Ítem 28 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 29, text: 'Ítem 29 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 30, text: 'Ítem 30 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 31, text: 'Ítem 31 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 32, text: 'Ítem 32 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 33, text: 'Ítem 33 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 34, text: 'Ítem 34 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 35, text: 'Ítem 35 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 36, text: 'Ítem 36 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 37, text: 'Ítem 37 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 38, text: 'Ítem 38 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 39, text: 'Ítem 39 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 40, text: 'Ítem 40 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 41, text: 'Ítem 41 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 42, text: 'Ítem 42 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 43, text: 'Ítem 43 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 44, text: 'Ítem 44 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 45, text: 'Ítem 45 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 46, text: 'Ítem 46 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 47, text: 'Ítem 47 (texto pendiente de confirmar)', options: SCALE_0_3 },
    { id: 48, text: 'Ítem 48 (texto pendiente de confirmar)', options: SCALE_0_3 },
  ],
  subscales: [
    { id: 'analisis_logico', label: 'Análisis Lógico', itemIds: [1, 9, 17, 25, 33, 41], min: 0, max: 18, transform: { mean: 11.1, sd: 3.5 } },
    { id: 'revalorizacion', label: 'Revalorización Positiva', itemIds: [2, 10, 18, 26, 34, 42], min: 0, max: 18, transform: { mean: 11.1, sd: 3.8 } },
    { id: 'busqueda_apoyo', label: 'Búsqueda de Apoyo y Orientación', itemIds: [3, 11, 19, 27, 35, 43], min: 0, max: 18, transform: { mean: 9.6, sd: 3.5 } },
    { id: 'resolucion_problemas', label: 'Resolución de Problemas', itemIds: [4, 12, 20, 28, 36, 44], min: 0, max: 18, transform: { mean: 11.2, sd: 3.8 } },
    { id: 'evitacion_cognitiva', label: 'Evitación Cognitiva', itemIds: [5, 13, 21, 29, 37, 45], min: 0, max: 18, transform: { mean: 8.8, sd: 4.0 } },
    { id: 'aceptacion_resignacion', label: 'Aceptación o Resignación', itemIds: [6, 14, 22, 30, 38, 46], min: 0, max: 18, transform: { mean: 8.0, sd: 4.0 } },
    { id: 'gratificaciones', label: 'Búsqueda de Gratificaciones Alternativas', itemIds: [7, 15, 23, 31, 39, 47], min: 0, max: 18, transform: { mean: 9.8, sd: 4.1 } },
    { id: 'descarga_emocional', label: 'Descarga Emocional', itemIds: [8, 16, 24, 32, 40, 48], min: 0, max: 18, transform: { mean: 7.7, sd: 3.5 } },
  ],
};
