import * as React from "react";

import { FieldPicker } from "../hub/fieldPicker";
import { applyQuery, Field, formatCell, monthsRange, Preset, PRESETS, presetRange, SavedQuery, VIEWS } from "../hub/logic";
import { RulePreview } from "../hub/rulePreview";
import { customValid, DAYS, DEFAULTS, Env, inHost, MONTHS, plan, startConfig, usesCustom, WidgetConfig } from "./shared";

/** Özel aralığa geçerken boş tarihler o an görünen aralıkla doldurulur. */
function withDates(c: WidgetConfig): WidgetConfig {
  if (!usesCustom(c) || (c.from && c.to)) return c;
  const now = new Date();
  const shown = c.view === "trend" ? monthsRange(6, now) : presetRange("lastMonth", now);
  return { ...c, from: c.from || shown.from, to: c.to || shown.to };
}

function Form({ value, onChange, env }: { value: WidgetConfig; onChange: (v: WidgetConfig) => void; env: Env }) {
  const { source, t } = env;
  const [types, setTypes] = React.useState<string[]>([]);
  const [fields, setFields] = React.useState<Field[]>([]);
  const [stateList, setStateList] = React.useState<string[]>();
  const [error, setError] = React.useState<string>();
  const set = (patch: Partial<WidgetConfig>) => onChange(withDates({ ...value, ...patch }));
  const [shared, setShared] = React.useState<SavedQuery[]>();
  React.useEffect(() => {
    env.sharedQueries().then(setShared);
  }, [env]);
  const linked = value.queryId ? shared?.find((q) => q.id === value.queryId) : undefined;
  /** Sorguya bağlıyken alanlar sorgudan gelir; formdaki kendi değerler geri dönülürse diye saklanır. */
  const r = linked ? applyQuery(value, linked.settings) : value;
  const ranged = r.view === "summary" || r.view === "weekly" || r.view === "daily";

  React.useEffect(() => {
    Promise.all([source.types(), source.fields()]).then(([ts, fs]) => {
      setTypes(ts);
      setFields(fs);
    }, (e) => setError(String(e?.message ?? e)));
  }, [source]);

  // Tür değişince state listesi yenilenir; bu türde olmayan seçimler düşer. Varsayılan seçim yok, kullanıcı seçer.
  React.useEffect(() => {
    if (!value.type) return setStateList([]);
    let live = true;
    setStateList(undefined);
    source.states(value.type).then((info) => {
      if (!live) return;
      const names = info.map((s) => s.name);
      setStateList(names);
      const kept = value.states.filter((s) => names.includes(s));
      if (kept.length !== value.states.length) set({ states: kept });
    }, (e) => live && setError(String(e?.message ?? e)));
    return () => {
      live = false;
    };
  }, [source, value.type]);

  const byRef = new Map(fields.map((f) => [f.referenceName, f]));

  // Kural önizlemesi için kırılım alanının gerçek değerleri: widget'ın filtreleriyle tek sorgu.
  const [samples, setSamples] = React.useState<{ key: string; values: string[] }>();
  const req = plan(r, new Date());
  const sampleKey = JSON.stringify([r.conditions, r.projects, r.type, r.dateField, r.states, r.assignee, value.breakdown, req.from, req.to]);
  const wantSamples = value.view === "summary" && !!value.breakdown && !!r.type && !!r.dateField && r.states.length > 0;
  React.useEffect(() => {
    if (!wantSamples || samples?.key === sampleKey) return;
    let live = true;
    const timer = window.setTimeout(() => {
      source
        .run({ conditions: r.conditions, projects: r.projects, assignee: r.assignee, type: r.type, dateField: r.dateField, states: r.states, from: req.from, to: req.to, columns: [value.breakdown] })
        .then(
          (r) => live && setSamples({ key: sampleKey, values: r.rows.map((row) => formatCell(row[value.breakdown], byRef.get(value.breakdown)?.type)) }),
          () => undefined,
        );
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [source, sampleKey, wantSamples]);
  const toggle = (s: string) =>
    set({ states: value.states.includes(s) ? value.states.filter((x) => x !== s) : (stateList ?? []).filter((x) => x === s || value.states.includes(x)) });

  return (
    <div className="flc">
      {error && <div className="flw-error">{t.loadError(error)}</div>}
      <label className="flc-field">
        <span>{t.w.cfgView}</span>
        <select value={value.view} onChange={(e) => set({ view: e.target.value as WidgetConfig["view"] })}>
          {VIEWS.map((v) => (
            <option key={v} value={v}>
              {t.w.views[v]}
            </option>
          ))}
        </select>
      </label>
      <label className="flc-field">
        <span>{t.w.cfgSource}</span>
        <select value={value.queryId} onChange={(e) => set({ queryId: e.target.value })}>
          <option value="">{t.w.ownSettings}</option>
          {value.queryId && !linked && shared && <option value={value.queryId}>{t.w.queryMissing}</option>}
          {(shared ?? []).map((q) => (
            <option key={q.id} value={q.id}>
              {q.ownerName ? `${q.name} — ${q.ownerName}` : q.name}
            </option>
          ))}
        </select>
        <span className="flc-hint">{shared && shared.length === 0 ? t.w.noShared : t.w.sourceHint}</span>
      </label>
      {linked && (
        <div className="flc-field">
          <span>{t.w.fromQuery}</span>
          <span className="flc-hint">
            {[
              r.type,
              byRef.get(r.dateField)?.name ?? r.dateField,
              r.states.join(", "),
              ...(ranged ? [r.preset === "custom" ? `${r.from} – ${r.to}` : t.presets[r.preset]] : []),
              ...(r.assignee ? [t.assignees[r.assignee]] : []),
              ...(r.projects ? [t.scope(r.projects)] : []),
              ...(r.conditions ? [t.cond.count(r.conditions.length)] : []),
            ].join(" · ")}
          </span>
        </div>
      )}
      {!value.queryId && (<>
      <label className="flc-field">
        <span>{t.type}</span>
        <select value={value.type} onChange={(e) => set({ type: e.target.value, states: [] })}>
          <option value="">{t.choose}</option>
          {types.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </label>
      <div className="flc-field">
        <span>{t.dateField}</span>
        <FieldPicker
          id="flc-date"
          single
          fields={fields.filter((f) => f.type === "dateTime")}
          selected={byRef.get(value.dateField)}
          placeholder={t.searchDateField}
          empty={t.noMatch}
          onPick={(ref) => set({ dateField: ref })}
        />
      </div>
      </>)}
      {!value.queryId && (value.view === "summary" || value.view === "weekly" || value.view === "daily") && (
        <label className="flc-field">
          <span>{t.w.cfgRange}</span>
          <select value={value.preset} onChange={(e) => set({ preset: e.target.value as Preset })}>
            {PRESETS.map((p) => (
              <option key={p} value={p}>
                {t.presets[p]}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.view === "trend" && (
        <label className="flc-field">
          <span>{t.w.cfgMonths}</span>
          <select value={value.months} onChange={(e) => set({ months: Number(e.target.value) })}>
            {MONTHS.map((n) => (
              <option key={n} value={n}>
                {t.w.months(n)}
              </option>
            ))}
            <option value={0}>{t.w.customRange}</option>
          </select>
        </label>
      )}
      {usesCustom(value) && !(value.queryId && ranged) && (
        <div className="flc-row">
          <label className="flc-field">
            <span>{t.from}</span>
            <input type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="flc-field">
            <span>{t.to}</span>
            <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} />
          </label>
        </div>
      )}
      {usesCustom(value) && !(value.queryId && ranged) && !customValid(value) && <span className="flc-hint flw-error">{t.need.range}</span>}
      {value.view === "upcoming" && (
        <label className="flc-field">
          <span>{t.w.cfgDays}</span>
          <select value={value.days} onChange={(e) => set({ days: Number(e.target.value) })}>
            {DAYS.map((n) => (
              <option key={n} value={n}>
                {t.w.nextDays(n)}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.view === "summary" && (
        <div className="flc-field">
          <span>{t.w.cfgBreakdown}</span>
          <div className="flc-inline">
            <FieldPicker
              id="flc-breakdown"
              single
              fields={fields.filter((f) => f.referenceName !== value.dateField)}
              selected={byRef.get(value.breakdown)}
              placeholder={t.w.searchField}
              empty={t.noMatch}
              onPick={(ref) => set({ breakdown: ref })}
            />
            {value.breakdown && (
              <button className="flc-clear" onClick={() => set({ breakdown: "" })}>
                {t.w.clear}
              </button>
            )}
          </div>
          <span className="flc-hint">{t.w.breakdownHint}</span>
        </div>
      )}
      {value.view === "summary" && value.breakdown && (
        <div className="flc-field">
          <span>{t.w.cfgRule}</span>
          <input
            className="fl-input fl-mono"
            value={value.breakdownRule}
            placeholder={t.rule.example}
            spellCheck={false}
            onChange={(e) => set({ breakdownRule: e.target.value })}
          />
          <span className="flc-hint">{t.w.ruleHint}</span>
          <RulePreview pattern={value.breakdownRule} values={samples?.key === sampleKey ? samples.values : undefined} t={t} pending={t.loading} />
        </div>
      )}
      {!value.queryId && <fieldset className="flc-states">
        <legend>{t.states}</legend>
        {!value.type ? (
          <span className="flc-hint">{t.need.type}</span>
        ) : !stateList ? (
          <span className="flc-hint">{t.loading}</span>
        ) : (
          stateList.map((s) => (
            <label key={s} className="flc-check">
              <input type="checkbox" checked={value.states.includes(s)} onChange={() => toggle(s)} />
              {s}
            </label>
          ))
        )}
      </fieldset>}
    </div>
  );
}

// Dashboard dışında (npm run dev) form örnek bir türle açılır.
startConfig("report-widget-config", inHost ? DEFAULTS : { ...DEFAULTS, type: "Kart", dateField: "Custom.TargetDate" }, Form);
