export type Preset = "last15" | "last30" | "last90" | "thisMonth" | "lastMonth" | "custom";
export const PRESETS: Preset[] = ["last15", "last30", "last90", "thisMonth", "lastMonth", "custom"];

/** `_apis/wit/fields` kaydı; type örn. "dateTime", "identity", "html", "string". */
export interface Field {
  referenceName: string;
  name: string;
  type: string;
}

/** from/to "YYYY-MM-DD", ikisi de dahil. */
export interface Query {
  type: string;
  dateField: string;
  from: string;
  to: string;
  states: string[];
  columns: string[];
}

export interface Settings {
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
  const f = `[${q.dateField}]`;
  return [
    "SELECT [System.Id] FROM WorkItems",
    "WHERE [System.TeamProject] = @project",
    `AND [System.WorkItemType] = ${esc(q.type)}`,
    `AND ${f} >= '${q.from}'`,
    `AND ${f} <= '${q.to}'`,
    `AND [System.State] IN (${q.states.map(esc).join(", ")})`,
    `ORDER BY ${f} ASC`,
  ].join(" ");
}

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
export function toCsv(rows: string[][], separator: string): string {
  const cell = (v: string) => {
    const text = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((r) => r.map(cell).join(separator)).join("\r\n");
}

export function csvRows(rows: Row[], columns: Field[]): string[][] {
  return [columns.map((c) => c.name), ...rows.map((r) => columns.map((c) => formatCell(r[c.referenceName], c.type)))];
}

/** Kayıtlı seçimlerden artık projede olmayan tür/alanları atar. State'ler türle birlikte düşer; tür içi kontrol arayüzde yapılır. */
export function sanitizeSettings(s: Settings | undefined, types: string[], fields: Field[]): Settings {
  if (!s) return {};
  const out: Settings = { ...s };
  const refs = new Set(fields.map((f) => f.referenceName));
  if ("type" in s && !types.includes(s.type ?? "")) {
    out.type = undefined;
    out.states = [];
  }
  if ("dateField" in s && !fields.some((f) => f.referenceName === s.dateField && f.type === "dateTime")) out.dateField = undefined;
  if (s.columns) out.columns = s.columns.filter((c) => refs.has(c));
  return out;
}

/** Görünen ad ya da referans adında geçenler; adı aramayla başlayanlar önce, sonra mevcut sıra. */
export function searchFields(fields: Field[], text: string): Field[] {
  const q = text.trim().toLocaleLowerCase("tr");
  if (!q) return fields;
  const low = (s: string) => s.toLocaleLowerCase("tr");
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

const lowTr = (s: string) => s.toLocaleLowerCase("tr");

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

/** Aralığın başından itibaren 7 günlük dilimler (sonuncusu aralık sonunda kesilir); her dilimde state başına sayı. */
export function weekBuckets(rows: Row[], dateField: string, from: string, to: string): WeekBucket[] {
  const out: WeekBucket[] = [];
  for (let i = 0; i <= daysBetween(from, to); i += 7) {
    const start = addDays(from, i);
    const end = addDays(from, i + 6);
    out.push({ start, end: end > to ? to : end, total: 0, counts: {} });
  }
  for (const r of rows) {
    const day = localDay(r[dateField]);
    if (!day || day < from || day > to) continue;
    const b = out[Math.floor(daysBetween(from, day) / 7)];
    const s = String(r["System.State"] ?? "");
    b.total++;
    b.counts[s] = (b.counts[s] ?? 0) + 1;
  }
  return out;
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
