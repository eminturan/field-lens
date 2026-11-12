import { DataSource } from "./api";
import { Field, Query, Row, formatCell } from "./logic";

const FIELDS: Field[] = [
  { referenceName: "System.Id", name: "ID", type: "integer" },
  { referenceName: "System.Title", name: "Title", type: "string" },
  { referenceName: "System.State", name: "State", type: "string" },
  { referenceName: "System.WorkItemType", name: "Work Item Type", type: "string" },
  { referenceName: "System.AssignedTo", name: "Assigned To", type: "identity" },
  { referenceName: "System.TeamProject", name: "Team Project", type: "string" },
  { referenceName: "System.CreatedDate", name: "Created Date", type: "dateTime" },
  { referenceName: "System.Description", name: "Description", type: "html" },
  { referenceName: "Custom.TargetDate", name: "Target Date", type: "dateTime" },
  { referenceName: "Custom.Sistem", name: "Sistem", type: "string" },
  { referenceName: "Custom.Requester", name: "Requester", type: "identity" },
];
const STATES = ["New", "Active", "Resolved", "Closed"];
const PEOPLE = ["Ayşe Yılmaz", "Mehmet Öztürk", "Can Şahin", undefined];
const SYSTEMS = ["Core Banking", "Mobil", "İnternet Şube"];
// Görünen adda kişi adı + birim; türetilmiş kolon kuralını denemek için.
const REQUESTERS = ["Deniz Arslan ABC Ödeme Hizmetleri", "Selin Koç XY Yazılım Destek", "Burak Tekin ABC Ödeme Hizmetleri", "Ece Yalın XY Altyapı", "Ali Veli"];
const DAY = 86400000;
/** İlki hub'ın açıldığı proje sayılır. */
const MOCK_PROJECTS = ["Örnek Proje", "Kanallar", "Kredi"];

/** `npm run dev` için örnek veri: son 120 ve sonraki 30 güne yayılmış 240 kart ve 60 bug (sayfalama denenebilsin). */
function build(): Row[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 300 }, (_, i) => {
    // Bugünden 120 gün geriye ve 30 gün ileriye yayılır (widget'ın "Yaklaşanlar" görünümü için).
    const planned = new Date(today.getTime() - (((i * 37) % 150) - 30) * DAY);
    const person = PEOPLE[i % PEOPLE.length];
    return {
      "System.Id": 5000 + i,
      "System.Title": i % 3 ? `Geçiş talebi #${i + 1}` : `Rapor Ekranında "Filtre" ve "Kolon" Alanlarının Düzenlenmesi #${i + 1}`,
      "System.State": STATES[i % STATES.length],
      "System.WorkItemType": i < 240 ? "Kart" : "Bug",
      "System.AssignedTo": person && { displayName: person, uniqueName: person },
      // Kayıtların yarısı bu projede, kalanı diğer iki projede: proje-arası sorgu denensin diye.
      "System.TeamProject": i % 2 ? MOCK_PROJECTS[0] : MOCK_PROJECTS[1 + ((i >> 1) % 2)],
      "System.CreatedDate": new Date(planned.getTime() - 20 * DAY + 9.5 * 3600000).toISOString(),
      "System.Description": `<div>Hata Başlığı: Kayıt ${i}<br>Ekran Adı: Bireysel Kredi Kartı Başvurusu. Modül Adı: Bireysel Kart Pazarlama. Hata Detayı: TLP-30863 kapsamında açılmış bir kayıttır; desteklerinizi talep ederiz. Bilgisayar Adı: NB-BPBB12. Etki: Sadece ben.</div>`,
      "Custom.TargetDate": planned.toISOString(),
      "Custom.Sistem": SYSTEMS[i % SYSTEMS.length],
      "Custom.Requester": { displayName: REQUESTERS[i % REQUESTERS.length], uniqueName: `user${i % REQUESTERS.length}` },
    };
  });
}

const day = (iso: unknown) => {
  const d = new Date(String(iso));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function mockSource(): DataSource {
  const rows = build();
  const later = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 200));
  const match = (q: Query) =>
    rows
      .filter((r) => r["System.WorkItemType"] === q.type && q.states.includes(String(r["System.State"])))
      .filter((r) => {
        const p = String(r["System.TeamProject"]);
        return q.projects === "all" || (q.projects ?? [MOCK_PROJECTS[0]]).includes(p);
      })
      .filter((r) => r[q.dateField] !== undefined && day(r[q.dateField]) >= q.from && day(r[q.dateField]) <= q.to)
      // Örnek veride "ben" = PEOPLE[0].
      // Ek koşullar örnek veride yaklaşık uygulanır: görünen değer üzerinde, sayılar ve tarihler karşılaştırılarak.
      .filter((r) =>
        (q.conditions ?? []).every((c) => {
          const v = formatCell(r[c.field], c.type);
          const a = c.type === "integer" || c.type === "double" ? Number(v) : c.type === "dateTime" ? day(r[c.field]) : v.toLocaleLowerCase("tr");
          const b = c.type === "integer" || c.type === "double" ? Number(c.value) : c.type === "dateTime" ? c.value : c.value.toLocaleLowerCase("tr");
          switch (c.op) {
            case "=": return a === b;
            case "<>": return a !== b;
            case "<": return a < b;
            case ">": return a > b;
            case "<=": return a <= b;
            case ">=": return a >= b;
            case "contains": case "under": return String(a).includes(String(b));
            default: return !String(a).includes(String(b));
          }
        }),
      )
      .filter((r) => {
        const who = (r["System.AssignedTo"] as { displayName?: string } | undefined)?.displayName;
        return q.assignee === "me" ? who === PEOPLE[0] : q.assignee === "none" ? !who : true;
      });
  return {
    projects: () => later([...MOCK_PROJECTS].sort((a, b) => a.localeCompare(b, "tr"))),
    types: () => later(["Bug", "Kart"]),
    states: () => later(STATES.map((name, i) => ({ name, color: ["#b2b2b2", "#007acc", "#ff9d00", "#339933"][i] }))),
    fields: () => later(FIELDS),
    run: (q) =>
      later({
        rows: match(q).sort((a, b) => String(a[q.dateField]).localeCompare(String(b[q.dateField]))),
        truncated: false,
      }),
    count: (q) => later(match(q).length),
  };
}
