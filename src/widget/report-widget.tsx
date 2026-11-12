import * as React from "react";
import { WidgetSettings } from "azure-devops-extension-api/Dashboard";

import { RunResult } from "../hub/api";
import { Bar, fullDay, shortDay, StackChart } from "../hub/chart";
import {
  countBy,
  Field,
  formatCell,
  monthBuckets,
  monthsRange,
  presetRange,
  Preset,
  previousRange,
  Query,
  Row,
  upcomingRange,
  View,
  weekBuckets,
} from "../hub/logic";
import { configured, usesCustom, DEFAULTS, Env, Frame, inHost, parseSettings, startWidget, useEnv, WidgetConfig } from "./shared";

/** Dağılımda gösterilen en fazla değer; kalanlar "Diğer"de toplanır. */
const TOP = 8;
/** Yaklaşanlar listesinde gösterilen en fazla kayıt. */
const LIST_LIMIT = 100;

interface Meta {
  fields: Map<string, Field>;
  colors: Record<string, string>;
}

/** Görünümün veri isteği: hangi aralık ve hangi kolonlar. */
function plan(cfg: WidgetConfig, now: Date): { from: string; to: string; columns: string[] } {
  const range = usesCustom(cfg)
    ? { from: cfg.from, to: cfg.to }
    : cfg.view === "trend"
      ? monthsRange(cfg.months, now)
      : cfg.view === "upcoming"
        ? upcomingRange(cfg.days, now)
        : presetRange(cfg.preset as Exclude<Preset, "custom">, now);
  const columns =
    cfg.view === "distribution"
      ? [cfg.groupField, "System.State"]
      : cfg.view === "upcoming"
        ? ["System.Title", "System.State", cfg.dateField]
        : ["System.State", cfg.dateField];
  return { ...range, columns };
}

/** Widget boyutuna göre grafik oranı: SVG genişliği 640 birim, yükseklik alanın oranına göre. */
function chartHeight(settings?: WidgetSettings) {
  const cols = settings?.size?.columnSpan ?? 4;
  const rows = settings?.size?.rowSpan ?? 2;
  const w = cols * 160 + (cols - 1) * 10 - 28;
  const h = rows * 160 + (rows - 1) * 10 - 64;
  return Math.max(110, Math.round((640 * h) / w));
}

function Report({ settings }: { settings?: WidgetSettings }) {
  const env = useEnv();
  // Dashboard dışında görünüm ?view= ile seçilir, ayarlar örnek veriye göredir.
  const cfg: WidgetConfig = inHost
    ? parseSettings(settings)
    : {
        ...DEFAULTS,
        view: (new URLSearchParams(window.location.search).get("view") as View) || "summary",
        type: "Kart",
        dateField: "Custom.TargetDate",
        states: ["New", "Active", "Resolved", "Closed"],
        groupField: "Custom.Sistem",
        preset: "last90",
      };
  const ok = configured(cfg);
  const req = plan(cfg, new Date());
  const key = JSON.stringify([cfg, req]);
  const [meta, setMeta] = React.useState<Meta>();
  const [data, setData] = React.useState<{ key: string; result: RunResult; prev?: number }>();
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (!env || !ok) return;
    let live = true;
    setError(undefined);
    Promise.all([env.source.fields(), env.source.states(cfg.type)]).then(
      ([fs, st]) => live && setMeta({ fields: new Map(fs.map((f) => [f.referenceName, f])), colors: Object.fromEntries(st.map((s) => [s.name, s.color])) }),
      (e) => live && setError(String(e?.message ?? e)),
    );
    const q: Query = { type: cfg.type, dateField: cfg.dateField, states: cfg.states, from: req.from, to: req.to, columns: req.columns };
    Promise.all([
      env.source.run(q),
      cfg.view === "summary" ? env.source.count({ ...q, ...previousRange(q.from, q.to) }).catch(() => undefined) : undefined,
    ]).then(
      ([result, prev]) => live && setData({ key, result, prev }),
      (e) => live && setError(String(e?.message ?? e)),
    );
    return () => {
      live = false;
    };
  }, [env, key]);

  const title = settings?.name || "Field Lens";
  if (!env) return <Frame title={title} />;
  const { t } = env;
  if (!ok) return <Frame title={title} message={t.w.notConfigured} />;
  const field = (ref: string) => meta?.fields.get(ref) ?? { referenceName: ref, name: ref, type: "string" };
  const custom = usesCustom(cfg);
  const span = custom ? t.presets.custom : cfg.view === "trend" ? t.w.months(cfg.months) : cfg.view === "upcoming" ? t.w.nextDays(cfg.days) : t.presets[cfg.preset];
  // Özel aralık yıl değiştirebilir; o yüzden yılıyla yazılır.
  const day = custom ? fullDay : shortDay;
  const viewName = cfg.view === "distribution" ? `${t.w.views.distribution}: ${field(cfg.groupField).name}` : t.w.views[cfg.view];
  const sub = [viewName, cfg.type, field(cfg.dateField).name, `${span} (${day(req.from)} – ${day(req.to)})`].join(" · ");
  const link = { href: env.hubUrl, label: t.w.openReport };
  if (error) return <Frame title={title} sub={sub} link={link} message={t.loadError(error)} error />;
  if (!meta || data?.key !== key) return <Frame title={title} sub={sub} link={link} message={t.loading} />;
  const rows = data.result.rows;
  if (rows.length === 0) return <Frame title={title} sub={sub} link={link} message={cfg.view === "upcoming" ? t.w.noUpcoming : t.w.noData} />;

  const body = (() => {
    switch (cfg.view) {
      case "summary":
        return <Summary rows={rows} prev={data.prev} states={cfg.states} colors={meta.colors} env={env} />;
      case "trend":
      case "weekly": {
        const buckets = (cfg.view === "trend" ? monthBuckets : weekBuckets)(rows, cfg.dateField, req.from, req.to);
        const bars: Bar[] = buckets.map((b) => {
          const month = new Date(`${b.start}T00:00:00`).toLocaleDateString(t.locale, { month: "short", year: "2-digit" });
          return cfg.view === "trend"
            ? { ...b, label: month, tip: t.w.monthTip(month, b.total) }
            : { ...b, label: shortDay(b.start), tip: t.weekTip(shortDay(b.start), shortDay(b.end), b.total) };
        });
        return (
          <div className="flw-chart">
            <StackChart bars={bars} states={cfg.states} colors={meta.colors} label={sub} height={chartHeight(settings)} />
            <Legend states={cfg.states} colors={meta.colors} />
          </div>
        );
      }
      case "distribution":
        return <Distribution rows={rows} col={field(cfg.groupField)} env={env} />;
      case "upcoming":
        return <Upcoming rows={rows} dateField={field(cfg.dateField)} colors={meta.colors} env={env} />;
    }
  })();
  return (
    <Frame title={title} sub={sub} link={link}>
      {body}
      {data.result.truncated && <div className="flw-sub flw-error">{t.w.truncated}</div>}
    </Frame>
  );
}

const dot = (color: string | undefined) => ({ "--fl-state": color || undefined }) as React.CSSProperties;

function Legend({ states, colors }: { states: string[]; colors: Record<string, string> }) {
  return (
    <div className="flw-legend">
      {states.map((s) => (
        <span key={s} style={dot(colors[s])}>
          <span className="fl-dot" />
          {s}
        </span>
      ))}
    </div>
  );
}

/** 1: toplam, önceki dönemle fark ve state oranları. */
function Summary({ rows, prev, states, colors, env }: { rows: Row[]; prev?: number; states: string[]; colors: Record<string, string>; env: Env }) {
  const { t } = env;
  const total = rows.length;
  const counts = states.map((s) => ({ s, n: rows.filter((r) => r["System.State"] === s).length })).filter((x) => x.n > 0);
  const pct = (n: number) => Math.round((n / total) * 100);
  return (
    <div className="flw-summary">
      <div className="flw-big">
        <span className="flw-num">{total}</span>
        {prev !== undefined && (
          <span className="flw-delta">
            {t.prevPeriod(prev)}
            {prev > 0 && (
              <span className={total >= prev ? "fl-up" : "fl-down"}>
                {" · "}
                {total >= prev ? "+" : "−"}%{Math.round((Math.abs(total - prev) / prev) * 100)}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flw-stack" role="img" aria-label={counts.map((c) => `${c.s} ${c.n}`).join(", ")}>
        {counts.map((c) => (
          <span key={c.s} title={`${c.s}: ${c.n}`} style={{ width: `${(c.n / total) * 100}%`, background: colors[c.s] || "#8a8a8a" }} />
        ))}
      </div>
      <div className="flw-rows">
        {counts.map((c) => (
          <div key={c.s} className="flw-row" style={dot(colors[c.s])}>
            <span className="fl-dot" />
            <span className="flw-name">{c.s}</span>
            <span className="flw-n">{c.n}</span>
            <span className="flw-pct">%{pct(c.n)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 4: seçilen alana göre yatay çubuklar. */
function Distribution({ rows, col, env }: { rows: Row[]; col: Field; env: Env }) {
  const { t } = env;
  const { items, other } = countBy(rows, col, TOP);
  const list = other ? [...items, { value: t.w.other, count: other, rest: true }] : items;
  const max = Math.max(...list.map((x) => x.count));
  return (
    <div className="flw-scroll">
      {list.map((x) => (
        <div key={x.value + ("rest" in x ? "*" : "")} className={"rest" in x ? "flw-dist flw-rest" : "flw-dist"}>
          <span className="flw-name" title={x.value || t.w.blank}>
            {x.value || t.w.blank}
          </span>
          <span className="flw-track">
            <span style={{ width: `${(x.count / max) * 100}%` }} />
          </span>
          <span className="flw-n">{x.count}</span>
        </div>
      ))}
    </div>
  );
}

/** 5: tarih alanı önümüzdeki günlere düşen kayıtlar, en yakın önce. */
function Upcoming({ rows, dateField, colors, env }: { rows: Row[]; dateField: Field; colors: Record<string, string>; env: Env }) {
  const { t } = env;
  return (
    <div className="flw-scroll">
      <table className="flw-table">
        <tbody>
          {rows.slice(0, LIST_LIMIT).map((r) => {
            const id = Number(r["System.Id"]);
            const state = String(r["System.State"] ?? "");
            return (
              <tr key={id}>
                <td className="flw-when">{formatCell(r[dateField.referenceName], dateField.type)}</td>
                <td>
                  <a className="fl-link" href={env.itemUrl(id)} target="_blank" rel="noopener noreferrer">
                    {id}
                  </a>
                </td>
                <td className="flw-name" title={String(r["System.Title"] ?? "")}>
                  {String(r["System.Title"] ?? "")}
                </td>
                <td className="flw-state" style={dot(colors[state])}>
                  <span className="fl-dot" />
                  {state}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > LIST_LIMIT && <div className="flw-sub">{t.w.more(rows.length - LIST_LIMIT)}</div>}
    </div>
  );
}

startWidget("report-widget", (settings) => <Report settings={settings} />);
