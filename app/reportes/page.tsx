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
import { downloadPdf, normalizeText, parseMotivoConsulta } from '@/lib/utils';
import { PdfDocument, PdfSectionData } from '@/components/PdfDocument';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// JS's Date#getDay() is Sunday-first (0-6) — remap to the Monday-first order
// the rest of this app uses (see DIAS in app/agenda/page.tsx).
const JS_DAY_TO_INDEX = [6, 0, 1, 2, 3, 4, 5];

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
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [year, setYear] = useState('todos');
  const [month, setMonth] = useState('todos');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const rawTableRefs = useRef<Record<string, RawTableSectionHandle | null>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, citasRes] = await Promise.all([fetch('/api/patients'), fetch('/api/citas')]);
        const patientsData = await patientsRes.json();
        const citasData = await citasRes.json();
        setPatients(patientsData.patients || []);
        setCitas(citasData.citas || []);
      } catch (error) {
        console.error('Error fetching reportes data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    if (user) fetchData();
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

  // Citas filtered by the cita's OWN fecha (not the patient's anio/mes_ingreso
  // — a session can happen well after a patient's original intake month), on
  // the same year/month picked above. Reportes never looked at citas at all
  // before this — every chart used to be roster/demographic data only.
  const citasFiltered = citas.filter((c: any) => {
    if (!c.fecha) return false;
    const d = new Date(c.fecha);
    if (year !== 'todos' && String(d.getUTCFullYear()) !== year) return false;
    if (month !== 'todos' && MESES[d.getUTCMonth()] !== month) return false;
    return true;
  });

  const sesionesCompletadas = citasFiltered.filter((c: any) => c.estado === 'Completada').length;
  const inasistencias = citasFiltered.filter((c: any) => c.estado === 'No asistió').length;
  const resueltas = sesionesCompletadas + inasistencias;
  const tasaInasistencia = resueltas ? Math.round((inasistencias / resueltas) * 100) : 0;
  const pacientesConSesion = new Set(
    citasFiltered
      .filter((c: any) => c.estado === 'Completada')
      .flatMap((c: any) => c.paciente || [])
  ).size;
  const promedioSesionesPorPaciente = pacientesConSesion
    ? Math.round((sesionesCompletadas / pacientesConSesion) * 10) / 10
    : 0;

  // Citas por día de la semana (Lunes-first, matching the rest of the app)
  const diaCounts = new Array(7).fill(0);
  citasFiltered.forEach((c: any) => {
    if (!c.fecha) return;
    diaCounts[JS_DAY_TO_INDEX[new Date(c.fecha).getUTCDay()]]++;
  });
  const diaTotal = diaCounts.reduce((s, v) => s + v, 0);
  const diaData: BarDatum[] = DIAS_SEMANA.map((label, i) => ({
    label,
    value: diaCounts[i],
    color: CATEGORICAL[0],
  }));

  // Diagnósticos más frecuentes (Dx Principal; falls back to the two legacy
  // roster columns — comorbilidad and diagnostico — for patients that
  // predate the Sesión 3 flow, same fallback chain as app/pacientes/page.tsx)
  const dxCounts = new Map<string, number>();
  filtered.forEach((p: any) => {
    const dx = (p.dx_principal || p.comorbilidad || p.diagnostico || '').trim();
    if (dx) dxCounts.set(dx, (dxCounts.get(dx) || 0) + 1);
  });
  const dxSorted = Array.from(dxCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const dxTop = dxSorted.slice(0, 10);
  const dxRest = dxSorted.slice(10).reduce((s, r) => s + r.value, 0);
  const dxData = dxRest > 0 ? [...dxTop, { label: 'Otros', value: dxRest }] : dxTop;
  const dxTotal = dxSorted.reduce((s, r) => s + r.value, 0);

  // Motivos de consulta más frecuentes — motivo_consulta is a "select all
  // that apply" list (see parseMotivoConsulta), so one patient can add to
  // several bars here, unlike every other chart on this page.
  const motivoCounts = new Map<string, number>();
  filtered.forEach((p: any) => {
    parseMotivoConsulta(p.motivo_consulta).forEach((m) => motivoCounts.set(m, (motivoCounts.get(m) || 0) + 1));
  });
  const motivoSorted = Array.from(motivoCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const motivoTop = motivoSorted.slice(0, 10);
  const motivoRest = motivoSorted.slice(10).reduce((s, r) => s + r.value, 0);
  const motivoData = motivoRest > 0 ? [...motivoTop, { label: 'Otros', value: motivoRest }] : motivoTop;
  const motivoTotal = motivoSorted.reduce((s, r) => s + r.value, 0);

  // Sesiones y asistencia por terapeuta (admin only, same gating as the
  // caseload chart above) — the caseload chart only counts assigned
  // patients; this is actual session volume and no-show rate per therapist.
  const terapeutaSesionesMap = new Map<string, { completadas: number; noAsistio: number }>();
  citasFiltered.forEach((c: any) => {
    const key = c.terapeuta ? titleCase(c.terapeuta) : 'Sin asignar';
    const entry = terapeutaSesionesMap.get(key) || { completadas: 0, noAsistio: 0 };
    if (c.estado === 'Completada') entry.completadas++;
    if (c.estado === 'No asistió') entry.noAsistio++;
    terapeutaSesionesMap.set(key, entry);
  });
  const terapeutaSesionesSorted = Array.from(terapeutaSesionesMap.entries())
    .map(([label, { completadas, noAsistio }]) => {
      const resueltasTerapeuta = completadas + noAsistio;
      return {
        label,
        value: completadas,
        pct: resueltasTerapeuta ? Math.round((noAsistio / resueltasTerapeuta) * 100) : 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const sections: PdfSectionData[] = [
        {
          title: 'Resumen',
          fields: [
            { label: 'Pacientes nuevos', value: filtered.length },
            { label: 'Pacientes activos durante el mes', value: pacientesConSesion },
            { label: 'Edad promedio', value: avgAge ? `${avgAge} años` : null },
            { label: 'Terapeutas activos', value: terapeutaSorted.length },
            { label: 'Sesiones completadas', value: sesionesCompletadas },
            { label: 'Tasa de inasistencia', value: resueltas ? `${tasaInasistencia}%` : null },
            { label: 'Promedio de sesiones por paciente', value: pacientesConSesion ? promedioSesionesPorPaciente : null },
          ],
        },
        {
          title: 'Sexo',
          fields: sexoData.map((d) => ({ label: d.label, value: sexoTotal ? `${d.value} (${Math.round((d.value / sexoTotal) * 100)}%)` : d.value })),
        },
        {
          title: 'Rango de edad',
          fields: edadData.map((d) => ({ label: d.label, value: edadTotal ? `${d.value} (${Math.round((d.value / edadTotal) * 100)}%)` : d.value })),
        },
        {
          title: 'Estado del expediente',
          fields: estatusData.map((d) => ({ label: d.label, value: estatusTotal ? `${d.value} (${Math.round((d.value / estatusTotal) * 100)}%)` : d.value })),
        },
        {
          title: 'Frecuencia de sesiones',
          fields: frecuenciaData.map((d) => ({ label: d.label, value: frecuenciaTotal ? `${d.value} (${Math.round((d.value / frecuenciaTotal) * 100)}%)` : d.value })),
        },
        ...(isAdmin
          ? [
              {
                title: 'Pacientes por terapeuta',
                fields: terapeutaData.map((d) => ({ label: d.label, value: d.value })),
              },
            ]
          : []),
        {
          title: 'Ingresos por mes',
          fields: mesData.filter((d) => d.value > 0).map((d) => ({ label: titleCase(d.label), value: d.value })),
        },
        {
          title: 'Citas por día de la semana',
          fields: diaData.filter((d) => d.value > 0).map((d) => ({ label: d.label, value: d.value })),
        },
        {
          title: 'Diagnósticos más frecuentes',
          fields: dxData.map((d) => ({ label: d.label, value: d.value, full: true })),
        },
        {
          title: 'Motivos de consulta más frecuentes',
          fields: motivoData.map((d) => ({ label: d.label, value: d.value, full: true })),
        },
        ...(isAdmin
          ? [
              {
                title: 'Sesiones y asistencia por terapeuta',
                fields: terapeutaSesionesSorted.map((d) => ({
                  label: d.label,
                  value: `${d.value} completadas — ${d.pct}% inasistencia`,
                  full: true,
                })),
              },
            ]
          : []),
      ];

      const slug = normalizeText(`reportes-${periodLabel}`)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      await downloadPdf(
        <PdfDocument
          title="Reportes"
          subtitle={periodLabel}
          sections={sections}
          generatedNote="Consulta · Reporte generado automáticamente"
        />,
        slug
      );
    } catch (error) {
      console.error('Error generating reportes PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

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
            {isAdmin && (
              <Button variant="secondary" onClick={() => window.print()}>
                🖨 Imprimir
              </Button>
            )}
            {isAdmin && (
              <Button variant="secondary" onClick={handleExportPdf} disabled={isExportingPdf} isLoading={isExportingPdf}>
                ⬇️ Descargar reporte (PDF)
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {[
            { label: 'Pacientes nuevos', value: filtered.length, suffix: '' },
            { label: 'Pacientes activos durante el mes', value: pacientesConSesion, suffix: '' },
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

        {/* Session/attendance stats — the first numbers on this page that
            come from citas instead of the patient roster. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Sesiones completadas', display: sesionesCompletadas ? String(sesionesCompletadas) : null },
            { label: 'Tasa de inasistencia', display: resueltas ? `${tasaInasistencia}%` : null },
            { label: 'Sesiones por paciente', display: pacientesConSesion ? String(promedioSesionesPorPaciente) : null },
          ].map((s, i) => (
            <div
              key={s.label}
              className="bg-panel border border-line rounded-lg p-4 animate-fade-in-up"
              style={{ animationDelay: `${180 + i * 40}ms` }}
            >
              <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">{s.label}</div>
              {isLoadingData ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="font-serif text-2xl font-medium">{s.display ?? '—'}</div>
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

            <ChartCard
              title="Citas por día de la semana"
              subtitle={`${diaTotal} citas`}
              tableRows={diaData.map((d) => ({ label: d.label, value: d.value, pct: diaTotal ? Math.round((d.value / diaTotal) * 100) : 0 }))}
              tableHeaders={['Día', 'Citas', '%']}
              delay={320}
            >
              <VerticalBars data={diaData} unit="citas" axisLabelFormatter={(l) => l.slice(0, 3)} />
            </ChartCard>

            <ChartCard
              title="Diagnósticos más frecuentes"
              subtitle={`${dxTotal} pacientes con Dx`}
              tableRows={dxData.map((d) => ({ label: d.label, value: d.value, pct: dxTotal ? Math.round((d.value / dxTotal) * 100) : 0 }))}
              tableHeaders={['Diagnóstico', 'Pacientes', '%']}
              delay={350}
            >
              <RankedBars data={dxData} color={CATEGORICAL[1]} />
            </ChartCard>

            <ChartCard
              title="Motivos de consulta más frecuentes"
              subtitle="Un paciente puede señalar más de uno"
              tableRows={motivoData.map((d) => ({ label: d.label, value: d.value, pct: motivoTotal ? Math.round((d.value / motivoTotal) * 100) : 0 }))}
              tableHeaders={['Motivo', 'Menciones', '%']}
              delay={380}
            >
              <RankedBars data={motivoData} color={CATEGORICAL[2]} unit="menciones" />
            </ChartCard>

            {isAdmin && (
              <ChartCard
                title="Sesiones y asistencia por terapeuta"
                subtitle="% de inasistencia sobre sesiones resueltas"
                tableRows={terapeutaSesionesSorted}
                tableHeaders={['Terapeuta', 'Sesiones completadas', '% inasistencia']}
                delay={410}
              >
                <RankedBars
                  data={terapeutaSesionesSorted.map((d) => ({ label: d.label, value: d.value }))}
                  color={CATEGORICAL[0]}
                  unit="sesiones"
                />
              </ChartCard>
            )}
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
