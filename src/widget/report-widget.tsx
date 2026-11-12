import * as React from "react";
import { WidgetSettings } from "azure-devops-extension-api/Dashboard";

import { RunResult } from "../hub/api";
import { Bar, Donut, fullDay, shortDay, Slice, StackChart, weekLabel } from "../hub/chart";
import {
  countBy,
  dayBuckets,
  Field,
  formatCell,
  monthBuckets,
  compileRule,
  DERIVED,
  deriveRows,
  previousRange,
  Query,
  Row,
  View,
  weekBuckets,
} from "../hub/logic";
import { configured, DEFAULTS, Env, Frame, inHost, parseSettings, plan, startWidget, useEnv, usesCustom, WidgetConfig } from "./shared";

/** Yaklaşanlar listesinde gösterilen en fazla kayıt. */
const LIST_LIMIT = 100;

interface Meta {
  fields: Map<string, Field>;
  colors: Record<string, string>;
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
        preset: "last90",
        breakdown: new URLSearchParams(window.location.search).get("breakdown") ?? "",
        breakdownRule: new URLSearchParams(window.location.search).get("rule") ?? "",
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
  const viewName = cfg.view === "summary" && cfg.breakdown ? `${t.w.views.summary}: ${field(cfg.breakdown).name}` : t.w.views[cfg.view];
  const sub = [viewName, cfg.type, field(cfg.dateField).name, `${span} (${day(req.from)} – ${day(req.to)})`].join(" · ");
  const link = { href: env.hubUrl, label: t.w.openReport };
  if (error) return <Frame title={title} sub={sub} link={link} message={t.loadError(error)} error />;
  if (!meta || data?.key !== key) return <Frame title={title} sub={sub} link={link} message={t.loading} />;
  const rows = data.result.rows;
  if (rows.length === 0) return <Frame title={title} sub={sub} link={link} message={cfg.view === "upcoming" ? t.w.noUpcoming : t.w.noData} />;

  const body = (() => {
    switch (cfg.view) {
      case "summary":
        return (
          <Summary
            rows={rows}
            prev={data.prev}
            states={cfg.states}
            colors={meta.colors}
            breakdown={cfg.breakdown ? field(cfg.breakdown) : undefined}
            rule={cfg.breakdownRule}
            env={env}
          />
        );
      case "trend":
      case "weekly":
      case "daily": {
        const bucket = cfg.view === "trend" ? monthBuckets : cfg.view === "weekly" ? weekBuckets : dayBuckets;
        const bars: Bar[] = bucket(rows, cfg.dateField, req.from, req.to).map((b) => {
          if (cfg.view === "trend") {
            const month = new Date(`${b.start}T00:00:00`).toLocaleDateString(t.locale, { month: "short", year: "2-digit" });
            return { ...b, label: month, tip: t.w.barTip(month, b.total) };
          }
          return cfg.view === "weekly"
            ? { ...b, label: weekLabel(b.start, b.end), tip: t.weekTip(fullDay(b.start), fullDay(b.end), b.total) }
            : { ...b, label: shortDay(b.start), tip: t.w.barTip(fullDay(b.start), b.total) };
        });
        return (
          <div className="flw-chart">
            <StackChart bars={bars} states={cfg.states} colors={meta.colors} label={sub} height={chartHeight(settings)} />
            <Legend states={cfg.states} colors={meta.colors} />
          </div>
        );
      }
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

/** Kırılım alanı değerleri için renkler (Azure DevOps grafik paletine yakın); "Diğer" gri. */
const PALETTE = ["#4c9bd6", "#e8913a", "#bfbfbf", "#f2c04e", "#3b7dd8", "#8a4fb0", "#a6c85a"];
const OTHER = "#8a8a8a";
/** Halkada ayrı dilim olarak gösterilen en fazla değer; kalanlar "Diğer"de toplanır. */
const TOP = 7;

/** 1: toplam ve önceki dönemle fark; halka state'lere ya da seçilen kırılım alanının değerlerine göre bölünür. */
function Summary(props: { rows: Row[]; prev?: number; states: string[]; colors: Record<string, string>; breakdown?: Field; rule?: string; env: Env }) {
  const { rows, prev, states, colors, breakdown, env } = props;
  const { t } = env;
  const total = rows.length;
  let slices: Slice[];
  if (breakdown) {
    // Kural varsa değerler önce kuraldan geçirilir (örn. kişi adı atılıp birim bırakılır).
    const re = props.rule ? compileRule(props.rule) : undefined;
    const { items, other } =
      re instanceof RegExp
        ? countBy(deriveRows(rows, breakdown, re, t.rule.unmatched), { referenceName: DERIVED, name: breakdown.name, type: "string" }, TOP)
        : countBy(rows, breakdown, TOP);
    slices = items.map((x, i) => ({ label: x.value || t.w.blank, value: x.count, color: PALETTE[i] }));
    if (other) slices.push({ label: t.w.other, value: other, color: OTHER });
  } else {
    slices = states
      .map((s) => ({ label: s, value: rows.filter((r) => r["System.State"] === s).length, color: colors[s] || OTHER }))
      .filter((x) => x.value > 0);
  }
  return (
    <div className="flw-summary">
      {prev !== undefined && (
        <div className="flw-delta">
          {t.prevPeriod(prev)}
          {prev > 0 && (
            <span className={total >= prev ? "fl-up" : "fl-down"}>
              {" · "}
              {total >= prev ? "+" : "−"}%{Math.round((Math.abs(total - prev) / prev) * 100)}
            </span>
          )}
        </div>
      )}
      <div className="flw-donut">
        <Donut slices={slices} label={slices.map((x) => `${x.label} ${x.value}`).join(", ")} />
        <div className="flw-rows">
          {slices.map((x) => (
            <div key={x.label} className="flw-row" style={dot(x.color)} title={`${x.label}: ${x.value}`}>
              <span className="fl-dot" />
              <span className="flw-name">{x.label}</span>
              <span className="flw-n">{x.value}</span>
              <span className="flw-pct">%{Math.round((x.value / total) * 100)}</span>
            </div>
          ))}
        </div>
      </div>
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
