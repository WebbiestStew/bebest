import { PsychTestDefinition } from '../types';

// PSQ — Cuestionario de Estrés Percibido (FAES 2.1 / Programa FAES,
// 'Cuestionarios y escalas de valoración en salud mental'), transcribed from
// Diego's physical protocol. Matches the standard published 30-item PSQ
// (Levenstein et al.) item-for-item, including which 8 items are the
// positively-worded, reverse-scored ones (1, 7, 10, 13, 17, 21, 25, 29) — that
// match is what confirms this is the standard instrument and not a variant.
//
// The same 30 questions are answered TWICE on the physical form — once
// reflecting on the last 1-2 years, once on the last month — producing two
// scores (PSQ General / PSQ Reciente). Modeled here as 60 items: 1-30 for the
// 1-2-años pass, 101-130 for the último-mes pass, each its own subscale.
//
// Response scale is 0-3 per Diego's own handwritten annotation on the form
// (A=0 .. D=3). Interpretation bands are the same generic orientative
// percent-of-range convention as DERS's own template (no official PSQ cutoff
// table was on the form) — swap them out if a real norm table turns up.
function opts(reverse: boolean) {
  const pts = reverse ? [3, 2, 1, 0] : [0, 1, 2, 3];
  return ["Casi nunca", "Algunas veces", "A menudo", "Casi siempre"].map((label, i) => ({ label, points: pts[i] }));
}

export const psq: PsychTestDefinition = {
  id: 'PSQ',
  name: 'PSQ — Cuestionario de Estrés Percibido',
  reference: 'Levenstein, S. et al. (1993). Development of the Perceived Stress Questionnaire. Adaptación: Programa FAES 2.1.',
  note: 'Cada pregunta se responde dos veces: pensando en los últimos 1-2 años y en el último mes.',
  items: [
    { id: 1, text: "Se siente descansado (últimos 1-2 años)", options: opts(true) },
    { id: 2, text: "Siente que recaen sobre usted excesivas tareas (últimos 1-2 años)", options: opts(false) },
    { id: 3, text: "Está enfadado o irritable (últimos 1-2 años)", options: opts(false) },
    { id: 4, text: "Tiene demasiadas cosas que hacer (últimos 1-2 años)", options: opts(false) },
    { id: 5, text: "Se siente solo o aislado (últimos 1-2 años)", options: opts(false) },
    { id: 6, text: "Se encuentra ante situaciones conflictivas (últimos 1-2 años)", options: opts(false) },
    { id: 7, text: "Siente que está haciendo cosas que realmente desea (últimos 1-2 años)", options: opts(true) },
    { id: 8, text: "Se siente cansado (últimos 1-2 años)", options: opts(false) },
    { id: 9, text: "Teme que no va a poder alcanzar sus objetivos (últimos 1-2 años)", options: opts(false) },
    { id: 10, text: "Se siente tranquilo (últimos 1-2 años)", options: opts(true) },
    { id: 11, text: "Tiene demasiadas decisiones que tomar (últimos 1-2 años)", options: opts(false) },
    { id: 12, text: "Se siente frustrado (últimos 1-2 años)", options: opts(false) },
    { id: 13, text: "Se siente lleno de energía (últimos 1-2 años)", options: opts(true) },
    { id: 14, text: "Se siente tenso (últimos 1-2 años)", options: opts(false) },
    { id: 15, text: "Sus problemas parecen amontonarse (últimos 1-2 años)", options: opts(false) },
    { id: 16, text: "Tiene la sensación de ir demasiado deprisa (últimos 1-2 años)", options: opts(false) },
    { id: 17, text: "Se siente seguro y protegido (últimos 1-2 años)", options: opts(true) },
    { id: 18, text: "Tiene muchas preocupaciones (últimos 1-2 años)", options: opts(false) },
    { id: 19, text: "Está bajo presión de otras personas (últimos 1-2 años)", options: opts(false) },
    { id: 20, text: "Se siente desalentado (últimos 1-2 años)", options: opts(false) },
    { id: 21, text: "Se divierte (últimos 1-2 años)", options: opts(true) },
    { id: 22, text: "Tiene miedo del futuro (últimos 1-2 años)", options: opts(false) },
    { id: 23, text: "Siente que hace las cosas porque tiene que hacerlas no porque quiera hacerlas (últimos 1-2 años)", options: opts(false) },
    { id: 24, text: "Se siente criticado o juzgado (últimos 1-2 años)", options: opts(false) },
    { id: 25, text: "Se siente alegre (últimos 1-2 años)", options: opts(true) },
    { id: 26, text: "Se siente mentalmente exhausto (últimos 1-2 años)", options: opts(false) },
    { id: 27, text: "Tiene dificultad para relajarse (últimos 1-2 años)", options: opts(false) },
    { id: 28, text: "Se siente cargado de responsabilidades (últimos 1-2 años)", options: opts(false) },
    { id: 29, text: "Tiene bastante tiempo para sí mismo (últimos 1-2 años)", options: opts(true) },
    { id: 30, text: "Se siente bajo presión de fechas (plazos) (últimos 1-2 años)", options: opts(false) },
    { id: 101, text: "Se siente descansado (último mes)", options: opts(true) },
    { id: 102, text: "Siente que recaen sobre usted excesivas tareas (último mes)", options: opts(false) },
    { id: 103, text: "Está enfadado o irritable (último mes)", options: opts(false) },
    { id: 104, text: "Tiene demasiadas cosas que hacer (último mes)", options: opts(false) },
    { id: 105, text: "Se siente solo o aislado (último mes)", options: opts(false) },
    { id: 106, text: "Se encuentra ante situaciones conflictivas (último mes)", options: opts(false) },
    { id: 107, text: "Siente que está haciendo cosas que realmente desea (último mes)", options: opts(true) },
    { id: 108, text: "Se siente cansado (último mes)", options: opts(false) },
    { id: 109, text: "Teme que no va a poder alcanzar sus objetivos (último mes)", options: opts(false) },
    { id: 110, text: "Se siente tranquilo (último mes)", options: opts(true) },
    { id: 111, text: "Tiene demasiadas decisiones que tomar (último mes)", options: opts(false) },
    { id: 112, text: "Se siente frustrado (último mes)", options: opts(false) },
    { id: 113, text: "Se siente lleno de energía (último mes)", options: opts(true) },
    { id: 114, text: "Se siente tenso (último mes)", options: opts(false) },
    { id: 115, text: "Sus problemas parecen amontonarse (último mes)", options: opts(false) },
    { id: 116, text: "Tiene la sensación de ir demasiado deprisa (último mes)", options: opts(false) },
    { id: 117, text: "Se siente seguro y protegido (último mes)", options: opts(true) },
    { id: 118, text: "Tiene muchas preocupaciones (último mes)", options: opts(false) },
    { id: 119, text: "Está bajo presión de otras personas (último mes)", options: opts(false) },
    { id: 120, text: "Se siente desalentado (último mes)", options: opts(false) },
    { id: 121, text: "Se divierte (último mes)", options: opts(true) },
    { id: 122, text: "Tiene miedo del futuro (último mes)", options: opts(false) },
    { id: 123, text: "Siente que hace las cosas porque tiene que hacerlas no porque quiera hacerlas (último mes)", options: opts(false) },
    { id: 124, text: "Se siente criticado o juzgado (último mes)", options: opts(false) },
    { id: 125, text: "Se siente alegre (último mes)", options: opts(true) },
    { id: 126, text: "Se siente mentalmente exhausto (último mes)", options: opts(false) },
    { id: 127, text: "Tiene dificultad para relajarse (último mes)", options: opts(false) },
    { id: 128, text: "Se siente cargado de responsabilidades (último mes)", options: opts(false) },
    { id: 129, text: "Tiene bastante tiempo para sí mismo (último mes)", options: opts(true) },
    { id: 130, text: "Se siente bajo presión de fechas (plazos) (último mes)", options: opts(false) },
  ],
  subscales: [
    { id: 'psq_general', label: 'PSQ General (últimos 1-2 años)', itemIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], min: 0, max: 90 },
    { id: 'psq_reciente', label: 'PSQ Reciente (último mes)', itemIds: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130], min: 0, max: 90 },
  ],
  bands: [
    { max: 0.26, label: 'Bajo' },
    { max: 0.51, label: 'Leve-moderado' },
    { max: 0.76, label: 'Moderado-alto' },
    { max: 1, label: 'Alto' },
  ],
};
