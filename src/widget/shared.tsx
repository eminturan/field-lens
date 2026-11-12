import "./widget.css";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IExtensionDataService,
  ILocationService,
  IProjectPageService,
} from "azure-devops-extension-api/Common/CommonServices";
import {
  ConfigurationEvent,
  IWidgetConfigurationContext,
  WidgetConfigurationSave,
  WidgetSettings,
  WidgetStatusHelper,
} from "azure-devops-extension-api/Dashboard";

import { createRestSource, DataSource } from "../hub/api";
import { firstOf, pickLang, Strings, STRINGS } from "../hub/i18n";
import { parseQueries, SavedQuery } from "../hub/logic";
import { localDocs } from "../hub/queryBar";
import { mockSource } from "../hub/mock";

/** vss-extension.json içindeki publisher ve extension id'si; widget tam id ile de kaydedilir. */
const EXTENSION = "turanemin.field-lens";

/** Azure DevOps dışında (npm run dev) açıldıysa örnek veri ve örnek ayarlarla çalışılır. */
export const inHost = window.self !== window.top;

export { configured, customValid, DAYS, DEFAULTS, MONTHS, plan, savable, usesCustom } from "./config";
export type { WidgetConfig } from "./config";
import { DEFAULTS, savable, WidgetConfig } from "./config";

export interface Env {
  source: DataSource;
  t: Strings;
  /** Hub ve work item bağlantıları; dashboard dışında "#". */
  hubUrl: string;
  itemUrl: (id: number, project?: string) => string;
  /** Projeyle paylaşılmış kayıtlı sorgular (okunamazsa boş). */
  sharedQueries(): Promise<SavedQuery[]>;
}

let env: Promise<Env> | undefined;

/** Veri kaynağı, dil ve bağlantılar; sayfa başına bir kez kurulur. */
export function connect(): Promise<Env> {
  return (env ??= (async () => {
    if (!inHost) {
      const lang = new URLSearchParams(window.location.search).get("lang") ?? navigator.language;
      return {
        source: mockSource(),
        t: STRINGS[pickLang(lang)],
        hubUrl: "/hub/hub.html",
        itemUrl: () => "#",
        sharedQueries: async () => parseQueries(await localDocs().get(true), true),
      };
    }
    await SDK.ready();
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
    const dataService = await SDK.getService<IExtensionDataService>(CommonServiceIds.ExtensionDataService);
    const manager = dataService.getExtensionDataManager(SDK.getExtensionContext().id, await SDK.getAccessToken());
    const collection = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const base = collection + encodeURIComponent(project);
    return {
      source: createRestSource(baseUrl, () => SDK.getAccessToken(), project),
      t: STRINGS[pickLang(culture)],
      hubUrl: `${base}/_apps/hub/${EXTENSION}.hub`,
      // base proje adresi; başka projedeki kayıt için koleksiyon adresi + o projenin adı kullanılır.
      itemUrl: (id, p) => (p ? `${collection}${encodeURIComponent(p)}` : base) + `/_workitems/edit/${id}`,
      // Rapor sayfasıyla aynı koleksiyon: proje başına ortak liste. Okunamazsa boş sayılır.
      sharedQueries: () =>
        manager
          .then((m) => m.getDocuments(`queries-${projectInfo.id}`, { scopeType: "Default" }))
          .then((d) => parseQueries(d, true), () => []),
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
    return { ...c, queryId: typeof c.queryId === "string" ? c.queryId : "", states: Array.isArray(c.states) ? c.states.map(String) : [] };
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
    onSave: () => (savable(current) ? WidgetConfigurationSave.Valid(custom()) : WidgetConfigurationSave.Invalid()),
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
