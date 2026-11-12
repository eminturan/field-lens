import { describe, expect, it } from "vitest";
import { applyRule, buildWiql, chunk, compileRule, crossCount, DERIVED, deriveRows, dayBuckets, monthBuckets, monthsRange, upcomingRange, countStates, previousRange, weekBuckets, csvRows, filterRows, sortRows, Field, formatCell, moveItem, pageSlice, presetRange, Query, sanitizeSettings, searchFields, toCsv } from "../src/hub/logic";

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
  it("all projects: no project condition", () => expect(buildWiql({ ...q, projects: "all" })).not.toContain("TeamProject"));
  it("chosen projects: IN list, escaped", () =>
    expect(buildWiql({ ...q, projects: ["A", "O'B"] })).toContain("[System.TeamProject] IN ('A', 'O''B')"));
  it("rejects an empty project list", () => expect(() => buildWiql({ ...q, projects: [] })).toThrow());
  it("adds no assignee condition by default", () => expect(buildWiql(q)).not.toContain("AssignedTo"));
  it("filters to the current user", () => expect(buildWiql({ ...q, assignee: "me" })).toContain("AND [System.AssignedTo] = @Me"));
  it("filters to unassigned items", () => expect(buildWiql({ ...q, assignee: "none" })).toContain("AND [System.AssignedTo] = ''"));
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
  it("keeps only known projects; none left means this project", () => {
    expect(sanitizeSettings({ projects: ["A", "Gone"] }, [], fields, ["A", "B"]).projects).toEqual(["A"]);
    expect(sanitizeSettings({ projects: ["Gone"] }, [], fields, ["A"]).projects).toBeUndefined();
    expect(sanitizeSettings({ projects: "all" }, [], fields, ["A"]).projects).toBe("all");
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

describe("filterRows", () => {
  const cols: Field[] = [
    { referenceName: "System.Title", name: "Title", type: "string" },
    { referenceName: "System.AssignedTo", name: "Assigned To", type: "identity" },
  ];
  const rows = [
    { "System.Title": "İNTERNET şube", "System.AssignedTo": { displayName: "Ayşe Yılmaz" } },
    { "System.Title": "Mobil", "System.AssignedTo": { displayName: "Can Işık" } },
    { "System.Title": "Mobil ödeme", "System.AssignedTo": undefined },
  ];

  it("global search looks in every column as displayed, Turkish case-insensitive", () => {
    expect(filterRows(rows, cols, "internet", {})).toEqual([rows[0]]);
    expect(filterRows(rows, cols, "ışık", {})).toEqual([rows[1]]);
  });

  it("column filters must all match, and combine with the global search", () => {
    expect(filterRows(rows, cols, "", { "System.Title": "mobil" })).toEqual([rows[1], rows[2]]);
    expect(filterRows(rows, cols, "mobil", { "System.AssignedTo": "can" })).toEqual([rows[1]]);
    expect(filterRows(rows, cols, " ", { "System.Title": "" })).toEqual(rows);
  });
});

describe("sortRows", () => {
  const rows = [
    { "System.Id": 10, "System.Title": "b2", "D": "2026-09-05T00:00:00Z" },
    { "System.Id": 9, "System.Title": "B10", "D": undefined },
    { "System.Id": 100, "System.Title": "a", "D": "2026-09-01T00:00:00Z" },
  ];
  const ids = (r: Record<string, unknown>[]) => r.map((x) => x["System.Id"]);

  it("numbers numerically, text naturally, both directions", () => {
    expect(ids(sortRows(rows, { referenceName: "System.Id", name: "ID", type: "integer" }, "asc"))).toEqual([9, 10, 100]);
    expect(ids(sortRows(rows, { referenceName: "System.Title", name: "Title", type: "string" }, "asc"))).toEqual([100, 10, 9]);
    expect(ids(sortRows(rows, { referenceName: "System.Title", name: "Title", type: "string" }, "desc"))).toEqual([9, 10, 100]);
  });

  it("dates by time with empty values last in both directions, without mutating", () => {
    const d: Field = { referenceName: "D", name: "D", type: "dateTime" };
    expect(ids(sortRows(rows, d, "asc"))).toEqual([100, 10, 9]);
    expect(ids(sortRows(rows, d, "desc"))).toEqual([10, 100, 9]);
    expect(ids(rows)).toEqual([10, 9, 100]);
  });
});

describe("previousRange", () => {
  it("a full calendar month compares with the month before", () => {
    expect(previousRange("2026-10-01", "2026-10-31")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(previousRange("2026-03-01", "2026-03-31")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousRange("2026-01-01", "2026-01-31")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("any other range compares with the same number of days right before it", () => {
    expect(previousRange("2026-10-18", "2026-11-01")).toEqual({ from: "2026-10-03", to: "2026-10-17" });
    expect(previousRange("2026-11-01", "2026-11-12")).toEqual({ from: "2026-10-20", to: "2026-10-31" });
  });
});

describe("weekBuckets", () => {
  // Yerel gece yarısı; formatCell/toDateInput yerel güne çevirir.
  const at = (d: string) => new Date(`${d}T10:00:00`).toISOString();
  const rows = [
    { D: at("2026-10-01"), "System.State": "A" },
    { D: at("2026-10-07"), "System.State": "B" },
    { D: at("2026-10-08"), "System.State": "A" },
    { D: at("2026-10-31"), "System.State": "A" },
    { D: undefined, "System.State": "A" },
  ];

  it("Monday-to-Sunday calendar weeks, first and last cut at the range, counted per state", () => {
    // 2026-10-01 perşembe, 2026-10-31 cumartesi
    const b = weekBuckets(rows, "D", "2026-10-01", "2026-10-31");
    expect(b.map((x) => [x.start, x.end, x.total])).toEqual([
      ["2026-10-01", "2026-10-04", 1],
      ["2026-10-05", "2026-10-11", 2],
      ["2026-10-12", "2026-10-18", 0],
      ["2026-10-19", "2026-10-25", 0],
      ["2026-10-26", "2026-10-31", 1],
    ]);
    expect(b[1].counts).toEqual({ A: 1, B: 1 });
  });
});

describe("widget ranges", () => {
  const now = new Date(2026, 10, 12, 15, 0);
  it("monthsRange starts on the first day N-1 months back and ends today", () => {
    expect(monthsRange(6, now)).toEqual({ from: "2026-06-01", to: "2026-11-12" });
    expect(monthsRange(12, now)).toEqual({ from: "2025-12-01", to: "2026-11-12" });
  });
  it("upcomingRange covers today and the next N-1 days", () => {
    expect(upcomingRange(7, now)).toEqual({ from: "2026-11-12", to: "2026-11-18" });
    expect(upcomingRange(30, new Date(2026, 11, 20))).toEqual({ from: "2026-12-20", to: "2027-01-18" });
  });
});

describe("monthBuckets", () => {
  const at = (d: string) => new Date(`${d}T10:00:00`).toISOString();
  it("one bucket per calendar month, ends cut at the range, counted per state", () => {
    const rows = [
      { D: at("2026-09-15"), "System.State": "A" },
      { D: at("2026-11-02"), "System.State": "B" },
      { D: at("2026-11-03"), "System.State": "A" },
      { D: at("2026-12-01"), "System.State": "A" },
    ];
    const b = monthBuckets(rows, "D", "2026-09-10", "2026-11-12");
    expect(b.map((x) => [x.start, x.end, x.total])).toEqual([
      ["2026-09-10", "2026-09-30", 1],
      ["2026-10-01", "2026-10-31", 0],
      ["2026-11-01", "2026-11-12", 2],
    ]);
    expect(b[2].counts).toEqual({ A: 1, B: 1 });
  });
});

describe("dayBuckets", () => {
  const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00`).toISOString();
  it("one bucket per local day that has items, in date order, counted per state", () => {
    const rows = [
      { D: at("2026-10-09"), "System.State": "A" },
      { D: at("2026-10-02", 23), "System.State": "B" },
      { D: at("2026-10-02", 1), "System.State": "A" },
      { D: at("2026-11-01"), "System.State": "A" },
      { D: undefined, "System.State": "A" },
    ];
    const b = dayBuckets(rows, "D", "2026-10-01", "2026-10-31");
    expect(b.map((x) => [x.start, x.end, x.total])).toEqual([
      ["2026-10-02", "2026-10-02", 2],
      ["2026-10-09", "2026-10-09", 1],
    ]);
    expect(b[0].counts).toEqual({ A: 1, B: 1 });
  });
});

describe("rules", () => {
  it("compileRule returns a RegExp, or the error message for an invalid pattern", () => {
    expect(compileRule("\\b(ABC|XY)\\b.*")).toBeInstanceOf(RegExp);
    expect(typeof compileRule("(ABC")).toBe("string");
    expect(typeof compileRule("")).toBe("string");
  });

  it("compileRule rejects nested quantifiers that can freeze the browser", () => {
    for (const p of ["(a+)+$", "(\\w+\\s?)*$", "([a-z]*)*x", "(a{1,}){2,}", "(?:x+)+y"]) expect(typeof compileRule(p)).toBe("string");
    for (const p of ["(ABC|XY) .+", "\\(a+\\)+", "(a)+", "[(a+)]+"]) expect(compileRule(p)).toBeInstanceOf(RegExp);
  });

  it("applyRule only looks at the first 500 characters", () => {
    expect(applyRule("a".repeat(600) + "XY", /XY/u)).toBeUndefined();
  });

  it("applyRule keeps the first matching part; undefined when nothing matches", () => {
    const re = compileRule("\\b(ABC|XY)\\b.*") as RegExp;
    expect(applyRule("Deniz Arslan ABC Ödeme Hizmetleri", re)).toBe("ABC Ödeme Hizmetleri");
    expect(applyRule("Selin Koç XY Yazılım Destek", re)).toBe("XY Yazılım Destek");
    expect(applyRule("Ali Veli DGM Operasyon", re)).toBeUndefined();
    // "AXY" içindeki XY kelime sınırında olmadığı için eşleşmez
    expect(applyRule("Can AXYS", re)).toBeUndefined();
  });

  it("deriveRows fills the derived column from the source's displayed value; empty stays empty, misses get the label", () => {
    const re = compileRule("\\b(ABC|XY)\\b.*") as RegExp;
    const src: Field = { referenceName: "Custom.Requester", name: "Requester", type: "identity" };
    const rows = [
      { "Custom.Requester": { displayName: "Deniz Arslan ABC Ödeme Hizmetleri" } },
      { "Custom.Requester": undefined },
      { "Custom.Requester": { displayName: "Ali Veli" } },
    ];
    expect(deriveRows(rows, src, re, "(eşleşmedi)").map((r) => r[DERIVED])).toEqual(["ABC Ödeme Hizmetleri", "", "(eşleşmedi)"]);
    expect(rows[0]).not.toHaveProperty(DERIVED);
  });
});

describe("sanitizeSettings with a derived column", () => {
  const fields: Field[] = [{ referenceName: "Custom.Requester", name: "Requester", type: "identity" }];
  it("keeps the derived column while its source exists", () => {
    const s = { columns: ["Custom.Requester", DERIVED], derived: { source: "Custom.Requester", pattern: "XY.*", name: "Birim" } };
    expect(sanitizeSettings(s, [], fields)).toEqual(s);
  });
  it("drops the rule and its column when the source is gone", () => {
    const s = { columns: [DERIVED], derived: { source: "Custom.Gone", pattern: "XY.*", name: "Birim" } };
    expect(sanitizeSettings(s, [], fields)).toEqual({ columns: [], derived: undefined });
  });
});

describe("crossCount", () => {
  it("counts each displayed value per state, biggest total first, ties by name, empty value as \"\"", () => {
    const col: Field = { referenceName: "U", name: "Birim", type: "string" };
    const rows = [
      { U: "ABC Kart", "System.State": "Kapalı" },
      { U: "XY", "System.State": "Kapalı" },
      { U: "XY", "System.State": "İptal" },
      { U: "XY", "System.State": "Kapalı" },
      { U: undefined, "System.State": "İptal" },
      { U: "Aaa", "System.State": "Kapalı" },
    ];
    expect(crossCount(rows, col)).toEqual([
      { value: "XY", total: 3, counts: { Kapalı: 2, İptal: 1 } },
      { value: "", total: 1, counts: { İptal: 1 } },
      { value: "Aaa", total: 1, counts: { Kapalı: 1 } },
      { value: "ABC Kart", total: 1, counts: { Kapalı: 1 } },
    ]);
  });
});
