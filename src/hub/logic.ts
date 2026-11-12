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

/** 0 tabanlı sayfa; sayfa aralık dışındaysa son sayfaya çekilir. first/last 1 tabanlı satır numaraları. */
export function pageSlice<T>(rows: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(0, page), pages - 1);
  const items = rows.slice(p * size, (p + 1) * size);
  return { items, page: p, pages, first: items.length ? p * size + 1 : 0, last: p * size + items.length };
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
