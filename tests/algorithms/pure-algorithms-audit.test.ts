import { describe, expect, it } from "vitest";
import { loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, GridFrame, StringFrame, TableFrame, TreeFrame } from "@/lib/engine/types";

function seededValues(seed: number, length: number): number[] {
  let state = seed >>> 0;
  return Array.from({ length }, () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state % 21) - 10;
  });
}

function bottomRight(frame: TableFrame): string | number | null {
  return frame.cells.at(-1)?.at(-1)?.value ?? null;
}

function numericAux(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string): number[] {
  return (frame.aux?.find((row) => row.label.toLowerCase().startsWith(label.toLowerCase()))?.values ?? [])
    .filter((value): value is number => typeof value === "number");
}

function foundValues(frame: ArrayFrame): number[] {
  return Object.entries(frame.states ?? {})
    .filter(([, state]) => state === "found")
    .map(([index]) => frame.values[Number(index)]);
}

const BASE_SORTING = [
  "bubble-sort", "selection-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort",
  "shell-sort", "counting-sort", "radix-sort", "cocktail-shaker-sort", "comb-sort",
  "bucket-sort", "tim-sort", "pancake-sort",
];
const BASE_SEARCHING = [
  "linear-search", "binary-search", "jump-search", "interpolation-search",
  "exponential-search", "ternary-search",
];
const BASE_STRINGS = [
  "naive-pattern-matching", "kmp", "rabin-karp", "z-algorithm", "boyer-moore",
];

describe("sorting generators against the native numeric-order oracle", () => {
  for (const slug of BASE_SORTING) {
    it(`${slug}: sorts randomized duplicates, negatives, and bounds`, async () => {
      const mod = await loadAlgorithm(slug) as AlgorithmModule<ArrayFrame, { values: number[] }>;
      for (let seed = 1; seed <= 40; seed++) {
        const raw = seededValues(seed, 2 + (seed % 7));
        const values = slug === "counting-sort" || slug === "radix-sort" ? raw.map(Math.abs) : raw;
        const final = mod.generate({ values }).at(-1)!.frame.values;
        expect(final, `seed ${seed}`).toEqual([...values].sort((a, b) => a - b));
      }
    });
  }

  it("reports actual insertion comparisons and writes in distribution/hybrid sorts", async () => {
    const bucket = await loadAlgorithm("bucket-sort") as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const tim = await loadAlgorithm("tim-sort") as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const counting = await loadAlgorithm("counting-sort") as AlgorithmModule<ArrayFrame, { values: number[] }>;

    expect(bucket.generate({ values: [7, 7] }).at(-1)!.counters).toMatchObject({ comparisons: 1, writes: 5 });
    expect(tim.generate({ values: [1, 2, 3, 4] }).at(-1)!.counters?.comparisons).toBe(3);
    expect(counting.generate({ values: [1, 0] }).at(-1)!.counters?.writes).toBe(4);
  });
});

describe("searching generators", () => {
  it("interpolation search handles a constant-valued range", async () => {
    const mod = await loadAlgorithm("interpolation-search") as AlgorithmModule<ArrayFrame, { values: number[]; target: number }>;
    const steps = mod.generate({ values: [7, 7, 7, 7], target: 7 });
    expect(foundValues(steps.at(-1)!.frame)).toEqual([7]);
    expect(steps.at(-1)!.counters?.probes).toBe(1);
  });

  for (const slug of BASE_SEARCHING) {
    it(`${slug}: agrees with membership across duplicates and negative values`, async () => {
      const mod = await loadAlgorithm(slug) as AlgorithmModule<ArrayFrame, { values: number[]; target: number }>;
      for (let seed = 1; seed <= 30; seed++) {
        const values = seededValues(seed, 1 + (seed % 9));
        for (const target of [-10, -1, 0, 7, 10, 11]) {
          const steps = mod.generate({ values, target });
          const hits = steps.flatMap((step) => foundValues(step.frame));
          expect(hits.length > 0, `seed ${seed}, target ${target}`).toBe(values.includes(target));
          expect(hits.every((value) => value === target)).toBe(true);
        }
      }
    });
  }
});

describe("string matching generators", () => {
  const slugs = BASE_STRINGS;
  const cases = [
    { text: "aaaaa", pattern: "aa", matches: [0, 1, 2, 3] },
    { text: "abcabcabc", pattern: "abc", matches: [0, 3, 6] },
    { text: "mississippi", pattern: "issi", matches: [1, 4] },
    { text: "abcdef", pattern: "gh", matches: [] },
    { text: "a😀b😀", pattern: "😀", matches: [1, 3] },
    { text: "مرحبا مرحبا", pattern: "مرحبا", matches: [0, 6] },
  ];

  for (const slug of slugs) {
    it(`${slug}: reports exact overlapping Unicode character indices`, async () => {
      const mod = await loadAlgorithm(slug) as AlgorithmModule<StringFrame, { text: string; pattern: string }>;
      for (const testCase of cases) {
        const final = mod.generate(testCase).at(-1)!.frame;
        const matches = numericAux(final, slug === "naive-pattern-matching" ? "Matches at" : "Matches");
        expect(matches, `${testCase.text} / ${testCase.pattern}`).toEqual(testCase.matches);
        expect(Object.keys(final.text).length).toBe([...testCase.text].length + (slug === "z-algorithm" ? [...testCase.pattern].length + 1 : 0));
      }
    });

    it(`${slug}: validates pattern length in rendered characters`, async () => {
      const mod = await loadAlgorithm(slug) as AlgorithmModule<StringFrame, { text: string; pattern: string }>;
      expect(mod.parseInput({ text: "abc", pattern: "😀😀" })).toEqual({ text: "abc", pattern: "😀😀" });
    });
  }
});

function editDistance(a: string, b: string): number {
  const aa = [...a];
  const bb = [...b];
  const dp = Array.from({ length: aa.length + 1 }, (_, i) => Array.from({ length: bb.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= aa.length; i++) for (let j = 1; j <= bb.length; j++)
    dp[i][j] = aa[i - 1] === bb[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[aa.length][bb.length];
}

function lcsLength(a: string, b: string): number {
  const aa = [...a];
  const bb = [...b];
  const dp = Array.from({ length: aa.length + 1 }, () => new Array(bb.length + 1).fill(0));
  for (let i = 1; i <= aa.length; i++) for (let j = 1; j <= bb.length; j++)
    dp[i][j] = aa[i - 1] === bb[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[aa.length][bb.length];
}

function lisLength(values: number[]): number {
  let best = 0;
  for (let mask = 0; mask < 2 ** values.length; mask++) {
    const seq = values.filter((_, i) => mask & (1 << i));
    if (seq.every((value, i) => i === 0 || seq[i - 1] < value)) best = Math.max(best, seq.length);
  }
  return best;
}

describe("dynamic-programming generators", () => {
  it("supports Fibonacci's zero base case", async () => {
    const mod = await loadAlgorithm("fibonacci-dp") as AlgorithmModule<unknown, { n: number }>;
    expect(mod.parseInput({ n: "0" })).toEqual({ n: 0 });
    expect(mod.generate({ n: 0 }).at(-1)!.description).toContain("fib(0) = 0");
  });

  it("edit distance and LCS agree with independent tables", async () => {
    const edit = await loadAlgorithm("edit-distance") as AlgorithmModule<TableFrame, { a: string; b: string }>;
    const lcs = await loadAlgorithm("longest-common-subsequence") as AlgorithmModule<TableFrame, { a: string; b: string }>;
    const cases = [["", "abc"], ["kitten", "sitting"], ["ABCD", "ACBAD"], ["same", "same"], ["😀a", "a"]] as const;
    for (const [a, b] of cases) {
      expect(bottomRight(edit.generate({ a, b }).at(-1)!.frame)).toBe(editDistance(a, b));
      expect(bottomRight(lcs.generate({ a, b }).at(-1)!.frame)).toBe(lcsLength(a, b));
    }
  });

  it("0/1 knapsack and coin change return oracle optima", async () => {
    const knapsack = await loadAlgorithm("knapsack-01") as AlgorithmModule<TableFrame, { items: { w: number; v: number }[]; capacity: number }>;
    const coin = await loadAlgorithm("coin-change") as AlgorithmModule<TableFrame, { coins: number[]; amount: number }>;
    const items = [{ w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 8 }, { w: 5, v: 8 }];
    let best = 0;
    for (let mask = 0; mask < 2 ** items.length; mask++) {
      const picked = items.filter((_, i) => mask & (1 << i));
      if (picked.reduce((sum, item) => sum + item.w, 0) <= 7) best = Math.max(best, picked.reduce((sum, item) => sum + item.v, 0));
    }
    expect(bottomRight(knapsack.generate({ items, capacity: 7 }).at(-1)!.frame)).toBe(best);
    expect(bottomRight(coin.generate({ coins: [1, 3, 4], amount: 6 }).at(-1)!.frame)).toBe(2);
    expect(bottomRight(coin.generate({ coins: [2, 4], amount: 0 }).at(-1)!.frame)).toBe(0);
    expect(coin.generate({ coins: [4, 6], amount: 5 }).at(-1)!.description).toContain("not reachable");
  });

  it("LIS and maximum subarray handle duplicates and all-negative arrays", async () => {
    const lis = await loadAlgorithm("longest-increasing-subsequence") as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const max = await loadAlgorithm("maximum-subarray") as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const values = [3, 1, 2, 2, 5, -1, 6];
    const lisMatch = lis.generate({ values }).at(-1)!.description.match(/length (\d+)/);
    expect(Number(lisMatch?.[1])).toBe(lisLength(values));
    const maxSteps = max.generate({ values: [-8, -3, -6, -2, -5, -4] });
    expect(numericAux(maxSteps.at(-1)!.frame, "best sum")).toEqual([-2]);
    expect(maxSteps.at(-1)!.counters?.comparisons).toBe(10);
  });
});

function maxActivities(activities: { start: number; finish: number }[]): number {
  let best = 0;
  for (let mask = 0; mask < 2 ** activities.length; mask++) {
    const selected = activities.filter((_, i) => mask & (1 << i)).sort((a, b) => a.start - b.start);
    if (selected.every((activity, i) => i === 0 || selected[i - 1].finish <= activity.start)) best = Math.max(best, selected.length);
  }
  return best;
}

describe("greedy generators", () => {
  it("activity selection matches exhaustive optimum", async () => {
    const mod = await loadAlgorithm("activity-selection") as AlgorithmModule<TableFrame, { activities: { start: number; finish: number }[] }>;
    const activities = [{ start: 0, finish: 6 }, { start: 1, finish: 4 }, { start: 3, finish: 5 }, { start: 5, finish: 7 }, { start: 5, finish: 9 }, { start: 8, finish: 9 }];
    expect(mod.generate({ activities }).at(-1)!.counters?.selected).toBe(maxActivities(activities));
  });

  it("fractional knapsack reaches the ratio-order optimum", async () => {
    const mod = await loadAlgorithm("fractional-knapsack") as AlgorithmModule<TableFrame, { items: { w: number; v: number }[]; capacity: number }>;
    const final = mod.generate({ items: [{ w: 10, v: 60 }, { w: 20, v: 100 }, { w: 30, v: 120 }], capacity: 50 }).at(-1)!;
    expect(final.counters?.total).toBe(240);
  });

  it("job sequencing matches exhaustive feasible-subset profit", async () => {
    const mod = await loadAlgorithm("job-sequencing") as AlgorithmModule<TableFrame, { jobs: { id: string; deadline: number; profit: number }[] }>;
    const jobs = [{ id: "A", deadline: 2, profit: 100 }, { id: "B", deadline: 1, profit: 19 }, { id: "C", deadline: 2, profit: 27 }, { id: "D", deadline: 1, profit: 25 }, { id: "E", deadline: 3, profit: 15 }];
    let optimum = 0;
    for (let mask = 0; mask < 2 ** jobs.length; mask++) {
      const picked = jobs.filter((_, i) => mask & (1 << i)).sort((a, b) => a.deadline - b.deadline);
      if (picked.every((job, i) => job.deadline >= i + 1)) optimum = Math.max(optimum, picked.reduce((sum, job) => sum + job.profit, 0));
    }
    expect(mod.generate({ jobs }).at(-1)!.counters?.profit).toBe(optimum);
  });

  it("Huffman output is prefix-free and has optimal weighted cost", async () => {
    const mod = await loadAlgorithm("huffman-coding") as AlgorithmModule<TreeFrame, { text: string }>;
    const text = "aaaabbc";
    const final = mod.generate({ text }).at(-1)!;
    const rows = final.frame.aux ?? [];
    const chars = rows.find((row) => row.label === "character")!.values.map(String);
    const codes = rows.find((row) => row.label === "Huffman code")!.values.map(String);
    for (let i = 0; i < codes.length; i++) for (let j = 0; j < codes.length; j++)
      if (i !== j) expect(codes[j].startsWith(codes[i])).toBe(false);
    const frequencies = new Map([...text].map((ch) => [ch, [...text].filter((value) => value === ch).length]));
    const cost = chars.reduce((sum, ch, i) => sum + frequencies.get(ch)! * codes[i].length, 0);
    expect(cost).toBe(10);
    expect(final.counters?.merges).toBe(chars.length - 1);
  });
});

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = BigInt(1);
  base %= modulus;
  while (exponent > BigInt(0)) {
    if (exponent % BigInt(2) === BigInt(1)) result = (result * base) % modulus;
    base = (base * base) % modulus;
    exponent /= BigInt(2);
  }
  return result;
}

describe("mathematics generators", () => {
  it("Euclidean GCD handles zero, equal values, and coprime bounds", async () => {
    const mod = await loadAlgorithm("euclidean-gcd") as AlgorithmModule<unknown, { a: number; b: number }>;
    for (const [a, b] of [[48, 18], [17, 17], [999_999_999_989, 0], [999_999_999_989, 999_999_999_959]]) {
      const expected = gcd(BigInt(a), BigInt(b));
      expect(mod.generate({ a, b }).at(-1)!.description).toContain(`= ${expected}.`);
    }
  });

  it("extended Euclid preserves Bézout exactly near the accepted upper bound", async () => {
    const mod = await loadAlgorithm("extended-euclidean") as AlgorithmModule<TableFrame, { a: number; b: number }>;
    const a = 999_999_999_989;
    const b = 999_999_999_959;
    const final = mod.generate({ a, b }).at(-1)!;
    const x = BigInt(String(final.frame.cells[0][4].value));
    const y = BigInt(String(final.frame.cells[0][5].value));
    expect(BigInt(a) * x + BigInt(b) * y).toBe(gcd(BigInt(a), BigInt(b)));
    expect(final.description).toContain("= 1. ✓");
  });

  it("fast power returns exact raw and modular results", async () => {
    const mod = await loadAlgorithm("fast-power") as AlgorithmModule<unknown, { base: number; exp: number; mod?: number }>;
    expect(mod.generate({ base: 2, exp: 100 }).at(-1)!.description).toContain((BigInt(2) ** BigInt(100)).toString());
    const expected = modPow(BigInt(987654), BigInt(12345), BigInt(1_000_000_007));
    expect(mod.generate({ base: 987654, exp: 12345, mod: 1_000_000_007 }).at(-1)!.description).toContain(`= ${expected},`);
  });

  it("prime factorization preserves the product", async () => {
    const mod = await loadAlgorithm("prime-factorization") as AlgorithmModule<ArrayFrame, { n: number }>;
    for (const n of [2, 3, 4, 97, 360, 199_999]) {
      const factors = numericAux(mod.generate({ n }).at(-1)!.frame, "factors");
      expect(factors.reduce((product, factor) => product * factor, 1)).toBe(n);
    }
  });

  it("the sieve supports its mathematical minimum and marks exact primes", async () => {
    const mod = await loadAlgorithm("sieve-of-eratosthenes") as AlgorithmModule<GridFrame, { n: number }>;
    expect(mod.parseInput({ n: "2" })).toEqual({ n: 2 });
    const frame = mod.generate({ n: 30 }).at(-1)!.frame;
    const primes = frame.cells.flat().filter((cell) => cell.state === "sorted").map((cell) => Number(cell.value));
    expect(primes).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });
});
