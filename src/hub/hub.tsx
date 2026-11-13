import "azure-devops-ui/Core/override.css";
import "./hub.css";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  IHostNavigationService,
  ILocationService,
  IProjectPageService,
} from "azure-devops-extension-api/Common/CommonServices";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { Page } from "azure-devops-ui/Page";

import { createRestSource, DataSource, RunResult } from "./api";
import { fullDay } from "./chart";
import { FieldPicker } from "./fieldPicker";
import { RulePreview } from "./rulePreview";
import { copyText, Docs, localDocs, QueryBar, QueryStore, queryStore } from "./queryBar";
import { ConditionsEditor } from "./conditions";
import { GroupSummary } from "./groupSummary";
import { firstOf, pickLang, Strings, STRINGS } from "./i18n";
import {
  countStates,
  csvRows,
  filterRows,
  fold,
  DEFAULT_COLUMNS,
  DEFAULT_PRESET,
  Field,
  formatCell,
  moveItem,
  pageSlice,
  Preset,
  PRESETS,
  presetRange,
  previousRange,
  deltaText,
  Query,
  compileRule,
  DERIVED,
  deriveRows,
  Rule,
  checkCondition,
  Condition,
  protectCell,
  toHtmlTable,
  toTsv,
  Assignee,
  Projects,
  sanitizeSettings,
  SavedQuery,
  sortRows,
  Settings,
  toCsv,
} from "./logic";
import { mockSource } from "./mock";

const PAGE_SIZE = 100;

/** Kullanıcı seçimlerinin saklandığı yer. */
interface Store {
  load(): Promise<Settings | undefined>;
  save(s: Settings): Promise<void>;
}

interface Props {
  source: DataSource;
  store: Store;
  queries: QueryStore;
  /** Sayfa ?query=<id> ile açıldıysa. */
  initialQueryId?: string;
  linkFor(id: string): string;
  mock: boolean;
  t: Strings;
  /** project: kaydın projesi (proje-arası sorguda); yoksa hub'ın projesi. */
  itemUrl: (id: number, project?: string) => string;
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


function App({ source, store, queries, initialQueryId, linkFor, mock, t, itemUrl }: Props) {
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
  const [assignee, setAssignee] = React.useState<Assignee>();
  const [conditions, setConditions] = React.useState<Condition[]>([]);
  /** Sonuçların gruplandığı kolon (yalnızca görünüm; kayda girmez). */
  const [groupBy, setGroupBy] = React.useState("");
  const [copyNote, setCopyNote] = React.useState<string>();
  const [projects, setProjects] = React.useState<Projects>();
  const projectsKey = JSON.stringify(projects ?? null);
  /** Koleksiyondaki projeler (okunamazsa boş: seçili projeler o zaman doğrulanmaz). */
  const [projectNames, setProjectNames] = React.useState<string[]>([]);
  const [projectSearch, setProjectSearch] = React.useState("");
  /** types listesinin hangi kapsam için yüklendiği; aynı kapsam için yeniden istenmez. */
  const typesFor = React.useRef<string>();
  const [columns, setColumns] = React.useState<string[]>(DEFAULT_COLUMNS);

  const [running, setRunning] = React.useState(false);
  const [runError, setRunError] = React.useState<string>();
  /** Türetilmiş kolon kuralı; kaynak, geçerli kural ve ad doluysa kolon olarak kullanılabilir. */
  const [rule, setRule] = React.useState<Rule>({ source: "", pattern: "", name: "" });
  /** fetched: sunucudan istenen alanlar (önizleme kaynağın gelip gelmediğini buradan anlar); rule: çalıştırıldığı andaki kural. */
  const [result, setResult] = React.useState<{ query: Query; data: RunResult; fetched: string[]; rule?: Rule }>();
  const [page, setPage] = React.useState(0);
  /** Özet kartına tıklanınca tablo ve CSV yalnızca bu state'i gösterir. */
  const [stateFilter, setStateFilter] = React.useState<string>();
  /** Sonuçlar içinde arama: tüm kolonlarda ve kolon bazında; sıralama tablo başlığından. */
  const [search, setSearch] = React.useState("");
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [showColFilters, setShowColFilters] = React.useState(false);
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

  /** Formu verilen (temizlenmiş) ayarlarla doldurur; eksik olanlar varsayılana döner. */
  const applySettings = (s: Settings, ts: string[]) => {
    setType(s.type ?? (ts.length === 1 ? ts[0] : ""));
    setDateField(s.dateField ?? "");
    const p = s.preset ?? DEFAULT_PRESET;
    setPreset(p);
    const range = p !== "custom" ? presetRange(p, new Date()) : s.from && s.to ? { from: s.from, to: s.to } : presetRange(DEFAULT_PRESET, new Date());
    setFrom(range.from);
    setTo(range.to);
    setStates(s.states ?? []);
    setAssignee(s.assignee);
    setProjects(s.projects);
    setConditions(s.conditions ?? []);
    setColumns(s.columns?.length ? s.columns : DEFAULT_COLUMNS);
    setRule(s.derived ?? { source: "", pattern: "", name: "" });
  };
  /** Sonuçları ve sonuç içi filtreleri kaldırır, filtre panelini açar. */
  const clearResults = () => {
    runId.current++;
    setResult(undefined);
    setRunError(undefined);
    setPrevCount(undefined);
    setPage(0);
    setStateFilter(undefined);
    setSearch("");
    setColFilters({});
    setSort(undefined);
    setCollapsed(false);
  };
  const [queryId, setQueryId] = React.useState<string>();
  /** Bağlantıyla açılan sorgu, form hazır olunca (state listesi yüklenince) bir kez çalıştırılır. */
  const [autoRun, setAutoRun] = React.useState(false);
  const knownProjects = () => (projectNames.length ? projectNames : undefined);
  /** Sorgunun kapsamındaki türleri yükleyip formu doldurur (tür, kapsamdaki listeye göre doğrulanır). */
  const pickQuery = async (q: SavedQuery | undefined, run?: boolean) => {
    setQueryId(q?.id);
    if (!q || !types) return;
    const p = sanitizeSettings(q.settings, [], fields, knownProjects()).projects;
    const ts = await source.types(p).catch(() => types);
    typesFor.current = JSON.stringify(p ?? null);
    setTypes(ts);
    applySettings(sanitizeSettings(q.settings, ts, fields, knownProjects()), ts);
    clearResults();
    setAutoRun(!!run);
  };

  // İlk yükleme: türler, alanlar ve kayıtlı seçimler.
  React.useEffect(() => {
    let live = true;
    setLoadError(undefined);
    setTypes(undefined);
    Promise.all([source.fields(), store.load().catch(() => undefined), source.projects().catch(() => [] as string[])])
      .then(async ([fs, saved, names]) => {
        const known = names.length ? names : undefined;
        const p = sanitizeSettings(saved, [], fs, known).projects;
        const ts = await source.types(p);
        if (!live) return;
        typesFor.current = JSON.stringify(p ?? null);
        // Önce alanlar: sorgu çubuğu türler gelince açılır ve bağlantıdaki sorguyu alan listesiyle doğrular.
        setFields(fs);
        setProjectNames(names);
        setTypes(ts);
        applySettings(sanitizeSettings(saved, ts, fs, known), ts);
      })
      .catch((e) => live && setLoadError(message(e)));
    return () => {
      live = false;
    };
  }, [source, store, reload]);

  // Kapsam değişince tür listesi yenilenir; kapsamda olmayan tür seçimi düşer.
  React.useEffect(() => {
    if (!types || typesFor.current === projectsKey || (Array.isArray(projects) && projects.length === 0)) return;
    typesFor.current = projectsKey;
    let live = true;
    source
      .types(projects)
      .then((ts) => {
        if (!live) return;
        setTypes(ts);
        setType((cur) => (ts.includes(cur) ? cur : ""));
      })
      .catch((e) => live && setLoadError(message(e)));
    return () => {
      live = false;
    };
  }, [source, projectsKey, types]);

  // Tür ya da kapsam değişince state listesi yenilenir; seçimde yalnızca listede olanlar kalır.
  React.useEffect(() => {
    if (!type) return setStateList([]);
    if (Array.isArray(projects) && projects.length === 0) return;
    let live = true;
    source
      .states(type, projects)
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
  }, [source, type, projectsKey, reload]);

  const ruleRe = compileRule(rule.pattern);
  const ruleReady = !!rule.source && typeof ruleRe !== "string" && !!rule.name.trim();
  // Kural tamamlanınca kolon kendiliğinden eklenir, bozulunca çıkarılır.
  React.useEffect(() => {
    setColumns((cols) => (ruleReady ? (cols.includes(DERIVED) ? cols : [...cols, DERIVED]) : cols.filter((c) => c !== DERIVED)));
  }, [ruleReady]);
  const byRef = React.useMemo(() => {
    const map = new Map(fields.map((f) => [f.referenceName, f]));
    map.set(DERIVED, { referenceName: DERIVED, name: rule.name.trim() || t.rule.defaultName, type: "string" });
    return map;
  }, [fields, rule.name, t]);
  const dateFields = React.useMemo(() => fields.filter((f) => f.type === "dateTime"), [fields]);
  const columnFields = columns.map((c) => byRef.get(c) ?? { referenceName: c, name: c, type: "string" });

  /** Proje-arası kapsamda Proje kolonu ID'nin hemen arkasına eklenir (kaldırılabilir). */
  const chooseProjects = (p: Projects | undefined) => {
    setProjects(p);
    if (p && !columns.includes("System.TeamProject")) {
      const at = columns.indexOf("System.Id") + 1;
      setColumns([...columns.slice(0, at), "System.TeamProject", ...columns.slice(at)]);
    }
  };
  const toggleProject = (name: string) =>
    Array.isArray(projects) &&
    setProjects(projects.includes(name) ? projects.filter((x) => x !== name) : projectNames.filter((x) => x === name || projects.includes(x)));

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

  type Need = keyof typeof t.need | "loading";
  const need: Need | undefined = Array.isArray(projects) && projects.length === 0
    ? "projects"
    : conditions.some((c) => !c.field || checkCondition(c))
      ? "conditions"
    : !type
    ? "type"
    : statesType !== type
      ? "loading"
    : !dateField
      ? "dateField"
      : states.length === 0
        ? "states"
        : !from || !to || from > to
          ? "range"
          : columns.length === 0
            ? "columns"
            : undefined;
  const missing = need && (need === "loading" ? t.loading : t.need[need]);
  /** Çalıştır'a eksikle basılınca işaretlenen alan; o alan tamamlanınca işaret kendiliğinden kalkar. */
  const [flagged, setFlagged] = React.useState<Need>();
  const flagShown = flagged && flagged === need ? flagged : undefined;
  const invalid = (k: Need) => (flagShown === k ? " fl-invalid" : "");
  const needNote = (k: Need) =>
    flagShown === k && k !== "loading" ? (
      <span className="fl-qerror fl-need" role="alert">
        ⚠ {t.need[k]}
      </span>
    ) : null;
  React.useEffect(() => {
    if (flagShown) document.querySelector<HTMLElement>(".fl-invalid input, .fl-invalid select, .fl-invalid button")?.focus();
  }, [flagShown]);

  /** İlk tık onay ister, ikincisi sıfırlar (iframe'de window.confirm engellenebilir). */
  const [confirmReset, setConfirmReset] = React.useState(false);
  const resetAll = () => {
    if (!confirmReset) return setConfirmReset(true);
    setConfirmReset(false);
    store.save({}).catch(() => undefined);
    applySettings({}, types ?? []);
    clearResults();
    setQueryId(undefined);
    chooseDense(false);
  };

  const current: Settings = { conditions: conditions.length ? conditions : undefined, projects, assignee, type, dateField, preset, from, to, states, columns, derived: rule.source || rule.pattern ? rule : undefined };

  React.useEffect(() => {
    if (!autoRun || missing === t.loading) return;
    setAutoRun(false);
    if (!missing) run();
  }, [autoRun, missing]);

  const run = () => {
    if (missing) return;
    const query: Query = { conditions: conditions.length ? conditions : undefined, projects, assignee, type, dateField, from, to, states, columns };
    const activeRule = ruleReady && columns.includes(DERIVED) ? rule : undefined;
    // Türetilmiş kolon sunucudan istenmez; yerine kaynak alanı istenir.
    const fetched = [...new Set([...columns.filter((c) => c !== DERIVED), ...(activeRule ? [activeRule.source] : [])])];
    store.save(current).catch(() => undefined);
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
      .run({ ...query, columns: fetched })
      .then((data) => {
        setResult({ query, data, fetched, rule: activeRule });
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

  const allRows = React.useMemo(() => {
    const rows = result?.data.rows ?? [];
    const r = result?.rule;
    const re = r && compileRule(r.pattern);
    const src = r && byRef.get(r.source);
    return r && src && re instanceof RegExp ? deriveRows(rows, src, re, t.rule.unmatched) : rows;
  }, [result, byRef, t]);
  // Önizleme: son çalıştırmada kaynak alan istendiyse onun görünen değerleri.
  const previewValues =
    result && rule.source && result.fetched.includes(rule.source)
      ? result.data.rows.map((r) => formatCell(r[rule.source], byRef.get(rule.source)?.type))
      : undefined;
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
  const colFilterCount = Object.values(colFilters).filter((v) => v.trim()).length;
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
  /** Görünen kayıtlar panoya: HTML tablo (Teams, e-posta, Excel) ve sekmeli düz metin; formül koruması CSV'deki gibi. */
  const copyTable = async () => {
    if (!result) return;
    const rows = csvRows(visible, shownCols).map((r) => r.map(protectCell));
    let ok = false;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([toHtmlTable(rows)], { type: "text/html" }),
          "text/plain": new Blob([toTsv(rows)], { type: "text/plain" }),
        }),
      ]);
      ok = true;
    } catch {
      ok = await copyText(toTsv(rows));
    }
    setCopyNote(ok ? t.copied(visible.length) : t.copyFailed);
  };
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
        {types && <QueryBar store={queries} t={t.q} current={current} selectedId={queryId} onSelect={pickQuery} initialId={initialQueryId} linkFor={linkFor} />}
        {types && result && collapsed && !running && (
          <section className="fl-report">
            <div className="fl-report-text">
              <h2 className="fl-report-title">{t.reportTitle(result.query.type)}</h2>
              <span className="fl-muted">
                {[
                  byRef.get(result.query.dateField)?.name ?? result.query.dateField,
                  `${result.query.from} – ${result.query.to}`,
                  t.statesN(result.query.states.length),
                  ...(result.query.assignee ? [t.assignees[result.query.assignee]] : []),
                  ...(result.query.projects ? [t.scope(result.query.projects)] : []),
                  ...(result.query.conditions ? [t.cond.count(result.query.conditions.length)] : []),
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
            <div className="fl-sec-row">
              <fieldset className="fl-sec">
                <legend>{t.sections.scope}</legend>
                <div className={"fl-field" + invalid("projects")}>
                  <span className="fl-muted">{t.projects}</span>
                  <span className="fl-segment fl-assignee" role="group" aria-label={t.projects}>
                    <button aria-pressed={projects === undefined} onClick={() => chooseProjects(undefined)}>
                      {t.projectModes.this}
                    </button>
                    <button aria-pressed={projects === "all"} onClick={() => chooseProjects("all")}>
                      {t.projectModes.all}
                    </button>
                    <button aria-pressed={Array.isArray(projects)} disabled={!projectNames.length} onClick={() => !Array.isArray(projects) && chooseProjects([])}>
                      {t.projectModes.some}
                    </button>
                  </span>
                  {projects === "all" && <span className="fl-muted">{t.allProjectsHint}</span>}
                  {Array.isArray(projects) && (
                    <div className="fl-projects">
                      <input
                        className="fl-input"
                        placeholder={t.searchProject}
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                      <div className="fl-project-list">
                        {projectNames
                          .filter((n) => fold(n).includes(fold(projectSearch.trim())))
                          .map((n) => (
                            <label key={n} className="fl-check">
                              <input type="checkbox" checked={projects.includes(n)} onChange={() => toggleProject(n)} />
                              {n}
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                  {needNote("projects")}
                </div>
                <label className={"fl-field" + invalid("type")}>
                  <span className="fl-muted">{t.type}</span>
                  <select className="fl-input" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="">{t.choose}</option>
                    {types.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  {needNote("type")}
                </label>
                <div className="fl-field">
                  <span className="fl-muted">{t.assignee}</span>
                  <span className="fl-segment fl-assignee" role="group" aria-label={t.assignee}>
                    {([undefined, "me", "none"] as const).map((a) => (
                      <button key={a ?? "all"} aria-pressed={assignee === a} onClick={() => setAssignee(a)}>
                        {t.assignees[a ?? "all"]}
                      </button>
                    ))}
                  </span>
                </div>
              </fieldset>
              <fieldset className="fl-sec">
                <legend>{t.sections.time}</legend>
                <div className="fl-toolbar">
                  <div className={"fl-field" + invalid("dateField")}>
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
                    {needNote("dateField")}
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
                  <label className={"fl-field" + invalid("range")}>
                    <span className="fl-muted">{t.from}</span>
                    <input
                      className="fl-input"
                      type="date"
                      value={from}
                      disabled={preset !== "custom"}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label className={"fl-field" + invalid("range")}>
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
                {needNote("range")}
              </fieldset>
            </div>

            <fieldset className="fl-sec">
              <legend>{t.sections.filter}</legend>
              <fieldset className={"fl-field" + invalid("states")} style={{ border: 0, padding: 0, margin: 0 }}>
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
                {needNote("states")}
              </fieldset>

              <div className={invalid("conditions").trim() || undefined}>
                <ConditionsEditor value={conditions} onChange={setConditions} fields={fields} t={t.cond} searchField={t.w.searchField} noMatch={t.noMatch} />
                {needNote("conditions")}
              </div>
            </fieldset>

            <fieldset className="fl-sec">
              <legend>{t.sections.view}</legend>
              <div className={"fl-field" + invalid("columns")}>
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
                {needNote("columns")}
              </div>

              <details className="fl-rule" open={!!rule.source || !!rule.pattern}>
                <summary>{t.rule.title}</summary>
                <div className="fl-toolbar">
                  <div className="fl-field">
                    <span className="fl-muted">{t.rule.source}</span>
                    <FieldPicker
                      id="fl-rule-source"
                      single
                      fields={fields}
                      selected={byRef.get(rule.source)}
                      placeholder={t.w.searchField}
                      empty={t.noMatch}
                      onPick={(ref) => setRule({ ...rule, source: ref, name: rule.name || t.rule.defaultName })}
                    />
                  </div>
                  <label className="fl-field">
                    <span className="fl-muted">{t.rule.pattern}</span>
                    <input
                      className="fl-input fl-mono fl-rule-input"
                      value={rule.pattern}
                      placeholder={t.rule.example}
                      spellCheck={false}
                      onChange={(e) => setRule({ ...rule, pattern: e.target.value })}
                    />
                  </label>
                  <label className="fl-field">
                    <span className="fl-muted">{t.rule.name}</span>
                    <input className="fl-input" value={rule.name} placeholder={t.rule.defaultName} onChange={(e) => setRule({ ...rule, name: e.target.value })} />
                  </label>
                  {(rule.source || rule.pattern) && (
                    <button className="fl-button" onClick={() => setRule({ source: "", pattern: "", name: "" })}>
                      {t.rule.remove}
                    </button>
                  )}
                  {ruleReady && !columns.includes(DERIVED) && (
                    <button className="fl-button" onClick={() => setColumns([...columns, DERIVED])}>
                      {t.rule.addColumn}
                    </button>
                  )}
                </div>
                <span className="fl-muted">{t.rule.hint}</span>
                {rule.source && <RulePreview pattern={rule.pattern} values={previewValues} t={t} />}
              </details>
            </fieldset>

            <div className="fl-actions">
              <button className="fl-button" disabled={running} onClick={() => (need ? need !== "loading" && setFlagged(need) : run())}>
                {running ? t.running : t.run}
              </button>
              {csvButton}
              {need === "loading" && <span className="fl-muted">{t.loading}</span>}
              {result && !missing && <span className="fl-muted">{t.count(result.data.rows.length)}</span>}
              <button
                className="fl-button fl-reset"
                disabled={running}
                title={t.resetTip}
                onClick={resetAll}
                onBlur={() => setConfirmReset(false)}
              >
                <span aria-hidden="true">↻ </span>
                {confirmReset ? t.resetConfirm : t.reset}
              </button>
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
                  {prevCount > 0 && <span className="fl-delta">{deltaText(allRows.length, prevCount)} · </span>}
                  {t.prevPeriod(prevCount)}
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
          </div>
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
            {/* Kapalıyken de filtreler uygulanır; sayaç bunu gösterir. */}
            <button className="fl-button" aria-pressed={showColFilters} onClick={() => setShowColFilters(!showColFilters)}>
              {t.colFilters}
              {colFilterCount > 0 && <span className="fl-count">{colFilterCount}</span>}
            </button>
            <span className="fl-segment" role="group" aria-label={t.density}>
              <button aria-pressed={!dense} onClick={() => chooseDense(false)}>
                {t.comfortable}
              </button>
              <button aria-pressed={dense} onClick={() => chooseDense(true)}>
                {t.compact}
              </button>
            </span>
            <button className="fl-button" title={t.copyTableTip} disabled={visible.length === 0} onClick={copyTable}>
              {t.copyTable}
            </button>
            <label className="fl-qpick">
              <span className="fl-muted">{t.group.label}</span>
              <select className="fl-input" value={shownCols.some((c) => c.referenceName === groupBy) ? groupBy : ""} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="">{t.group.none}</option>
                {shownCols
                  .filter((c) => c.referenceName !== "System.Id")
                  .map((c) => (
                    <option key={c.referenceName} value={c.referenceName}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            {copyNote && (
              <span className="fl-muted" aria-live="polite">
                {copyNote}
              </span>
            )}
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
        {!running && result && allRows.length > 0 && byRef.get(groupBy) && shownCols.some((c) => c.referenceName === groupBy) && (
          <GroupSummary
            rows={visible}
            col={byRef.get(groupBy)!}
            states={result.query.states}
            colors={stateColors}
            tip={t.group.tip}
            blank={t.w.blank}
            onPick={(v) => setColFilter(groupBy, v)}
          />
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
                        {showColFilters && (
                          <input
                            className="fl-col-filter"
                            type="search"
                            aria-label={t.filterCol(c.name)}
                            placeholder={t.filterPlaceholder}
                            value={colFilters[c.referenceName] ?? ""}
                            onChange={(e) => setColFilter(c.referenceName, e.target.value)}
                          />
                        )}
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
                          <a className="fl-link" href={itemUrl(Number(r["System.Id"]), r["System.TeamProject"] ? String(r["System.TeamProject"]) : undefined)} target="_top" rel="noopener noreferrer">
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
      {
        source: mockSource(),
        store: localStore,
        queries: queryStore(localDocs(), { id: "me", name: "Siz" }),
        initialQueryId: new URLSearchParams(window.location.search).get("query") ?? undefined,
        linkFor: (id) => `${window.location.origin}${window.location.pathname}?query=${encodeURIComponent(id)}`,
        mock: true,
        itemUrl: () => "#",
      },
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
    const projectInfo = await (await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService)).getProject();
    const project = projectInfo?.name;
    if (!project || !projectInfo) throw new Error("Project not found");
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const dataService = await SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService);
    const manager = dataService.getExtensionDataManager(SDK.getExtensionContext().id, await SDK.getAccessToken());
    const store: Store = {
      load: async () => (await manager).getValue<Settings>("settings", { scopeType: "User" }),
      save: async (s) => {
        await (await manager).setValue("settings", s, { scopeType: "User" });
      },
    };
    // Kişisel sorgular kullanıcı kapsamında, paylaşılanlar her proje için ayrı bir ortak koleksiyonda.
    const coll = (shared: boolean) => (shared ? `queries-${projectInfo.id}` : "queries");
    const scope = (shared: boolean) => ({ scopeType: shared ? "Default" : "User" });
    const docs: Docs = {
      get: async (shared) => (await manager).getDocuments(coll(shared), scope(shared)),
      set: async (shared, doc) => (await manager).setDocument(coll(shared), doc, scope(shared)),
      del: async (shared, id) => (await manager).deleteDocument(coll(shared), id, scope(shared)),
    };
    const me = SDK.getUser();
    const params = await (await SDK.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService)).getQueryParams().catch(() => ({}) as Record<string, string>);
    render(
      {
        source: createRestSource(baseUrl, () => SDK.getAccessToken(), project),
        store,
        queries: queryStore(docs, { id: me.id, name: me.displayName || me.name }),
        initialQueryId: params.query || undefined,
        linkFor: (id) => `${base}${encodeURIComponent(project)}/_apps/hub/turanemin.field-lens.hub?query=${encodeURIComponent(id)}`,
        mock: false,
        itemUrl: (id, p) => `${base}${encodeURIComponent(p ?? project)}/_workitems/edit/${id}`,
      },
      culture,
    );
    await SDK.notifyLoadSucceeded();
  } catch (e) {
    await SDK.notifyLoadFailed(e instanceof Error ? e : String(e));
  }
}

start();
