import { PsychTestDefinition, TestSubscale, ScoreBand } from '../types';

// Transcribed directly from Diego's physical "Cuestionario de Personalidad
// (SCID-II)" protocol (photos, 2026-09-24) — all 119 items, verbatim.
// Binary Sí/No per item; Sí = 1 (endorses the trait/behavior), No = 0, same
// convention as every other Sí/No instrument in this folder (COPE, etc.).
//
// Scoring key (which items belong to which of the 12 styles, and each
// style's "Significativo" cutoff) comes from Diego's own "scid blanco.xls"
// scoring workbook — extracted from that file's actual SUM/IF formulas
// (converted to .xlsx via Numbers, read with openpyxl), not eyeballed:
//   Evitativo=SUM(B2:B8)<5, Dependiente=SUM(B9:B16)<6, Obsesivo=SUM(B17:B25)<5,
//   Pasivo-Agresivo=SUM(B26:B33)<5, Depresivo=SUM(B34:B41)<6,
//   Paranoide=SUM(B42:B49)<5, Esquizotípico=SUM(B50:B60)<6,
//   Esquizoide=SUM(B61:B66)<6, Histriónico=SUM(B67:B73)<6,
//   Narcisista=SUM(B74:B90)<6, Límite=SUM(B91:B105)<6, Antisocial=SUM(B106:B120)<6
// — where the sheet's row N holds question (N-1), so e.g. B2:B8 is items
// 1-7. The "<X" in each IF is (Umbral column's DSM-criteria threshold) + 1;
// bandsFor() below reproduces that exact "score > umbral" cutoff as a
// percent-of-range band pair, since this app's band system is percent-based
// and SCID-II's real cutoff is an absolute count that differs per style.
//
const YES_NO = [
  { label: 'No', points: 0 },
  { label: 'Sí', points: 1 },
];

// The physical protocol's own back matter describes what an elevated score
// on each of these 12 styles means clinically — used below as each
// subscale's highText. Exported too, in case a future screen wants the full
// map independent of a specific scored result.
export const SCID_II_ESTILOS: Record<string, string> = {
  Evitativo:
    'Se caracteriza por creer que es débil e inferior; ve el mundo como complejo, piensa sobre el futuro como con pocas expectativas y sus relaciones como rechazantes. Sus conductas tienden a ser evitativas y sus emociones predominantes son: tensión, miedo, vergüenza y tristeza.',
  Dependiente:
    'Se caracteriza por creer que es dependiente, que los demás son generosos, superiores. Ve al mundo como difícil y las relaciones como necesarias. Sus expectativas son negativas. Su conducta es sumisa y sus emociones predominantes son: miedo, tensión e inseguridad.',
  Obsesivo:
    'Se caracteriza por creer que es responsable y competente; los demás son despreocupados; ve el mundo como difícil, por lo que tiene que esforzarse mucho; las relaciones son poco fiables. Sus conductas tienden a ser frías y de control; sus emociones predominantes son: tensión y enojo.',
  'Pasivo-Agresivo':
    'Se caracteriza por creer que es bueno y malo; los demás son desconfiables por lo que el mundo lo percibe como impredecible; el futuro es confuso y sus relaciones poco fiables. Tiene conductas sumisas/agresivas y sus emociones predominantes son: tensión, enojo, hostilidad.',
  Depresivo:
    'Se caracteriza por creer que es inútil y débil por lo que los demás no lo valoran. El mundo es percibido como malo por lo que el futuro es negativo y sus relaciones de rechazo. Tiene conductas de aislamiento y sus emociones predominantes son: tristeza y negativismo.',
  Paranoide:
    'Se caracteriza por creer que es bueno y honesto. Los demás son dañinos y poco fiables; considera al mundo como peligroso y el futuro como potencialmente dañino. Sus relaciones están basadas en la sospecha. Sus conductas son agresivas y vigilantes y sus emociones: tensión y desconfianza.',
  Esquizotípico:
    'Se caracteriza por creer que es especial y distinto. Los demás son potencialmente dañinos y ve el futuro como impredecible. Considera las relaciones dañinas y desconfiables. Sus conductas son extrañas y con tendencia al aislamiento. Sus emociones predominantes: embotamiento y sin empatía.',
  Esquizoide:
    'Se caracteriza por creer que es autosuficiente. Los demás son molestos por lo que las relaciones son por interés y sin emoción. Su conducta predominante es el aislamiento y su emoción predominante la ausencia de empatía.',
  Histriónico:
    'Se caracteriza por creer que es especial. Ve a los demás como mediocres y al mundo como divertido y fácil. El futuro es positivo y sus relaciones por admiración y explotación. Su conducta es seductora y manipuladora y sus emociones exageradas.',
  Narcisista:
    'Se caracteriza por creer que es superior y excepcional. Los demás son mediocres. El mundo es percibido como fácil y el futuro como brillante. Las relaciones son de admiración y reconocimiento. No anticipa consecuencias y su emoción predominante es la seguridad.',
  Límite:
    'Se caracteriza por creer que es vulnerable e incapaz. Los demás son dañinos por lo que el mundo es difícil y el futuro negativo. Sus relaciones son inestables. Tiene conductas de descontrol, agresivas y de evitación. Sus emociones son: ira, tristeza y vacío.',
  Antisocial:
    'Se caracteriza por creer que es fuerte y autónomo. Los demás son dañinos. Cree que el mundo es para los vencedores y en las relaciones predomina la ley del más fuerte. Sus conductas son agresivas y sus emociones de ira y descontrol.',
};

export const scidII: PsychTestDefinition = {
  id: 'SCID-II',
  name: 'SCID-II — Cuestionario de Personalidad',
  note:
    'Umbral de "Significativo" por estilo tomado directamente de la hoja de ' +
    'cálculo de calificación de Diego (criterios DSM por trastorno) — no es ' +
    'un porcentaje genérico como en las demás pruebas de este módulo.',
  items: [
    { id: 1, text: '¿Ha evitado trabajos o tareas que implicaban tener que tratar con mucha gente?', options: YES_NO },
    { id: 2, text: '¿Evita entablar relación con otras personas a menos que esté seguro de que les va a caer bien?', options: YES_NO },
    { id: 3, text: '¿Le resulta difícil ser "abierto" incluso con las personas con las que se mantiene una relación cercana?', options: YES_NO },
    { id: 4, text: '¿Le preocupa con frecuencia ser criticado o rechazado en situaciones sociales?', options: YES_NO },
    { id: 5, text: '¿Permanece generalmente callado cuando conoce gente nueva?', options: YES_NO },
    { id: 6, text: '¿Cree usted que no es tan bueno, tan listo o tan atractivo como la mayoría de las personas?', options: YES_NO },
    { id: 7, text: '¿Le da miedo intentar cosas nuevas?', options: YES_NO },
    {
      id: 8,
      text: '¿Necesita usted dejarse aconsejar y desangustiar mucho por parte de otras personas antes de poder tomar decisiones cotidianas, como qué ropa ponerse o qué pedir en un restaurante?',
      options: YES_NO,
    },
    {
      id: 9,
      text: '¿Depende usted de otras personas para controlar áreas importantes de su vida, como asuntos económicos, el cuidado de los hijos o decisiones sobre dónde y cómo vivir?',
      options: YES_NO,
    },
    { id: 10, text: '¿Le resulta difícil mostrarse en desacuerdo con otras personas incluso cuando considera que están equivocadas?', options: YES_NO },
    { id: 11, text: '¿Le cuesta empezar o realizar tareas cuando no hay nadie que le ayude?', options: YES_NO },
    { id: 12, text: '¿Se ha ofrecido con frecuencia voluntario para realizar tareas desagradables?', options: YES_NO },
    { id: 13, text: '¿Se siente usted generalmente incómodo cuando está solo?', options: YES_NO },
    { id: 14, text: 'Cuando finaliza una relación de pareja, ¿siente usted que tiene que encontrar inmediatamente a otra persona que le cuide?', options: YES_NO },
    { id: 15, text: '¿Le preocupa mucho que le abandonen y que tenga que cuidar de sí mismo?', options: YES_NO },
    { id: 16, text: '¿Es usted la clase de persona que se fija en los detalles, el orden y la organización o a la que le gusta hacer listas o agendas?', options: YES_NO },
    { id: 17, text: '¿Tiene problemas a la hora de finalizar tareas o trabajos debido a que emplea demasiado tiempo tratando de hacer las cosas de forma perfecta?', options: YES_NO },
    {
      id: 18,
      text: '¿Le parece a usted o a otras personas que está tan dedicado a su trabajo (o estudios) que no le queda tiempo para nadie más, o simplemente para divertirse?',
      options: YES_NO,
    },
    { id: 19, text: '¿Tiene usted unos valores muy estrictos sobre lo que está bien y lo que está mal?', options: YES_NO },
    { id: 20, text: '¿Le cuesta a usted mucho tirar las cosas porque algún día podrían serle útiles?', options: YES_NO },
    { id: 21, text: '¿Le cuesta dejar que otras personas le ayuden a menos que hagan las cosas exactamente como usted quiere?', options: YES_NO },
    { id: 22, text: '¿Le cuesta a usted mucho gastar dinero en usted mismo o en otros, incluso teniendo el suficiente?', options: YES_NO },
    { id: 23, text: '¿Está a menudo tan seguro de tener razón que no le importa lo que digan los demás?', options: YES_NO },
    { id: 24, text: '¿Le han comentado otras personas que usted es terco o rígido?', options: YES_NO },
    { id: 25, text: 'Cuando alguien le pide que haga algo que usted no quiere hacer, ¿dice que sí pero luego lo hace despacio o mal?', options: YES_NO },
    { id: 26, text: 'Cuando no quiere hacer algo, ¿suele simplemente "olvidarse" de hacerlo?', options: YES_NO },
    { id: 27, text: '¿Siente con frecuencia que los demás no le comprenden o que no aprecian lo mucho que usted hace?', options: YES_NO },
    { id: 28, text: '¿Está usted a menudo de mal humor o tiende a discutir?', options: YES_NO },
    { id: 29, text: '¿Le parece a usted que la mayoría de sus jefes, profesores, supervisores, médicos o personas supuestamente expertas en realidad no lo son?', options: YES_NO },
    { id: 30, text: '¿Piensa a menudo que no es justo que otras personas tengan más que usted?', options: YES_NO },
    { id: 31, text: '¿Se queja usted a menudo de haber tenido más mala suerte de lo normal?', options: YES_NO },
    { id: 32, text: '¿Rehúsa a menudo con enfado hacer lo que quieren los demás, luego se siente mal y se disculpa?', options: YES_NO },
    { id: 33, text: '¿Se siente habitualmente infeliz, o como si la vida no fuese agradable?', options: YES_NO },
    { id: 34, text: '¿Cree usted ser una persona básicamente incapaz y con frecuencia no se siente bien consigo mismo?', options: YES_NO },
    { id: 35, text: '¿Se descalifica a sí mismo con frecuencia?', options: YES_NO },
    { id: 36, text: '¿Piensa mucho en cosas malas que han sucedido en el pasado o se preocupa por las que podrían suceder en el futuro?', options: YES_NO },
    { id: 37, text: '¿Juzga a menudo a los demás con dureza y les encuentra defectos con facilidad?', options: YES_NO },
    { id: 38, text: '¿Cree usted que la mayoría de las personas no son buenas?', options: YES_NO },
    { id: 39, text: '¿Espera usted casi siempre que las cosas vayan mal?', options: YES_NO },
    { id: 40, text: '¿Se siente usted a menudo culpable de cosas que ha hecho o dejado de hacer?', options: YES_NO },
    { id: 41, text: '¿Tiene a menudo que estar alerta para evitar que los demás abusen de usted o le hieran?', options: YES_NO },
    { id: 42, text: '¿Pasa usted mucho tiempo preguntándose si puede fiarse de sus amigos o compañeros de trabajo?', options: YES_NO },
    { id: 43, text: '¿Cree usted que es mejor no dejar que otras personas sepan mucho sobre usted porque podrían utilizar la información en su contra?', options: YES_NO },
    { id: 44, text: '¿Detecta usted a menudo amenazas o insultos ocultos en lo que la gente dice o hace?', options: YES_NO },
    { id: 45, text: '¿Es usted la clase de persona que guarda rencor o tarda mucho tiempo en perdonar a las personas que le han insultado o menospreciado?', options: YES_NO },
    { id: 46, text: '¿Hay muchas personas a las que no puede perdonar por algo que le hicieron o le dijeron hace mucho tiempo?', options: YES_NO },
    { id: 47, text: '¿Con qué frecuencia se enfada o se pone furioso cuando alguien le critica o le insulta de alguna manera?', options: YES_NO },
    { id: 48, text: '¿Ha sospechado a menudo que su pareja le es o era infiel?', options: YES_NO },
    { id: 49, text: 'Cuando está en público y ve personas hablando, ¿a menudo le parece que están hablando de usted?', options: YES_NO },
    {
      id: 50,
      text: '¿Tiene con frecuencia la impresión de que cosas que no poseen ningún significado especial para la mayoría de la gente de hecho contienen en realidad un mensaje especial para usted?',
      options: YES_NO,
    },
    { id: 51, text: 'Cuando está entre la gente, ¿tiene a menudo la sensación de que lo están observando o mirando fijamente?', options: YES_NO },
    { id: 52, text: '¿Ha sentido alguna vez que podría hacer que sucedieran cosas simplemente formulando un deseo o pensando en ellas?', options: YES_NO },
    { id: 53, text: '¿Ha tenido experiencias personales de tipo sobrenatural?', options: YES_NO },
    { id: 54, text: '¿Cree tener un "sexto sentido" que le permite conocer y predecir cosas que otros no pueden?', options: YES_NO },
    {
      id: 55,
      text: '¿Le ha parecido a menudo como si los objetos o las sombras fueran realmente personas o animales, o que los ruidos fueran en realidad voces de personas?',
      options: YES_NO,
    },
    { id: 56, text: '¿Ha tenido la sensación de que alguna persona o fuerza se hallaba alrededor de usted, aunque no podía ver a nadie?', options: YES_NO },
    { id: 57, text: '¿Ve con frecuencia auras o campos de energía alrededor de las personas?', options: YES_NO },
    { id: 58, text: '¿Hay muy pocas personas a las que se sienta próximo a aparte de su familia inmediata?', options: YES_NO },
    { id: 59, text: '¿Se siente con frecuencia nervioso cuando está con otras personas?', options: YES_NO },
    { id: 60, text: '¿Es poco importante para usted si tiene o no relaciones personales?', options: YES_NO },
    { id: 61, text: '¿Prefiere usted casi siempre hacer las cosas solo y no con otras personas?', options: YES_NO },
    { id: 62, text: '¿Podría estar satisfecho sin tener jamás ninguna relación sexual?', options: YES_NO },
    { id: 63, text: '¿Hay realmente muy pocas cosas que le proporcionen placer?', options: YES_NO },
    { id: 64, text: '¿Le es totalmente indiferente lo que otras personas piensen de usted?', options: YES_NO },
    { id: 65, text: '¿Cree que no hay nada que ponga ni muy contento ni muy triste?', options: YES_NO },
    { id: 66, text: '¿Le gusta ser el centro de atención?', options: YES_NO },
    { id: 67, text: '¿Coquetea mucho?', options: YES_NO },
    { id: 68, text: '¿Se da cuenta a menudo de que se está comportando de forma seductora con otras personas?', options: YES_NO },
    { id: 69, text: '¿Trata de llamar la atención a través de su forma de vestir o su aspecto físico?', options: YES_NO },
    { id: 70, text: '¿Se muestra muy a menudo como una persona dramática y pintoresca?', options: YES_NO },
    { id: 71, text: '¿Cambia a menudo de opinión según las personas con las que esté o según lo que acabe de leer o ver en la televisión?', options: YES_NO },
    { id: 72, text: '¿Tiene usted muchos amigos a los que se siente muy próximo?', options: YES_NO },
    { id: 73, text: '¿Considera que a menudo los demás no saben apreciar su talento o sus cualidades?', options: YES_NO },
    { id: 74, text: '¿Le han comentado otras personas que tiene una opinión demasiado elevada de sí mismo?', options: YES_NO },
    { id: 75, text: '¿Piensa mucho en que algún día alcanzará, el poder, la fama o el reconocimiento?', options: YES_NO },
    { id: 76, text: '¿Pasa usted mucho tiempo pensado en que algún día disfrutará de un romance perfecto?', options: YES_NO },
    { id: 77, text: 'Cuando tiene un problema, ¿insiste casi siempre en ver al máximo responsable?', options: YES_NO },
    { id: 78, text: '¿Considera usted que es importante dedicar el tiempo a personas especiales o influyentes?', options: YES_NO },
    { id: 79, text: '¿Es muy importante para usted que la gente le preste atención o le admire de alguna manera?', options: YES_NO },
    { id: 80, text: '¿Cree usted que no es necesario respetar ciertas reglas o convenciones sociales si suponen un obstáculo en su camino?', options: YES_NO },
    { id: 81, text: '¿Considera usted que es la clase de persona que merece un trato especial?', options: YES_NO },
    { id: 82, text: '¿A menudo le resulta necesario aprovecharse de otros para conseguir lo que quiere?', options: YES_NO },
    { id: 83, text: '¿Tiene con frecuencia que anteponer sus necesidades a las de otras personas?', options: YES_NO },
    { id: 84, text: '¿Espera a menudo que otras personas hagan lo que les pide sin vacilar, por ser usted quién es?', options: YES_NO },
    { id: 85, text: '¿A usted realmente no le interesan los problemas y sentimientos de los demás?', options: YES_NO },
    { id: 86, text: '¿Se han quejado algunas personas de que usted no le escucha o de que no se preocupa por sus sentimientos?', options: YES_NO },
    { id: 87, text: '¿Tiene a menudo envidia de otras personas?', options: YES_NO },
    { id: 88, text: '¿Cree usted que los demás a menudo le envidian a usted?', options: YES_NO },
    { id: 89, text: '¿Le parece que hay pocas personas que merezcan que usted les dedique su tiempo y atención?', options: YES_NO },
    { id: 90, text: '¿Se ha puesto furioso con frecuencia cuando ha creído que alguien a quien realmente quería iba a abandonarlo?', options: YES_NO },
    { id: 91, text: 'Las relaciones con las personas que verdaderamente quiere, ¿tienen muchos altibajos extremos?', options: YES_NO },
    { id: 92, text: '¿Cambia a veces de repente su sentido de quién es usted o hacia dónde va?', options: YES_NO },
    { id: 93, text: '¿Cambia a menudo dramáticamente su sentido de quién es?', options: YES_NO },
    { id: 94, text: '¿Es usted diferente con diferentes personas o en diferentes situaciones, de tal manera que a veces no sabe quién es usted en realidad?', options: YES_NO },
    { id: 95, text: '¿Se han producido muchos cambios bruscos en sus metas, planes profesionales, creencias religiosas, etc.?', options: YES_NO },
    { id: 96, text: '¿Ha hecho a menudo cosas impulsivas?', options: YES_NO },
    { id: 97, text: '¿Ha tratado de hacerse daño o matarse, o amenazado con hacerlo?', options: YES_NO },
    { id: 98, text: '¿Alguna vez se ha cortado, quemado o herido a sí mismo a propósito?', options: YES_NO },
    { id: 99, text: '¿Experimenta usted muchos cambios repentinos de estado de ánimo?', options: YES_NO },
    { id: 100, text: '¿Se siente con frecuencia vacío por dentro?', options: YES_NO },
    { id: 101, text: '¿Tiene usted a menudo arranques de cólera o se enfurece tanto que pierde el control?', options: YES_NO },
    { id: 102, text: 'Cuando se enfada, ¿golpea usted a las personas o arroja objetos?', options: YES_NO },
    { id: 103, text: '¿Se pone muy furioso incluso por cosas sin importancia?', options: YES_NO },
    { id: 104, text: 'Cuando se halla bajo gran tensión, ¿se vuelve suspicaz con otras personas o se siente especialmente distante o ausente?', options: YES_NO },
    { id: 105, text: 'Antes de los 15 años, ¿intimidaba o amenazaba a otros niños?', options: YES_NO },
    { id: 106, text: 'Antes de los 15 años, ¿provocaba usted peleas?', options: YES_NO },
    { id: 107, text: 'Antes de los 15 años, ¿hirió o amenazó a alguien con un arma, como por ejemplo un palo, una piedra, una botella rota, una navaja o una pistola?', options: YES_NO },
    { id: 108, text: 'Antes de los 15 años, ¿torturó deliberadamente a alguien o le causó dolor y sufrimiento?', options: YES_NO },
    { id: 109, text: 'Antes de los 15 años, ¿torturó o hirió animales a propósito?', options: YES_NO },
    { id: 110, text: 'Antes de los 15 años, ¿robó, atracó o arrebató por la fuerza a algo o alguien amenazándole?', options: YES_NO },
    { id: 111, text: 'Antes de los 15 años, ¿forzó a alguien a tener relaciones sexuales con usted, a desvestirse delante de usted o a tocarle sexualmente?', options: YES_NO },
    { id: 112, text: 'Antes de los 15 años, ¿provocó algún incendio?', options: YES_NO },
    { id: 113, text: 'Antes de los 15 años, ¿destruyó deliberadamente cosas que no eran suyas?', options: YES_NO },
    { id: 114, text: 'Antes de los 15 años, ¿irrumpió en casas, otros edificios o coches de otras personas?', options: YES_NO },
    { id: 115, text: 'Antes de los 15 años, ¿mentía mucho o estafaba a otras personas?', options: YES_NO },
    { id: 116, text: 'Antes de los 15 años, ¿robaba cosas (sin enfrentarse con la víctima) o falsificaba la firma de otras personas?', options: YES_NO },
    { id: 117, text: 'Antes de los 15 años, ¿se escapó de casa y pasó la noche fuera?', options: YES_NO },
    { id: 118, text: 'Antes de los 13 años, ¿permanecía mucho tiempo fuera de casa y llegaba mucho más tarde de la hora permitida?', options: YES_NO },
    { id: 119, text: 'Antes de los 13 años, ¿faltaba a menudo a clase?', options: YES_NO },
  ],
  subscales: buildSubscales(),
};

// A contiguous range of item ids — every one of the 12 styles below covers a
// single unbroken block of the 119 items, per the source workbook's own
// SUM() ranges.
function itemRange(start: number, end: number): number[] {
  const ids: number[] = [];
  for (let i = start; i <= end; i++) ids.push(i);
  return ids;
}

// Reproduces "Significativo" iff raw > umbral (the workbook's own IF logic,
// e.g. Evitativo: =IF(SUMA<5,"No Significativo","Significativo") for an
// umbral of 4) as a percent-of-range band pair, since raw is always an
// integer here — the +0.5 lands the boundary strictly between umbral and
// umbral+1 regardless of how many items the style has.
function bandsFor(umbral: number, itemCount: number): ScoreBand[] {
  return [
    { max: (umbral + 0.5) / itemCount, label: 'No Significativo' },
    { max: 1, label: 'Significativo' },
  ];
}

function buildSubscales(): TestSubscale[] {
  const estilos: { id: string; label: keyof typeof SCID_II_ESTILOS; start: number; end: number; umbral: number }[] = [
    { id: 'evitativo', label: 'Evitativo', start: 1, end: 7, umbral: 4 },
    { id: 'dependiente', label: 'Dependiente', start: 8, end: 15, umbral: 5 },
    { id: 'obsesivo', label: 'Obsesivo', start: 16, end: 24, umbral: 4 },
    { id: 'pasivo_agresivo', label: 'Pasivo-Agresivo', start: 25, end: 32, umbral: 4 },
    { id: 'depresivo', label: 'Depresivo', start: 33, end: 40, umbral: 5 },
    { id: 'paranoide', label: 'Paranoide', start: 41, end: 48, umbral: 4 },
    { id: 'esquizotipico', label: 'Esquizotípico', start: 49, end: 59, umbral: 5 },
    { id: 'esquizoide', label: 'Esquizoide', start: 60, end: 65, umbral: 5 },
    { id: 'histrionico', label: 'Histriónico', start: 66, end: 72, umbral: 5 },
    { id: 'narcisista', label: 'Narcisista', start: 73, end: 89, umbral: 5 },
    { id: 'limite', label: 'Límite', start: 90, end: 104, umbral: 5 },
    { id: 'antisocial', label: 'Antisocial', start: 105, end: 119, umbral: 5 },
  ];

  return estilos.map((e) => {
    const itemIds = itemRange(e.start, e.end);
    return {
      id: e.id,
      label: e.label,
      itemIds,
      min: 0,
      max: itemIds.length,
      bands: bandsFor(e.umbral, itemIds.length),
      highText: SCID_II_ESTILOS[e.label],
    };
  });
}
