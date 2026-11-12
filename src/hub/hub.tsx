import "azure-devops-ui/Core/override.css";
import "./hub.css";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  ILocationService,
  IProjectPageService,
} from "azure-devops-extension-api/Common/CommonServices";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Page } from "azure-devops-ui/Page";

import { createRestSource, DataSource, RunResult } from "./api";
import { FieldPicker } from "./fieldPicker";
import { firstOf, pickLang, Strings, STRINGS } from "./i18n";
import {
  busiestDay,
  countStates,
  csvRows,
  filterRows,
  DEFAULT_COLUMNS,
  Field,
  formatCell,
  moveItem,
  pageSlice,
  Preset,
  PRESETS,
  presetRange,
  previousRange,
  Query,
  sanitizeSettings,
  sortRows,
  Settings,
  toCsv,
  WeekBucket,
  weekBuckets,
} from "./logic";
import { mockSource } from "./mock";

const PAGE_SIZE = 100;
const DEFAULT_PRESET: Exclude<Preset, "custom"> = "thisMonth";

/** Kullanıcı seçimlerinin saklandığı yer. */
interface Store {
  load(): Promise<Settings | undefined>;
  save(s: Settings): Promise<void>;
}

interface Props {
  source: DataSource;
  store: Store;
  mock: boolean;
  t: Strings;
  itemUrl: (id: number) => string;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Metni dosya olarak indirir. Baştaki BOM, Excel'in Türkçe karakterleri doğru okuması içindir. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Sorgu çalışırken kartların ve tablonun yerinde gri yer tutucular. */
function Skeleton({ cards, cols, label }: { cards: number; cols: number; label: string }) {
  return (
    <div className="fl-skeleton" role="status" aria-busy="true">
      <span className="fl-sr">{label}</span>
      <div className="fl-summary" aria-hidden="true">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="fl-card fl-card-ghost">
            <span className="fl-bone" style={{ width: 48, height: 24 }} />
            <span className="fl-bone" style={{ width: 72 }} />
          </div>
        ))}
      </div>
      <div className="fl-scroll" aria-hidden="true">
        <table className="fl-table">
          <tbody>
            {Array.from({ length: 8 }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => (
                  <td key={c}>
                    <span className="fl-bone" style={{ width: `${40 + ((r * 7 + c * 13) % 50)}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DENSITY_KEY = "field-lens-density";
const readDense = () => {
  try {
    return localStorage.getItem(DENSITY_KEY) === "compact";
  } catch {
    return false;
  }
};

/** "2026-10-07" → "07.10" */
const shortDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
/** "2026-10-07" → "07.10.2026" */
const fullDay = (d: string) => `${shortDay(d)}.${d.slice(0, 4)}`;

/** Haftalara göre yığılmış çubuklar; renkler panodaki state renkleri, sıra sorgudaki state sırası. */
function WeekChart({ buckets, states, colors, t }: { buckets: WeekBucket[]; states: string[]; colors: Record<string, string>; t: Strings }) {
  const W = 640;
  const H = 150;
  const top = 18;
  const bottom = 22;
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const slot = W / buckets.length;
  const bar = Math.min(48, slot * 0.7);
  const labelEvery = Math.ceil(buckets.length / 12);
  const scale = (n: number) => (n / max) * (H - top - bottom);
  return (
    <svg className="fl-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.weekly}>
      <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} className="fl-axis" />
      {buckets.map((b, i) => {
        const x = i * slot + (slot - bar) / 2;
        let y = H - bottom;
        return (
          <g key={b.start}>
            <title>{t.weekTip(shortDay(b.start), shortDay(b.end), b.total)}</title>
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
                {shortDay(b.start)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function App({ source, store, mock, t, itemUrl }: Props) {
  const [reload, setReload] = React.useState(0);
  const [loadError, setLoadError] = React.useState<string>();
  const [types, setTypes] = React.useState<string[]>();
  const [fields, setFields] = React.useState<Field[]>([]);
  const [stateList, setStateList] = React.useState<string[]>([]);
  /** stateList'in ait olduğu tür; farklıysa liste yükleniyor demektir ve sorgu çalıştırılmaz. */
  const [statesType, setStatesType] = React.useState("");
  /** State adı → panodaki rengi. */
  const [stateColors, setStateColors] = React.useState<Record<string, string>>({});

  const [type, setType] = React.useState("");
  const [dateField, setDateField] = React.useState("");
  const [preset, setPreset] = React.useState<Preset>(DEFAULT_PRESET);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [states, setStates] = React.useState<string[]>([]);
  const [columns, setColumns] = React.useState<string[]>(DEFAULT_COLUMNS);

  const [running, setRunning] = React.useState(false);
  const [runError, setRunError] = React.useState<string>();
  const [result, setResult] = React.useState<{ query: Query; data: RunResult }>();
  const [page, setPage] = React.useState(0);
  /** Özet kartına tıklanınca tablo ve CSV yalnızca bu state'i gösterir. */
  const [stateFilter, setStateFilter] = React.useState<string>();
  /** Sonuçlar içinde arama: tüm kolonlarda ve kolon bazında; sıralama tablo başlığından. */
  const [search, setSearch] = React.useState("");
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [sort, setSort] = React.useState<{ ref: string; dir: "asc" | "desc" }>();
  /** Sonuç gelince filtre paneli tek satırlık rapor başlığına iner. */
  const [collapsed, setCollapsed] = React.useState(false);
  const [prevCount, setPrevCount] = React.useState<number>();
  const runId = React.useRef(0);
  const [dense, setDense] = React.useState(readDense);
  const chooseDense = (v: boolean) => {
    setDense(v);
    try {
      localStorage.setItem(DENSITY_KEY, v ? "compact" : "comfortable");
    } catch {
      // saklanamıyor; seçim bu oturumla sınırlı
    }
  };
  const [drag, setDrag] = React.useState<{ from: number; over: number }>();
  /** Klavyeyle taşınan etiket; yeniden çizimden sonra odak onda kalsın. */
  const focusChip = React.useRef<string>();
  React.useEffect(() => {
    if (!focusChip.current) return;
    document.querySelector<HTMLElement>(`.fl-chip[data-ref="${CSS.escape(focusChip.current)}"]`)?.focus();
    focusChip.current = undefined;
  }, [columns]);

  // İlk yükleme: türler, alanlar ve kayıtlı seçimler.
  React.useEffect(() => {
    let live = true;
    setLoadError(undefined);
    setTypes(undefined);
    Promise.all([source.types(), source.fields(), store.load().catch(() => undefined)])
      .then(([ts, fs, saved]) => {
        if (!live) return;
        const s = sanitizeSettings(saved, ts, fs);
        setTypes(ts);
        setFields(fs);
        setType(s.type ?? (ts.length === 1 ? ts[0] : ""));
        setDateField(s.dateField ?? "");
        const p = s.preset ?? DEFAULT_PRESET;
        setPreset(p);
        const range =
          p !== "custom" ? presetRange(p, new Date()) : s.from && s.to ? { from: s.from, to: s.to } : presetRange(DEFAULT_PRESET, new Date());
        setFrom(range.from);
        setTo(range.to);
        setStates(s.states ?? []);
        if (s.columns?.length) setColumns(s.columns);
      })
      .catch((e) => live && setLoadError(message(e)));
    return () => {
      live = false;
    };
  }, [source, store, reload]);

  // Tür değişince state listesi yenilenir; seçimde yalnızca bu türde olanlar kalır.
  React.useEffect(() => {
    if (!type) return setStateList([]);
    let live = true;
    source
      .states(type)
      .then((info) => {
        if (!live) return;
        const list = info.map((s) => s.name);
        setStateList(list);
        setStateColors(Object.fromEntries(info.map((s) => [s.name, s.color])));
        setStatesType(type);
        setStates((prev) => prev.filter((s) => list.includes(s)));
      })
      .catch((e) => live && setLoadError(message(e)));
    return () => {
      live = false;
    };
  }, [source, type, reload]);

  const byRef = React.useMemo(() => new Map(fields.map((f) => [f.referenceName, f])), [fields]);
  const dateFields = React.useMemo(() => fields.filter((f) => f.type === "dateTime"), [fields]);
  const columnFields = columns.map((c) => byRef.get(c) ?? { referenceName: c, name: c, type: "string" });

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p, new Date());
      setFrom(r.from);
      setTo(r.to);
    }
  };
  const chooseDateField = (ref: string) => {
    setDateField(ref);
    if (ref && !columns.includes(ref)) setColumns([...columns, ref]);
  };
  const addable = fields.filter((f) => !columns.includes(f.referenceName));
  const toggleState = (s: string) =>
    setStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : stateList.filter((x) => x === s || prev.includes(x))));

  const missing = !type
    ? t.need.type
    : statesType !== type
      ? t.loading
    : !dateField
      ? t.need.dateField
      : states.length === 0
        ? t.need.states
        : !from || !to || from > to
          ? t.need.range
          : columns.length === 0
            ? t.need.columns
            : undefined;

  const run = () => {
    if (missing) return;
    const query: Query = { type, dateField, from, to, states, columns };
    store.save({ type, dateField, preset, from, to, states, columns }).catch(() => undefined);
    setRunning(true);
    setRunError(undefined);
    setPrevCount(undefined);
    const id = ++runId.current;
    // Önceki dönem yalnızca sayı için; başarısız olursa karşılaştırma gösterilmez.
    source
      .count({ ...query, ...previousRange(from, to) })
      .then((n) => id === runId.current && setPrevCount(n))
      .catch(() => undefined);
    source
      .run(query)
      .then((data) => {
        setResult({ query, data });
        setCollapsed(true);
        setPage(0);
        setStateFilter(undefined);
        setSearch("");
        setColFilters({});
        setSort(undefined);
      })
      .catch((e) => {
        setResult(undefined);
        setRunError(message(e));
      })
      .finally(() => setRunning(false));
  };

  const exportCsv = () => {
    if (!result) return;
    const { query } = result;
    const cols = query.columns.map((c) => byRef.get(c) ?? { referenceName: c, name: c, type: "string" });
    const safe = (v: string) => v.replace(/[^\w-]/g, "_");
    const name = `field-lens_${safe(query.type)}${stateFilter ? "_" + safe(stateFilter) : ""}_${query.from}_${query.to}.csv`;
    download(name, toCsv(csvRows(visible, cols), t.csvSeparator));
  };

  const allRows = result?.data.rows ?? [];
  const shownCols = React.useMemo(
    () => (result ? result.query.columns.map((c) => byRef.get(c) ?? { referenceName: c, name: c, type: "string" }) : []),
    [result, byRef],
  );
  // Metin filtreleri state kartlarındaki sayılara da yansır; state filtresi ve sıralama yalnızca tabloya/CSV'ye.
  const matched = React.useMemo(() => filterRows(allRows, shownCols, search, colFilters), [allRows, shownCols, search, colFilters]);
  const visible = React.useMemo(() => {
    const rows = stateFilter ? matched.filter((r) => r["System.State"] === stateFilter) : matched;
    const col = sort && shownCols.find((c) => c.referenceName === sort.ref);
    return col ? sortRows(rows, col, sort.dir) : rows;
  }, [matched, stateFilter, sort, shownCols]);
  const summary = result ? countStates(matched, result.query.states) : [];
  const filtering = !!search.trim() || Object.values(colFilters).some((v) => v.trim()) || !!stateFilter;
  const filterBy = (s: string | undefined) => {
    setStateFilter(s);
    setPage(0);
  };
  const setColFilter = (ref: string, v: string) => {
    setColFilters((prev) => ({ ...prev, [ref]: v }));
    setPage(0);
  };
  const clearFilters = () => {
    setSearch("");
    setColFilters({});
    setStateFilter(undefined);
    setPage(0);
  };
  const toggleSort = (ref: string) => {
    // artan → azalan → kapalı (WIQL sırası: tarih alanına göre artan)
    setSort((s) => (s?.ref !== ref ? { ref, dir: "asc" } : s.dir === "asc" ? { ref, dir: "desc" } : undefined));
    setPage(0);
  };
  const shown = pageSlice(visible, page, PAGE_SIZE);
  const textFiltered = matched.length !== allRows.length;
  const peak = result ? busiestDay(matched, result.query.dateField) : undefined;
  const buckets = React.useMemo(
    () => (result ? weekBuckets(matched, result.query.dateField, result.query.from, result.query.to) : []),
    [matched, result],
  );
  const csvButton = (
    <button className="fl-button" disabled={!result || visible.length === 0} onClick={exportCsv}>
      {filtering ? `${t.exportCsv} (${visible.length})` : t.exportCsv}
    </button>
  );

  return (
    <Page className="fl-page">
      <Header title={t.title} titleSize={TitleSize.Large} description={t.subtitle} />
      <div className="fl-content">
        {mock && <MessageCard severity={MessageCardSeverity.Info}>{t.mock}</MessageCard>}
        {loadError && (
          <MessageCard severity={MessageCardSeverity.Error}>
            {t.loadError(loadError)}{" "}
            <button className="fl-button" onClick={() => setReload((n) => n + 1)}>
              {t.retry}
            </button>
          </MessageCard>
        )}
        {!types && !loadError && <div className="fl-empty">{t.loading}</div>}
        {types && result && collapsed && !running && (
          <section className="fl-report">
            <div className="fl-report-text">
              <h2 className="fl-report-title">{t.reportTitle(result.query.type)}</h2>
              <span className="fl-muted">
                {[
                  byRef.get(result.query.dateField)?.name ?? result.query.dateField,
                  `${result.query.from} – ${result.query.to}`,
                  t.statesN(result.query.states.length),
                ].join(" · ")}
              </span>
            </div>
            <div className="fl-actions">
              <button className="fl-button" onClick={() => setCollapsed(false)}>
                {t.edit}
              </button>
              {csvButton}
            </div>
          </section>
        )}
        {types && !(result && collapsed && !running) && (
          <section className="fl-panel">
            <div className="fl-toolbar">
              <label className="fl-field">
                <span className="fl-muted">{t.type}</span>
                <select className="fl-input" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">{t.choose}</option>
                  {types.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <div className="fl-field">
                <span className="fl-muted">{t.dateField}</span>
                <FieldPicker
                  id="fl-date-list"
                  single
                  fields={dateFields}
                  selected={byRef.get(dateField)}
                  placeholder={t.searchDateField}
                  empty={t.noMatch}
                  onPick={chooseDateField}
                />
              </div>
              <label className="fl-field">
                <span className="fl-muted">{t.range}</span>
                <select className="fl-input" value={preset} onChange={(e) => choosePreset(e.target.value as Preset)}>
                  {PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {t.presets[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fl-field">
                <span className="fl-muted">{t.from}</span>
                <input
                  className="fl-input"
                  type="date"
                  value={from}
                  disabled={preset !== "custom"}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="fl-field">
                <span className="fl-muted">{t.to}</span>
                <input
                  className="fl-input"
                  type="date"
                  value={to}
                  disabled={preset !== "custom"}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>

            <fieldset className="fl-field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="fl-muted">{t.states}</legend>
              <div className="fl-group">
                {stateList.map((s) => (
                  <label key={s} className="fl-check">
                    <input type="checkbox" checked={states.includes(s)} onChange={() => toggleState(s)} />
                    {s}
                  </label>
                ))}
                {!type && <span className="fl-muted">{t.need.type}</span>}
              </div>
            </fieldset>

            <div className="fl-field">
              <span className="fl-muted">{t.columns}</span>
              <div className="fl-group">
                {columnFields.map((f, i) => (
                  <span
                    key={f.referenceName}
                    data-ref={f.referenceName}
                    className={
                      "fl-chip" +
                      (drag && drag.over === i && drag.from !== i ? (drag.from > i ? " fl-drop-before" : " fl-drop-after") : "") +
                      (drag?.from === i ? " fl-dragging" : "")
                    }
                    title={`${f.referenceName} — ${t.moveHint}`}
                    tabIndex={0}
                    aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", f.referenceName); // Firefox veri olmadan sürüklemez
                      setDrag({ from: i, over: i });
                    }}
                    onDragOver={(e) => {
                      if (!drag) return;
                      e.preventDefault();
                      if (drag.over !== i) setDrag({ ...drag, over: i });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (drag) setColumns(moveItem(columns, drag.from, i));
                      setDrag(undefined);
                    }}
                    onDragEnd={() => setDrag(undefined)}
                    onKeyDown={(e) => {
                      if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
                      e.preventDefault();
                      setColumns(moveItem(columns, i, i + (e.key === "ArrowLeft" ? -1 : 1)));
                      focusChip.current = f.referenceName;
                    }}
                  >
                    {f.name}
                    <button aria-label={t.remove(f.name)} onClick={() => setColumns(columns.filter((c) => c !== f.referenceName))}>
                      ×
                    </button>
                  </span>
                ))}
                <FieldPicker
                  id="fl-column-list"
                  fields={addable}
                  placeholder={t.addColumn}
                  empty={t.noMatch}
                  onPick={(ref) => setColumns([...columns, ref])}
                />
              </div>
            </div>

            <div className="fl-actions">
              <button className="fl-button" disabled={!!missing || running} onClick={run}>
                {running ? t.running : t.run}
              </button>
              {csvButton}
              {missing && <span className="fl-muted">{missing}</span>}
              {result && !missing && <span className="fl-muted">{t.count(result.data.rows.length)}</span>}
            </div>
          </section>
        )}

        {runError && <MessageCard severity={MessageCardSeverity.Error}>{t.runError(runError)}</MessageCard>}
        {running && <Skeleton cards={Math.min(states.length + 1, 6)} cols={Math.min(Math.max(columns.length, 3), 8)} label={t.running} />}
        {!running && result?.data.truncated && <MessageCard severity={MessageCardSeverity.Warning}>{t.truncated}</MessageCard>}
        {!running && result && result.data.rows.length === 0 && <div className="fl-empty">{t.empty}</div>}
        {!running && result && allRows.length > 0 && (
          <div className="fl-summary" role="group" aria-label={t.summary}>
            <button
              className="fl-card"
              aria-pressed={!stateFilter}
              onClick={() => filterBy(undefined)}
              title={(() => {
                const p = previousRange(result.query.from, result.query.to);
                return prevCount !== undefined ? t.prevTip(fullDay(p.from), fullDay(p.to)) : undefined;
              })()}
            >
              <span className="fl-card-num">{matched.length}</span>
              <span className="fl-card-label">{t.total}</span>
              {prevCount !== undefined && !textFiltered && (
                <span className="fl-card-sub">
                  {t.prevPeriod(prevCount)}
                  {prevCount > 0 && (
                    <span className={allRows.length >= prevCount ? "fl-up" : "fl-down"}>
                      {" · "}
                      {allRows.length >= prevCount ? "+" : "−"}%{Math.round((Math.abs(allRows.length - prevCount) / prevCount) * 100)}
                    </span>
                  )}
                </span>
              )}
            </button>
            {summary.map(({ state, count }) => (
              <button
                key={state}
                className="fl-card"
                aria-pressed={stateFilter === state}
                disabled={count === 0}
                title={t.filterHint(state)}
                onClick={() => filterBy(stateFilter === state ? undefined : state)}
                style={{ "--fl-state": stateColors[state] || undefined } as React.CSSProperties}
              >
                <span className="fl-card-num">{count}</span>
                <span className="fl-card-label">
                  <span className="fl-dot" />
                  {state}
                </span>
                <span className="fl-card-bar">
                  <span style={{ width: `${matched.length ? (count / matched.length) * 100 : 0}%` }} />
                </span>
              </button>
            ))}
            {peak && (
              <div
                className="fl-card fl-card-static"
                title={t.busiestTip(fullDay(peak.day), peak.count, byRef.get(result.query.dateField)?.name ?? result.query.dateField)}
              >
                <span className="fl-card-num">{shortDay(peak.day)}</span>
                <span className="fl-card-label">{t.busiest}</span>
                <span className="fl-card-sub">{t.count(peak.count)}</span>
              </div>
            )}
          </div>
        )}
        {!running && result && allRows.length > 0 && buckets.length > 1 && (
          <section className="fl-box">
            <h3 className="fl-box-title">
              {t.weekly}
              <span className="fl-muted">{byRef.get(result.query.dateField)?.name ?? result.query.dateField}</span>
            </h3>
            <WeekChart buckets={buckets} states={result.query.states} colors={stateColors} t={t} />
          </section>
        )}
        {!running && result && allRows.length > 0 && (
          <div className="fl-actions">
            <input
              className="fl-input fl-search"
              type="search"
              aria-label={t.search}
              placeholder={t.search}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <span className="fl-segment" role="group" aria-label={t.density}>
              <button aria-pressed={!dense} onClick={() => chooseDense(false)}>
                {t.comfortable}
              </button>
              <button aria-pressed={dense} onClick={() => chooseDense(true)}>
                {t.compact}
              </button>
            </span>
            {filtering && (
              <>
                <span className="fl-muted" aria-live="polite">
                  {t.shownOf(visible.length, allRows.length)}
                </span>
                <button className="fl-button" onClick={clearFilters}>
                  {t.clearFilters}
                </button>
              </>
            )}
          </div>
        )}
        {!running && result && allRows.length > 0 && (
          <div className="fl-scroll">
            <table className={dense ? "fl-table fl-dense" : "fl-table"}>
              <thead>
                <tr>
                  {shownCols.map((c) => {
                    const dir = sort?.ref === c.referenceName ? sort.dir : undefined;
                    return (
                      <th key={c.referenceName} aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}>
                        <button className="fl-sort" title={`${c.referenceName} — ${t.sortHint}`} onClick={() => toggleSort(c.referenceName)}>
                          {c.name}
                          <span className="fl-sort-arrow" aria-hidden="true">
                            {dir === "asc" ? "▲" : dir === "desc" ? "▼" : "↕"}
                          </span>
                        </button>
                        <input
                          className="fl-col-filter"
                          type="search"
                          aria-label={t.filterCol(c.name)}
                          placeholder={t.filterPlaceholder}
                          value={colFilters[c.referenceName] ?? ""}
                          onChange={(e) => setColFilter(c.referenceName, e.target.value)}
                        />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={shownCols.length} className="fl-empty">
                      {t.noFiltered}
                    </td>
                  </tr>
                )}
                {shown.items.map((r) => (
                  <tr key={String(r["System.Id"])}>
                    {shownCols.map((c) => (
                      <td
                        key={c.referenceName}
                        className={c.type === "dateTime" || c.referenceName === "System.Id" || c.referenceName === "System.State" ? "fl-nowrap" : "fl-cell"}
                      >
                        {c.referenceName === "System.Id" ? (
                          <a className="fl-link" href={itemUrl(Number(r["System.Id"]))} target="_top" rel="noopener noreferrer">
                            {String(r["System.Id"])}
                          </a>
                        ) : c.referenceName === "System.State" ? (
                          <span className="fl-badge" style={{ "--fl-state": stateColors[String(r["System.State"])] || undefined } as React.CSSProperties}>
                            <span className="fl-dot" />
                            {formatCell(r["System.State"], c.type)}
                          </span>
                        ) : (
                          <div className="fl-clip">{formatCell(r[c.referenceName], c.type)}</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.pages > 1 && (
              <div className="fl-actions fl-pager">
                <button className="fl-button" disabled={shown.page === 0} onClick={() => setPage(shown.page - 1)}>
                  {t.prev}
                </button>
                <span className="fl-muted">{t.pageInfo(shown.first, shown.last, visible.length)}</span>
                <button className="fl-button" disabled={shown.page >= shown.pages - 1} onClick={() => setPage(shown.page + 1)}>
                  {t.next}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}

function render(props: Omit<Props, "t">, culture: string | undefined) {
  const lang = pickLang(culture);
  document.documentElement.lang = lang;
  ReactDOM.render(<App {...props} t={STRINGS[lang]} />, document.getElementById("root"));
}

/** Tarayıcıda yerel saklama; erişim engelliyse sessizce atlanır. */
const localStore: Store = {
  async load() {
    try {
      return JSON.parse(localStorage.getItem("field-lens") ?? "null") ?? undefined;
    } catch {
      return undefined;
    }
  },
  async save(s) {
    try {
      localStorage.setItem("field-lens", JSON.stringify(s));
    } catch {
      // saklanamıyor; seçimler bu oturumla sınırlı kalır
    }
  },
};

async function start() {
  // Azure DevOps dışında (npm run dev) açıldıysa örnek veriyle çalış; dil ?lang=tr|en ile seçilebilir.
  if (window.self === window.top) {
    render(
      { source: mockSource(), store: localStore, mock: true, itemUrl: () => "#" },
      new URLSearchParams(window.location.search).get("lang") ?? navigator.language,
    );
    return;
  }
  await SDK.init({ loaded: false, applyTheme: true });
  await SDK.ready();
  try {
    const baseUrl = await (await SDK.getService<ILocationService>(CommonServiceIds.LocationService)).getServiceLocation();
    // Azure DevOps Server 2022'de getPageContext() hata fırlatır; sırayla sayfa diline ve tarayıcı diline düşülür.
    const culture = firstOf([
      () => SDK.getPageContext().globalization.culture,
      () => window.parent.document.documentElement.lang,
      () => navigator.language,
    ]);
    const project = (await (await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService)).getProject())?.name;
    if (!project) throw new Error("Project not found");
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const dataService = await SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService);
    const manager = dataService.getExtensionDataManager(SDK.getExtensionContext().id, await SDK.getAccessToken());
    const store: Store = {
      load: async () => (await manager).getValue<Settings>("settings", { scopeType: "User" }),
      save: async (s) => {
        await (await manager).setValue("settings", s, { scopeType: "User" });
      },
    };
    render(
      {
        source: createRestSource(baseUrl, () => SDK.getAccessToken(), project),
        store,
        mock: false,
        itemUrl: (id) => `${base}${encodeURIComponent(project)}/_workitems/edit/${id}`,
      },
      culture,
    );
    await SDK.notifyLoadSucceeded();
  } catch (e) {
    await SDK.notifyLoadFailed(e instanceof Error ? e : String(e));
  }
}

start();
