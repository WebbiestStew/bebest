import { PsychTestDefinition } from '../types';

// Extracted from 'Autoestima Adultos.xlsx', ADULTOS + RESULTADOS Y  PERFIL sheets
// (the ESCOLAR/school-age sheets in that same file are a different instrument
// and intentionally not included here — this file's own title is 'Adultos').
// V/F item: which answer counts as 1 point is read from the ADULTOS sheet's own
// SUM() formulas (they sum specific V-column or F-column cells per item), not
// guessed from whether the item reads as a 'positive' or 'negative' statement.
export const coopersmithAdultos: PsychTestDefinition = {
  id: 'COOPERSMITH-ADULTOS',
  name: 'Inventario de Autoestima de Coopersmith (Adultos)',
  reference: 'Coopersmith, S. (1967). The Antecedents of Self-Esteem.',
  items: [
    { id: 1, text: "Usualmente las cosas no me molestan", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 2, text: "Me resulta difícil hablar frente a un grupo", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 3, text: "Hay muchas cosas de mí que cambiaría si pudiese", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 4, text: "Puedo tomar decisiones sin mayor dificultad", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 5, text: "Soy muy divertido(a)", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 6, text: "Me altero fácilmente en casa", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 7, text: "Me toma mucho tiempo acostumbrarme a cualquier cosa nueva", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 8, text: "Soy popular entre las personas de mi edad", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 9, text: "Generalmente mi familia considera mis sentimientos", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 10, text: "Me rindo fácilmente", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 11, text: "Mi familia espera mucho de mí", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 12, text: "Es bastante difícil ser \"Yo mismo\"", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 13, text: "Me siento muchas veces confundido", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 14, text: "La gente usualmente sigue mis ideas", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 15, text: "Tengo una pobre opinión acerca de mí mismo", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 16, text: "Hay muchas ocasiones que me gustaría irme de mi casa", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 17, text: "Frecuentemente me siento descontento con mi trabajo", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 18, text: "No estoy tan simpático como mucha gente", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 19, text: "Si tengo algo que decir, usualmente lo digo", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 20, text: "Mi familia me comprende", options: [{ label: 'Verdadero', points: 1 }, { label: 'Falso', points: 0 }] },
    { id: 21, text: "Muchas personas son más preferidas que yo", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 22, text: "Frecuentemente siento como si mi familia me estuviera presionando", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 23, text: "Frecuentemente me siento desalentado con lo que hago", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 24, text: "Frecuentemente desearía ser otra persona", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
    { id: 25, text: "No soy digno de confianza", options: [{ label: 'Verdadero', points: 0 }, { label: 'Falso', points: 1 }] },
  ],
  subscales: [
    { id: 'sg', label: 'Sí Mismo General', itemIds: [1, 3, 4, 19, 7, 10, 12, 13, 15, 18, 23, 24, 25], min: 0, max: 13 },
    { id: 'so', label: 'Social', itemIds: [8, 14, 2, 5, 17, 21], min: 0, max: 6 },
    { id: 'fa', label: 'Familia', itemIds: [9, 20, 6, 11, 16, 22], min: 0, max: 6 },
  ],
  totalItemIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  totalLabel: 'Escala General (SEI)',
  bands: [
    { max: 0.45, label: 'Baja autoestima' },
    { max: 0.74, label: 'Promedio' },
    { max: 1, label: 'Alta autoestima' },
  ],
};
