import * as React from "react";

import { Strings } from "./i18n";
import { applyRule, compileRule } from "./logic";

/** Önizlemede gösterilen en fazla farklı değer. */
const SAMPLES = 6;

/** Kuralın gerçek değerlere uygulanmış hali: "değer → sonuç". values undefined ise henüz veri yok; o zaman `pending` yazılır. */
export function RulePreview({ pattern, values, t, pending }: { pattern: string; values?: string[]; t: Strings; pending?: string }) {
  if (!pattern.trim()) return null;
  const re = compileRule(pattern);
  if (typeof re === "string") return <div className="fl-rule-error">{t.rule.invalid(re)}</div>;
  if (!values) return <div className="fl-rule-hint">{pending ?? t.rule.needData}</div>;
  const samples = [...new Set(values.filter(Boolean))].slice(0, SAMPLES);
  if (samples.length === 0) return <div className="fl-rule-hint">{t.rule.noValues}</div>;
  return (
    <ul className="fl-rule-preview" aria-label={t.rule.preview}>
      {samples.map((v) => {
        const out = applyRule(v, re);
        return (
          <li key={v}>
            <span className="fl-rule-in">{v}</span>
            <span aria-hidden="true">→</span>
            <span className={out === undefined ? "fl-rule-miss" : "fl-rule-out"}>{out ?? t.rule.unmatched}</span>
          </li>
        );
      })}
    </ul>
  );
}
