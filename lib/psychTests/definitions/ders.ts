import { PsychTestDefinition } from '../types';

// Extracted directly from Plantilla_DERS_CPCCM.xlsx (Captura DERS + Resultados sheets).
// The template ships with no item wording ("capture la respuesta numérica del
// protocolo aplicado") — items show only their subscale, matching the source file.
const ANCHORS = [
  { label: "Casi nunca / Muy poco", value: 1 },
  { label: "Algunas veces / Poco", value: 2 },
  { label: "Aproximadamente la mitad de las veces", value: 3 },
  { label: "La mayoría de las veces", value: 4 },
  { label: "Casi siempre / Mucho", value: 5 },
];

function opts(reverse: boolean) {
  return ANCHORS.map((a) => ({ label: a.label, points: reverse ? 6 - a.value : a.value }));
}

export const ders: PsychTestDefinition = {
  id: 'DERS',
  name: 'DERS — Escala de Dificultades en la Regulación Emocional',
  reference: 'Gratz, K. L., & Roemer, L. (2004). Journal of Psychopathology and Behavioral Assessment, 26, 41-54.',
  note: 'Interpretación dimensional y orientativa: no hay puntos de corte diagnósticos universales.',
  items: [
    { id: 1, options: opts(true) },
    { id: 2, options: opts(true) },
    { id: 3, options: opts(false) },
    { id: 4, options: opts(false) },
    { id: 5, options: opts(false) },
    { id: 6, options: opts(true) },
    { id: 7, options: opts(true) },
    { id: 8, options: opts(true) },
    { id: 9, options: opts(false) },
    { id: 10, options: opts(true) },
    { id: 11, options: opts(false) },
    { id: 12, options: opts(false) },
    { id: 13, options: opts(false) },
    { id: 14, options: opts(false) },
    { id: 15, options: opts(false) },
    { id: 16, options: opts(false) },
    { id: 17, options: opts(true) },
    { id: 18, options: opts(false) },
    { id: 19, options: opts(false) },
    { id: 20, options: opts(true) },
    { id: 21, options: opts(false) },
    { id: 22, options: opts(true) },
    { id: 23, options: opts(false) },
    { id: 24, options: opts(true) },
    { id: 25, options: opts(false) },
    { id: 26, options: opts(false) },
    { id: 27, options: opts(false) },
    { id: 28, options: opts(false) },
    { id: 29, options: opts(false) },
    { id: 30, options: opts(false) },
    { id: 31, options: opts(false) },
    { id: 32, options: opts(false) },
    { id: 33, options: opts(false) },
    { id: 34, options: opts(true) },
    { id: 35, options: opts(false) },
    { id: 36, options: opts(false) },
  ],
  subscales: [
    { id: "claridad", label: "Falta de claridad emocional", itemIds: [1, 4, 5, 7, 9], min: 5, max: 25, highText: "Alta dificultad para identificar con claridad qué emoción está experimentando.", lowText: "Dificultad relativa en claridad emocional." },
    { id: "consciencia", label: "Falta de consciencia emocional", itemIds: [2, 6, 8, 10, 17, 34], min: 6, max: 30, highText: "Alta dificultad para atender o reconocer la propia experiencia emocional.", lowText: "Dificultad relativa en consciencia emocional." },
    { id: "impulsos", label: "Dificultad control impulsos", itemIds: [3, 14, 19, 24, 27, 32], min: 6, max: 30, highText: "Alta dificultad para controlar conductas impulsivas cuando experimenta emociones intensas.", lowText: "Dificultad relativa para modular impulsos ante malestar." },
    { id: "no_aceptacion", label: "No aceptación emocional", itemIds: [11, 12, 21, 23, 25, 29], min: 6, max: 30, highText: "Alta tendencia a responder con rechazo, culpa o malestar secundario ante las emociones.", lowText: "Dificultad relativa para aceptar emociones, según nivel obtenido." },
    { id: "metas", label: "Dificultad en metas", itemIds: [13, 18, 20, 26, 33], min: 5, max: 25, highText: "Alta dificultad para mantener conducta dirigida a objetivos bajo malestar emocional.", lowText: "Dificultad relativa para sostener metas cuando hay activación emocional." },
    { id: "estrategias", label: "Acceso limitado a estrategias", itemIds: [15, 16, 22, 28, 30, 31, 35, 36], min: 8, max: 40, highText: "Alta percepción de contar con pocas estrategias eficaces para regular emociones.", lowText: "Dificultad relativa en acceso a estrategias de regulación." },
  ],
  totalItemIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  totalLabel: 'TOTAL DERS',
  bands: [
    { max: 0.26, label: 'Bajo' },
    { max: 0.51, label: 'Leve-moderado' },
    { max: 0.76, label: 'Moderado-alto' },
    { max: 1, label: 'Alto' },
  ],
};
