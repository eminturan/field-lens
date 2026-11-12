import "./chart.css";

import * as React from "react";

/** "2026-10-07" → "07.10" */
export const shortDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
/** "2026-10-07" → "07.10.2026" */
export const fullDay = (d: string) => `${shortDay(d)}.${d.slice(0, 4)}`;
/** Hafta etiketi: "13–19.10", ay değişiyorsa "29.09–05.10". */
export const weekLabel = (start: string, end: string) =>
  start.slice(5, 7) === end.slice(5, 7) ? `${start.slice(8, 10)}–${shortDay(end)}` : `${shortDay(start)}–${shortDay(end)}`;

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
  const max = Math.max(1, ...bars.map((b) => b.total));
  const slot = W / Math.max(1, bars.length);
  const bar = Math.min(48, slot * 0.7);
  // Etiketler üst üste binmesin: en uzun etiketin genişliği 11px yazıda karakter başına ~6.5 birim.
  const longest = Math.max(1, ...bars.map((b) => b.label.length));
  const flat = longest * 6.5 + 6 <= slot;
  // Yan yana sığmıyorsa 45° çapraz yazılır; çaprazda her etiket yalnızca ~13 birim yatay yer ister.
  const rotate = !flat;
  const labelEvery = flat ? 1 : Math.max(1, Math.ceil(13 / slot));
  const bottom = rotate ? Math.round(longest * 6.5 * 0.71) + 12 : 22;
  // Çapraz etiket sola doğru uzar; ilki kesilmesin diye solda pay bırakılır.
  const pad = rotate ? Math.max(0, Math.round(longest * 6.5 * 0.71 - slot / 2)) : 0;
  // Sayılar ancak çubuğun üstüne sığıyorsa yazılır; değer her durumda çubuğun ipucunda.
  const longestNum = Math.max(...bars.map((b) => String(b.total).length));
  const showNums = longestNum * 6.5 + 10 <= slot;
  // Kenardaki etiketler kesilmesin.
  const labelX = (x: number, text: string) => Math.min(Math.max(x, (text.length * 6.5) / 2), W - (text.length * 6.5) / 2);
  const scale = (n: number) => (n / max) * (H - top - bottom);
  return (
    <svg className="fl-chart" viewBox={`${-pad} 0 ${W + pad} ${H}`} role="img" aria-label={label}>
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
            {showNums && b.total > 0 && (
              <text x={x + bar / 2} y={y - 4} textAnchor="middle" className="fl-chart-num">
                {b.total}
              </text>
            )}
            {i % labelEvery === 0 &&
              (rotate ? (
                <text
                  x={x + bar / 2 + 4}
                  y={H - bottom + 12}
                  textAnchor="end"
                  transform={`rotate(-45 ${x + bar / 2 + 4} ${H - bottom + 12})`}
                  className="fl-chart-label"
                >
                  {b.label}
                </text>
              ) : (
                <text x={labelX(x + bar / 2, b.label)} y={H - 6} textAnchor="middle" className="fl-chart-label">
                  {b.label}
                </text>
              ))}
          </g>
        );
      })}
    </svg>
  );
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Halka dilimi: dış yarıçap r, iç yarıçap ri, a0→a1 radyan (0 = saat 12, saat yönünde). */
function arc(r: number, ri: number, a0: number, a1: number) {
  const p = (rad: number, a: number) => `${(rad * Math.sin(a)).toFixed(2)} ${(-rad * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${p(ri, a0)} Z`;
}

/** Ortasında toplam yazan halka grafik; yeterince büyük dilimlerde sayı yazar. */
export function Donut({ slices, label }: { slices: Slice[]; label: string }) {
  const R = 100;
  const RI = 58;
  const total = slices.reduce((n, s) => n + s.value, 0);
  let a = 0;
  return (
    <svg className="fl-donut" viewBox="-102 -102 204 204" role="img" aria-label={label}>
      {slices.map((s) => {
        // Tam daire tek yayla çizilemez; tek dilimde bitişi bir tık geride bırakılır.
        const sweep = Math.min((s.value / total) * Math.PI * 2, Math.PI * 2 - 0.0001);
        const a0 = a;
        a += (s.value / total) * Math.PI * 2;
        const mid = a0 + sweep / 2;
        const rm = (R + RI) / 2;
        return (
          <g key={s.label}>
            <title>{`${s.label}: ${s.value}`}</title>
            <path d={arc(R, RI, a0, a0 + sweep)} fill={s.color} stroke="var(--background-color, #fff)" strokeWidth={1} />
            {sweep > 0.4 && (
              <text x={rm * Math.sin(mid)} y={-rm * Math.cos(mid) + 4} textAnchor="middle" className="fl-donut-num">
                {s.value}
              </text>
            )}
          </g>
        );
      })}
      <text x={0} y={14} textAnchor="middle" className="fl-donut-total">
        {total}
      </text>
    </svg>
  );
}
