/** Dashboard widget görünümleri, oluşturulma sırasıyla. */
export type View = "summary" | "trend" | "weekly" | "daily" | "upcoming";
export const VIEWS: View[] = ["summary", "trend", "weekly", "daily", "upcoming"];

export type Preset = "last15" | "last30" | "last90" | "thisMonth" | "lastMonth" | "custom";
/** Rapor sayfasının açılıştaki aralığı. */
export const DEFAULT_PRESET: Exclude<Preset, "custom"> = "thisMonth";
export const PRESETS: Preset[] = ["last15", "last30", "last90", "thisMonth", "lastMonth", "custom"];

/** `_apis/wit/fields` kaydı; type örn. "dateTime", "identity", "html", "string". */
export interface Field {
  referenceName: string;
  name: string;
  type: string;
}

/** from/to "YYYY-MM-DD", ikisi de dahil. */
/** Atanan filtresi: yok (herkes), sorguyu çalıştıran kişi ya da atanmamış. */
export type Assignee = "me" | "none";
export const ASSIGNEES: Assignee[] = ["me", "none"];

/** Sorgunun kapsamı: yok = hub'ın açıldığı proje, "all" = görülebilen tüm projeler, liste = seçili projeler (adlarıyla). */
export type Projects = "all" | string[];

/** Ek alan koşulu; type alanın türüdür (değerin nasıl yazılacağını belirler). */
export type Op = "=" | "<>" | "<" | ">" | "<=" | ">=" | "contains" | "notContains" | "under" | "notUnder";
export interface Condition {
  field: string;
  type: string;
  op: Op;
  value: string;
}

export interface Query {
  conditions?: Condition[];
  projects?: Projects;
  assignee?: Assignee;
  type: string;
  dateField: string;
  from: string;
  to: string;
  states: string[];
  columns: string[];
}

/** Türetilmiş kolon: kaynak alanın görünen değerine regex uygulanır, eşleşen ilk kısım yeni kolona yazılır. */
export interface Rule {
  source: string;
  pattern: string;
  name: string;
}

/** Türetilmiş kolonun sanal referans adı; sunucudan istenmez, satırlara tarayıcıda eklenir. */
export const DERIVED = "FieldLens.Derived";

export interface Settings {
  conditions?: Condition[];
  projects?: Projects;
  assignee?: Assignee;
  derived?: Rule;
  type?: string;
  dateField?: string;
  preset?: Preset;
  from?: string;
  to?: string;
  states?: string[];
  columns?: string[];
}

/** workitemsbatch'ten gelen alanlar + "System.Id". */
export type Row = Record<string, unknown>;

/** Varsayılan kolonlar; seçilen tarih alanı arayüzde sona eklenir. */
export const DEFAULT_COLUMNS = ["System.Id", "System.Title", "System.State"];

// Harf (Türkçe dahil), rakam, _ ve . ; ] ve ' girmediği için WIQL'e güvenle konur.
const FIELD_REF = /^[\p{L}\p{N}_.]+$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const esc = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function buildWiql(q: Query): string {
  if (!FIELD_REF.test(q.dateField)) throw new Error(`Invalid field: ${q.dateField}`);
  if (!DATE.test(q.from) || !DATE.test(q.to)) throw new Error("Invalid date");
  if (q.states.length === 0) throw new Error("No states selected");
  if (Array.isArray(q.projects) && q.projects.length === 0) throw new Error("No projects selected");
  const f = `[${q.dateField}]`;
  return [
    "SELECT [System.Id] FROM WorkItems",
    q.projects === undefined
      ? "WHERE [System.TeamProject] = @project"
      : q.projects === "all"
        ? "WHERE [System.Id] > 0"
        : `WHERE [System.TeamProject] IN (${q.projects.map(esc).join(", ")})`,
    `AND [System.WorkItemType] = ${esc(q.type)}`,
    `AND ${f} >= '${q.from}'`,
    `AND ${f} <= '${q.to}'`,
    `AND [System.State] IN (${q.states.map(esc).join(", ")})`,
    ...(q.conditions ?? []).map(conditionClause),
    ...(q.assignee === "me" ? ["AND [System.AssignedTo] = @Me"] : q.assignee === "none" ? ["AND [System.AssignedTo] = ''"] : []),
    `ORDER BY ${f} ASC`,
  ].join(" ");
}

const NUMERIC = ["integer", "double"];
const LONG_TEXT = ["plainText", "html", "history"];
const COMPARE: Op[] = ["=", "<>", "<", ">", "<=", ">="];

/** Alan türüne göre kullanılabilen koşullar (WIQL'in desteklediği kadar). */
export function opsFor(type: string): Op[] {
  if (NUMERIC.includes(type) || type === "dateTime") return COMPARE;
  if (type === "boolean") return ["=", "<>"];
  if (LONG_TEXT.includes(type)) return ["contains", "notContains"];
  if (type === "treePath") return ["=", "<>", "under", "notUnder"];
  return ["=", "<>", "contains", "notContains"];
}

/** Koşulun sorunu: alan adı, koşul türü ya da değer. Değerler WIQL'e yazılmadan önce burada doğrulanır. */
export function checkCondition(c: Condition): "field" | "op" | "value" | undefined {
  if (!FIELD_REF.test(c.field)) return "field";
  if (!opsFor(c.type).includes(c.op)) return "op";
  const v = c.value.trim();
  if (NUMERIC.includes(c.type)) return /^-?\d+(\.\d+)?$/.test(v) ? undefined : "value";
  if (c.type === "dateTime") return DATE.test(v) ? undefined : "value";
  if (c.type === "boolean") return v === "true" || v === "false" ? undefined : "value";
  if (c.value.length > 200 || (!v && c.op !== "=" && c.op !== "<>")) return "value";
  return undefined;
}

const WIQL_OP: Record<Op, string> = { "=": "=", "<>": "<>", "<": "<", ">": ">", "<=": "<=", ">=": ">=", contains: "CONTAINS", notContains: "NOT CONTAINS", under: "UNDER", notUnder: "UNDER" };

function conditionClause(c: Condition): string {
  if (checkCondition(c)) throw new Error(`Invalid condition: ${c.field}`);
  const v = c.value.trim();
  const literal = NUMERIC.includes(c.type) ? v : c.type === "boolean" ? (v === "true" ? "True" : "False") : esc(c.type === "dateTime" ? v : c.value);
  return `AND ${c.op === "notUnder" ? "NOT " : ""}[${c.field}] ${WIQL_OP[c.op]} ${literal}`;
}

/** Panoya düz metin: sekmeyle ayrılmış, hücre içindeki sekme ve satır sonları boşluk olur. */
export const toTsv = (rows: string[][]) => rows.map((r) => r.map((v) => v.replace(/[\t\r\n]+/g, " ")).join("\t")).join("\r\n");

const html = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Panoya HTML tablo (Teams, e-posta ve Excel biçimiyle yapıştırır); ilk satır başlık, her hücre kaçışlanır. */
export const toHtmlTable = ([head, ...body]: string[][]) =>
  `<table><thead><tr>${head.map((v) => `<th>${html(v)}</th>`).join("")}</tr></thead><tbody>${body
    .map((r) => `<tr>${r.map((v) => `<td>${html(v)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

const p2 = (n: number) => String(n).padStart(2, "0");
export const toDateInput = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

export function presetRange(preset: Exclude<Preset, "custom">, now: Date): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = toDateInput(now);
  switch (preset) {
    case "thisMonth":
      return { from: toDateInput(new Date(y, m, 1)), to: today };
    case "lastMonth":
      return { from: toDateInput(new Date(y, m - 1, 1)), to: toDateInput(new Date(y, m, 0)) };
    default: {
      const days = { last15: 15, last30: 30, last90: 90 }[preset];
      return { from: toDateInput(new Date(y, m, now.getDate() - (days - 1))), to: today };
    }
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

export function formatCell(value: unknown, fieldType: string | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "displayName" in value) return String((value as { displayName: unknown }).displayName ?? "");
  if (fieldType === "dateTime" && typeof value === "string") {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const time = d.getHours() || d.getMinutes() ? ` ${p2(d.getHours())}:${p2(d.getMinutes())}` : "";
    return toDateInput(d) + time;
  }
  if (fieldType === "html" && typeof value === "string") {
    return value
      .replace(/<(br|\/?(p|div|li|tr|h\d))\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e])
      .replace(/\s+/g, " ")
      .trim();
  }
  return String(value);
}

/** Excel formül enjeksiyonuna karşı =,+,-,@ ile başlayan hücrelerin başına ' eklenir. */
/** Excel'in formül olarak çalıştıracağı başlangıçların önüne ' koyar (CSV ve panoya kopyalama). */
export const protectCell = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function toCsv(rows: string[][], separator: string): string {
  const cell = (v: string) => {
    const text = protectCell(v);
    return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((r) => r.map(cell).join(separator)).join("\r\n");
}

export function csvRows(rows: Row[], columns: Field[]): string[][] {
  return [columns.map((c) => c.name), ...rows.map((r) => columns.map((c) => formatCell(r[c.referenceName], c.type)))];
}

/** Kayıtlı seçimlerden artık projede olmayan tür/alanları atar. State'ler türle birlikte düşer; tür içi kontrol arayüzde yapılır. */
export function sanitizeSettings(s: Settings | undefined, types: string[], fields: Field[], projectNames?: string[]): Settings {
  if (!s) return {};
  const out: Settings = { ...s };
  if (Array.isArray(s.projects) && projectNames) {
    const kept = s.projects.filter((p) => projectNames.includes(p));
    out.projects = kept.length ? kept : undefined;
  }
  const refs = new Set(fields.map((f) => f.referenceName));
  if ("type" in s && !types.includes(s.type ?? "")) {
    out.type = undefined;
    out.states = [];
  }
  if ("dateField" in s && !fields.some((f) => f.referenceName === s.dateField && f.type === "dateTime")) out.dateField = undefined;
  const derivedOk = !!s.derived && refs.has(s.derived.source);
  if ("derived" in s && !derivedOk) out.derived = undefined;
  if (s.conditions) out.conditions = s.conditions.filter((c) => refs.has(c.field));
  if (s.columns) out.columns = s.columns.filter((c) => refs.has(c) || (c === DERIVED && derivedOk));
  return out;
}

/**
 * Arama için harf katlama: Türkçe küçük harfe çevirir, sonra ı'yı i yapar. Böylece "GIT" (→ "gıt") ile "git",
 * "İSTANBUL" ile "istanbul" eşleşir; proje ve alan adları çoğunlukla İngilizce harflerle yazıldığı için.
 */
export const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i");

/** Görünen ad ya da referans adında geçenler; adı aramayla başlayanlar önce, sonra mevcut sıra. */
export function searchFields(fields: Field[], text: string): Field[] {
  const q = fold(text.trim());
  if (!q) return fields;
  const low = fold;
  const hits = fields.filter((f) => low(f.name).includes(q) || low(f.referenceName).includes(q));
  return [...hits.filter((f) => low(f.name).startsWith(q)), ...hits.filter((f) => !low(f.name).startsWith(q))];
}

/** from'daki öğeyi to sırasına taşır (yeni dizi); to listeye sığdırılır, geçersiz from'da liste aynen döner. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(Math.min(Math.max(0, to), out.length), 0, item);
  return out;
}

/** 0 tabanlı sayfa; sayfa aralık dışındaysa son sayfaya çekilir. first/last 1 tabanlı satır numaraları. */
export function pageSlice<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(0, page), pages - 1);
  const items = rows.slice(p * size, (p + 1) * size);
  return { items, page: p, pages, first: items.length ? p * size + 1 : 0, last: p * size + items.length };
}

/** Satırları state'e göre sayar: verilen sırayla (sıfırlar dahil), listede olmayanlar sona. */
export function countStates(rows: Row[], states: string[]): { state: string; count: number }[] {
  const counts = new Map<string, number>(states.map((s) => [s, 0]));
  for (const r of rows) {
    const s = String(r["System.State"] ?? "");
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts].map(([state, count]) => ({ state, count }));
}

const lowTr = fold;

/** Tabloda görünen metinde arar (Türkçe büyük/küçük harf duyarsız). global her kolonda, byCol yalnızca kendi kolonunda; hepsi sağlanmalı. */
export function filterRows(rows: Row[], columns: Field[], global: string, byCol: Record<string, string>): Row[] {
  const g = lowTr(global.trim());
  const per = columns.map((c) => [c, lowTr((byCol[c.referenceName] ?? "").trim())] as const).filter(([, q]) => q);
  if (!g && per.length === 0) return rows;
  const text = (r: Row, c: Field) => lowTr(formatCell(r[c.referenceName], c.type));
  return rows.filter((r) => (!g || columns.some((c) => text(r, c).includes(g))) && per.every(([c, q]) => text(r, c).includes(q)));
}

/** Yeni dizi döner. Sayılar sayısal, tarihler zamana göre, diğerleri görünen metne göre doğal sırada; boşlar her yönde sonda. */
export function sortRows(rows: Row[], col: Field, dir: "asc" | "desc"): Row[] {
  const numeric = col.type === "integer" || col.type === "double";
  const key = (r: Row): number | string | undefined => {
    const v = r[col.referenceName];
    if (v === null || v === undefined || v === "") return undefined;
    if (numeric) return Number(v);
    if (col.type === "dateTime") return Date.parse(String(v));
    return formatCell(v, col.type);
  };
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((r) => [r, key(r)] as const)
    .sort(([, a], [, b]) => {
      if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? 1 : -1;
      const c = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "tr", { numeric: true, sensitivity: "base" });
      return c * sign;
    })
    .map(([r]) => r);
}

const parseDay = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const addDays = (d: string, n: number) => {
  const x = parseDay(d);
  return toDateInput(new Date(x.getFullYear(), x.getMonth(), x.getDate() + n));
};
const daysBetween = (from: string, to: string) => Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86400000);
/** Değerin yerel günü ("YYYY-MM-DD"); boş ya da geçersizse undefined. */
const localDay = (v: unknown) => {
  if (v === null || v === undefined || v === "") return undefined;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : toDateInput(d);
};

/** Karşılaştırma dönemi: tam takvim ayıysa bir önceki ay, değilse hemen önceki aynı uzunlukta aralık. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const f = parseDay(from);
  const monthEnd = toDateInput(new Date(f.getFullYear(), f.getMonth() + 1, 0));
  if (f.getDate() === 1 && to === monthEnd) {
    return { from: toDateInput(new Date(f.getFullYear(), f.getMonth() - 1, 1)), to: toDateInput(new Date(f.getFullYear(), f.getMonth(), 0)) };
  }
  const days = daysBetween(from, to) + 1;
  return { from: addDays(from, -days), to: addDays(from, -1) };
}

export interface WeekBucket {
  start: string;
  end: string;
  total: number;
  counts: Record<string, number>;
}

/** Pazartesi–pazar takvim haftaları (ilk ve son hafta aralıkla kesilir); her dilimde state başına sayı. */
export function weekBuckets(rows: Row[], dateField: string, from: string, to: string): WeekBucket[] {
  const monday = addDays(from, -((parseDay(from).getDay() + 6) % 7));
  const out: WeekBucket[] = [];
  for (let i = 0; addDays(monday, i) <= to; i += 7) {
    const start = addDays(monday, i);
    const end = addDays(monday, i + 6);
    out.push({ start: start < from ? from : start, end: end > to ? to : end, total: 0, counts: {} });
  }
  for (const r of rows) {
    const day = localDay(r[dateField]);
    if (!day || day < from || day > to) continue;
    add(out[Math.floor(daysBetween(monday, day) / 7)], r);
  }
  return out;
}

/** Kaydı dilime state'iyle sayar. */
function add(b: WeekBucket, r: Row) {
  const s = String(r["System.State"] ?? "");
  b.total++;
  b.counts[s] = (b.counts[s] ?? 0) + 1;
}

/** Tarih alanında kayıt olan her yerel gün için bir dilim, tarih sırasıyla; boş günler yok. */
export function dayBuckets(rows: Row[], dateField: string, from: string, to: string): WeekBucket[] {
  const days = new Map<string, WeekBucket>();
  for (const r of rows) {
    const day = localDay(r[dateField]);
    if (!day || day < from || day > to) continue;
    if (!days.has(day)) days.set(day, { start: day, end: day, total: 0, counts: {} });
    add(days.get(day)!, r);
  }
  return [...days.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** Son N takvim ayı: (N-1) ay önceki ayın ilk günü – bugün. */
export function monthsRange(months: number, now: Date): { from: string; to: string } {
  return { from: toDateInput(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)), to: toDateInput(now) };
}

/** Bugün ve sonraki N-1 gün. */
export function upcomingRange(days: number, now: Date): { from: string; to: string } {
  return { from: toDateInput(now), to: toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1)) };
}

/** Takvim ayı başına bir dilim (ilk ve son dilim aralıkla kesilir); her dilimde state başına sayı. */
export function monthBuckets(rows: Row[], dateField: string, from: string, to: string): WeekBucket[] {
  const out: WeekBucket[] = [];
  const index = new Map<string, WeekBucket>();
  for (let d = parseDay(from); toDateInput(d) <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const start = toDateInput(d);
    const end = toDateInput(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const b: WeekBucket = { start, end: end > to ? to : end, total: 0, counts: {} };
    out.push(b);
    index.set(start.slice(0, 7), b);
  }
  for (const r of rows) {
    const day = localDay(r[dateField]);
    const b = day && day >= from && day <= to ? index.get(day.slice(0, 7)) : undefined;
    if (b) add(b, r);
  }
  return out;
}

// İç içe tekrar ((a+)+, (\w*)*) üstel geri izlemeyle sekmeyi dondurabilir; widget kuralı panoyu açan herkesin tarayıcısında çalışır.
// shortcut: yaygın biçimleri yakalar, (a|aa)+ gibi çakışan seçenekler geçer; gerekirse kuralı zaman aşımlı bir Worker'da çalıştır.
const NESTED = /\([^()]*(?:[+*]|\{\d+,\d*\})[^()]*\)(?:[+*]|\{\d+,)/;
/** Kurala yalnızca değerin bu kadar karakteri verilir. */
const RULE_TEXT_MAX = 500;

/** Kuralı derler; geçersizse (ya da boşsa) hata metnini döner. Kullanıcının kendi tarayıcısında çalışır. */
export function compileRule(pattern: string): RegExp | string {
  if (!pattern.trim()) return "empty";
  if (NESTED.test(pattern.replace(/\\./g, "_").replace(/\[[^\]]*\]/g, "_"))) return "Nested quantifiers like (a+)+ are not allowed: they can freeze the browser";
  try {
    return new RegExp(pattern, "u");
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/** Metinde kurala uyan ilk kısım (kırpılmış); eşleşme yoksa undefined. */
export function applyRule(text: string, re: RegExp): string | undefined {
  const m = re.exec(text.slice(0, RULE_TEXT_MAX));
  return m ? m[0].trim() : undefined;
}

/** Satırların kopyasına DERIVED kolonunu ekler: kaynak boşsa "", eşleşmezse `unmatched`. */
export function deriveRows(rows: Row[], source: Field, re: RegExp, unmatched: string): Row[] {
  return rows.map((r) => {
    const text = formatCell(r[source.referenceName], source.type);
    return { ...r, [DERIVED]: text ? (applyRule(text, re) ?? unmatched) : "" };
  });
}

/** Görünen değer × state sayımı: toplamı büyük olan önce (eşitlikte ada göre); boş değer "". */
export function crossCount(rows: Row[], col: Field): { value: string; total: number; counts: Record<string, number> }[] {
  const by = new Map<string, { value: string; total: number; counts: Record<string, number> }>();
  for (const r of rows) {
    const value = formatCell(r[col.referenceName], col.type);
    const state = String(r["System.State"] ?? "");
    const e = by.get(value) ?? { value, total: 0, counts: {} };
    e.total++;
    e.counts[state] = (e.counts[state] ?? 0) + 1;
    by.set(value, e);
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.value.localeCompare(b.value, "tr"));
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** İsim verilerek saklanan sorgu. shared: proje genelindeki listede durur; __etag: Extension Data Service sürümü. */
export interface SavedQuery {
  id: string;
  name: string;
  shared: boolean;
  ownerId: string;
  ownerName: string;
  settings: Settings;
  __etag?: number;
}

export const QUERY_NAME_MAX = 80;

/** Ad sorunu: boş, çok uzun ya da (büyük/küçük harf farkı gözetmeden) listede var; exceptId kendi adını korur. */
export function nameError(name: string, list: SavedQuery[], exceptId?: string): "empty" | "long" | "duplicate" | undefined {
  const n = name.trim();
  if (!n) return "empty";
  if (n.length > QUERY_NAME_MAX) return "long";
  const low = fold(n);
  if (list.some((q) => q.id !== exceptId && fold(q.name) === low)) return "duplicate";
  return undefined;
}

/** Ayarların karşılaştırma anahtarı; eksik değerler formun varsayılanı sayılır, göreli aralıkta tarihler (o güne göre hesaplandığından) sayılmaz. */
export function settingsKey(s: Settings): string {
  const d = s.derived;
  const preset = s.preset ?? DEFAULT_PRESET;
  return JSON.stringify([
    s.type ?? "",
    s.dateField ?? "",
    preset,
    preset === "custom" ? [s.from ?? "", s.to ?? ""] : [],
    s.states ?? [],
    s.columns?.length ? s.columns : DEFAULT_COLUMNS,
    d && (d.source || d.pattern) ? [d.source, d.pattern, d.name] : [],
    s.assignee ?? "",
    s.projects ?? "",
    s.conditions ?? [],
  ]);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const strs = (v: unknown) => (Array.isArray(v) ? v.map(String) : undefined);

/** Sunucudaki belgeleri doğrular: ortak listeye herkes yazabildiği için içerik güvenilmez sayılır. */
export function parseQueries(docs: unknown[], shared: boolean): SavedQuery[] {
  const out: SavedQuery[] = [];
  for (const raw of docs) {
    if (!raw || typeof raw !== "object") continue;
    const d = raw as Record<string, unknown>;
    const name = str(d.name)?.trim().slice(0, QUERY_NAME_MAX);
    const s = d.settings;
    if (!str(d.id) || !name || !s || typeof s !== "object") continue;
    const x = s as Record<string, unknown>;
    const rule = x.derived as Record<string, unknown> | undefined;
    const conditions = (Array.isArray(x.conditions) ? x.conditions : []).flatMap((raw): Condition[] => {
      const k = raw as Record<string, unknown>;
      if (!k || typeof k !== "object" || ![k.field, k.type, k.op, k.value].every((v) => typeof v === "string")) return [];
      const c = { field: k.field, type: k.type, op: k.op, value: k.value } as Condition;
      return checkCondition(c) ? [] : [c];
    });
    const settings: Settings = {
      conditions: conditions.length ? conditions : undefined,
      projects: x.projects === "all" ? "all" : Array.isArray(x.projects) && x.projects.length ? x.projects.map(String) : undefined,
      assignee: ASSIGNEES.includes(x.assignee as Assignee) ? (x.assignee as Assignee) : undefined,
      type: str(x.type),
      dateField: str(x.dateField),
      preset: PRESETS.includes(x.preset as Preset) ? (x.preset as Preset) : undefined,
      from: str(x.from),
      to: str(x.to),
      states: strs(x.states),
      columns: strs(x.columns),
      derived:
        rule && typeof rule === "object" && str(rule.source) !== undefined && str(rule.pattern) !== undefined && str(rule.name) !== undefined
          ? { source: rule.source as string, pattern: rule.pattern as string, name: rule.name as string }
          : undefined,
    };
    out.push({
      id: d.id as string,
      name,
      shared,
      ownerId: str(d.ownerId) ?? "",
      ownerName: str(d.ownerName) ?? "",
      settings,
      __etag: typeof d.__etag === "number" ? d.__etag : undefined,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

/** Kişisel sorgular her zaman, ortak olanlar yalnızca oluşturanınca düzenlenir (arayüz kısıtı; servis sahiplik denetlemez). */
export const canEdit = (q: SavedQuery, userId: string) => !q.shared || q.ownerId === userId;

/** Widget'ın kayıtlı sorgudan aldığı alanlar. */
interface QueryTarget {
  view: View;
  type: string;
  dateField: string;
  states: string[];
  preset: Preset;
  from: string;
  to: string;
  assignee?: Assignee;
  projects?: Projects;
  conditions?: Condition[];
}

/** Widget ayarına kayıtlı sorguyu uygular: tür, tarih alanı, state'ler, atanan; aralık yalnızca aralık seçen görünümlerde (trend ay, yaklaşanlar gün sayısıyla çalışır). */
export function applyQuery<C extends QueryTarget>(c: C, s: Settings): C {
  const out: C = { ...c, type: s.type ?? "", dateField: s.dateField ?? "", states: s.states ?? [], assignee: s.assignee, projects: s.projects, conditions: s.conditions };
  if (c.view !== "summary" && c.view !== "weekly" && c.view !== "daily") return out;
  const preset = s.preset ?? DEFAULT_PRESET;
  return preset === "custom" ? { ...out, preset, from: s.from ?? "", to: s.to ?? "" } : { ...out, preset };
}
