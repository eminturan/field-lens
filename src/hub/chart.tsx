import "./chart.css";

import * as React from "react";

/** "2026-10-07" → "07.10" */
export const shortDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
/** "2026-10-07" → "07.10.2026" */
export const fullDay = (d: string) => `${shortDay(d)}.${d.slice(0, 4)}`;

export interface Bar {
  start: string;
  label: string;
  tip: string;
  total: number;
  counts: Record<string, number>;
}

/** State renklerinde yığılmış dikey çubuklar; sıra verilen state sırası. Hub ve widget ortak kullanır. */
export function StackChart({ bars, states, colors, label, height = 150 }: { bars: Bar[]; states: string[]; colors: Record<string, string>; label: string; height?: number }) {
  const W = 640;
  const H = height;
  const top = 18;
  const bottom = 22;
  const max = Math.max(1, ...bars.map((b) => b.total));
  const slot = W / Math.max(1, bars.length);
  const bar = Math.min(48, slot * 0.7);
  const labelEvery = Math.ceil(bars.length / 12);
  const scale = (n: number) => (n / max) * (H - top - bottom);
  return (
    <svg className="fl-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} className="fl-axis" />
      {bars.map((b, i) => {
        const x = i * slot + (slot - bar) / 2;
        let y = H - bottom;
        return (
          <g key={b.start}>
            <title>{b.tip}</title>
            {states.map((s) => {
              const h = scale(b.counts[s] ?? 0);
              if (!h) return null;
              y -= h;
              return <rect key={s} x={x} y={y} width={bar} height={h} fill={colors[s] || "#8a8a8a"} />;
            })}
            {b.total > 0 && (
              <text x={x + bar / 2} y={y - 4} textAnchor="middle" className="fl-chart-num">
                {b.total}
              </text>
            )}
            {i % labelEvery === 0 && (
              <text x={x + bar / 2} y={H - 6} textAnchor="middle" className="fl-chart-label">
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
