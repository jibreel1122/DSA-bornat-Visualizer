import { createRNG } from "@/lib/engine/random";
import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";

const sortSlugs = ["bubble-sort", "selection-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort"];

async function main() {
  let failures = 0;
  for (const slug of sortSlugs) {
    const mod = (await import(`@/lib/algorithms/sorting/${slug}`)).default as AlgorithmModule<ArrayFrame, { values: number[] }>;
    for (const level of [1, 2, 3, 4, 5] as const) {
      const input = mod.defaultInput(level, createRNG(level * 101 + slug.length));
      const steps = mod.generate(input) as Step<ArrayFrame>[];
      const expected = [...input.values].sort((a, b) => a - b);
      const final = steps[steps.length - 1].frame.values;
      const ok = final.length === expected.length && final.every((v, i) => v === expected[i]);
      if (!ok || steps.length < 3) {
        console.log(`FAIL ${slug} L${level}: steps=${steps.length} final=${JSON.stringify(final)} expected=${JSON.stringify(expected)}`);
        failures++;
      }
    }
    console.log(`ok ${slug}`);
  }
  console.log(failures === 0 ? "ALL SORTING OK" : `${failures} FAILURES`);
  if (failures > 0) process.exit(1);
}
main();
