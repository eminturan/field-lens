import { Preset, View, Assignee } from "./logic";

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

export interface WidgetStrings {
  views: Record<View, string>;
  cfgView: string;
  cfgRange: string;
  cfgMonths: string;
  months: (n: number) => string;
  customRange: string;
  cfgBreakdown: string;
  cfgRule: string;
  ruleHint: string;
  breakdownHint: string;
  cfgSource: string;
  ownSettings: string;
  sourceHint: string;
  noShared: string;
  queryMissing: string;
  fromQuery: string;
  searchField: string;
  clear: string;
  other: string;
  blank: string;
  cfgDays: string;
  nextDays: (n: number) => string;
  notConfigured: string;
  noData: string;
  noUpcoming: string;
  openReport: string;
  truncated: string;
  more: (n: number) => string;
  barTip: (label: string, n: number) => string;
}

export interface QueryStrings {
  label: string;
  none: string;
  mine: string;
  shared: string;
  save: string;
  saveAs: string;
  saved: string;
  rename: string;
  remove: string;
  changed: string;
  changedTip: string;
  namePlaceholder: string;
  share: string;
  shareTip: string;
  ok: string;
  cancel: string;
  confirmRemove: (name: string) => string;
  errors: Record<"empty" | "long" | "duplicate", string>;
  conflict: string;
  failed: (detail: string) => string;
  ownerOnly: (owner: string) => string;
  copyLink: string;
  linkTip: string;
  linkCopied: string;
  linkManual: string;
  linkPersonal: string;
  notFound: string;
}

export interface RuleStrings {
  title: string;
  source: string;
  pattern: string;
  name: string;
  defaultName: string;
  hint: string;
  example: string;
  invalid: (msg: string) => string;
  unmatched: string;
  preview: string;
  needData: string;
  noValues: string;
  addColumn: string;
  remove: string;
}

export interface Strings {
  locale: string;
  rule: RuleStrings;
  q: QueryStrings;
  w: WidgetStrings;
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
  assignee: string;
  assignees: Record<"all" | Assignee, string>;
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
  search: string;
  filterCol: (name: string) => string;
  filterPlaceholder: string;
  clearFilters: string;
  shownOf: (shown: number, total: number) => string;
  noFiltered: string;
  sortHint: string;
  reportTitle: (type: string) => string;
  edit: string;
  reset: string;
  resetConfirm: string;
  resetTip: string;
  statesN: (n: number) => string;
  prevPeriod: (n: number) => string;
  prevTip: (from: string, to: string) => string;
  weekTip: (from: string, to: string, n: number) => string;
  density: string;
  comfortable: string;
  compact: string;
  empty: string;
  need: { type: string; dateField: string; states: string; range: string; columns: string };
}

export const STRINGS: Record<Lang, Strings> = {
  tr: {
    locale: "tr-TR",
    q: {
      label: "Kayıtlı sorgu",
      none: "(kaydedilmemiş sorgu)",
      mine: "Sorgularım",
      shared: "Proje sorguları",
      save: "Kaydet",
      saveAs: "Farklı kaydet",
      saved: "Kaydedildi",
      rename: "Yeniden adlandır",
      remove: "Sil",
      changed: "değişti",
      changedTip: "Formdaki ayarlar kayıtlı sorgudan farklı. Güncellemek için Kaydet'e basın.",
      namePlaceholder: "Sorgu adı, örneğin Bug – bu ay kapananlar",
      share: "Projeyle paylaş",
      shareTip: "Projedeki herkes görür ve kullanır; yalnızca siz düzenleyip silebilirsiniz.",
      ok: "Tamam",
      cancel: "Vazgeç",
      confirmRemove: (n) => `"${n}" silinsin mi? Bu geri alınamaz.`,
      errors: { empty: "Bir ad yazın.", long: "Ad en fazla 80 karakter olabilir.", duplicate: "Bu adda bir sorgu var." },
      conflict: "Bu sorgu bu arada başka biri tarafından değiştirildi; liste yenilendi. Değişikliğinizi yeniden kaydedin.",
      failed: (d) => `Sorgu kaydedilemedi: ${d}`,
      copyLink: "Bağlantıyı kopyala",
      linkTip: "Açan kişi raporu bu sorguyla, çalışmış olarak görür.",
      linkCopied: "Bağlantı kopyalandı.",
      linkManual: "Bağlantı kopyalanamadı; aşağıdan seçip kopyalayın.",
      linkPersonal: "Bu kişisel bir sorgu: bağlantı yalnızca sizin için çalışır. Ekiple paylaşmak için Farklı kaydet ile projeyle paylaşın.",
      notFound: "Bağlantıdaki sorgu bulunamadı: silinmiş ya da size paylaşılmamış olabilir.",
      ownerOnly: (o) => `${o} oluşturdu; yalnızca o düzenleyip silebilir. Kendi kopyanız için Farklı kaydet'i kullanın.`,
    },
    rule: {
      title: "Kuralla türetilen kolon",
      source: "Kaynak alan",
      pattern: "Kural (regex)",
      name: "Kolon adı",
      defaultName: "Birim",
      hint: "Kaynak alanın görünen değerinde kurala uyan ilk kısım yeni kolona yazılır. Örnek kural, ABC ya da XY kelimesinden başlayıp sonuna kadar olan kısmı alır.",
      example: "\\b(ABC|XY)\\b.*",
      invalid: (m) => (m === "empty" ? "Kural boş." : `Kural geçersiz: ${m}`),
      unmatched: "(eşleşmedi)",
      preview: "Önizleme",
      needData: "Önizleme için raporu çalıştırın.",
      noValues: "Bu alanda değer yok.",
      addColumn: "Kolonlara ekle",
      remove: "Kuralı kaldır",
    },
    w: {
      views: { summary: "Özet", trend: "Aylık trend", weekly: "Haftalık", daily: "Tarihe göre", upcoming: "Yaklaşanlar" },
      cfgView: "Görünüm",
      cfgRange: "Aralık",
      cfgMonths: "Ay sayısı",
      months: (n) => `Son ${n} ay`,
      customRange: "Özel aralık",
      cfgBreakdown: "Kırılım alanı (isteğe bağlı)",
      cfgRule: "Değere uygulanacak kural (isteğe bağlı, regex)",
      ruleHint: "Grafik, alanın görünen değerinde kurala uyan ilk kısma göre bölünür. Örnek kural, ABC ya da XY kelimesinden başlayıp sonuna kadar olan kısmı alır.",
      cfgSource: "Kaynak",
      ownSettings: "Bu widget'ın kendi ayarları",
      sourceHint: "Projeyle paylaşılmış bir kayıtlı sorgu seçilirse tür, tarih alanı, state'ler, atanan ve (Özet, Haftalık, Tarihe göre için) aralık o sorgudan gelir. Sorgu güncellenince widget da güncellenir.",
      noShared: "Projede paylaşılmış sorgu yok. Rapor sayfasında Projeyle paylaş ile kaydedin.",
      queryMissing: "Bağlı kayıtlı sorgu bulunamadı; silinmiş olabilir. Widget'ı yeniden ayarlayın.",
      fromQuery: "Sorgudan gelen",
      breakdownHint: "Boşsa halka grafik state'lere göre bölünür. Bir alan seçilirse alanın her değeri için, seçili state'lere bölünmüş bir yatay çubuk çizilir.",
      searchField: "Alan ara…",
      clear: "Temizle",
      other: "Diğer",
      blank: "(boş)",
      cfgDays: "Süre",
      nextDays: (n) => `Sonraki ${n} gün`,
      notConfigured: "Ayarlamak için widget'ın düzenle simgesini kullanın.",
      noData: "Bu filtrelerle kayıt yok.",
      noUpcoming: "Bu sürede planlanmış kayıt yok.",
      openReport: "Raporu aç",
      truncated: "20.000 kayıt sınırına ulaşıldı; sayılar eksik olabilir.",
      more: (n) => `+${n} kayıt daha`,
      barTip: (m, n) => `${m}: ${n} kayıt`,
    },
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
    assignee: "Atanan",
    assignees: { all: "Herkes", me: "Bana atananlar", none: "Atanmamış" },
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
    search: "Sonuçlarda ara…",
    filterCol: (n) => `${n} kolonunda filtrele`,
    filterPlaceholder: "Filtrele",
    clearFilters: "Filtreleri temizle",
    shownOf: (s, n) => `${s} / ${n} kayıt gösteriliyor`,
    noFiltered: "Filtrelere uyan kayıt yok.",
    sortHint: "Sıralamak için tıklayın",
    reportTitle: (ty) => `${ty} raporu`,
    edit: "Düzenle",
    reset: "Ayarları sıfırla",
    resetConfirm: "Emin misiniz? Sıfırlamak için tekrar tıklayın",
    resetTip: "Tür, tarih alanı, aralık, state'ler, kolonlar, kural ve satır görünümü varsayılana döner; kayıtlı seçimleriniz silinir.",
    statesN: (n) => `${n} state`,
    prevPeriod: (n) => `önceki dönem ${n}`,
    prevTip: (f, to) =>
      `Önceki dönem: ${f} – ${to}. Aynı tür, state'ler ve tarih alanıyla sayıldı. Arama ya da kolon filtresi açıkken karşılaştırma gizlenir.`,
    weekTip: (f, to, n) => `${f}–${to}: ${n} kayıt`,
    density: "Satır yoğunluğu",
    comfortable: "Rahat",
    compact: "Sıkı",
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
    locale: "en-US",
    q: {
      label: "Saved query",
      none: "(unsaved query)",
      mine: "My queries",
      shared: "Project queries",
      save: "Save",
      saveAs: "Save as",
      saved: "Saved",
      rename: "Rename",
      remove: "Delete",
      changed: "changed",
      changedTip: "The form differs from the saved query. Click Save to update it.",
      namePlaceholder: "Query name, for example Bugs closed this month",
      share: "Share with the project",
      shareTip: "Everyone in the project sees and uses it; only you can edit or delete it.",
      ok: "OK",
      cancel: "Cancel",
      confirmRemove: (n) => `Delete "${n}"? This can't be undone.`,
      errors: { empty: "Enter a name.", long: "Use at most 80 characters.", duplicate: "A query with this name already exists." },
      conflict: "Someone else changed this query in the meantime, so the list was reloaded. Save your change again.",
      failed: (d) => `Couldn't save the query: ${d}`,
      copyLink: "Copy link",
      linkTip: "Whoever opens it sees the report with this query, already run.",
      linkCopied: "Link copied.",
      linkManual: "Couldn't copy the link; select and copy it below.",
      linkPersonal: "This is a personal query, so the link only works for you. To share it with the team, use Save as and share it with the project.",
      notFound: "The query in the link wasn't found. It may have been deleted or not shared with you.",
      ownerOnly: (o) => `Created by ${o}; only they can edit or delete it. Use Save as for your own copy.`,
    },
    rule: {
      title: "Column derived by a rule",
      source: "Source field",
      pattern: "Rule (regex)",
      name: "Column name",
      defaultName: "Unit",
      hint: "The first part of the source field's displayed value that matches the rule goes into the new column. The example rule keeps everything from the word ABC or XY to the end.",
      example: "\\b(ABC|XY)\\b.*",
      invalid: (m) => (m === "empty" ? "The rule is empty." : `Invalid rule: ${m}`),
      unmatched: "(no match)",
      preview: "Preview",
      needData: "Run the report to see a preview.",
      noValues: "This field has no values.",
      addColumn: "Add to columns",
      remove: "Remove rule",
    },
    w: {
      views: { summary: "Summary", trend: "Monthly trend", weekly: "Weekly", daily: "By date", upcoming: "Upcoming" },
      cfgView: "View",
      cfgRange: "Range",
      cfgMonths: "Months",
      months: (n) => `Last ${n} months`,
      customRange: "Custom range",
      cfgBreakdown: "Breakdown field (optional)",
      cfgRule: "Rule applied to the value (optional, regex)",
      ruleHint: "The chart is split by the first part of the field's displayed value that matches the rule. The example rule keeps everything from the word ABC or XY to the end.",
      cfgSource: "Source",
      ownSettings: "This widget's own settings",
      sourceHint: "Pick a saved query shared with the project and the type, date field, states, assignee and (for Summary, Weekly and By date) range come from it. When the query changes, the widget follows.",
      noShared: "No queries are shared with this project yet. Save one on the report page with Share with the project.",
      queryMissing: "The linked saved query wasn't found; it may have been deleted. Configure the widget again.",
      fromQuery: "From the query",
      breakdownHint: "Empty: a donut split by state. With a field: one horizontal bar per value of the field, split by the chosen states.",
      searchField: "Search field…",
      clear: "Clear",
      other: "Other",
      blank: "(empty)",
      cfgDays: "Period",
      nextDays: (n) => `Next ${n} days`,
      notConfigured: "Use the widget's edit icon to configure it.",
      noData: "No items match these filters.",
      noUpcoming: "Nothing planned in this period.",
      openReport: "Open report",
      truncated: "The 20,000 item limit was reached; counts may be incomplete.",
      more: (n) => `+${n} more`,
      barTip: (m, n) => `${m}: ${n} items`,
    },
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
    assignee: "Assigned to",
    assignees: { all: "Anyone", me: "Assigned to me", none: "Unassigned" },
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
    search: "Search results…",
    filterCol: (n) => `Filter ${n}`,
    filterPlaceholder: "Filter",
    clearFilters: "Clear filters",
    shownOf: (s, n) => `Showing ${s} of ${n}`,
    noFiltered: "No items match the filters.",
    sortHint: "Click to sort",
    reportTitle: (ty) => `${ty} report`,
    edit: "Edit",
    reset: "Reset settings",
    resetConfirm: "Sure? Click again to reset",
    resetTip: "Type, date field, range, states, columns, rule and row density go back to their defaults, and your saved selections are deleted.",
    statesN: (n) => `${n} ${n === 1 ? "state" : "states"}`,
    prevPeriod: (n) => `previous period ${n}`,
    prevTip: (f, to) =>
      `Previous period: ${f} – ${to}, counted with the same type, states and date field. Hidden while a search or column filter is on.`,
    weekTip: (f, to, n) => `${f}–${to}: ${n} items`,
    density: "Row density",
    comfortable: "Comfortable",
    compact: "Compact",
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
