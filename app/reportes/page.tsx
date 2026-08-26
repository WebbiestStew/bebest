'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { hasAdminAccess } from '@/lib/roles';
import { BackButton, Button } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { VerticalBars, BarDatum } from '@/components/charts/VerticalBars';
import { RankedBars } from '@/components/charts/RankedBars';
import { ChartCard } from '@/components/charts/ChartCard';
import { CATEGORICAL, MUTED_GRAY, ordinalStep } from '@/lib/chartColors';
import { Skeleton } from '@/components/Skeleton';
import { CountUp } from '@/components/CountUp';
import { RawTableSection, RawTableSectionHandle } from '@/components/RawTableSection';

// Every table in the base, in the same order as the tabs in Airtable itself.
const AIRTABLE_TABLES = [
  'LEEME',
  'PACIENTES_2025_2026',
  'PACIENTES_2025',
  'PACIENTES_2026',
  'ACTIVOS_FUERA_MUESTRA',
  'BAJAS_FECHA_BAJA_2025_2026',
  'REGISTRO_2025_2026_FILTRADO',
  'SEGUIMIENTO_LIMPIO',
  'CALIDAD_DATOS',
  'PLANTILLA_CITAS',
  'PLANTILLA_INGRESOS',
  'RESUMEN',
  'GRAFICAS',
  'users',
  'alerts',
  'citas',
  'sugerencias',
];

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];
const MES_ABBR: Record<string, string> = {
  ENERO: 'Ene', FEBRERO: 'Feb', MARZO: 'Mar', ABRIL: 'Abr', MAYO: 'May', JUNIO: 'Jun',
  JULIO: 'Jul', AGOSTO: 'Ago', SEPTIEMBRE: 'Sep', OCTUBRE: 'Oct', NOVIEMBRE: 'Nov', DICIEMBRE: 'Dic',
};
const RANGO_EDAD_ORDER = ['MENOR DE 18', '18-25', '26-35', '36-45', '46-55', '56-65', '66+', 'SIN DATO'];
const ESTATUS_ORDER = ['ACTIVO', 'ALTA', 'BAJA', 'SIN DATO'];
const FRECUENCIA_ORDER = ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'SOLO ENTREVISTA', 'SIN DATO'];

function titleCase(s: string) {
  if (!s) return 'Sin dato';
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function groupBy(items: any[], field: string, order?: string[]) {
  const counts = new Map<string, number>();
  for (const it of items) {
    const key = (it[field] || 'SIN DATO').toString().toUpperCase().trim() || 'SIN DATO';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const keys = order ? order.filter((k) => counts.has(k)) : Array.from(counts.keys());
  return keys.map((k) => ({ key: k, value: counts.get(k) || 0 }));
}

export default function ReportesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [year, setYear] = useState('todos');
  const [month, setMonth] = useState('todos');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const rawTableRefs = useRef<Record<string, RawTableSectionHandle | null>>({});

  const exportEverythingToPdf = async () => {
    setIsExportingPdf(true);
    try {
      await Promise.all(
        AIRTABLE_TABLES.map((table) => rawTableRefs.current[table]?.ensureLoaded('ambos'))
      );
      // Let entrance animations (bar charts grow on mount) settle before the
      // print snapshot is taken, otherwise bars print at 0 height.
      await new Promise((resolve) => setTimeout(resolve, 900));
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        setPatients(data.patients || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    if (user) fetchPatients();
  }, [user]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => p.anio_ingreso && set.add(String(p.anio_ingreso)));
    return Array.from(set).sort();
  }, [patients]);

  const yearFiltered = useMemo(() => {
    if (year === 'todos') return patients;
    return patients.filter((p) => String(p.anio_ingreso) === year);
  }, [patients, year]);

  const filtered = useMemo(() => {
    if (month === 'todos') return yearFiltered;
    return yearFiltered.filter((p) => (p.mes_ingreso || '').toUpperCase() === month);
  }, [yearFiltered, month]);

  // Sexo
  const sexoRows = groupBy(filtered, 'sexo', ['MASCULINO', 'FEMENINO']);
  const sexoTotal = sexoRows.reduce((s, r) => s + r.value, 0);
  const sexoData: BarDatum[] = sexoRows.map((r, i) => ({
    label: titleCase(r.key),
    value: r.value,
    color: CATEGORICAL[i % CATEGORICAL.length],
  }));

  // Rango edad
  const edadRows = groupBy(filtered, 'rango_edad', RANGO_EDAD_ORDER);
  const edadKnown = edadRows.filter((r) => r.key !== 'SIN DATO');
  const edadTotal = edadRows.reduce((s, r) => s + r.value, 0);
  const edadData: BarDatum[] = edadRows.map((r) => ({
    label: r.key === 'SIN DATO' ? 'Sin dato' : r.key,
    value: r.value,
    color: r.key === 'SIN DATO' ? MUTED_GRAY : ordinalStep(edadKnown.findIndex((e) => e.key === r.key), edadKnown.length),
  }));

  // Estatus
  const estatusRows = groupBy(filtered, 'estatus_en_registro', ESTATUS_ORDER);
  const estatusTotal = estatusRows.reduce((s, r) => s + r.value, 0);
  const estatusData: BarDatum[] = estatusRows.map((r, i) => ({
    label: titleCase(r.key),
    value: r.value,
    color: CATEGORICAL[i % CATEGORICAL.length],
  }));

  // Frecuencia
  const frecuenciaRows = groupBy(filtered, 'frecuencia', FRECUENCIA_ORDER);
  const frecuenciaTotal = frecuenciaRows.reduce((s, r) => s + r.value, 0);
  const frecuenciaData: BarDatum[] = frecuenciaRows.map((r, i) => ({
    label: titleCase(r.key),
    value: r.value,
    color: CATEGORICAL[i % CATEGORICAL.length],
  }));

  // Terapeuta caseload (ranked)
  const terapeutaCounts = new Map<string, number>();
  filtered.forEach((p) => {
    const key = p.terapeuta ? titleCase(p.terapeuta) : 'Sin asignar';
    terapeutaCounts.set(key, (terapeutaCounts.get(key) || 0) + 1);
  });
  const terapeutaSorted = Array.from(terapeutaCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const terapeutaTop = terapeutaSorted.slice(0, 10);
  const terapeutaRest = terapeutaSorted.slice(10).reduce((s, r) => s + r.value, 0);
  const terapeutaData = terapeutaRest > 0 ? [...terapeutaTop, { label: 'Otros', value: terapeutaRest }] : terapeutaTop;
  const terapeutaTotal = terapeutaSorted.reduce((s, r) => s + r.value, 0);

  // Ingresos por mes (whole selected year, emphasized on selected month)
  const mesRows = groupBy(yearFiltered, 'mes_ingreso', MESES);
  const mesTotal = mesRows.reduce((s, r) => s + r.value, 0);
  const mesData: BarDatum[] = MESES.map((m) => {
    const row = mesRows.find((r) => r.key === m);
    const value = row ? row.value : 0;
    const isSelected = month !== 'todos' && month === m;
    return {
      label: m,
      value,
      color: month === 'todos' ? CATEGORICAL[0] : isSelected ? CATEGORICAL[0] : MUTED_GRAY,
    };
  });

  if (isLoading) return null;
  if (!user) return null;

  const isAdmin = hasAdminAccess(user.rol);
  const avgAge = filtered.length
    ? Math.round(filtered.reduce((s, p) => s + (p.edad || 0), 0) / filtered.filter((p) => p.edad).length) || 0
    : 0;

  const periodLabel =
    month === 'todos' && year === 'todos'
      ? 'Todo el periodo'
      : month === 'todos'
      ? `Año ${year}`
      : `${titleCase(month)} ${year === 'todos' ? '' : year}`.trim();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 print:p-6" id="reportes-print-area">
        <div className="print:hidden">
          <BackButton onClick={() => router.push('/')} />
        </div>

        <div className="mb-6 flex items-end justify-between animate-fade-in-up">
          <div>
            <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">
              {isAdmin ? 'Toda la consulta' : 'Tus pacientes'}
            </div>
            <h1 className="font-serif text-4xl font-medium mb-2">Reportes</h1>
            <p className="text-ink-soft text-base">
              Estadísticas de {periodLabel.toLowerCase()} — generadas automáticamente, sin Excel de por medio.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              🖨 Imprimir
            </Button>
            {isAdmin && (
              <Button variant="secondary" onClick={exportEverythingToPdf} disabled={isExportingPdf}>
                {isExportingPdf ? 'Preparando…' : '📄 Exportar todo (PDF)'}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setMonth('todos');
            }}
            className="px-4 py-2.5 border border-line rounded-lg text-sm bg-panel text-ink-soft transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage"
          >
            <option value="todos">Todos los años</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={year === 'todos'}
            className="px-4 py-2.5 border border-line rounded-lg text-sm bg-panel text-ink-soft transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="todos">Todo el año</option>
            {MESES.map((m) => (
              <option key={m} value={m}>
                {titleCase(m)}
              </option>
            ))}
          </select>
          {year === 'todos' && (
            <span className="text-xs text-ink-soft italic">Elige un año para filtrar por mes</span>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Pacientes en el periodo', value: filtered.length, suffix: '' },
            { label: 'Edad promedio', value: avgAge, suffix: avgAge ? ' años' : '' },
            { label: 'Terapeutas activos', value: terapeutaSorted.length, suffix: '' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="bg-panel border border-line rounded-lg p-4 animate-fade-in-up"
              style={{ animationDelay: `${100 + i * 40}ms` }}
            >
              <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">{s.label}</div>
              {isLoadingData ? (
                <Skeleton className="h-7 w-16" />
              ) : s.value ? (
                <div className="font-serif text-2xl font-medium">
                  <CountUp value={s.value} />
                  {s.suffix}
                </div>
              ) : (
                <div className="font-serif text-2xl font-medium">—</div>
              )}
            </div>
          ))}
        </div>

        {isLoadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-panel border-2 border-dashed border-line rounded-lg p-10 text-center text-ink-soft animate-fade-in-up">
            No hay pacientes registrados en {periodLabel.toLowerCase()}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1">
            <ChartCard
              title="Sexo"
              subtitle={`${sexoTotal} pacientes`}
              legend={sexoData.map((d) => ({ label: d.label, color: d.color }))}
              tableRows={sexoData.map((d) => ({ label: d.label, value: d.value, pct: sexoTotal ? Math.round((d.value / sexoTotal) * 100) : 0 }))}
              delay={140}
            >
              <VerticalBars data={sexoData} />
            </ChartCard>

            <ChartCard
              title="Rango de edad"
              subtitle={`${edadTotal} pacientes`}
              tableRows={edadData.map((d) => ({ label: d.label, value: d.value, pct: edadTotal ? Math.round((d.value / edadTotal) * 100) : 0 }))}
              delay={170}
            >
              <VerticalBars data={edadData} />
            </ChartCard>

            <ChartCard
              title="Estado del expediente"
              subtitle={`${estatusTotal} pacientes`}
              legend={estatusData.map((d) => ({ label: d.label, color: d.color }))}
              tableRows={estatusData.map((d) => ({ label: d.label, value: d.value, pct: estatusTotal ? Math.round((d.value / estatusTotal) * 100) : 0 }))}
              delay={200}
            >
              <VerticalBars data={estatusData} />
            </ChartCard>

            <ChartCard
              title="Frecuencia de sesiones"
              subtitle={`${frecuenciaTotal} pacientes`}
              legend={frecuenciaData.map((d) => ({ label: d.label, color: d.color }))}
              tableRows={frecuenciaData.map((d) => ({ label: d.label, value: d.value, pct: frecuenciaTotal ? Math.round((d.value / frecuenciaTotal) * 100) : 0 }))}
              delay={230}
            >
              <VerticalBars data={frecuenciaData} />
            </ChartCard>

            {isAdmin && (
              <ChartCard
                title="Pacientes por terapeuta"
                subtitle={`${terapeutaSorted.length} terapeutas`}
                tableRows={terapeutaData.map((d) => ({ label: d.label, value: d.value, pct: terapeutaTotal ? Math.round((d.value / terapeutaTotal) * 100) : 0 }))}
                delay={260}
              >
                <RankedBars data={terapeutaData} color={CATEGORICAL[0]} />
              </ChartCard>
            )}

            <ChartCard
              title="Ingresos por mes"
              subtitle={year === 'todos' ? 'Todos los años' : `Año ${year}`}
              tableRows={mesData.map((d) => ({ label: titleCase(d.label), value: d.value, pct: mesTotal ? Math.round((d.value / mesTotal) * 100) : 0 }))}
              delay={290}
            >
              <VerticalBars data={mesData} axisLabelFormatter={(l) => MES_ABBR[l] || l} />
            </ChartCard>
          </div>
        )}

        {isAdmin && (
          <div className="mt-10 print:hidden">
            <div className="mb-3">
              <h2 className="font-serif text-2xl font-medium mb-1">Todas las tablas de Airtable</h2>
              <p className="text-ink-soft text-sm">
                Vista completa de la base, tabla por tabla — incluye las que no tienen su propia pantalla en la app.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {AIRTABLE_TABLES.map((table) => (
                <RawTableSection
                  key={table}
                  table={table}
                  ref={(el) => {
                    rawTableRefs.current[table] = el;
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="print:hidden">
        <Toast />
      </div>
    </div>
  );
}
