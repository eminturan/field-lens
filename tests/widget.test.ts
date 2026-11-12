import { describe, expect, it } from "vitest";
import { DEFAULTS, savable } from "../src/widget/config";

describe("widget settings can be saved", () => {
  const own = { ...DEFAULTS, type: "Change", dateField: "Custom.TargetDate", states: ["Kapalı"] };
  it("own settings need type, date field and states", () => {
    expect(savable(own)).toBe(true);
    expect(savable({ ...own, states: [] })).toBe(false);
  });
  it("a widget linked to a saved query needs none of them, even with a custom range left empty", () => {
    expect(savable({ ...DEFAULTS, view: "weekly", queryId: "q1" })).toBe(true);
    expect(savable({ ...DEFAULTS, view: "summary", queryId: "q1", preset: "custom", from: "", to: "" })).toBe(true);
  });
  it("a linked monthly trend still needs a valid custom month range of its own", () => {
    expect(savable({ ...DEFAULTS, view: "trend", queryId: "q1", months: 0 })).toBe(false);
    expect(savable({ ...DEFAULTS, view: "trend", queryId: "q1", months: 6 })).toBe(true);
  });
  it("a linked summary still rejects an invalid breakdown rule", () => {
    expect(savable({ ...DEFAULTS, queryId: "q1", breakdown: "System.AssignedTo", breakdownRule: "(a+)+" })).toBe(false);
  });
});

describe("widget's own projects, assignee and conditions", () => {
  const own = { ...DEFAULTS, type: "Change", dateField: "Custom.TargetDate", states: ["Kapalı"] };
  it("accepts complete conditions and a project scope", () => {
    expect(savable({ ...own, projects: "all", assignee: "me", conditions: [{ field: "Custom.Sistem", type: "string", op: "=", value: "Mobil" }] })).toBe(true);
    expect(savable({ ...own, projects: ["A"] })).toBe(true);
  });
  it("rejects an empty project list and incomplete or invalid conditions", () => {
    expect(savable({ ...own, projects: [] })).toBe(false);
    expect(savable({ ...own, conditions: [{ field: "", type: "string", op: "=", value: "" }] })).toBe(false);
    expect(savable({ ...own, conditions: [{ field: "Microsoft.VSTS.Common.Priority", type: "integer", op: "<", value: "x" }] })).toBe(false);
  });
});
