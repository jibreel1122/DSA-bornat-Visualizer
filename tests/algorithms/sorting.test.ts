// tests/algorithms/sorting.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";

/**
 * Raw field values fed through each module's own parseInput. If a module
 * rejects a case (e.g. counting sort rejecting negatives), the contract is
 * satisfied by a friendly error instead — both branches are asserted.
 */
const CASES: Record<string, string> = {
  "empty input": "",
  "one element": "5",
  "two elements": "2, 1",
  "already sorted": "1, 2, 3, 4, 5, 6, 7, 8",
  "reverse sorted": "9, 8, 7, 6, 5, 4, 3, 2, 1",
  "duplicates": "5, 3, 8, 3, 5, 1, 8, 1",
  "all equal": "7, 7, 7, 7, 7",
  "negative numbers": "-3, 12, -7, 0, 5, -1",
  "extreme values": "999, -999, 500, -500, 0",
  "random": "34, 7, 23, 32, 5, 62, 78, 4, 97, 41, 3, 73",
};

function inversions(a: number[]): number {
  let c = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++)
      if (a[i] > a[j]) c++;
  return c;
}

describe.each(byCategory("sorting").map((m) => [m.slug] as const))(
  "%s",
  (slug) => {
    let mod: AlgorithmModule<ArrayFrame, { values: number[] }>;

    beforeAll(async () => {
      mod = (await loadAlgorithm(slug)) as typeof mod;
      expect(mod).not.toBeNull();
    });

    for (const [name, raw] of Object.entries(CASES)) {
      it(`handles ${name}`, () => {
        let input: { values: number[] };
        try {
          input = mod.parseInput({ values: raw });
        } catch (e) {
          // Rejection is fine if the message is user-friendly (non-empty prose).
          expect((e as Error).message.trim().length).toBeGreaterThan(3);
          return;
        }
        const steps = mod.generate(input) as Step<ArrayFrame>[];
        const final = steps[steps.length - 1].frame.values;
        const expected = [...input.values].sort((a, b) => a - b);
        expect(final).toEqual(expected);
      });
    }
  },
);

describe("bubble-sort counter theorems", () => {
  let mod: AlgorithmModule<ArrayFrame, { values: number[] }>;

  beforeAll(async () => {
    mod = (await loadAlgorithm("bubble-sort")) as typeof mod;
  });

  function finalCounters(values: number[]) {
    const steps = mod.generate({ values });
    return steps[steps.length - 1].counters ?? {};
  }

  it("swap count equals the inversion count of the input", () => {
    const values = [34, 7, 23, 32, 5, 62, 78, 4];
    expect(finalCounters(values).swaps).toBe(inversions(values));
  });

  it("reverse-sorted input needs n(n-1)/2 comparisons", () => {
    const values = [9, 8, 7, 6, 5, 4, 3, 2, 1];
    const n = values.length;
    expect(finalCounters(values).comparisons).toBe((n * (n - 1)) / 2);
  });

  it("sorted input early-exits: n-1 comparisons, 0 swaps", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];
    const c = finalCounters(values);
    expect(c.comparisons).toBe(values.length - 1);
    expect(c.swaps).toBe(0);
  });
});
