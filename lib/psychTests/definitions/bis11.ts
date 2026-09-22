import { PsychTestDefinition } from '../types';

// Extracted from 'Escala de impulsividad de Barrat excel (1).xlsx' — each item's
// own 4-value scoring array is read directly from its IF() formula in the
// 'Resultados' sheet (not inferred from the item's wording), since roughly a
// third of items are reverse-keyed and eyeballing which ones is exactly the
// kind of mistake that matters here.
export const bis11: PsychTestDefinition = {
  id: 'BIS-11',
  name: 'Escala de Impulsividad de Barratt (BIS-11)',
  reference: 'Patton, Stanford & Barratt (1995). Adaptación al español de uso común en Latinoamérica.',
  items: [
    { id: 1, text: "Planifico mis tareas con cuidado", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 2, text: "Hago las cosas sin pensarlas", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 3, text: "Casi nunca me tomo las cosas a pecho (no me perturbo con facilidad)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 4, text: "Mis pensamientos pueden tener gran velocidad (tengo pensamientos que van muy rápido en mi mente)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 5, text: "Planifico mis viajes con antelación", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 6, text: "Soy una persona con autocontrol", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 7, text: "Me concentro con facilidad (se me hace fácil concentrarme)", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 8, text: "Ahorro con regularidad", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 9, text: "Se me hace difícil estar quieto (a) por largos periodos de tiempo", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 10, text: "Pienso las cosas cuidadosamente", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 11, text: "Planifico para tener un trabajo fijo (me esfuerzo por asegurar que tendré dinero para pagar mis gastos)", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 12, text: "Digo las cosas sin pensarlas", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 13, text: "Me gusta pensar sobre problemas complicados (me gusta pensar sobre problemas complejos)", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 14, text: "Cambio de trabajo frecuentemente (no me quedo en el mismo trabajo por largos periodos de tiempo)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 15, text: "Actúo impulsivamente", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 16, text: "Me aburro con facilidad tratando de resolver problemas en mi mente (me aburre pensar en algo por demasiado tiempo)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 17, text: "Visito al médico y al dentista con regularidad", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 18, text: "Hago las cosas en el momento que se me ocurren", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 19, text: "Soy una persona que piensa sin distraerse (puedo enfocar mi mente en una sola cosa por mucho tiempo)", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 20, text: "Cambio de vivienda a menudo (me mudo con frecuencia o no me gusta vivir en el mismo sitio por mucho tiempo)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 21, text: "Compro cosas impulsivamente", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 22, text: "Termino lo que empiezo", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
    { id: 23, text: "Camino y me muevo con rapidez", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 24, text: "Resuelvo los problemas experimentando (resuelvo los problemas tratando una posible solución y viendo si funciona)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 25, text: "Gasto en efectivo o a crédito más de lo que gano (gasto más de lo que gano)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 26, text: "Hablo rápido", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 27, text: "Tengo pensamientos extraños cuando estoy pensando (a veces tengo pensamientos irrelevantes cuando pienso)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 28, text: "Me interesa más el presente que el futuro", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 29, text: "Me siento inquieto (a) en clases o charlas (me siento inquieto (a) si tengo que oír a alguien hablar demasiado tiempo)", options: [{ label: "Raramente o nunca", points: 0 }, { label: "Ocasionalmente", points: 1 }, { label: "A menudo", points: 3 }, { label: "Siempre o casi siempre", points: 4 }] },
    { id: 30, text: "Planifico para el futuro (me interesa más el futuro que el presente)", options: [{ label: "Raramente o nunca", points: 4 }, { label: "Ocasionalmente", points: 3 }, { label: "A menudo", points: 1 }, { label: "Siempre o casi siempre", points: 0 }] },
  ],
  subscales: [
    { id: 'cognitiva', label: 'Impulsividad Cognitiva', itemIds: [4, 7, 10, 13, 16, 24, 27, 19], min: 0, max: 32 },
    { id: 'motora', label: 'Impulsividad Motora', itemIds: [2, 6, 9, 12, 15, 18, 21, 23, 26, 29], min: 0, max: 40 },
    { id: 'no_planeada', label: 'Impulsividad No Planeada', itemIds: [1, 3, 5, 8, 11, 14, 17, 20, 22, 25, 28, 30], min: 0, max: 48 },
  ],
  totalItemIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  totalLabel: 'TOTAL BIS-11',
};
