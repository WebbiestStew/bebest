import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { PruebaInterpretacion, PlanObjetivo } from '@/lib/utils';
import { getPsychTest, scoreTest } from '@/lib/psychTests';

// Matches the clinic's actual physical "Informe de Resultados de Evaluación
// Psicológica" letterhead (CPCCM) section-for-section — Diego provided
// photos of a real signed one as the spec. Sections IV and V (Factores
// Predisponentes / Recursos del Paciente) are new fields captured in
// Sesión 2; everything else already existed on the Patient record from
// Sesión 1-3, this is assembly, not new data collection. The one thing this
// can't do is embed the physical signatures or an uploaded test's own scan
// — those stay as "ver documento adjunto" references.
const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 70, fontSize: 10, fontFamily: 'Helvetica', color: '#24312B' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', maxWidth: 340 },
  date: { fontSize: 10, color: '#5B6B62', marginTop: 4 },
  logoStack: { alignItems: 'flex-end' },
  logoBebest: { width: 80, height: 30, objectFit: 'contain' },
  logoCpccm: { width: 80, height: 17, objectFit: 'contain', marginTop: 6 },
  sectionHeader: { backgroundColor: '#E3DDCE', paddingVertical: 5, paddingHorizontal: 8, marginTop: 14, marginBottom: 8 },
  sectionHeaderText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldLine: { flexDirection: 'row', marginBottom: 3 },
  fieldLabel: { width: 130, fontFamily: 'Helvetica-Bold', fontSize: 10 },
  fieldValue: { flex: 1, fontSize: 10 },
  paragraph: { fontSize: 10, lineHeight: 1.5 },
  emptyNote: { fontSize: 9.5, color: '#5B6B62', fontStyle: 'italic' },
  testBlock: { marginBottom: 12 },
  testTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 },
  barRow: { marginBottom: 5 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  barLabel: { fontSize: 8.5, color: '#5B6B62' },
  barLabelTotal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#24312B' },
  barValue: { fontSize: 8.5, color: '#5B6B62' },
  barTrack: { height: 5, backgroundColor: '#E3DDCE' },
  barFill: { height: 5, backgroundColor: '#709527' },
  barFillTotal: { height: 5, backgroundColor: '#435E1C' },
  table: { borderTop: '1 solid #E3DDCE', borderLeft: '1 solid #E3DDCE', marginTop: 6 },
  tableRow: { flexDirection: 'row' },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    borderRight: '1 solid #E3DDCE',
    borderBottom: '1 solid #E3DDCE',
    backgroundColor: '#F6F3EC',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableCell: { flex: 1, padding: 6, borderRight: '1 solid #E3DDCE', borderBottom: '1 solid #E3DDCE', fontSize: 9.5 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  signatureBlock: { width: '42%', alignItems: 'center' },
  signatureLine: { borderTop: '1 solid #24312B', width: '100%', marginBottom: 4 },
  signatureLabel: { fontSize: 9 },
  disclaimer: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginTop: 24, marginBottom: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#21302A',
    color: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
  },
});

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.fieldLine}>
      <Text style={styles.fieldLabel}>{label}:</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

function SectionHeader({ numeral, title }: { numeral: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>
        {numeral}. {title}
      </Text>
    </View>
  );
}

function Paragraph({ value }: { value?: string | null }) {
  if (!value) return <Text style={styles.emptyNote}>Sin información capturada.</Text>;
  return <Text style={styles.paragraph}>{value}</Text>;
}

function TestResultBlock({ item, letter }: { item: PruebaInterpretacion; letter: string }) {
  const test = item.testId ? getPsychTest(item.prueba) : undefined;
  const result = test && item.respuestas ? scoreTest(test, item.respuestas) : undefined;

  return (
    <View style={styles.testBlock} wrap={false}>
      <Text style={styles.testTitle}>
        {letter}) {item.prueba}
      </Text>
      {item.tipo === 'archivo' && item.archivo && (
        <Text style={styles.paragraph}>Ver documento adjunto: {item.archivo.filename}</Text>
      )}
      {item.tipo === 'texto' && <Text style={styles.paragraph}>{item.texto}</Text>}
      {item.tipo === 'estructurado' && (
        <View>
          {result?.total && (
            <View style={styles.barRow}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabelTotal}>{result.total.label}</Text>
                <Text style={styles.barValue}>
                  {result.total.raw}/{result.total.max}
                  {result.total.band ? ` · ${result.total.band}` : ''}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={{ ...styles.barFillTotal, width: `${Math.max(2, Math.min(1, result.total.percent) * 100)}%` }} />
              </View>
            </View>
          )}
          {result?.subscales.map((s) => (
            <View key={s.id} style={styles.barRow}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>{s.label}</Text>
                <Text style={styles.barValue}>
                  {s.tScore !== undefined ? `T=${s.tScore}` : `${s.raw}/${s.max}`}
                  {s.band ? ` · ${s.band}` : ''}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={{ ...styles.barFill, width: `${Math.max(2, Math.min(1, s.percent) * 100)}%` }} />
              </View>
            </View>
          ))}
          {!result && item.texto && <Text style={styles.paragraph}>{item.texto}</Text>}
        </View>
      )}
    </View>
  );
}

export interface InformeResultadosData {
  nombre: string;
  fecha?: string;
  edad?: number;
  sexo?: string;
  estadoCivil?: string;
  ocupacion?: string;
  motivoConsulta?: string[];
  historiaProblema?: string;
  factoresPredisponentes?: string;
  recursosPaciente?: string;
  pruebas: PruebaInterpretacion[];
  dxPrincipal?: { nombre?: string; codigo?: string };
  dxComorbilidad?: { nombre?: string; codigo?: string };
  dxOtros?: { nombre?: string; codigo?: string };
  dxAdicionales?: { nombre: string; codigo?: string }[];
  planTratamiento: PlanObjetivo[];
}

export function InformeResultadosDocument({ data }: { data: InformeResultadosData }) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';

  return (
    <Document title={`Informe de Resultados — ${data.nombre}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>INFORME DE RESULTADOS DE EVALUACIÓN PSICOLÓGICA</Text>
            <Text style={styles.date}>{data.fecha || new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</Text>
          </View>
          <View style={styles.logoStack}>
            <Image src="/bebest-logo.png" style={styles.logoBebest} />
            <Image src="/cpccm-logo.jpg" style={styles.logoCpccm} />
          </View>
        </View>

        <SectionHeader numeral="I" title="Datos Iniciales" />
        <Field label="Nombre" value={data.nombre} />
        <Field label="Edad" value={data.edad} />
        <Field label="Sexo" value={data.sexo} />
        <Field label="Estado Civil" value={data.estadoCivil} />
        <Field label="Profesión/Ocupación" value={data.ocupacion} />

        <SectionHeader numeral="II" title="Motivo de Consulta" />
        <Paragraph value={data.motivoConsulta && data.motivoConsulta.length ? data.motivoConsulta.join('; ') : undefined} />

        <SectionHeader numeral="III" title="Historia del Problema" />
        <Paragraph value={data.historiaProblema} />

        <SectionHeader numeral="IV" title="Factores Predisponentes o de Vulnerabilidad" />
        <Paragraph value={data.factoresPredisponentes} />

        <SectionHeader numeral="V" title="Recursos del Paciente para Hacer Frente al Problema" />
        <Paragraph value={data.recursosPaciente} />

        <SectionHeader numeral="VI" title="Pruebas Aplicadas y Resultados" />
        {data.pruebas.length === 0 ? (
          <Text style={styles.emptyNote}>Sin pruebas capturadas.</Text>
        ) : (
          data.pruebas.map((item, i) => <TestResultBlock key={i} item={item} letter={letters[i] || `${i + 1}`} />)
        )}

        <SectionHeader numeral="VII" title="Diagnóstico de Acuerdo con el DSM-V" />
        <Field
          label="Dx Principal"
          value={[data.dxPrincipal?.nombre, data.dxPrincipal?.codigo].filter(Boolean).join(' — ') || undefined}
        />
        <Field
          label="Dx Comorbilidad"
          value={[data.dxComorbilidad?.nombre, data.dxComorbilidad?.codigo].filter(Boolean).join(' — ') || undefined}
        />
        <Field
          label="Otros Problemas"
          value={[data.dxOtros?.nombre, data.dxOtros?.codigo].filter(Boolean).join(' — ') || undefined}
        />
        {(data.dxAdicionales || []).map((d, i) => (
          <Field key={i} label={`Otros ${i + 1}`} value={[d.nombre, d.codigo].filter(Boolean).join(' — ')} />
        ))}
        {!data.dxPrincipal?.nombre && !data.dxComorbilidad?.nombre && !data.dxOtros?.nombre && (
          <Text style={styles.emptyNote}>Sin diagnóstico capturado.</Text>
        )}

        <SectionHeader numeral="VIII" title="Plan de Tratamiento" />
        {data.planTratamiento.length === 0 ? (
          <Text style={styles.emptyNote}>Sin plan de tratamiento capturado.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeaderCell}>Objetivo</Text>
              <Text style={styles.tableHeaderCell}>Actividades a Realizar</Text>
            </View>
            {data.planTratamiento.map((row, i) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <Text style={styles.tableCell}>{row.objetivo}</Text>
                <Text style={styles.tableCell}>{row.tecnicas}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma Psicólogo</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Firma Paciente</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          *Este informe es de carácter clínico por lo que no puede ser utilizado con fines legales
        </Text>

        <View style={styles.footer} fixed>
          <Text>José Benítez 2020, Piso PL, local 43{'\n'}Col. Deportivo Obispado, Monterrey, NL{'\n'}México. Cp. 64060</Text>
          <Text>tel. 81-1937-9150{'\n'}contacto@cpccm.com.mx</Text>
        </View>
      </Page>
    </Document>
  );
}
