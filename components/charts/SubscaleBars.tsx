'use client';

import { useEffect, useState } from 'react';
import { SubscaleResult } from '@/lib/psychTests';

// A profile chart for a scored psychological test: one bar per subscale,
// filled to that subscale's own percent-of-its-own-range — NOT relative to
// the other subscales' raw values, which is what the app's existing bar
// charts (RankedBars/VerticalBars) do and would be meaningless here, since
// DERS's subscales alone span three different max values (25/30/40).
//
// Bars share one neutral brand color rather than a red/green severity scale
// on purpose: "higher is worse" is true for DERS/BIS-11/Ellis/PSQ, but false
// for Coopersmith (higher self-esteem is good) and mixed within COPE/CRI-A
// (some coping styles are adaptive at high scores, others aren't) — nothing
// here knows that direction per subscale, so the band's own text label
// (already computed correctly per test) carries the clinical meaning, and
// the bar itself just shows relative magnitude/profile shape at a glance.
export function SubscaleBars({
  subscales,
  total,
}: {
  subscales: SubscaleResult[];
  total?: SubscaleResult;
}) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const rows = total ? [{ ...total, isTotal: true }, ...subscales.map((s) => ({ ...s, isTotal: false }))] : subscales.map((s) => ({ ...s, isTotal: false }));

  return (
    <div className="space-y-3">
      {rows.map((s, i) => {
        const pct = Math.max(0, Math.min(1, s.percent)) * 100;
        const scoreText = s.tScore !== undefined ? `T=${s.tScore}` : `${s.raw}/${s.max}`;
        return (
          <div key={s.id}>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className={`text-sm truncate ${s.isTotal ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                {s.label}
              </span>
              <span className="text-xs font-mono text-ink-soft shrink-0">
                {scoreText}
                {s.band ? <span className="text-ink-soft/70"> · {s.band}</span> : null}
              </span>
            </div>
            <div className={`rounded-full overflow-hidden bg-line/50 ${s.isTotal ? 'h-3' : 'h-2'}`}>
              <div
                className={`h-full rounded-full ${s.isTotal ? 'bg-sage-deep' : 'bg-sage'}`}
                style={{
                  width: `${grown ? Math.max(pct, 2) : 0}%`,
                  transition: `width 550ms cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 15) * 40}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
