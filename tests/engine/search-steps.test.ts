import { describe, expect, it } from "vitest";
import { buildGenericSearchSteps, supportsGenericSearch } from "@/lib/engine/search-steps";
import type { ArrayFrame, CallStackFrame, GraphFrame, GridFrame, Step, StringFrame, TableFrame, TreeFrame } from "@/lib/engine/types";

describe("generic renderer search steps", () => {
  it("checks array values in order and stops on the requested value", () => {
    const current: Step<ArrayFrame> = {
      frame: { values: [7, 3, 9] },
      description: "Current array",
      transformation: { kind: "other", label: "prior edit" },
    };

    const steps = buildGenericSearchSteps(
      { slug: "bubble-sort", renderer: "array" },
      current,
      "3",
    ) as Step<ArrayFrame>[];

    expect(steps).toHaveLength(2);
    expect(steps[0].frame.states).toEqual({ 0: "active" });
    expect(steps[1].frame.states).toEqual({ 1: "found" });
    expect(steps[1].description).toContain("index 1");
    expect(steps[1].descriptionAr).toBeTruthy();
    expect(steps[1].counters).toEqual({ checks: 2 });
    expect(steps.every((step) => step.transformation === undefined)).toBe(true);
  });

  it("uses binary-search-tree routing instead of scanning every branch", () => {
    const current: Step<TreeFrame> = {
      frame: {
        rootId: "8",
        nodes: {
          "8": { id: "8", value: 8, left: "4", right: "12" },
          "4": { id: "4", value: 4 },
          "12": { id: "12", value: 12 },
        },
      },
      description: "Current tree",
    };

    const steps = buildGenericSearchSteps(
      { slug: "binary-search-tree", renderer: "tree" },
      current,
      "12",
    ) as Step<TreeFrame>[];

    expect(steps).toHaveLength(2);
    expect(steps[0].description).toContain("right");
    expect(steps[1].frame.states).toEqual({ "12": "found" });
    expect(steps.some((step) => step.frame.states?.["4"])).toBe(false);
  });

  it("finishes with an inspectable not-found step", () => {
    const current: Step<ArrayFrame> = {
      frame: { values: [1, 2] },
      description: "Current array",
    };

    const steps = buildGenericSearchSteps(
      { slug: "selection-sort", renderer: "array" },
      current,
      "99",
    ) as Step<ArrayFrame>[];

    expect(steps).toHaveLength(3);
    expect(steps.at(-1)?.phase).toBe("not-found");
    expect(steps.at(-1)?.counters).toEqual({ checks: 2 });
  });

  it("exposes lookup for every visualization renderer", () => {
    expect(supportsGenericSearch({ slug: "queue", renderer: "list" })).toBe(true);
    for (const renderer of ["array", "list", "tree", "hash", "graph", "grid", "table", "callstack", "string"] as const) {
      expect(supportsGenericSearch({ slug: "example", renderer })).toBe(true);
    }
  });

  it("searches disconnected graphs without revisiting nodes", () => {
    const current: Step<GraphFrame> = { frame: { nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }], edges: [{ from: "a", to: "b" }] }, description: "Graph" };
    const steps = buildGenericSearchSteps({ slug: "breadth-first-search", renderer: "graph" }, current, "C") as Step<GraphFrame>[];
    expect(steps).toHaveLength(3);
    expect(steps.at(-1)?.frame.nodeStates).toEqual({ c: "found" });
    expect(steps.at(-1)?.descriptionAr).toBeTruthy();
  });

  it("searches grid and table cells in a reversible row-major path", () => {
    const grid: Step<GridFrame> = { frame: { rows: 2, cols: 2, cells: [[{ value: 1 }, { value: 2 }], [{ value: 3 }, { value: 4 }]] }, description: "Grid" };
    const gridSteps = buildGenericSearchSteps({ slug: "maze", renderer: "grid" }, grid, "3") as Step<GridFrame>[];
    expect(gridSteps).toHaveLength(3);
    expect(gridSteps.at(-1)?.frame.cells[1][0].state).toBe("found");

    const table: Step<TableFrame> = { frame: { rowLabels: ["r1"], colLabels: ["c1", "c2"], cells: [[{ value: null }, { value: 8 }]] }, description: "Table" };
    const tableSteps = buildGenericSearchSteps({ slug: "fibonacci", renderer: "table" }, table, "8") as Step<TableFrame>[];
    expect(tableSteps).toHaveLength(1);
    expect(tableSteps[0].frame.cells[0][1].state).toBe("found");
  });

  it("searches call stacks from the top and strings by alignment", () => {
    const stack: Step<CallStackFrame> = { frame: { stack: [{ id: "1", label: "main" }, { id: "2", label: "solve", detail: "n=4" }] }, description: "Stack" };
    const stackSteps = buildGenericSearchSteps({ slug: "recursion", renderer: "callstack" }, stack, "main") as Step<CallStackFrame>[];
    expect(stackSteps).toHaveLength(2);
    expect(stackSteps[0].frame.stack[1].state).toBe("active");
    expect(stackSteps[1].frame.stack[0].state).toBe("found");

    const string: Step<StringFrame> = { frame: { text: [..."bornat"].map((ch) => ({ ch })) }, description: "Text" };
    const stringSteps = buildGenericSearchSteps({ slug: "naive-string-matching", renderer: "string" }, string, "nat") as Step<StringFrame>[];
    expect(stringSteps).toHaveLength(4);
    expect(stringSteps.at(-1)?.frame.text.slice(3).every((item) => item.state === "found")).toBe(true);
    expect(stringSteps.at(-1)?.frame.shift).toBe(3);
  });
});
