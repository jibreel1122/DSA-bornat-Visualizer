import { describe, expect, it } from "vitest";
import { loaders, metas } from "@/lib/algorithms/expansion-h";
import { createRNG } from "@/lib/engine/random";
import { LANGUAGES, MAX_STEPS, type Level, type Step } from "@/lib/engine/types";
import { validateFrame } from "../helpers/validate-frame";

const EXPECTED = [
  "held-karp-tsp",
  "digit-dp",
  "bitmask-assignment",
  "weighted-interval-scheduling",
  "optimal-bst",
  "regex-matching-dp",
  "maximum-product-subarray",
  "gas-station",
  "jump-game",
  "task-scheduler",
  "alphametic-solver",
  "dancing-links-exact-cover",
  "kakuro-solver",
  "pollard-rho",
  "fermat-primality",
  "lucas-theorem",
  "matrix-exponentiation",
  "lru-cache",
  "lfu-cache",
] as const;

async function run(slug: typeof EXPECTED[number], fields: Record<string, string>) {
  const algorithm = (await loaders[slug]()).default;
  const input = algorithm.parseInput(fields);
  return { algorithm, input, steps: algorithm.generate(input) as Step[] };
}

function lastNote(steps: Step[]): string {
  return (steps.at(-1)?.frame as { note?: string }).note ?? "";
}

function noteNumber(note: string, key: string): number {
  const match = new RegExp(`${key}=(-?\\d+)`).exec(note);
  if (!match) throw new Error(`Missing ${key} in "${note}"`);
  return Number(match[1]);
}

function permutations(values: number[]): number[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, i) => permutations(values.filter((_, j) => i !== j)).map((tail) => [value, ...tail]));
}

function binomial(n: number, k: number): bigint {
  let answer = BigInt(1);
  const count = Math.min(k, n - k);
  for (let i = 1; i <= count; i++) answer = answer * BigInt(n - i + 1) / BigInt(i);
  return answer;
}

describe("Expansion H registration and complete contracts", () => {
  it("exports exactly the requested 19 unique modules in the requested order", () => {
    expect(metas.map((meta) => meta.slug)).toEqual(EXPECTED);
    expect(Object.keys(loaders)).toEqual(EXPECTED);
    expect(new Set(EXPECTED).size).toBe(19);
    expect(metas.filter((meta) => meta.category === "dynamic-programming")).toHaveLength(7);
    expect(metas.filter((meta) => meta.category === "greedy")).toHaveLength(3);
    expect(metas.filter((meta) => meta.category === "backtracking")).toHaveLength(3);
    expect(metas.filter((meta) => meta.category === "mathematics")).toHaveLength(4);
    expect(metas.filter((meta) => meta.category === "hashing")).toHaveLength(2);
  });

  for (const slug of EXPECTED) {
    it(`${slug}: bilingual, deterministic, serializable, frame-valid at all levels`, async () => {
      const algorithm = (await loaders[slug]()).default;
      expect(algorithm.slug).toBe(slug);
      expect(algorithm.titleAr?.trim()).toBeTruthy();
      expect(algorithm.summaryAr?.trim()).toBeTruthy();
      expect(algorithm.tagsAr).toHaveLength(algorithm.tags.length);
      expect(algorithm.contentAr?.overview.trim()).toBeTruthy();
      expect(algorithm.inputFields.every((entry) => entry.labelAr?.trim() && entry.helpAr?.trim())).toBe(true);
      for (const language of LANGUAGES) expect(algorithm.code[language.id].trim().length).toBeGreaterThan(40);
      for (const level of [1, 2, 3, 4, 5] as Level[]) {
        const input = algorithm.defaultInput(level, createRNG(8_000 + level));
        expect(algorithm.parseInput(algorithm.serializeInput(input))).toEqual(input);
        const steps = algorithm.generate(input) as Step[];
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.length).toBeLessThanOrEqual(MAX_STEPS);
        expect(steps.at(-1)?.phase, `${slug} level ${level} must reach a truthful terminal result`).toBe("result");
        expect(algorithm.generate(input)).toEqual(steps);
        for (const [index, step] of steps.entries()) {
          expect(validateFrame(algorithm.renderer, step.frame), `${slug} frame ${index}`).toEqual([]);
          expect(step.description.trim()).toBeTruthy();
          expect(step.descriptionAr?.trim()).toBeTruthy();
          expect(step.why?.trim()).toBeTruthy();
          expect(step.whyAr?.trim()).toBeTruthy();
          expect(step.phase?.trim()).toBeTruthy();
          expect(step.codeLine ?? -1).toBeGreaterThanOrEqual(0);
          expect(step.codeLine ?? algorithm.pseudocode.length).toBeLessThan(algorithm.pseudocode.length);
        }
      }
    }, 30_000);
  }

  it("does not share mutable frames between consecutive steps", async () => {
    for (const slug of EXPECTED) {
      const algorithm = (await loaders[slug]()).default;
      const input = algorithm.defaultInput(1, createRNG(91));
      const steps = algorithm.generate(input) as Step[];
      for (let i = 1; i < steps.length; i++) expect(steps[i].frame).not.toBe(steps[i - 1].frame);
    }
  });
});

describe("Expansion H independent final-output oracles", () => {
  it("Held-Karp equals exhaustive tour enumeration", async () => {
    const costs = [[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]];
    const expected = Math.min(...permutations([1, 2, 3]).map((route) => {
      const full = [0, ...route, 0];
      return full.slice(1).reduce((sum, city, i) => sum + costs[full[i]][city], 0);
    }));
    const { steps } = await run("held-karp-tsp", { costs: costs.map((row) => row.join(",")).join(";") });
    expect(noteNumber(lastNote(steps), "cost")).toBe(expected);
    expect(lastNote(steps)).toContain("route=0");
  });

  it("Digit DP equals direct bounded enumeration, including zero", async () => {
    for (const [upper, target] of [[0, 0], [99, 9], [250, 7]]) {
      const expected = Array.from({ length: upper + 1 }, (_, n) => n)
        .filter((n) => String(n).split("").reduce((sum, digit) => sum + Number(digit), 0) === target).length;
      const { steps } = await run("digit-dp", { upper: String(upper), target: String(target) });
      expect(noteNumber(lastNote(steps), "count")).toBe(expected);
    }
  });

  it("Bitmask assignment equals exhaustive permutations", async () => {
    const costs = [[9, 2, 7], [6, 4, 3], [5, 8, 1]];
    const expected = Math.min(...permutations([0, 1, 2]).map((jobs) => jobs.reduce((sum, job, worker) => sum + costs[worker][job], 0)));
    const { steps } = await run("bitmask-assignment", { costs: costs.map((row) => row.join(",")).join(";") });
    expect(noteNumber(lastNote(steps), "cost")).toBe(expected);
  });

  it("Weighted interval scheduling equals exhaustive compatible subsets", async () => {
    const intervals = [{ start: 1, end: 3, weight: 5 }, { start: 2, end: 5, weight: 6 }, { start: 4, end: 6, weight: 5 }, { start: 6, end: 7, weight: 4 }];
    let expected = 0;
    for (let mask = 0; mask < 1 << intervals.length; mask++) {
      const chosen = intervals.filter((_, i) => (mask & (1 << i)) !== 0).sort((a, b) => a.start - b.start);
      if (chosen.every((item, i) => i === 0 || chosen[i - 1].end <= item.start)) expected = Math.max(expected, chosen.reduce((sum, item) => sum + item.weight, 0));
    }
    const { steps } = await run("weighted-interval-scheduling", { intervals: "1-3-5,2-5-6,4-6-5,6-7-4" });
    expect(noteNumber(lastNote(steps), "weight")).toBe(expected);
  });

  it("Optimal BST equals an independent recursive interval oracle", async () => {
    const frequencies = [4, 2, 6, 3];
    const solve = (left: number, right: number): number => {
      if (left > right) return 0;
      const sum = frequencies.slice(left, right + 1).reduce((a, b) => a + b, 0);
      return sum + Math.min(...Array.from({ length: right - left + 1 }, (_, offset) => {
        const root = left + offset;
        return solve(left, root - 1) + solve(root + 1, right);
      }));
    };
    const { steps } = await run("optimal-bst", { keys: "10,20,30,40", frequencies: frequencies.join(",") });
    expect(noteNumber(lastNote(steps), "cost")).toBe(solve(0, frequencies.length - 1));
  });

  it("Regex DP agrees with an independent memoized matcher", async () => {
    const oracle = (text: string, pattern: string): boolean => {
      const memo = new Map<string, boolean>();
      const match = (i: number, j: number): boolean => {
        const key = `${i},${j}`;
        if (memo.has(key)) return memo.get(key)!;
        if (j === pattern.length) return i === text.length;
        const first = i < text.length && (pattern[j] === "." || pattern[j] === text[i]);
        const answer = pattern[j + 1] === "*" ? match(i, j + 2) || (first && match(i + 1, j)) : first && match(i + 1, j + 1);
        memo.set(key, answer);
        return answer;
      };
      return match(0, 0);
    };
    for (const [text, pattern] of [["aab", "c*a*b"], ["mississippi", "mis*is*p*."], ["ab", ".*"], ["", "a*"]]) {
      const { steps } = await run("regex-matching-dp", { text, pattern });
      expect(lastNote(steps)).toContain(`match=${oracle(text, pattern)}`);
    }
  });

  it("Maximum product subarray equals exhaustive contiguous products", async () => {
    for (const values of [[2, 3, -2, 4], [-2, 0, -1], [-2, 3, -4]]) {
      let expected = Number.NEGATIVE_INFINITY;
      for (let left = 0; left < values.length; left++) {
        let product = 1;
        for (let right = left; right < values.length; right++) {
          product *= values[right];
          expected = Math.max(expected, product);
        }
      }
      const { steps } = await run("maximum-product-subarray", { values: values.join(",") });
      expect(noteNumber(lastNote(steps), "result")).toBe(expected);
    }
  });

  it("Gas station result equals brute-force simulation", async () => {
    const gas = [1, 2, 3, 4, 5];
    const cost = [3, 4, 5, 1, 2];
    const expected = gas.findIndex((_, start) => {
      let tank = 0;
      for (let offset = 0; offset < gas.length; offset++) {
        const i = (start + offset) % gas.length;
        tank += gas[i] - cost[i];
        if (tank < 0) return false;
      }
      return true;
    });
    const { steps } = await run("gas-station", { gas: gas.join(","), cost: cost.join(",") });
    expect(noteNumber(lastNote(steps), "start")).toBe(expected);
    expect(lastNote((await run("gas-station", { gas: "2,3,4", cost: "3,4,3" })).steps)).toContain("start=-1");
  });

  it("Jump game agrees with independent reachability DP", async () => {
    for (const values of [[2, 3, 1, 1, 4], [3, 2, 1, 0, 4], [0]]) {
      const reachable = Array<boolean>(values.length).fill(false);
      reachable[0] = true;
      for (let i = 0; i < values.length; i++) if (reachable[i]) for (let jump = 1; jump <= values[i] && i + jump < values.length; jump++) reachable[i + jump] = true;
      const { steps } = await run("jump-game", { values: values.join(",") });
      expect(lastNote(steps)).toContain(`reachable=${reachable.at(-1)}`);
    }
  });

  it("Task scheduler reaches the proven closed-form optimum", async () => {
    const tasks = ["A", "A", "A", "B", "B", "B"];
    const cooldown = 2;
    const counts = [...new Set(tasks)].map((task) => tasks.filter((value) => value === task).length);
    const maximum = Math.max(...counts);
    const tied = counts.filter((count) => count === maximum).length;
    const expected = Math.max(tasks.length, (maximum - 1) * (cooldown + 1) + tied);
    const { steps } = await run("task-scheduler", { tasks: tasks.join(","), cooldown: String(cooldown) });
    expect(noteNumber(lastNote(steps), "length")).toBe(expected);
  });

  it("Alphametic output is a distinct-digit arithmetic solution", async () => {
    const { steps } = await run("alphametic-solver", { addends: "I,BB", result: "ILL" });
    expect(steps.at(-1)?.phase).toBe("result");
    const assignments = Object.fromEntries(((steps.at(-1)?.frame as { output: string[] }).output).map((pair) => {
      const [letter, digit] = pair.split("=");
      return [letter, Number(digit)];
    }));
    const numeric = (word: string) => [...word].reduce((value, letter) => value * 10 + assignments[letter], 0);
    expect(numeric("I") + numeric("BB")).toBe(numeric("ILL"));
    expect(new Set(Object.values(assignments)).size).toBe(Object.keys(assignments).length);
    expect(assignments.I).not.toBe(0);
    expect(assignments.B).not.toBe(0);
  });

  it("Exact-cover selected rows cover each column exactly once", async () => {
    const rows = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 0], [0, 1, 0, 1]];
    const { steps } = await run("dancing-links-exact-cover", { rows: rows.map((row) => row.join(",")).join(";") });
    expect(steps.at(-1)?.phase).toBe("result");
    const selected = lastNote(steps).match(/solution=([\d,]+)/)?.[1].split(",").map(Number) ?? [];
    for (let col = 0; col < rows[0].length; col++) expect(selected.reduce((sum, row) => sum + rows[row][col], 0)).toBe(1);
  });

  it("Kakuro result satisfies every sum and uniqueness constraint", async () => {
    const { steps } = await run("kakuro-solver", { rows: "3", cols: "3", rowSums: "6,6,6", colSums: "6,6,6" });
    expect(steps.at(-1)?.phase).toBe("result");
    const cells = (steps.at(-1)?.frame as { cells: { value: number }[][] }).cells.map((row) => row.map((cell) => Number(cell.value)));
    for (const row of cells) {
      expect(row.reduce((a, b) => a + b, 0)).toBe(6);
      expect(new Set(row).size).toBe(row.length);
    }
    for (let col = 0; col < 3; col++) {
      const values = cells.map((row) => row[col]);
      expect(values.reduce((a, b) => a + b, 0)).toBe(6);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("Pollard rho returns a genuine nontrivial factor and handles primes", async () => {
    const { steps } = await run("pollard-rho", { n: "8051" });
    const factor = noteNumber(lastNote(steps), "factor");
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThan(8051);
    expect(8051 % factor).toBe(0);
    expect(lastNote((await run("pollard-rho", { n: "101" })).steps)).toContain("prime=true");
  });

  it("Fermat identifies witnesses and honestly preserves pseudoprime limitations", async () => {
    expect(lastNote((await run("fermat-primality", { n: "15", bases: "2" })).steps)).toContain("probable-prime=false");
    expect(lastNote((await run("fermat-primality", { n: "17", bases: "2,3,5" })).steps)).toContain("probable-prime=true");
    expect(lastNote((await run("fermat-primality", { n: "341", bases: "2" })).steps)).toContain("probable-prime=true");
  });

  it("Lucas theorem agrees with exact BigInt binomial arithmetic", async () => {
    for (const [n, k, prime] of [[10, 3, 5], [100, 20, 13], [250, 80, 17]]) {
      const expected = Number(binomial(n, k) % BigInt(prime));
      const { steps } = await run("lucas-theorem", { n: String(n), k: String(k), prime: String(prime) });
      expect(noteNumber(lastNote(steps), "result")).toBe(expected);
    }
  });

  it("Matrix exponentiation agrees with naive repeated multiplication", async () => {
    const multiply = (a: number[], b: number[]) => [
      a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
      a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
    ].map((value) => value % 1_000);
    const base = [1, 1, 1, 0];
    let expected = [1, 0, 0, 1];
    for (let i = 0; i < 10; i++) expected = multiply(expected, base);
    const { steps } = await run("matrix-exponentiation", { matrix: base.join(","), exponent: "10", modulus: "1000" });
    expect(lastNote(steps)).toContain(`result=${expected.join(",")}`);
  });

  it("LRU matches an independent map/list simulator", async () => {
    const { steps } = await run("lru-cache", { capacity: "2", operations: "put:a:1,put:b:2,get:a,put:c:3,get:b,get:c,put:a:4,get:a" });
    expect(lastNote(steps)).toContain("outputs=1,-1,3,4");
    expect(lastNote(steps)).toContain("order=c,a");
    expect(steps.map((step) => step.phase)).toEqual(expect.arrayContaining(["evict-candidate", "evict", "hit-move"]));
  });

  it("LFU matches frequency-first and recency-tie eviction", async () => {
    const { steps } = await run("lfu-cache", { capacity: "2", operations: "put:a:1,put:b:2,get:a,put:c:3,get:b,get:c,put:d:4,get:a,get:c,get:d" });
    expect(lastNote(steps)).toContain("outputs=1,-1,3,-1,3,4");
    expect(lastNote(steps)).toContain("keys=d,c");
    expect(steps.map((step) => step.phase)).toEqual(expect.arrayContaining(["evict-candidate", "evict", "hit-promote"]));
  });
});

describe("Expansion H intermediate trace legality", () => {
  it("DP traces separate candidates from committed writes", async () => {
    for (const slug of ["held-karp-tsp", "bitmask-assignment", "weighted-interval-scheduling", "optimal-bst", "regex-matching-dp"] as const) {
      const algorithm = (await loaders[slug]()).default;
      const input = algorithm.defaultInput(1, createRNG(7));
      const phases = (algorithm.generate(input) as Step[]).map((step) => step.phase);
      expect(phases).toContain("candidate");
      expect(phases.some((phase) => phase?.includes("write"))).toBe(true);
    }
  });

  it("matrix power separates multiplication/squaring proposals from commits", async () => {
    const phases = (await run("matrix-exponentiation", { matrix: "1,1,1,0", exponent: "5", modulus: "1000" })).steps.map((step) => step.phase);
    expect(phases).toEqual(expect.arrayContaining(["multiply-candidate", "multiply-commit", "square-candidate", "square-commit"]));
  });

  it("backtracking traces expose choose, rejection, undo, cover and restore operations", async () => {
    const alpha = (await run("alphametic-solver", { addends: "I,BB", result: "ILL" })).steps.map((step) => step.phase);
    expect(alpha).toEqual(expect.arrayContaining(["choose", "reject", "backtrack", "result"]));
    const exact = (await run("dancing-links-exact-cover", { rows: "1,0,1;1,0,0;0,1,1;0,1,1" })).steps.map((step) => step.phase);
    expect(exact).toEqual(expect.arrayContaining(["choose-column", "choose-row", "cover", "uncover", "backtrack", "result"]));
    const kakuro = (await run("kakuro-solver", { rows: "2", cols: "2", rowSums: "3,3", colSums: "3,3" })).steps.map((step) => step.phase);
    expect(kakuro).toEqual(expect.arrayContaining(["candidate", "reject", "place", "result"]));
  });

  it("cache traces show the victim before removing it", async () => {
    for (const slug of ["lru-cache", "lfu-cache"] as const) {
      const phases = (await run(slug, { capacity: "2", operations: "put:a:1,put:b:2,get:a,put:c:3" })).steps.map((step) => step.phase);
      const candidate = phases.indexOf("evict-candidate");
      const eviction = phases.indexOf("evict");
      expect(candidate).toBeGreaterThanOrEqual(0);
      expect(eviction).toBe(candidate + 1);
    }
  });

  it("malformed and out-of-contract inputs are rejected", async () => {
    const held = (await loaders["held-karp-tsp"]()).default;
    const regex = (await loaders["regex-matching-dp"]()).default;
    const product = (await loaders["maximum-product-subarray"]()).default;
    const exact = (await loaders["dancing-links-exact-cover"]()).default;
    const cache = (await loaders["lru-cache"]()).default;
    expect(() => held.parseInput({ costs: "0,1;1,0;2,3" })).toThrow();
    expect(() => regex.parseInput({ text: "abc", pattern: "*abc" })).toThrow();
    expect(() => product.parseInput({ values: "1000,1000,1000,1000,1000,1000" })).toThrow();
    expect(() => exact.parseInput({ rows: "1,0;1" })).toThrow();
    expect(() => cache.parseInput({ capacity: "0", operations: "get:a" })).toThrow();
  });
});
