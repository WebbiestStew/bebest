'use client';

import { useEffect, useState } from 'react';

export interface RankedDatum {
  label: string;
  value: number;
}

export function RankedBars({
  data,
  color,
  unit = 'pacientes',
}: {
  data: RankedDatum[];
  color: string;
  unit?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (data.length === 0) {
    return <div className="text-sm text-ink-soft italic py-8 text-center">Sin datos para este periodo.</div>;
  }

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = total ? Math.round((d.value / total) * 100) : 0;
        const widthPct = (d.value / max) * 100;
        const isHovered = hovered === i;
        return (
          <div
            key={d.label}
            tabIndex={0}
            role="button"
            aria-label={`${d.label}: ${d.value} ${unit} (${pct}%)`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            className="group outline-none"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-ink truncate max-w-[65%]">{d.label}</span>
              <span className="text-xs font-mono text-ink-soft">
                {d.value} <span className="text-ink-soft/60">· {pct}%</span>
              </span>
            </div>
            <div className="h-2.5 bg-line/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${grown ? Math.max(widthPct, 2) : 0}%`,
                  backgroundColor: color,
                  opacity: isHovered ? 1 : 0.85,
                  filter: isHovered ? 'brightness(1.08)' : 'none',
                  transition: `width 550ms cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 15) * 25}ms, opacity 150ms ease, filter 150ms ease`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
