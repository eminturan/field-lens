import { buildWiql, chunk, Field, Query, Row } from "./logic";

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

export interface DataSource {
  types(): Promise<string[]>;
  states(type: string): Promise<string[]>;
  fields(): Promise<Field[]>;
  run(q: Query): Promise<RunResult>;
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

  return {
    async types() {
      const r = await call<{ value?: { name: string; isDisabled?: boolean }[] }>(`${proj}_apis/wit/workitemtypes?${API}`);
      return (r.value ?? [])
        .filter((t) => !t.isDisabled)
        .map((t) => t.name)
        .sort((a, b) => a.localeCompare(b, "tr"));
    },
    async states(type) {
      const r = await call<{ value?: { name: string }[] }>(`${proj}_apis/wit/workitemtypes/${encodeURIComponent(type)}/states?${API}`);
      return (r.value ?? []).map((s) => s.name);
    },
    async fields() {
      const r = await call<{ value?: Field[] }>(`${proj}_apis/wit/fields?${API}`);
      return (r.value ?? [])
        .map(({ referenceName, name, type }) => ({ referenceName, name, type }))
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));
    },
    async run(q) {
      const found = await call<{ workItems?: { id: number }[] }>(`${proj}_apis/wit/wiql?$top=${QUERY_LIMIT}&${API}`, { query: buildWiql(q) });
      const ids = (found.workItems ?? []).map((w) => w.id);
      const fields = [...new Set(["System.Id", ...q.columns])];
      const byId = new Map<number, Row>();
      for (const part of await batches(chunk(ids, BATCH), fields)) for (const w of part) byId.set(w.id, { ...w.fields, "System.Id": w.id });
      return { rows: ids.flatMap((id): Row[] => { const r = byId.get(id); return r ? [r] : []; }), truncated: ids.length >= QUERY_LIMIT };
    },
  };
}
