'use client';

import { useState } from 'react';

export function ChartCard({
  title,
  subtitle,
  legend,
  tableRows,
  tableHeaders = ['Categoría', 'Pacientes', '%'],
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  tableRows?: { label: string; value: number; pct: number }[];
  tableHeaders?: [string, string, string];
  children: React.ReactNode;
  delay?: number;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div
      className="bg-panel border border-line rounded-lg p-6 transition-all duration-200 hover:shadow-md animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-serif text-lg font-medium">{title}</h3>
          {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
        </div>
        {tableRows && (
          <button
            onClick={() => setShowTable((s) => !s)}
            className="text-xs text-ink-soft hover:text-sage-deep transition-colors duration-150 shrink-0 ml-3 underline decoration-dotted underline-offset-2"
          >
            {showTable ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        )}
      </div>

      {legend && legend.length > 1 && !showTable && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 mt-2">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        {showTable && tableRows ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-soft uppercase">
                <th className="text-left py-1.5 font-medium">{tableHeaders[0]}</th>
                <th className="text-right py-1.5 font-medium">{tableHeaders[1]}</th>
                <th className="text-right py-1.5 font-medium">{tableHeaders[2]}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.label} className="border-b border-line last:border-0">
                  <td className="py-1.5 text-ink">{r.label}</td>
                  <td className="py-1.5 text-right font-mono">{r.value}</td>
                  <td className="py-1.5 text-right font-mono text-ink-soft">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
