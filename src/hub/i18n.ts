import { Preset } from "./logic";

export type Lang = "tr" | "en";

/** Azure DevOps kullanıcı dili (örn. "tr-TR") → desteklenen dil. Türkçe dışındaki her dil İngilizce görür. */
export function pickLang(culture: string | undefined | null): Lang {
  return (culture ?? "").toLowerCase().startsWith("tr") ? "tr" : "en";
}

/** Kaynakları sırayla dener; hata fırlatanı ya da boş döneni atlar (Server 2022'de getPageContext() hata fırlatır). */
export function firstOf(sources: Array<() => string | undefined | null>): string | undefined {
  for (const read of sources) {
    try {
      const value = read();
      if (value) return value;
    } catch {
      // bu kaynak kullanılamıyor, sıradakine geç
    }
  }
  return undefined;
}

export interface Strings {
  csvSeparator: string;
  title: string;
  subtitle: string;
  mock: string;
  type: string;
  dateField: string;
  range: string;
  presets: Record<Preset, string>;
  from: string;
  to: string;
  states: string;
  columns: string;
  addColumn: string;
  noMatch: string;
  searchDateField: string;
  remove: (name: string) => string;
  moveHint: string;
  choose: string;
  run: string;
  running: string;
  exportCsv: string;
  prev: string;
  next: string;
  pageInfo: (first: number, last: number, total: number) => string;
  retry: string;
  loading: string;
  loadError: (detail: string) => string;
  runError: (detail: string) => string;
  truncated: string;
  count: (n: number) => string;
  summary: string;
  total: string;
  filterHint: (state: string) => string;
  empty: string;
  need: { type: string; dateField: string; states: string; range: string; columns: string };
}

export const STRINGS: Record<Lang, Strings> = {
  tr: {
    csvSeparator: ";",
    title: "Field Lens",
    subtitle: "Seçilen tarih alanı aralığa düşen work item'lar",
    mock: "Örnek veri gösteriliyor (Azure DevOps dışında açıldı).",
    type: "Work item türü",
    dateField: "Tarih alanı",
    range: "Aralık",
    presets: { last15: "Son 15 gün", last30: "Son 30 gün", last90: "Son 90 gün", thisMonth: "Bu ay", lastMonth: "Geçen ay", custom: "Özel" },
    from: "Başlangıç",
    to: "Bitiş",
    states: "State",
    columns: "Kolonlar",
    addColumn: "Kolon ara ve ekle…",
    noMatch: "Eşleşen alan yok",
    searchDateField: "Tarih alanı ara…",
    remove: (n) => `${n} kolonunu kaldır`,
    moveHint: "Sürükleyerek ya da Alt + ←/→ ile sırasını değiştirin",
    choose: "Seçin…",
    run: "Çalıştır",
    running: "Çalışıyor…",
    exportCsv: "CSV indir",
    prev: "Önceki",
    next: "Sonraki",
    pageInfo: (f, l, n) => `${f}–${l} / ${n}`,
    retry: "Tekrar dene",
    loading: "Yükleniyor…",
    loadError: (d) => `Veriler yüklenemedi: ${d}`,
    runError: (d) => `Sorgu çalıştırılamadı: ${d}`,
    truncated: "Sonuç 20.000 kayıt sınırına ulaştı; liste eksik olabilir. Aralığı daraltın.",
    count: (n) => `${n} kayıt`,
    summary: "State özeti",
    total: "Toplam",
    filterHint: (s) => `Yalnızca ${s} kayıtlarını göster (tablo ve CSV)`,
    empty: "Bu filtrelerle kayıt bulunamadı.",
    need: {
      type: "Work item türü seçin.",
      dateField: "Tarih alanı seçin.",
      states: "En az bir state seçin.",
      range: "Başlangıç tarihi bitişten sonra olamaz.",
      columns: "En az bir kolon seçin.",
    },
  },
  en: {
    csvSeparator: ",",
    title: "Field Lens",
    subtitle: "Work items whose chosen date field falls in the range",
    mock: "Showing sample data (opened outside Azure DevOps).",
    type: "Work item type",
    dateField: "Date field",
    range: "Range",
    presets: { last15: "Last 15 days", last30: "Last 30 days", last90: "Last 90 days", thisMonth: "This month", lastMonth: "Last month", custom: "Custom" },
    from: "From",
    to: "To",
    states: "States",
    columns: "Columns",
    addColumn: "Search and add column…",
    noMatch: "No matching field",
    searchDateField: "Search date field…",
    remove: (n) => `Remove column ${n}`,
    moveHint: "Drag or use Alt + ←/→ to reorder",
    choose: "Choose…",
    run: "Run",
    running: "Running…",
    exportCsv: "Export CSV",
    prev: "Previous",
    next: "Next",
    pageInfo: (f, l, n) => `${f}–${l} of ${n}`,
    retry: "Retry",
    loading: "Loading…",
    loadError: (d) => `Could not load data: ${d}`,
    runError: (d) => `Query failed: ${d}`,
    truncated: "The result hit the 20,000 item limit; the list may be incomplete. Narrow the range.",
    count: (n) => `${n} items`,
    summary: "State summary",
    total: "Total",
    filterHint: (s) => `Show only ${s} items (table and CSV)`,
    empty: "No items match these filters.",
    need: {
      type: "Choose a work item type.",
      dateField: "Choose a date field.",
      states: "Choose at least one state.",
      range: "Start date cannot be after end date.",
      columns: "Choose at least one column.",
    },
  },
};
