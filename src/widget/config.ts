import { Assignee, compileRule, monthsRange, Preset, presetRange, Projects, upcomingRange, View, VIEWS } from "../hub/logic";

/** Widget ayarları ve doğrulaması; SDK'ya bağlı olmadığı için birim testlerde kullanılabilir. */
export interface WidgetConfig {
  view: View;
  /** Doluysa tür, tarih alanı, state'ler, atanan (ve aralık seçen görünümlerde aralık) bu paylaşılan kayıtlı sorgudan gelir. */
  queryId: string;
  /** Yalnızca kayıtlı sorgudan gelir. */
  assignee?: Assignee;
  /** Yalnızca kayıtlı sorgudan gelir; yoksa dashboard'un projesi. */
  projects?: Projects;
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

export const DEFAULTS: WidgetConfig = { queryId: "", view: "summary", type: "", dateField: "", states: [], preset: "lastMonth", months: 6, from: "", to: "", breakdown: "", breakdownRule: "", days: 14 };
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

/**
 * Ayar panelinde Kaydet: kayıtlı sorguya bağlıyken tür, tarih alanı, state'ler ve (Özet, Haftalık, Tarihe göre için) aralık
 * sorgudan gelir; formdaki bu alanlar boş olabilir. Aylık trendin ay aralığı ve kırılım kuralı yine widget'ındır.
 */
export const savable = (c: WidgetConfig) =>
  !c.queryId
    ? configured(c)
    : VIEWS.includes(c.view) &&
      (c.view !== "trend" || c.months !== 0 || customValid(c)) &&
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

