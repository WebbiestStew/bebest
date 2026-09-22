import { PsychTestDefinition } from './types';
import { ders } from './definitions/ders';
import { bis11 } from './definitions/bis11';
import { coopersmithAdultos } from './definitions/coopersmithAdultos';
import { cope } from './definitions/cope';
import { criA } from './definitions/criA';
import { ehs } from './definitions/ehs';
import { ellis } from './definitions/ellis';
import { psq } from './definitions/psq';

export * from './types';
export { scoreTest } from './scoring';

// Registry of every test the app can score inline. Keyed by the exact label
// used in Sesión 2's PRUEBAS_OPTIONS checklist, so a checked test can look
// itself up here to offer "Aplicar en la app" alongside upload/texto.
export const PSYCH_TESTS: Record<string, PsychTestDefinition> = {
  'DERS — Dificultades en la Regulación Emocional': ders,
  'Escala de Impulsividad de Barratt (BIS-11)': bis11,
  'Inventario de Autoestima de Coopersmith (Adultos)': coopersmithAdultos,
  'COPE (Carver) — Afrontamiento al Estrés': cope,
  'CRI-A — Inventario de Respuestas de Afrontamiento': criA,
  'EHS — Escala de Habilidades Sociales': ehs,
  'Test de Creencias de Ellis': ellis,
  'PSQ — Cuestionario de Estrés Percibido': psq,
};

export function getPsychTest(pruebaLabel: string): PsychTestDefinition | undefined {
  return PSYCH_TESTS[pruebaLabel];
}
