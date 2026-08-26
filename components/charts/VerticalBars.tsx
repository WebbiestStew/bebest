'use client';

import { useEffect, useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

export function VerticalBars({
  data,
  height = 180,
  unit = 'pacientes',
  axisLabelFormatter,
}: {
  data: BarDatum[];
  height?: number;
  unit?: string;
  axisLabelFormatter?: (label: string) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (data.length === 0 || total === 0) {
    return <div className="text-sm text-ink-soft italic py-8 text-center">Sin datos para este periodo.</div>;
  }

  return (
    <div className="relative">
      <div
        className="flex items-end gap-1.5 border-b border-line"
        style={{ height }}
        role="img"
        aria-label={`Gráfica de barras: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
      >
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          const barHeightPct = (d.value / max) * 100;
          const isHovered = hovered === i;
          const label = axisLabelFormatter ? axisLabelFormatter(d.label) : d.label;

          return (
            <div
              key={d.label}
              className="flex-1 min-w-0 flex flex-col items-center justify-end h-full outline-none cursor-pointer group"
              tabIndex={0}
              role="button"
              aria-label={`${d.label}: ${d.value} ${unit} (${pct}%)`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
            >
              <div
                className="text-[11px] font-mono text-ink mb-1 transition-opacity duration-300"
                style={{ opacity: grown ? (isHovered ? 1 : 0.85) : 0, transitionDelay: `${Math.min(i, 15) * 30 + 200}ms` }}
              >
                {d.value}
              </div>
              <div
                className="w-full max-w-[28px] rounded-t-[4px]"
                style={{
                  height: `${grown ? Math.max(barHeightPct, 1.5) : 0}%`,
                  backgroundColor: d.color,
                  opacity: isHovered ? 1 : 0.92,
                  filter: isHovered ? 'brightness(1.06)' : 'none',
                  transition: `height 550ms cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 15) * 30}ms, opacity 150ms ease, filter 150ms ease`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-1.5 mt-1.5">
        {data.map((d, i) => {
          const label = axisLabelFormatter ? axisLabelFormatter(d.label) : d.label;
          return (
            <div key={d.label} className="flex-1 min-w-0 text-center">
              <span className="text-[10px] text-ink-soft leading-tight break-words">{label}</span>
            </div>
          );
        })}
      </div>

      {hovered !== null && (
        <div
          className="absolute pointer-events-none bg-ink text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10 animate-fade-in"
          style={{
            left: `${((hovered + 0.5) / data.length) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -110%)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-mono font-semibold text-sm">
            {data[hovered].value} {unit}
          </div>
          <div className="text-white/70">
            {data[hovered].label} · {total ? Math.round((data[hovered].value / total) * 100) : 0}%
          </div>
        </div>
      )}
    </div>
  );
}
