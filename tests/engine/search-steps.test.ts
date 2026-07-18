import { describe, expect, it } from "vitest";
import { buildGenericSearchSteps, supportsGenericSearch } from "@/lib/engine/search-steps";
import type { ArrayFrame, Step, TreeFrame } from "@/lib/engine/types";

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

  it("exposes lookup only for renderers with a meaningful visual path", () => {
    expect(supportsGenericSearch({ slug: "queue", renderer: "list" })).toBe(true);
    expect(supportsGenericSearch({ slug: "fibonacci", renderer: "table" })).toBe(false);
  });
});
