import { describe, expect, it } from "vitest";
import { validateFrame } from "./validate-frame";

describe("validateFrame", () => {
  it("accepts a valid ArrayFrame", () => {
    expect(
      validateFrame("array", {
        values: [3, 1, 2],
        states: { 0: "compare", 2: "sorted" },
        pointers: [{ index: 1, label: "i" }],
      }),
    ).toEqual([]);
  });

  it("rejects out-of-range state keys and bad states", () => {
    const violations = validateFrame("array", {
      values: [1, 2],
      states: { 5: "compare", 0: "sparkly" },
    });
    expect(violations.some((v) => v.includes("5"))).toBe(true);
    expect(violations.some((v) => v.includes("sparkly"))).toBe(true);
  });

  it("rejects a TreeFrame whose child ids do not exist", () => {
    const violations = validateFrame("tree", {
      nodes: { a: { id: "a", value: 1, left: "ghost" } },
      rootId: "a",
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it("rejects a GraphFrame edge referencing a missing node", () => {
    const violations = validateFrame("graph", {
      nodes: [{ id: "A", label: "A" }],
      edges: [{ from: "A", to: "B" }],
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it("rejects a GridFrame with mismatched dimensions", () => {
    const violations = validateFrame("grid", {
      rows: 2,
      cols: 2,
      cells: [[{ value: 1 }]],
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it("rejects a TableFrame with a cell invalid state", () => {
    const violations = validateFrame("table", {
      rowLabels: ["R1", "R2"],
      colLabels: ["C1", "C2"],
      cells: [
        [{ value: 1 }, { value: 2 }],
        [{ value: 3 }, { value: 4, state: "sparkly" }],
      ],
    });
    expect(violations.some((v) => v.includes("sparkly"))).toBe(true);
  });

  it("rejects a HashFrame with a bucket-level invalid state", () => {
    const violations = validateFrame("hash", {
      chained: true,
      buckets: [
        { index: 0, items: [{ key: "a" }], state: "sparkly" },
      ],
    });
    expect(violations.some((v) => v.includes("sparkly"))).toBe(true);
  });

  it("rejects a StringFrame with a pattern char invalid state", () => {
    const violations = validateFrame("string", {
      text: [{ ch: "a" }],
      pattern: [{ ch: "a", state: "sparkly" }],
    });
    expect(violations.some((v) => v.includes("sparkly"))).toBe(true);
  });
});
