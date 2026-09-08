import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// A real, downloadable PDF matching the on-screen FormPrintPreview panel —
// built with react-pdf's own primitives (not a screenshot of the DOM), so
// text stays sharp and selectable at any zoom, unlike an html2canvas-style
// image-based PDF. Colors are the same palette as tailwind.config.js, kept
// as plain hex here since react-pdf doesn't read Tailwind config.
export interface PdfFieldData {
  label: string;
  value?: string | number | boolean | null;
  full?: boolean;
}

export interface PdfSectionData {
  title: string;
  fields: PdfFieldData[];
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#24312B' },
  title: { fontSize: 20, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 11, color: '#5B6B62', marginBottom: 22 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#4C6B51',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #E3DDCE',
  },
  fieldsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  field: { width: '50%', marginBottom: 9, paddingRight: 12 },
  fieldFull: { width: '100%', marginBottom: 9 },
  fieldLabel: { fontSize: 7.5, textTransform: 'uppercase', color: '#5B6B62', marginBottom: 2, letterSpacing: 0.5 },
  fieldValue: { fontSize: 10, color: '#24312B', lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: '#5B6B62',
    textAlign: 'center',
  },
});

function resolveDisplay(value: PdfFieldData['value']): string {
  if (value === true) return 'Sí';
  if (value === undefined || value === null) return '';
  return String(value);
}

function isVisible(field: PdfFieldData): boolean {
  return field.value !== undefined && field.value !== null && field.value !== '' && field.value !== false;
}

export function PdfDocument({
  title,
  subtitle,
  sections,
  generatedNote,
}: {
  title: string;
  subtitle?: string;
  sections: PdfSectionData[];
  generatedNote?: string;
}) {
  return (
    <Document title={title}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {sections.map((section, si) => {
          const visibleFields = section.fields.filter(isVisible);
          if (visibleFields.length === 0) return null;
          return (
            <View key={si} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.fieldsRow}>
                {visibleFields.map((f, fi) => (
                  <View key={fi} style={f.full ? styles.fieldFull : styles.field}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    <Text style={styles.fieldValue}>{resolveDisplay(f.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {generatedNote && (
          <Text style={styles.footer} fixed>
            {generatedNote}
          </Text>
        )}
      </Page>
    </Document>
  );
}
