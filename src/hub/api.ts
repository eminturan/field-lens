import { buildWiql, chunk, Field, Projects, Query, Row } from "./logic";

// Server 2022 için 7.0.
const API = "api-version=7.0";
/** Sunucunun tek WIQL sorgusunda döndürebildiği en fazla kayıt. */
export const QUERY_LIMIT = 20000;
const BATCH = 200; // workitemsbatch tek istekte en fazla 200 id kabul eder
const PARALLEL = 4;

export interface RunResult {
  rows: Row[];
  truncated: boolean;
}

/** color: panodaki state rengi ("#rrggbb"), sunucu geçerli renk vermezse "". */
export interface StateInfo {
  name: string;
  color: string;
}

export interface DataSource {
  /** Koleksiyondaki (kullanıcının görebildiği) projelerin adları. */
  projects(): Promise<string[]>;
  /** projects verilmezse hub'ın projesi; birden çok projede türler birleştirilir. */
  types(projects?: Projects): Promise<string[]>;
  /** Birden çok projede state'ler ilk görülme sırasıyla birleştirilir; renk ilk projeden gelir. */
  states(type: string, projects?: Projects): Promise<StateInfo[]>;
  fields(): Promise<Field[]>;
  run(q: Query): Promise<RunResult>;
  /** Yalnızca WIQL: eşleşen kayıt sayısı (önceki dönem karşılaştırması için). */
  count(q: Query): Promise<number>;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * @param baseUrl Collection adresi, örn. https://sunucu/tfs/DefaultCollection/
 * @param getToken Extension'ın erişim token'ını döndürür.
 * @param project Hub'ın açıldığı proje.
 */
export function createRestSource(
  baseUrl: string,
  getToken: () => Promise<string>,
  project: string,
  // credentials: "omit": sunucu 401 dönerse tarayıcı kendi kullanıcı adı/parola penceresini açmaz.
  fetchFn: Fetch = (u, i) => fetch(u, { ...i, credentials: "omit" }),
): DataSource {
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const proj = encodeURIComponent(project) + "/";

  async function call<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchFn(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res
        .json()
        .then((b) => (typeof b?.message === "string" ? `: ${b.message.slice(0, 300)}` : ""))
        .catch(() => "");
      throw new Error(`HTTP ${res.status}${detail}`);
    }
    return (await res.json()) as T;
  }

  type Item = { id: number; fields?: Record<string, unknown> };

  async function batches(parts: number[][], fields: string[]): Promise<Item[][]> {
    const out: Item[][] = new Array(parts.length);
    let next = 0;
    const worker = async () => {
      while (next < parts.length) {
        const i = next++;
        const r = await call<{ value?: (Item | null)[] }>(`_apis/wit/workitemsbatch?${API}`, { ids: parts[i], fields, errorPolicy: "Omit" });
        out[i] = (r.value ?? []).filter((x): x is Item => !!x);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, parts.length) }, worker));
    return out;
  }

  let allProjects: Promise<string[]> | undefined;
  const listProjects = () =>
    (allProjects ??= call<{ value?: { name: string }[] }>(`_apis/projects?$top=1000&${API}`).then((r) =>
      (r.value ?? []).map((p) => p.name).sort((a, b) => a.localeCompare(b, "tr")),
    ));
  /** Kapsamdaki projeler; tek tek okunamayanlar (tür yok, yetki yok) atlanır. */
  const names = async (p?: Projects) => (p === undefined ? [project] : p === "all" ? await listProjects() : p);
  const each = async <T>(p: Projects | undefined, f: (proj: string) => Promise<T>) =>
    (await Promise.all((await names(p)).map((n) => f(`${encodeURIComponent(n)}/`).then((v) => [v], () => [])))).flat();

  async function wiqlIds(q: Query): Promise<number[]> {
    const found = await call<{ workItems?: { id: number }[] }>(`${proj}_apis/wit/wiql?$top=${QUERY_LIMIT}&${API}`, { query: buildWiql(q) });
    return (found.workItems ?? []).map((w) => w.id);
  }

  return {
    projects: listProjects,
    async types(p) {
      const one = async (pp: string) =>
        ((await call<{ value?: { name: string; isDisabled?: boolean }[] }>(`${pp}_apis/wit/workitemtypes?${API}`)).value ?? [])
          .filter((t) => !t.isDisabled)
          .map((t) => t.name);
      // Tek projede hata yutulmaz; birden çok projede okunamayan proje atlanır.
      const all = p === undefined ? await one(proj) : (await each(p, one)).flat();
      return [...new Set(all)].sort((a, b) => a.localeCompare(b, "tr"));
    },
    async states(type, p) {
      const one = async (pp: string) =>
        ((await call<{ value?: { name: string; color?: string }[] }>(`${pp}_apis/wit/workitemtypes/${encodeURIComponent(type)}/states?${API}`)).value ?? []).map(
          (s) => ({ name: s.name, color: /^[0-9a-f]{6}$/i.test(s.color ?? "") ? `#${s.color}` : "" }),
        );
      const lists = p === undefined ? [await one(proj)] : await each(p, one);
      const seen = new Map<string, StateInfo>();
      for (const s of lists.flat()) if (!seen.has(s.name)) seen.set(s.name, s);
      return [...seen.values()];
    },
    async fields() {
      const r = await call<{ value?: Field[] }>(`${proj}_apis/wit/fields?${API}`);
      return (r.value ?? [])
        .map(({ referenceName, name, type }) => ({ referenceName, name, type }))
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));
    },
    count: async (q) => (await wiqlIds(q)).length,
    async run(q) {
      const ids = await wiqlIds(q);
      // Proje-arası sorguda kaydın projesi bağlantı ve Proje kolonu için gerekir.
      const fields = [...new Set(["System.Id", ...q.columns, ...(q.projects ? ["System.TeamProject"] : [])])];
      const byId = new Map<number, Row>();
      for (const part of await batches(chunk(ids, BATCH), fields)) for (const w of part) byId.set(w.id, { ...w.fields, "System.Id": w.id });
      return { rows: ids.flatMap((id): Row[] => { const r = byId.get(id); return r ? [r] : []; }), truncated: ids.length >= QUERY_LIMIT };
    },
  };
}
