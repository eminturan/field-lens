import "./widget.css";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import { CommonServiceIds, ILocationService, IProjectPageService } from "azure-devops-extension-api/Common/CommonServices";
import {
  ConfigurationEvent,
  IWidgetConfigurationContext,
  WidgetConfigurationSave,
  WidgetSettings,
  WidgetStatusHelper,
} from "azure-devops-extension-api/Dashboard";

import { createRestSource, DataSource } from "../hub/api";
import { firstOf, pickLang, Strings, STRINGS } from "../hub/i18n";
import { compileRule, monthsRange, Preset, presetRange, upcomingRange, View, VIEWS } from "../hub/logic";
import { mockSource } from "../hub/mock";

/** vss-extension.json içindeki publisher ve extension id'si; widget tam id ile de kaydedilir. */
const EXTENSION = "turanemin.field-lens";

/** Azure DevOps dışında (npm run dev) açıldıysa örnek veri ve örnek ayarlarla çalışılır. */
export const inHost = window.self !== window.top;

export interface WidgetConfig {
  view: View;
  type: string;
  dateField: string;
  states: string[];
  /** Özet, haftalık ve tarihe göre için aralık. Göreli olanlar dashboard'u kendiliğinden güncel tutar; "custom" from–to kullanır. */
  preset: Preset;
  /** Özet için isteğe bağlı kırılım alanı: doluysa halka state yerine bu alanın değerlerine göre bölünür. */
  breakdown: string;
  /** Kırılım alanının görünen değerine uygulanacak isteğe bağlı kural (regex); boşsa değer olduğu gibi kullanılır. */
  breakdownRule: string;
  /** Aylık trend için ay sayısı; 0 = özel aralık (from–to). */
  months: number;
  from: string;
  to: string;
  days: number;
}

export const DEFAULTS: WidgetConfig = { view: "summary", type: "", dateField: "", states: [], preset: "lastMonth", months: 6, from: "", to: "", breakdown: "", breakdownRule: "", days: 14 };
export const MONTHS = [3, 6, 12];
export const DAYS = [7, 14, 30, 60];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Görünüm özel aralık kullanıyor mu (yaklaşanlar her zaman bugünden ileriye bakar). */
export const usesCustom = (c: WidgetConfig) => (c.view === "trend" ? c.months === 0 : c.view !== "upcoming" && c.preset === "custom");
export const customValid = (c: WidgetConfig) => DATE.test(c.from) && DATE.test(c.to) && c.from <= c.to;

export const configured = (c: WidgetConfig) =>
  VIEWS.includes(c.view) &&
  !!c.type &&
  !!c.dateField &&
  c.states.length > 0 &&
  (!usesCustom(c) || customValid(c)) &&
  (c.view !== "summary" || !c.breakdown || !c.breakdownRule || typeof compileRule(c.breakdownRule) !== "string");

/** Görünümün veri isteği: hangi aralık ve hangi kolonlar. */
export function plan(cfg: WidgetConfig, now: Date): { from: string; to: string; columns: string[] } {
  const range = usesCustom(cfg)
    ? { from: cfg.from, to: cfg.to }
    : cfg.view === "trend"
      ? monthsRange(cfg.months, now)
      : cfg.view === "upcoming"
        ? upcomingRange(cfg.days, now)
        : presetRange(cfg.preset as Exclude<Preset, "custom">, now);
  const columns =
    cfg.view === "upcoming"
      ? ["System.Title", "System.State", cfg.dateField]
      : cfg.view === "summary" && cfg.breakdown
        ? ["System.State", cfg.dateField, cfg.breakdown]
        : ["System.State", cfg.dateField];
  return { ...range, columns };
}

export interface Env {
  source: DataSource;
  t: Strings;
  /** Hub ve work item bağlantıları; dashboard dışında "#". */
  hubUrl: string;
  itemUrl: (id: number) => string;
}

let env: Promise<Env> | undefined;

/** Veri kaynağı, dil ve bağlantılar; sayfa başına bir kez kurulur. */
export function connect(): Promise<Env> {
  return (env ??= (async () => {
    if (!inHost) {
      const lang = new URLSearchParams(window.location.search).get("lang") ?? navigator.language;
      return { source: mockSource(), t: STRINGS[pickLang(lang)], hubUrl: "#", itemUrl: () => "#" };
    }
    await SDK.ready();
    const baseUrl = await (await SDK.getService<ILocationService>(CommonServiceIds.LocationService)).getServiceLocation();
    // Azure DevOps Server 2022'de getPageContext() hata fırlatır; sırayla sayfa diline ve tarayıcı diline düşülür.
    const culture = firstOf([
      () => SDK.getPageContext().globalization.culture,
      () => window.parent.document.documentElement.lang,
      () => navigator.language,
    ]);
    const project = (await (await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService)).getProject())?.name;
    if (!project) throw new Error("Project not found");
    const base = (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/") + encodeURIComponent(project);
    return {
      source: createRestSource(baseUrl, () => SDK.getAccessToken(), project),
      t: STRINGS[pickLang(culture)],
      hubUrl: `${base}/_apps/hub/${EXTENSION}.hub`,
      itemUrl: (id) => `${base}/_workitems/edit/${id}`,
    };
  })());
}

export function useEnv(): Env | undefined {
  const [value, setValue] = React.useState<Env>();
  React.useEffect(() => {
    connect().then(setValue, () => undefined);
  }, []);
  return value;
}

export function parseSettings(settings: WidgetSettings | undefined): WidgetConfig {
  try {
    const c = { ...DEFAULTS, ...JSON.parse(settings?.customSettings?.data || "{}") };
    return { ...c, states: Array.isArray(c.states) ? c.states.map(String) : [] };
  } catch {
    return DEFAULTS;
  }
}

const root = () => document.getElementById("root");
/** Host nesneyi kısa ya da tam contribution id'siyle isteyebilir; ikisi de kaydedilir. */
const register = (id: string, instance: object) => {
  SDK.register(id, instance);
  SDK.register(`${EXTENSION}.${id}`, instance);
};

/** @param view Widget ayarlarından (dashboard dışında undefined) görünümü üretir. */
export function startWidget(id: string, view: (settings?: WidgetSettings) => React.ReactElement) {
  const show = (settings?: WidgetSettings) => ReactDOM.render(view(settings), root());
  if (!inHost) {
    show();
    return;
  }
  const load = (settings: WidgetSettings) => {
    show(settings);
    return WidgetStatusHelper.Success();
  };
  register(id, { preload: () => WidgetStatusHelper.Success(), load, reload: load });
  SDK.init();
}

/** Widget ayar paneli. Her değişiklik host'a bildirilir (önizleme güncellenir, Kaydet etkinleşir). */
export function startConfig(
  id: string,
  initial: WidgetConfig,
  Form: React.ComponentType<{ value: WidgetConfig; onChange: (value: WidgetConfig) => void; env: Env }>,
) {
  let current = initial;
  let context: IWidgetConfigurationContext | undefined;
  const custom = () => ({ data: JSON.stringify(current) });

  // Panelin kendi zemini görünsün: koyu temada iframe ayrı bir kutu gibi durmaz.
  document.body.style.background = "transparent";

  function Host() {
    const ready = useEnv();
    const [value, setValue] = React.useState(current);
    // Panelin yüksekliği içeriğe uyar: state listesi ve alan seçici açıldığında da.
    React.useEffect(() => {
      const form = root()?.firstElementChild;
      if (!inHost || !ready || !form) return;
      const fit = () => SDK.resize(undefined, Math.ceil(form.getBoundingClientRect().height) + 16);
      fit();
      const observer = new ResizeObserver(fit);
      observer.observe(form);
      return () => observer.disconnect();
    }, [ready]);
    if (!ready) return null;
    return (
      <Form
        value={value}
        env={ready}
        onChange={(next) => {
          current = next;
          setValue(next);
          context?.notify(ConfigurationEvent.ConfigurationChange, ConfigurationEvent.Args(custom()));
        }}
      />
    );
  }

  if (!inHost) {
    ReactDOM.render(<Host />, root());
    return;
  }
  register(id, {
    load: (settings: WidgetSettings, ctx: IWidgetConfigurationContext) => {
      current = parseSettings(settings);
      context = ctx;
      ReactDOM.render(<Host />, root());
      return WidgetStatusHelper.Success();
    },
    onSave: () => (configured(current) ? WidgetConfigurationSave.Valid(custom()) : WidgetConfigurationSave.Invalid()),
  });
  SDK.init();
}

/** Widget çerçevesi: başlık, alt başlık, "Raporu aç" ve içerik ya da durum mesajı. */
export function Frame(props: { title: string; sub?: string; link?: { href: string; label: string }; message?: string; error?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flw">
      <div className="flw-head">
        <div className="flw-title" title={props.title}>
          {props.title}
        </div>
        {props.link && (
          <a className="flw-link" href={props.link.href} target="_top">
            {props.link.label}
          </a>
        )}
      </div>
      {props.sub && (
        <div className="flw-sub" title={props.sub}>
          {props.sub}
        </div>
      )}
      {props.message ? <div className={`flw-msg${props.error ? " flw-error" : ""}`}>{props.message}</div> : props.children}
    </div>
  );
}
