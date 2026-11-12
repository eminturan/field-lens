import { describe, expect, it } from "vitest";
import { buildWiql, checkCondition, Condition, opsFor, parseQueries, protectCell, Query, sanitizeSettings, settingsKey, toHtmlTable, toTsv } from "../src/hub/logic";

const q: Query = { type: "Kart", dateField: "Custom.TargetDate", from: "2026-10-01", to: "2026-10-31", states: ["Active"], columns: [] };
const c = (over: Partial<Condition>): Condition => ({ field: "Custom.Sistem", type: "string", op: "=", value: "Mobil", ...over });

describe("extra field conditions", () => {
  it("offers operators by field type", () => {
    expect(opsFor("string")).toEqual(["=", "<>", "contains", "notContains"]);
    expect(opsFor("integer")).toEqual(["=", "<>", "<", ">", "<=", ">="]);
    expect(opsFor("dateTime")).toEqual(["=", "<>", "<", ">", "<=", ">="]);
    expect(opsFor("plainText")).toEqual(["contains", "notContains"]);
    expect(opsFor("treePath")).toEqual(["=", "<>", "under", "notUnder"]);
    expect(opsFor("boolean")).toEqual(["=", "<>"]);
  });

  it("writes each condition into the WIQL", () => {
    const w = buildWiql({
      ...q,
      conditions: [
        c({}),
        c({ field: "System.Tags", type: "plainText", op: "contains", value: "acil" }),
        c({ field: "Microsoft.VSTS.Common.Priority", type: "integer", op: "<=", value: "2" }),
        c({ field: "System.AreaPath", type: "treePath", op: "notUnder", value: "P\\Eski" }),
        c({ field: "Custom.Kritik", type: "boolean", op: "=", value: "true" }),
        c({ field: "System.ChangedDate", type: "dateTime", op: ">", value: "2026-10-05" }),
      ],
    });
    expect(w).toContain("AND [Custom.Sistem] = 'Mobil'");
    expect(w).toContain("AND [System.Tags] CONTAINS 'acil'");
    expect(w).toContain("AND [Microsoft.VSTS.Common.Priority] <= 2");
    expect(w).toContain("AND NOT [System.AreaPath] UNDER 'P\\Eski'");
    expect(w).toContain("AND [Custom.Kritik] = True");
    expect(w).toContain("AND [System.ChangedDate] > '2026-10-05'");
  });

  it("an empty value with = finds empty fields", () => expect(buildWiql({ ...q, conditions: [c({ value: "" })] })).toContain("[Custom.Sistem] = ''"));

  it("escapes quotes and rejects anything that could break out of the query", () => {
    expect(buildWiql({ ...q, conditions: [c({ value: "O'Brien" })] })).toContain("= 'O''Brien'");
    expect(checkCondition(c({ field: "X] OR 1=1 --" }))).toBe("field");
    expect(checkCondition(c({ op: "OR" as never }))).toBe("op");
    expect(checkCondition(c({ type: "integer", op: "<", value: "1 OR 1=1" }))).toBe("value");
    expect(checkCondition(c({ type: "dateTime", op: "<", value: "2026-10-05' OR '" }))).toBe("value");
    expect(checkCondition(c({ type: "boolean", value: "maybe" }))).toBe("value");
    expect(checkCondition(c({ type: "plainText", op: "=" }))).toBe("op");
    expect(checkCondition(c({ type: "integer", op: "<", value: "" }))).toBe("value");
    expect(() => buildWiql({ ...q, conditions: [c({ type: "integer", op: "<", value: "x" })] })).toThrow();
    expect(checkCondition(c({}))).toBeUndefined();
  });

  it("is part of saved settings: key, parsing and sanitizing", () => {
    expect(settingsKey({ conditions: [c({})] })).not.toBe(settingsKey({}));
    const out = parseQueries([{ id: "1", name: "A", settings: { conditions: [c({}), { field: "bad]", type: "string", op: "=", value: "" }, { field: "F", op: "=", value: 3 }, "x"] } }], false);
    expect(out[0].settings.conditions).toEqual([c({})]);
    const fields = [{ referenceName: "Custom.Sistem", name: "Sistem", type: "string" }];
    expect(sanitizeSettings({ conditions: [c({}), c({ field: "Custom.Gone" })] }, [], fields).conditions).toEqual([c({})]);
  });
});

describe("copying the table", () => {
  const rows = [["ID", "Title"], ["1", "a\tb\nc"], ["2", '<b>x</b> & "y"']];
  it("tab-separated text keeps one row per line", () => {
    expect(toTsv(rows)).toBe('ID\tTitle\r\n1\ta b c\r\n2\t<b>x</b> & "y"');
  });
  it("protectCell stops Excel from running pasted formulas", () => {
    expect(["=1+1", "+x", "-y", "@z", "ok"].map(protectCell)).toEqual(["'=1+1", "'+x", "'-y", "'@z", "ok"]);
  });
  it("HTML table escapes cell text", () => {
    const h = toHtmlTable(rows);
    expect(h).toContain("<th>ID</th><th>Title</th>");
    expect(h).toContain("<td>&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;</td>");
    expect(h).not.toContain("<b>x</b>");
  });
});
