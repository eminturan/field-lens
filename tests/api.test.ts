import { describe, expect, it } from "vitest";
import { createRestSource } from "../src/hub/api";
import { Query } from "../src/hub/logic";

const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
type Call = { url: string; body?: any };

function fake(handler: (url: string, body: any) => Response) {
  const calls: Call[] = [];
  const source = createRestSource("https://s/tfs/C", async () => "t", "My Proj", async (url, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, body });
    return handler(url, body);
  });
  return { source, calls };
}

const q: Query = { type: "Kart", dateField: "Custom.P", from: "2026-10-01", to: "2026-10-31", states: ["Active"], columns: ["System.Title"] };
const ids = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 1000 - i }));

describe("createRestSource", () => {
  it("run sends wiql and batches by 200, keeping WIQL order", async () => {
    const { source, calls } = fake((url, body) =>
      url.includes("/wiql")
        ? json({ workItems: ids(450) })
        : json({ value: body.ids.map((id: number) => ({ id, fields: { "System.Title": `t${id}` } })) }),
    );
    const res = await source.run(q);
    const batches = calls.filter((c) => c.url.includes("workitemsbatch"));
    expect(batches.map((b) => b.body.ids.length)).toEqual([200, 200, 50]);
    expect(batches[0].body.fields).toEqual(expect.arrayContaining(["System.Id", "System.Title"]));
    expect(batches[0].body.errorPolicy).toBe("Omit");
    expect(res.rows.map((r) => r["System.Id"])).toEqual(ids(450).map((w) => w.id));
    expect(res.rows[0]["System.Title"]).toBe("t1000");
    expect(res.truncated).toBe(false);
    expect(calls[0].url).toBe("https://s/tfs/C/My%20Proj/_apis/wit/wiql?$top=20000&api-version=7.0");
    expect(calls[0].body.query).toContain("[Custom.P] >= '2026-10-01'");
  });

  it("run drops items omitted by the server", async () => {
    const { source } = fake((url) =>
      url.includes("/wiql") ? json({ workItems: ids(2) }) : json({ value: [null, { id: 999, fields: {} }] }),
    );
    expect((await source.run(q)).rows.map((r) => r["System.Id"])).toEqual([999]);
  });

  it("run with no results skips batch", async () => {
    const { source, calls } = fake(() => json({ workItems: [] }));
    expect((await source.run(q)).rows).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("run flags truncated", async () => {
    const { source } = fake((url, body) => (url.includes("/wiql") ? json({ workItems: ids(20000) }) : json({ value: [] })));
    expect((await source.run(q)).truncated).toBe(true);
  });

  it("fields maps referenceName/name/type sorted by name", async () => {
    const { source } = fake(() =>
      json({ value: [{ referenceName: "Custom.P", name: "Planlanan", type: "dateTime", x: 1 }, { referenceName: "System.Id", name: "ID", type: "integer" }] }),
    );
    expect(await source.fields()).toEqual([
      { referenceName: "System.Id", name: "ID", type: "integer" },
      { referenceName: "Custom.P", name: "Planlanan", type: "dateTime" },
    ]);
  });

  it("types skips disabled", async () => {
    const { source } = fake(() => json({ value: [{ name: "Kart" }, { name: "X", isDisabled: true }, { name: "Bug" }] }));
    expect(await source.types()).toEqual(["Bug", "Kart"]);
  });

  it("states keep workflow order, board colors and encode type", async () => {
    const { source, calls } = fake(() => json({ value: [{ name: "New", color: "b2b2b2" }, { name: "Active", color: "007acc" }, { name: "Closed", color: "red;x" }] }));
    expect(await source.states("Ürün Kartı")).toEqual([
      { name: "New", color: "#b2b2b2" },
      { name: "Active", color: "#007acc" },
      { name: "Closed", color: "" },
    ]);
    expect(calls[0].url).toBe(`https://s/tfs/C/My%20Proj/_apis/wit/workitemtypes/${encodeURIComponent("Ürün Kartı")}/states?api-version=7.0`);
  });

  it("http error message", async () => {
    const { source } = fake(() => json({ message: "TF51005: field does not exist" }, 400));
    await expect(source.run(q)).rejects.toThrow("HTTP 400: TF51005: field does not exist");
  });
});
