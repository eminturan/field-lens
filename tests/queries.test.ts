import { describe, expect, it } from "vitest";
import { canEdit, DEFAULT_COLUMNS, nameError, parseQueries, SavedQuery, settingsKey } from "../src/hub/logic";

const q = (over: Partial<SavedQuery>): SavedQuery => ({ id: "1", name: "A", shared: false, ownerId: "me", ownerName: "Ben", settings: {}, ...over });

describe("saved queries", () => {
  it("nameError rejects empty, too long and duplicate names (case-insensitive), allowing the query's own name", () => {
    const list = [q({ id: "1", name: "Kasım geçişleri" }), q({ id: "2", name: "Açık buglar" })];
    expect(nameError("  ", list)).toBe("empty");
    expect(nameError("x".repeat(81), list)).toBe("long");
    expect(nameError("KASIM GEÇİŞLERİ", list)).toBe("duplicate");
    expect(nameError("Kasım geçişleri", list, "1")).toBeUndefined();
    expect(nameError("Yeni", list)).toBeUndefined();
  });

  it("settingsKey ignores from/to unless the range is custom, and ignores key order", () => {
    const a = { type: "Change", preset: "lastMonth" as const, from: "2026-10-01", to: "2026-10-31", states: ["A"] };
    expect(settingsKey(a)).toBe(settingsKey({ states: ["A"], preset: "lastMonth", type: "Change", from: "2026-09-01", to: "2026-09-30" }));
    expect(settingsKey({ ...a, preset: "custom" })).not.toBe(settingsKey({ ...a, preset: "custom", to: "2026-11-01" }));
    expect(settingsKey(a)).not.toBe(settingsKey({ ...a, states: ["A", "B"] }));
    expect(settingsKey({ type: "X", derived: undefined })).toBe(settingsKey({ type: "X" }));
  });

  it("settingsKey treats missing values as the form's defaults", () => {
    expect(settingsKey({ type: "Bug", preset: "last30" })).toBe(
      settingsKey({ type: "Bug", preset: "last30", dateField: "", states: [], columns: DEFAULT_COLUMNS, derived: undefined }),
    );
    expect(settingsKey({})).toBe(settingsKey({ preset: "thisMonth" }));
    expect(settingsKey({ derived: { source: "", pattern: "", name: "" } })).toBe(settingsKey({}));
  });

  it("parseQueries keeps only well-formed documents and coerces their fields", () => {
    const docs = [
      { id: "1", name: "Ok", shared: true, ownerId: "u1", ownerName: "Ayşe", settings: { type: "Bug", states: ["New", 5] }, __etag: 3 },
      { id: "2", name: "", settings: {} },
      { id: 3, name: "bad id", settings: {} },
      { id: "4", name: "no settings" },
      { id: "5", name: "x".repeat(200), settings: { columns: "nope", type: 7 } },
      null,
    ];
    const out = parseQueries(docs, true);
    expect(out.map((x) => x.id)).toEqual(["1", "5"]);
    expect(out[0]).toEqual({ id: "1", name: "Ok", shared: true, ownerId: "u1", ownerName: "Ayşe", settings: { type: "Bug", states: ["New", "5"] }, __etag: 3 });
    expect(out[1].name.length).toBe(80);
    expect(out[1].settings).toEqual({});
  });

  it("canEdit: personal queries always, shared ones only by their owner", () => {
    expect(canEdit(q({ shared: false, ownerId: "x" }), "me")).toBe(true);
    expect(canEdit(q({ shared: true, ownerId: "me" }), "me")).toBe(true);
    expect(canEdit(q({ shared: true, ownerId: "x" }), "me")).toBe(false);
  });
});
