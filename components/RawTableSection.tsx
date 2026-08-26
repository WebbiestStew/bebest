'use client';

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { VerticalBars, BarDatum } from './charts/VerticalBars';
import { RankedBars } from './charts/RankedBars';
import { ChartCard } from './charts/ChartCard';
import { CATEGORICAL } from '@/lib/chartColors';

type ViewMode = 'tabla' | 'graficas' | 'ambos';

interface Props {
  table: string;
}

export interface RawTableSectionHandle {
  // Opens the section and loads its data if needed; used by "export everything"
  // to force every table (even ones the user never clicked) into a printable state.
  ensureLoaded: (mode?: ViewMode) => Promise<void>;
}

function formatCell(value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.map(formatCell).join(', ');
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Picks fields worth charting: enough repetition across records that a bar
// chart is actually readable, not a free-text or unique-identifier field.
function findChartableFields(fields: string[], records: Record<string, any>[]) {
  const chartable: { field: string; rows: { label: string; value: number }[] }[] = [];

  for (const field of fields) {
    const counts = new Map<string, number>();
    let nonEmpty = 0;
    for (const r of records) {
      const raw = r[field];
      if (raw === undefined || raw === null || raw === '') continue;
      nonEmpty++;
      const key = formatCell(raw);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const distinct = counts.size;
    // A small, explicit set of categories (roles, statuses, yes/no) is worth
    // charting no matter how few records there are. Above that, only chart it
    // if values repeat enough to not just be near-unique free text.
    const looksCategorical = distinct <= 8 || distinct <= 30 && distinct <= nonEmpty * 0.6;
    if (nonEmpty === 0 || distinct < 2 || !looksCategorical) continue;

    const rows = Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    chartable.push({ field, rows });
  }

  return chartable;
}

export const RawTableSection = forwardRef<RawTableSectionHandle, Props>(function RawTableSection(
  { table },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<ViewMode>('tabla');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/airtable-tables?table=${encodeURIComponent(table)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFields(data.fields || []);
      setRecords(data.records || []);
      setLoaded(true);
    } catch {
      setError('No se pudo cargar esta tabla.');
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      ensureLoaded: async (forcedMode) => {
        setIsOpen(true);
        if (forcedMode) setMode(forcedMode);
        if (!loaded) await load();
      },
    }),
    [loaded]
  );

  const toggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !loaded) await load();
  };

  const chartable = useMemo(
    () => (loaded ? findChartableFields(fields, records) : []),
    [loaded, fields, records]
  );

  return (
    <div className="border border-line rounded-lg bg-panel overflow-hidden print:break-inside-avoid">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-black/[0.02] print:hidden"
      >
        <span className="font-mono text-sm font-medium">{table}</span>
        <span className="flex items-center gap-3 text-xs text-ink-soft">
          {loaded && <span>{records.length} registros</span>}
          <span className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
        </span>
      </button>

      {isOpen && (
        <div className="hidden print:block px-4 pt-3 font-mono text-sm font-medium">
          {table} <span className="text-ink-soft font-sans">— {records.length} registros</span>
        </div>
      )}

      {isOpen && (
        <div className="border-t border-line print:border-t-0">
          {isLoading ? (
            <div className="p-4 text-sm text-ink-soft">Cargando…</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : records.length === 0 ? (
            <div className="p-4 text-sm text-ink-soft">Esta tabla no tiene registros.</div>
          ) : (
            <>
              <div className="flex items-center gap-1 px-4 pt-3 print:hidden">
                {(['tabla', 'graficas', 'ambos'] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors duration-150 ${
                      mode === m ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/[0.04]'
                    }`}
                  >
                    {m === 'tabla' ? 'Tabla' : m === 'graficas' ? 'Gráficas' : 'Ambos'}
                  </button>
                ))}
              </div>

              {(mode === 'graficas' || mode === 'ambos') && (
                <div className="p-4">
                  {chartable.length === 0 ? (
                    <div className="text-sm text-ink-soft italic">
                      No hay campos con suficientes categorías repetidas para graficar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1">
                      {chartable.map(({ field, rows }) => {
                        const total = rows.reduce((s, r) => s + r.value, 0);
                        const useRanked = rows.length > 8;
                        const data: BarDatum[] = rows.map((r, i) => ({
                          label: r.label,
                          value: r.value,
                          color: CATEGORICAL[i % CATEGORICAL.length],
                        }));
                        return (
                          <ChartCard
                            key={field}
                            title={field}
                            subtitle={`${total} registros`}
                            tableRows={rows.map((r) => ({
                              label: r.label,
                              value: r.value,
                              pct: total ? Math.round((r.value / total) * 100) : 0,
                            }))}
                          >
                            {useRanked ? (
                              <RankedBars data={data.slice(0, 10)} color={CATEGORICAL[0]} unit="registros" />
                            ) : (
                              <VerticalBars data={data} unit="registros" />
                            )}
                          </ChartCard>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(mode === 'tabla' || mode === 'ambos') && (
                <div className="overflow-x-auto print:overflow-visible max-h-[28rem] print:max-h-none">
                  <table className="text-xs w-full border-collapse">
                    <thead className="sticky top-0 bg-panel print:static">
                      <tr>
                        {fields.map((f) => (
                          <th
                            key={f}
                            className="text-left font-medium px-3 py-2 border-b border-line whitespace-nowrap"
                          >
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} className="border-b border-line/60 last:border-0">
                          {fields.map((f) => (
                            <td key={f} className="px-3 py-1.5 whitespace-nowrap text-ink-soft">
                              {formatCell(r[f])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});
