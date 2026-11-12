import { describe, expect, it } from "vitest";
import { buildWiql, chunk, countStates, csvRows, Field, formatCell, moveItem, pageSlice, presetRange, Query, sanitizeSettings, searchFields, toCsv } from "../src/hub/logic";

const q: Query = {
  type: "Kart",
  dateField: "Custom.TargetDate",
  from: "2026-10-01",
  to: "2026-10-31",
  states: ["Active", "Can't Fix"],
  columns: [],
};

describe("buildWiql", () => {
  it("filters project, type, inclusive date range and orders by the date field", () => {
    const w = buildWiql(q);
    expect(w).toContain("[System.TeamProject] = @project");
    expect(w).toContain("[System.WorkItemType] = 'Kart'");
    expect(w).toContain("[Custom.TargetDate] >= '2026-10-01'");
    expect(w).toContain("[Custom.TargetDate] <= '2026-10-31'");
    expect(w).toContain("ORDER BY [Custom.TargetDate] ASC");
  });
  it("escapes quotes", () => expect(buildWiql(q)).toContain("[System.State] IN ('Active', 'Can''t Fix')"));
  it("escapes quotes in type", () => expect(buildWiql({ ...q, type: "O'Kart" })).toContain("= 'O''Kart'"));
  it("rejects bad field ref", () => expect(() => buildWiql({ ...q, dateField: "X] OR 1=1 --" })).toThrow());
  it("accepts Turkish letters in field ref", () =>
    expect(buildWiql({ ...q, dateField: "Custom.GeçişTarihi" })).toContain("[Custom.GeçişTarihi] >= '2026-10-01'"));
  it("rejects empty states",() => expect(() => buildWiql({ ...q, states: [] })).toThrow());
  it("rejects malformed dates", () => expect(() => buildWiql({ ...q, from: "2026-10-01' OR '" })).toThrow());
});

describe("presetRange", () => {
  const now = new Date(2026, 0, 15, 10); // 15 Ocak 2026, yerel
  it("last15 includes today", () => expect(presetRange("last15", now)).toEqual({ from: "2026-01-01", to: "2026-01-15" }));
  it("last30", () => expect(presetRange("last30", now)).toEqual({ from: "2025-12-17", to: "2026-01-15" }));
  it("last90", () => expect(presetRange("last90", now)).toEqual({ from: "2025-10-18", to: "2026-01-15" }));
  it("thisMonth", () => expect(presetRange("thisMonth", now)).toEqual({ from: "2026-01-01", to: "2026-01-15" }));
  it("lastMonth crosses year", () => expect(presetRange("lastMonth", now)).toEqual({ from: "2025-12-01", to: "2025-12-31" }));
  it("lastMonth from March gives February", () =>
    expect(presetRange("lastMonth", new Date(2028, 2, 31))).toEqual({ from: "2028-02-01", to: "2028-02-29" }));
});

describe("formatCell", () => {
  it("blank", () => {
    expect(formatCell(undefined, "string")).toBe("");
    expect(formatCell(null, undefined)).toBe("");
  });
  it("identity", () => expect(formatCell({ displayName: "Ayşe Yılmaz", uniqueName: "x" }, "identity")).toBe("Ayşe Yılmaz"));
  it("date-only at local midnight", () => expect(formatCell(new Date(2026, 9, 5).toISOString(), "dateTime")).toBe("2026-10-05"));
  it("datetime with time", () => expect(formatCell(new Date(2026, 9, 5, 14, 30).toISOString(), "dateTime")).toBe("2026-10-05 14:30"));
  it("html to text", () => expect(formatCell("<div>a&amp;b<br>c</div>", "html")).toBe("a&b c"));
  it("number and bool", () => {
    expect(formatCell(3.5, "double")).toBe("3.5");
    expect(formatCell(true, "boolean")).toBe("true");
  });
});

describe("csv", () => {
  it("toCsv quotes and guards formulas", () =>
    expect(toCsv([["a;b", 'x"y', "=SUM(1)", "line\nbreak"]], ";")).toBe('"a;b";"x""y";\'=SUM(1);"line\nbreak"'));
  it("csvRows header + order, missing value blank", () => {
    const cols: Field[] = [
      { referenceName: "System.Id", name: "ID", type: "integer" },
      { referenceName: "System.AssignedTo", name: "Assigned To", type: "identity" },
    ];
    expect(csvRows([{ "System.Id": 7 }], cols)).toEqual([["ID", "Assigned To"], ["7", ""]]);
  });
});

describe("sanitizeSettings", () => {
  const fields: Field[] = [
    { referenceName: "System.Id", name: "ID", type: "integer" },
    { referenceName: "Custom.P", name: "P", type: "dateTime" },
  ];
  it("undefined → empty", () => expect(sanitizeSettings(undefined, [], fields)).toEqual({}));
  it("drops unknown type/field/columns; states cleared with type", () =>
    expect(
      sanitizeSettings({ type: "Gone", dateField: "Custom.Gone", columns: ["System.Id", "Custom.Gone"], states: ["A"] }, ["Kart"], fields),
    ).toEqual({ type: undefined, dateField: undefined, columns: ["System.Id"], states: [] }));
  it("keeps valid values", () => {
    const s = { type: "Kart", dateField: "Custom.P", preset: "custom" as const, from: "2026-01-01", to: "2026-01-31", states: ["A"], columns: ["Custom.P"] };
    expect(sanitizeSettings(s, ["Kart"], fields)).toEqual(s);
  });
  it("rejects non-date dateField", () => expect(sanitizeSettings({ dateField: "System.Id" }, [], fields).dateField).toBeUndefined());
});

describe("pageSlice", () => {
  const rows = Array.from({ length: 245 }, (_, i) => i);
  it("middle page", () => expect(pageSlice(rows, 1, 100)).toEqual({ items: rows.slice(100, 200), page: 1, pages: 3, first: 101, last: 200 }));
  it("last page partial", () => expect(pageSlice(rows, 2, 100)).toMatchObject({ first: 201, last: 245, pages: 3 }));
  it("clamps out-of-range page", () => expect(pageSlice(rows, 9, 100).page).toBe(2));
  it("empty", () => expect(pageSlice([], 0, 100)).toEqual({ items: [], page: 0, pages: 1, first: 0, last: 0 }));
});


describe("searchFields", () => {
  const fs: Field[] = [
    { referenceName: "Custom.Requester", name: "Requester", type: "identity" },
    { referenceName: "Custom.TalepSahibi", name: "Talep Sahibi", type: "identity" },
    { referenceName: "System.Title", name: "Title", type: "string" },
    { referenceName: "Custom.Istek", name: "İstek Tipi", type: "string" },
  ];
  it("matches display name case-insensitively", () => expect(searchFields(fs, "talep s").map((f) => f.name)).toEqual(["Talep Sahibi"]));
  it("matches reference name", () => expect(searchFields(fs, "custom.requester").map((f) => f.name)).toEqual(["Requester"]));
  it("Turkish casing", () => expect(searchFields(fs, "istek").map((f) => f.name)).toEqual(["İstek Tipi"]));
  it("name-start matches first", () => expect(searchFields(fs, "ti").map((f) => f.name)).toEqual(["Title", "İstek Tipi"]));
  it("empty query returns all", () => expect(searchFields(fs, " ")).toHaveLength(4));
});

describe("moveItem", () => {
  it("moves forward", () => expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]));
  it("moves backward", () => expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]));
  it("clamps target and ignores bad source", () => {
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["b", "a"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 7, 0)).toEqual(["a", "b"]);
  });
  it("does not mutate input", () => {
    const list = ["a", "b"];
    moveItem(list, 0, 1);
    expect(list).toEqual(["a", "b"]);
  });
});

it("chunk",() => expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]));

describe("countStates", () => {
  it("counts in the given order, keeps zeros and appends unknown states", () => {
    const rows = [{ "System.State": "Closed" }, { "System.State": "Active" }, { "System.State": "Closed" }, { "System.State": "Odd" }];
    expect(countStates(rows, ["New", "Active", "Closed"])).toEqual([
      { state: "New", count: 0 },
      { state: "Active", count: 1 },
      { state: "Closed", count: 2 },
      { state: "Odd", count: 1 },
    ]);
  });
});
