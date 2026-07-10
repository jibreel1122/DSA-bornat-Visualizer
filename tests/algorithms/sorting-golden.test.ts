// tests/algorithms/sorting-golden.test.ts
import { describe, expect, it } from "vitest";
import { loadAlgorithm } from "@/lib/algorithms";

/**
 * Byte-identical golden baseline for the Task 8 refactor. If one of these
 * snapshots ever changes intentionally (a deliberate behavior fix), update
 * it explicitly with `vitest -u` in that fix's own commit.
 */
const SLUGS = [
  "bubble-sort", "selection-sort", "insertion-sort",
  "shell-sort", "cocktail-shaker-sort", "comb-sort",
] as const;

const INPUT = { values: [5, 2, 9, 1, 5, 6, 3, 8] };

describe("comparison-sort golden steps", () => {
  for (const slug of SLUGS) {
    it(`${slug} step stream is unchanged`, async () => {
      const mod = await loadAlgorithm(slug);
      expect(mod!.generate(INPUT)).toMatchSnapshot();
    });
  }
});
