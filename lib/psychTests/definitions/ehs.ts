import { PsychTestDefinition } from '../types';

// Extracted from 'Escala de Habilidades Sociales.xlsx' (Gismero's EHS), TEST
// sheet. Response options A-D; per-item scoring direction (which of the two
// LOOKUP tables the item's formula uses) is read per item, not assumed from
// its wording — only items 3, 16, 18 and 25 score directly (A=1..D=4), every
// other item is reverse-scored (A=4..D=1). Item wording and subscale names
// are the published Gismero EHS text/structure (the .xlsx itself only has
// bare "A B C D" placeholders, no anchor wording) — worth a quick check
// against the physical protocol Diego actually uses, in case the printed
// form phrases the four options differently.
const REVERSE = [
  { label: 'No me identifico en absoluto; la mayoría de las veces no me ocurre o no lo haría', points: 4 },
  { label: 'Más bien no tiene que ver conmigo, aunque alguna vez me ocurra', points: 3 },
  { label: 'Me describe aproximadamente, aunque no siempre actúe o me sienta así', points: 2 },
  { label: 'Muy de acuerdo; me sentiría o actuaría así en la mayoría de los casos', points: 1 },
];
const DIRECT = [
  { label: REVERSE[0].label, points: 1 },
  { label: REVERSE[1].label, points: 2 },
  { label: REVERSE[2].label, points: 3 },
  { label: REVERSE[3].label, points: 4 },
];

export const ehs: PsychTestDefinition = {
  id: 'EHS',
  name: 'EHS — Escala de Habilidades Sociales (Gismero)',
  reference: 'Gismero, E. (2000). EHS, Escala de Habilidades Sociales. TEA Ediciones.',
  items: [
    { id: 1, text: "A veces evito hacer preguntas por miedo a ser estúpido", options: REVERSE },
    { id: 2, text: "Me cuesta telefonear a tiendas, oficinas, etc. para preguntar algo", options: REVERSE },
    { id: 3, text: "Si al llegar a mi casa encuentro un defecto en algo que he comprado, voy a la tienda a devolverlo", options: DIRECT },
    { id: 4, text: "Cuando en una tienda atienden antes a alguien que entró después que yo, me quedo callado", options: REVERSE },
    { id: 5, text: "Si un vendedor insiste en enseñarme un producto que no deseo en absoluto, paso un mal rato para decirle que \"NO\"", options: REVERSE },
    { id: 6, text: "A veces me resulta difícil pedir que me devuelvan algo que dejé prestado", options: REVERSE },
    { id: 7, text: "Si en un restaurante no me traen la comida como la había pedido, llamo al camarero y pido que me la hagan de nuevo", options: REVERSE },
    { id: 8, text: "A veces no sé qué decir a personas atractivas del sexo opuesto", options: REVERSE },
    { id: 9, text: "Muchas veces cuando tengo que hacer un halago no sé qué decir", options: REVERSE },
    { id: 10, text: "Tiendo a guardar mis opiniones a mí mismo", options: REVERSE },
    { id: 11, text: "A veces evito ciertas reuniones sociales por miedo a hacer o decir alguna tontería", options: REVERSE },
    { id: 12, text: "Si estoy en el cine y alguien me molesta con su conversación, me da mucho apuro pedirle que se calle", options: REVERSE },
    { id: 13, text: "Cuando algún amigo expresa una opinión con la que estoy muy en desacuerdo prefiero callarme a manifestar abiertamente lo que yo pienso", options: REVERSE },
    { id: 14, text: "Cuando tengo mucha prisa y me llama una amiga por teléfono, me cuesta mucho cortarla", options: REVERSE },
    { id: 15, text: "Hay determinadas cosas que me disgusta prestar, pero si me las piden, no sé cómo negarme", options: REVERSE },
    { id: 16, text: "Si salgo de una tienda y me doy cuenta de que me han dado mal el vuelto, regreso allí a pedir el cambio correcto", options: DIRECT },
    { id: 17, text: "No me resulta fácil hacer un cumplido a alguien que me gusta", options: REVERSE },
    { id: 18, text: "Si veo en una fiesta a una persona atractiva del sexo opuesto, tomo la iniciativa y me acerco a entablar conversación con ella", options: DIRECT },
    { id: 19, text: "Me cuesta expresar mis sentimientos a los demás", options: REVERSE },
    { id: 20, text: "Si tuviera que buscar trabajo, preferiría escribir cartas de presentación a tener que pasar por entrevistas personales", options: REVERSE },
    { id: 21, text: "Soy incapaz de regatear o pedir descuento al comprar algo", options: REVERSE },
    { id: 22, text: "Cuando un familiar cercano me molesta, prefiero ocultar mis sentimientos antes que expresar mi enfado", options: REVERSE },
    { id: 23, text: "Nunca sé cómo \"cortar\" a un amigo que habla mucho", options: REVERSE },
    { id: 24, text: "Cuando decido que no me apetece volver a salir con una persona, me cuesta mucho comunicarle mi decisión", options: REVERSE },
    { id: 25, text: "Si un amigo al que he prestado cierta cantidad de dinero parece haberlo olvidado, se lo recuerdo", options: DIRECT },
    { id: 26, text: "Me suele costar mucho pedir a un amigo que me haga un favor", options: REVERSE },
    { id: 27, text: "Soy incapaz de pedir a alguien una cita", options: REVERSE },
    { id: 28, text: "Me siento turbado o violento cuando alguien del sexo opuesto me dice que le gusta algo de mi físico", options: REVERSE },
    { id: 29, text: "Me cuesta expresar mi opinión cuando estoy en grupo", options: REVERSE },
    { id: 30, text: "Cuando alguien se me \"cuela\" en una fila hago como si no me diera cuenta", options: REVERSE },
    { id: 31, text: "Me cuesta mucho expresar mi ira, cólera o enfado hacia el otro sexo aunque tenga motivos justificados", options: REVERSE },
    { id: 32, text: "Muchas veces prefiero callarme o \"quitarme de en medio\" para evitar problemas con otras personas", options: REVERSE },
    { id: 33, text: "Hay veces que no sé negarme con alguien que no me apetece pero que me llama varias veces", options: REVERSE },
  ],
  subscales: [
    { id: "autoexpresion", label: "Autoexpresión en Situaciones Sociales", itemIds: [1, 2, 10, 11, 19, 20, 28, 29], min: 8, max: 32 },
    { id: "defensa_derechos", label: "Defensa de los Propios Derechos como Consumidor", itemIds: [3, 4, 12, 21, 30], min: 5, max: 20 },
    { id: "expresion_desagrado", label: "Expresión de Enfado o Disconformidad", itemIds: [13, 22, 31, 32], min: 4, max: 16 },
    { id: "decir_no", label: "Decir No y Cortar Interacciones", itemIds: [5, 14, 15, 23, 24, 33], min: 6, max: 24 },
    { id: "peticiones", label: "Hacer Peticiones", itemIds: [6, 7, 16, 25, 26], min: 5, max: 20 },
    { id: "iniciar_interacciones", label: "Iniciar Interacciones Positivas con el Sexo Opuesto", itemIds: [8, 9, 17, 18, 27], min: 5, max: 20 },
  ],
  totalItemIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
  totalLabel: 'TOTAL EHS',
};
