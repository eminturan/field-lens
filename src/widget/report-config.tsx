import * as React from "react";

import { FieldPicker } from "../hub/fieldPicker";
import { applyQuery, Assignee, fold, Projects, Field, formatCell, monthsRange, Preset, PRESETS, presetRange, SavedQuery, VIEWS } from "../hub/logic";
import { RulePreview } from "../hub/rulePreview";
import { ConditionsEditor } from "../hub/conditions";
import { Help } from "../hub/help";
import { Icon, IconName } from "../hub/icons";
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
  const [stateColors, setStateColors] = React.useState<Record<string, string>>({});
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

  const [projectNames, setProjectNames] = React.useState<string[]>([]);
  const [projectSearch, setProjectSearch] = React.useState("");
  const projectsKey = JSON.stringify(value.projects ?? null);
  React.useEffect(() => {
    source.fields().then(setFields, (e) => setError(String(e?.message ?? e)));
    source.projects().then(setProjectNames, () => undefined);
  }, [source]);
  // Tür listesi widget'ın proje kapsamına göre; kapsamda olmayan tür seçimi düşer.
  React.useEffect(() => {
    if (Array.isArray(value.projects) && value.projects.length === 0) return;
    let live = true;
    source.types(value.projects).then((ts) => {
      if (!live) return;
      setTypes(ts);
      if (value.type && !ts.includes(value.type)) set({ type: "", states: [] });
    }, (e) => live && setError(String(e?.message ?? e)));
    return () => {
      live = false;
    };
  }, [source, projectsKey]);
  const scope = value.projects === undefined ? "this" : value.projects === "all" ? "all" : "some";
  const chooseScope = (s: string) => set({ projects: s === "this" ? undefined : s === "all" ? "all" : [] });
  const toggleProject = (n: string) =>
    Array.isArray(value.projects) &&
    set({ projects: value.projects.includes(n) ? value.projects.filter((x) => x !== n) : projectNames.filter((x) => x === n || value.projects!.includes(x)) });

  // Tür değişince state listesi yenilenir; bu türde olmayan seçimler düşer. Varsayılan seçim yok, kullanıcı seçer.
  React.useEffect(() => {
    if (!value.type) return setStateList([]);
    if (Array.isArray(value.projects) && value.projects.length === 0) return;
    let live = true;
    setStateList(undefined);
    source.states(value.type, value.projects).then((info) => {
      if (!live) return;
      const names = info.map((s) => s.name);
      setStateList(names);
      setStateColors(Object.fromEntries(info.map((s) => [s.name, s.color])));
      const kept = value.states.filter((s) => names.includes(s));
      if (kept.length !== value.states.length) set({ states: kept });
    }, (e) => live && setError(String(e?.message ?? e)));
    return () => {
      live = false;
    };
  }, [source, value.type, projectsKey]);

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

  const sec = (icon: IconName, color: string, title: string, children: React.ReactNode) => (
    <fieldset className="flc-sec">
      <legend className="flc-sec-head">
        <span className="flc-sec-icon" style={{ "--flc-c": color } as React.CSSProperties}>
          <Icon name={icon} size={13} />
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
  const own = !value.queryId;
  const showTime = own || value.view === "trend" || value.view === "upcoming" || (usesCustom(value) && !(value.queryId && ranged));

  return (
    <div className="flc">
      {error && <div className="flw-error">{t.loadError(error)}</div>}
      {sec(
        "layout",
        "#0078d4",
        t.sections.view,
        <>
          <div className="flc-field">
            <span className="fl-segment" role="group" aria-label={t.w.cfgView}>
              {VIEWS.map((v) => (
                <button key={v} type="button" aria-pressed={value.view === v} onClick={() => set({ view: v })}>
                  {t.w.views[v]}
                </button>
              ))}
            </span>
          </div>
          <label className="flc-field">
            <span className="flc-label">
              {t.w.cfgSource}
              <Help text={t.w.sourceHint} label={t.help.label} />
            </span>
            <select value={value.queryId} onChange={(e) => set({ queryId: e.target.value })}>
              <option value="">{t.w.ownSettings}</option>
              {value.queryId && !linked && shared && <option value={value.queryId}>{t.w.queryMissing}</option>}
              {(shared ?? []).map((q) => (
                <option key={q.id} value={q.id}>
                  {q.ownerName ? `${q.name} — ${q.ownerName}` : q.name}
                </option>
              ))}
            </select>
            {shared && shared.length === 0 && <span className="flc-hint">{t.w.noShared}</span>}
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
      {value.view === "summary" && (
        <div className="flc-field">
          <span className="flc-label">
            {t.w.cfgBreakdown}
            <Help text={t.w.breakdownHint} label={t.help.label} />
          </span>
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
        </>,
      )}
      {own &&
        sec(
          "target",
          "#8764b8",
          t.sections.scope,
          <>
            <div className="flc-field">
              <span className="flc-label">
                {t.projects}
                <Help text={t.help.projects} label={t.help.label} />
              </span>
              <span className="fl-segment" role="group" aria-label={t.projects}>
                <button type="button" aria-pressed={scope === "this"} onClick={() => chooseScope("this")}>
                  {t.projectModes.this}
                </button>
                <button type="button" aria-pressed={scope === "all"} onClick={() => chooseScope("all")}>
                  {t.projectModes.all}
                </button>
                {projectNames.length > 0 && (
                  <button type="button" aria-pressed={scope === "some"} onClick={() => scope !== "some" && chooseScope("some")}>
                    {t.projectModes.some}
                  </button>
                )}
              </span>
              {scope === "all" && <span className="flc-hint">{t.allProjectsHint}</span>}
            </div>
      {Array.isArray(value.projects) && (
        <div className="flc-field">
          <input className="fl-input" placeholder={t.searchProject} value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
          <div className="flc-projects">
            {projectNames
              .filter((n) => fold(n).includes(fold(projectSearch.trim())))
              .map((n) => (
                <label key={n} className="flc-check">
                  <input type="checkbox" checked={value.projects!.includes(n)} onChange={() => toggleProject(n)} />
                  {n}
                </label>
              ))}
          </div>
          {value.projects.length === 0 && <span className="flc-hint flw-error">{t.need.projects}</span>}
        </div>
      )}
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
              <span className="flc-label">
                {t.assignee}
                <Help text={t.help.assignee} label={t.help.label} />
              </span>
              <span className="fl-segment" role="group" aria-label={t.assignee}>
                {([undefined, "me", "none"] as const).map((a) => (
                  <button key={a ?? "all"} type="button" aria-pressed={value.assignee === a} onClick={() => set({ assignee: a as Assignee | undefined })}>
                    {t.assignees[a ?? "all"]}
                  </button>
                ))}
              </span>
            </div>
          </>,
        )}
      {showTime &&
        sec(
          "calendar",
          "#008272",
          t.sections.time,
          <>
      {own && (<>
      <div className="flc-field">
        <span className="flc-label">
          {t.dateField}
          <Help text={t.help.dateField} label={t.help.label} />
        </span>
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
          </>,
        )}
      {own &&
        sec(
          "filter",
          "#ca5010",
          t.sections.filter,
          <>
            <div className="flc-field">
              <span>{t.states}</span>
              {!value.type ? (
                <span className="flc-hint">{t.need.type}</span>
              ) : !stateList ? (
                <span className="flc-hint">{t.loading}</span>
              ) : (
                <div className="flc-chips">
                  {stateList.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="fl-state-chip"
                      aria-pressed={value.states.includes(s)}
                      onClick={() => toggle(s)}
                      style={{ "--fl-state": stateColors[s] || undefined } as React.CSSProperties}
                    >
                      <span className="fl-dot" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
      {!value.queryId && (
        <ConditionsEditor
          value={value.conditions ?? []}
          onChange={(cs) => set({ conditions: cs.length ? cs : undefined })}
          fields={fields}
          t={t.cond}
          searchField={t.w.searchField}
          noMatch={t.noMatch}
          help={<Help text={t.help.conditions} label={t.help.label} />}
        />
      )}
          </>,
        )}
    </div>
  );
}

// Dashboard dışında (npm run dev) form örnek bir türle açılır.
startConfig("report-widget-config", inHost ? DEFAULTS : { ...DEFAULTS, type: "Kart", dateField: "Custom.TargetDate" }, Form);
