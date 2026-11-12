import * as React from "react";
import { crossCount, Field, Row } from "./logic";

interface Props {
  rows: Row[];
  col: Field;
  /** Çubuktaki state sırası ve renkleri. */
  states: string[];
  colors: Record<string, string>;
  tip: string;
  blank: string;
  /** Bir değere tıklanınca (boş olmayan değerler için). */
  onPick(value: string): void;
}

/** Seçilen kolonun her değeri için bir satır: sayı ve state'lere bölünmüş yatay çubuk, en büyük önce. */
export function GroupSummary({ rows, col, states, colors, tip, blank, onPick }: Props) {
  const groups = React.useMemo(() => crossCount(rows, col), [rows, col]);
  const max = groups[0]?.total ?? 1;
  return (
    <div className="fl-grp-list" title={tip}>
      {groups.map((g) => (
        <button
          key={g.value}
          className="fl-grp"
          disabled={!g.value}
          onClick={() => onPick(g.value)}
          title={[g.value || blank, ...states.filter((s) => g.counts[s]).map((s) => `${s}: ${g.counts[s]}`)].join("\n")}
        >
          <span className="fl-grp-name">{g.value || blank}</span>
          <span className="fl-grp-track">
            <span className="fl-grp-fill" style={{ width: `${(g.total / max) * 100}%` }}>
              {states.map((s) => (g.counts[s] ? <span key={s} style={{ flex: g.counts[s], background: colors[s] || "#8a8a8a" }} /> : null))}
            </span>
          </span>
          <span className="fl-grp-n">{g.total}</span>
        </button>
      ))}
    </div>
  );
}
