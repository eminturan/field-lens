import * as React from "react";
import { FieldPicker } from "./fieldPicker";
import { ConditionStrings } from "./i18n";
import { checkCondition, Condition, Field, opsFor } from "./logic";

interface Props {
  value: Condition[];
  onChange(value: Condition[]): void;
  fields: Field[];
  t: ConditionStrings;
  searchField: string;
  noMatch: string;
}

/** Alan türüne göre değer kutusu: tarih, sayı, evet/hayır ya da metin. */
function ValueInput({ c, set, t }: { c: Condition; set: (v: string) => void; t: ConditionStrings }) {
  if (c.type === "boolean")
    return (
      <select className="fl-input" value={c.value} onChange={(e) => set(e.target.value)}>
        <option value="true">{t.yes}</option>
        <option value="false">{t.no}</option>
      </select>
    );
  const type = c.type === "dateTime" ? "date" : c.type === "integer" || c.type === "double" ? "number" : "text";
  return <input className="fl-input fl-cond-value" type={type} value={c.value} placeholder={t.valuePlaceholder} onChange={(e) => set(e.target.value)} />;
}

/** Ek alan koşulları: her satır alan, koşul türü ve değer; hepsi VE ile bağlanır. */
export function ConditionsEditor({ value, onChange, fields, t, searchField, noMatch }: Props) {
  const byRef = new Map(fields.map((f) => [f.referenceName, f]));
  const update = (i: number, patch: Partial<Condition>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const pick = (i: number, ref: string) => {
    const type = byRef.get(ref)?.type ?? "string";
    update(i, { field: ref, type, op: opsFor(type)[0], value: type === "boolean" ? "true" : "" });
  };

  return (
    <div className="fl-field">
      <span className="fl-muted">{t.title}</span>
      {value.map((c, i) => (
        <div key={i} className="fl-cond">
          <FieldPicker id={`fl-cond-${i}`} single fields={fields} selected={byRef.get(c.field)} placeholder={searchField} empty={noMatch} onPick={(ref) => pick(i, ref)} />
          {c.field && (
            <>
              <select className="fl-input" value={c.op} onChange={(e) => update(i, { op: e.target.value as Condition["op"] })}>
                {opsFor(c.type).map((op) => (
                  <option key={op} value={op}>
                    {t.ops[op]}
                  </option>
                ))}
              </select>
              <ValueInput c={c} set={(v) => update(i, { value: v })} t={t} />
            </>
          )}
          <button className="fl-button" aria-label={t.remove} title={t.remove} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            ×
          </button>
          {c.field && checkCondition(c) === "value" && <span className="fl-qerror">{t.badValue}</span>}
        </div>
      ))}
      <button className="fl-button fl-cond-add" onClick={() => onChange([...value, { field: "", type: "string", op: "=", value: "" }])}>
        {t.add}
      </button>
    </div>
  );
}
