// tests/algorithms/searching.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";

type SearchInput = { values: number[]; target: number };

const SORTED = "2, 5, 8, 12, 16, 23, 38, 56, 72, 91";

const CASES: { name: string; values: string; target: string; present: boolean }[] = [
  { name: "target at first index", values: SORTED, target: "2", present: true },
  { name: "target in the middle", values: SORTED, target: "16", present: true },
  { name: "target at last index", values: SORTED, target: "91", present: true },
  { name: "absent within range", values: SORTED, target: "10", present: false },
  { name: "absent above range", values: SORTED, target: "100", present: false },
  { name: "absent below range", values: SORTED, target: "1", present: false },
  { name: "duplicates", values: "1, 3, 3, 3, 7, 9", target: "3", present: true },
  { name: "two elements, hit", values: "4, 9", target: "9", present: true },
  { name: "two elements, miss", values: "4, 9", target: "5", present: false },
];

/** Every step index marked "found", mapped to the value at that index. */
function foundValues(steps: Step<ArrayFrame>[]): number[] {
  const hits: number[] = [];
  for (const s of steps)
    for (const [k, state] of Object.entries(s.frame.states ?? {}))
      if (state === "found") hits.push(s.frame.values[Number(k)]);
  return hits;
}

describe.each(byCategory("searching").map((m) => [m.slug] as const))(
  "%s",
  (slug) => {
    let mod: AlgorithmModule<ArrayFrame, SearchInput>;

    beforeAll(async () => {
      mod = (await loadAlgorithm(slug)) as typeof mod;
      expect(mod).not.toBeNull();
    });

    for (const c of CASES) {
      it(c.name, () => {
        let input: SearchInput;
        try {
          input = mod.parseInput({ values: c.values, target: c.target });
        } catch (e) {
          expect((e as Error).message.trim().length).toBeGreaterThan(3);
          return;
        }
        const steps = mod.generate(input) as Step<ArrayFrame>[];
        const hits = foundValues(steps);
        if (c.present) {
          expect(hits.length, "expected a found marker").toBeGreaterThan(0);
          for (const v of hits) expect(v).toBe(input.target);
        } else {
          expect(hits, "no index may be marked found").toEqual([]);
          const finalDesc = steps[steps.length - 1].description.toLowerCase();
          expect(finalDesc).toMatch(/not (found|present|in)/);
        }
      });
    }

    it("finds the target on an unsorted array or rejects unsorted input", () => {
      // Only linear search must handle unsorted data; the others may either
      // reject it in parseInput or document the sorted-input requirement.
      let input: SearchInput;
      try {
        input = mod.parseInput({ values: "34, 7, 23", target: "7" });
      } catch (e) {
        expect((e as Error).message.trim().length).toBeGreaterThan(3);
        return;
      }
      if (slug === "linear-search") {
        const hits = foundValues(mod.generate(input) as Step<ArrayFrame>[]);
        expect(hits).toEqual([7]);
      }
    });
  },
);
