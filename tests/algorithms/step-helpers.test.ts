// tests/algorithms/step-helpers.test.ts
import { describe, expect, it } from "vitest";
import { arrayFrame } from "@/lib/algorithms/step-helpers";

describe("arrayFrame", () => {
  it("copies values (no aliasing)", () => {
    const values = [3, 1, 2];
    const f = arrayFrame(values);
    values[0] = 99;
    expect(f.values).toEqual([3, 1, 2]);
  });

  it("marks a sorted suffix without overwriting explicit states", () => {
    const f = arrayFrame([4, 3, 2, 1], { 2: "swap" }, { sortedFrom: 2 });
    expect(f.states).toEqual({ 2: "swap", 3: "sorted" });
  });

  it("marks a sorted prefix", () => {
    const f = arrayFrame([1, 2, 3, 4], {}, { sortedTo: 2 });
    expect(f.states).toEqual({ 0: "sorted", 1: "sorted" });
  });

  it("passes through note, pointers, and aux", () => {
    const f = arrayFrame([1], {}, {
      note: "hi",
      pointers: [{ index: 0, label: "i" }],
      aux: [{ label: "buf", values: [7] }],
    });
    expect(f.note).toBe("hi");
    expect(f.pointers).toEqual([{ index: 0, label: "i" }]);
    expect(f.aux).toEqual([{ label: "buf", values: [7] }]);
  });
});
