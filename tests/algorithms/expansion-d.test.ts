import { describe, expect, it } from "vitest";
import { LANGUAGES, MAX_STEPS, type Level } from "@/lib/engine/types";
import { createRNG } from "@/lib/engine/random";
import { loaders, metas } from "@/lib/algorithms/expansion-d";
import { validateFrame } from "../helpers/validate-frame";

const EXPECTED = [
  "matrix-chain-multiplication", "rod-cutting", "subset-sum-dp", "word-break",
  "egg-dropping", "longest-palindromic-subsequence", "palindrome-partitioning", "catalan-numbers",
  "greedy-coin-change", "interval-partitioning", "optimal-merge-pattern", "greedy-set-cover",
  "graph-coloring", "knights-tour", "word-search", "generate-parentheses",
] as const;

async function run(slug: string, fields: Record<string, string>) {
  const algorithm = (await loaders[slug]()).default;
  const input = algorithm.parseInput(fields);
  return { algorithm, input, steps: algorithm.generate(input) };
}

function lastNote(steps: { frame: unknown }[]): string {
  const frame = steps.at(-1)?.frame as { note?: string };
  return frame.note ?? "";
}

describe("expansion D registration and contracts", () => {
  it("registers exactly the requested 16 unique slugs", () => {
    expect(metas.map((meta) => meta.slug)).toEqual(EXPECTED);
    expect(Object.keys(loaders)).toEqual(EXPECTED);
    expect(new Set(EXPECTED).size).toBe(16);
    expect(metas.filter((m) => m.category === "dynamic-programming")).toHaveLength(8);
    expect(metas.filter((m) => m.category === "greedy")).toHaveLength(4);
    expect(metas.filter((m) => m.category === "backtracking")).toHaveLength(4);
  });

  for (const slug of EXPECTED) {
    it(`${slug}: complete bilingual module, all code languages, all levels, valid reversible frames`, async () => {
      const algorithm = (await loaders[slug]()).default;
      const meta = metas.find((entry) => entry.slug === slug);
      expect(meta).toBeDefined();
      expect(algorithm.slug).toBe(slug);
      expect(algorithm.titleAr?.trim()).toBeTruthy();
      expect(algorithm.summaryAr?.trim()).toBeTruthy();
      expect(algorithm.tagsAr).toHaveLength(algorithm.tags.length);
      expect(algorithm.contentAr?.howItWorks.length).toBeGreaterThan(0);
      for (const language of LANGUAGES) expect(algorithm.code[language.id].trim().length).toBeGreaterThan(30);
      for (const level of [1, 2, 3, 4, 5] as Level[]) {
        const input = algorithm.defaultInput(level, createRNG(100 + level));
        expect(algorithm.parseInput(algorithm.serializeInput(input))).toEqual(input);
        const steps = algorithm.generate(input);
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.length).toBeLessThanOrEqual(MAX_STEPS);
        for (const [index, current] of steps.entries()) {
          expect(current.description.trim(), `English step ${index}`).toBeTruthy();
          expect(current.descriptionAr?.trim(), `Arabic step ${index}`).toBeTruthy();
          expect(current.phase?.trim(), `phase ${index}`).toBeTruthy();
          expect(current.codeLine ?? 0).toBeGreaterThanOrEqual(0);
          expect(current.codeLine ?? 0).toBeLessThan(algorithm.pseudocode.length);
          expect(validateFrame(algorithm.renderer, current.frame), `frame ${index}`).toEqual([]);
        }
        expect(algorithm.generate(input)).toEqual(steps);
      }
    });
  }
});

describe("expansion D independent final-result oracles", () => {
  it("matrix chain multiplication", async () => {
    const { steps } = await run("matrix-chain-multiplication", { dimensions: "10,30,5,60" });
    expect(lastNote(steps)).toContain("4500");
  });

  it("rod cutting", async () => {
    const { steps } = await run("rod-cutting", { prices: "1,5,8,9", length: "4" });
    expect(lastNote(steps)).toContain("10");
  });

  it("subset sum accepts and rejects exact targets", async () => {
    expect(lastNote((await run("subset-sum-dp", { values: "3,34,4,12,5,2", target: "9" })).steps)).toContain("true");
    expect(lastNote((await run("subset-sum-dp", { values: "3,34,4,12,5,2", target: "30" })).steps)).toContain("false");
  });

  it("word break accepts and rejects segmentations", async () => {
    expect(lastNote((await run("word-break", { text: "leetcode", dictionary: "leet,code" })).steps)).toContain("true");
    expect(lastNote((await run("word-break", { text: "catsandog", dictionary: "cats,dog,sand,and,cat" })).steps)).toContain("false");
  });

  it("egg dropping", async () => {
    expect(lastNote((await run("egg-dropping", { eggs: "2", floors: "10" })).steps)).toContain("4");
  });

  it("longest palindromic subsequence", async () => {
    expect(lastNote((await run("longest-palindromic-subsequence", { text: "bbbab" })).steps)).toContain("4");
  });

  it("palindrome partitioning", async () => {
    expect(lastNote((await run("palindrome-partitioning", { text: "aab" })).steps)).toContain("1");
  });

  it("Catalan numbers", async () => {
    expect(lastNote((await run("catalan-numbers", { n: "5" })).steps)).toContain("42");
  });

  it("greedy coin change", async () => {
    expect(lastNote((await run("greedy-coin-change", { coins: "25,10,5,1", amount: "63" })).steps)).toContain("6 coins");
  });

  it("interval partitioning uses the maximum overlap", async () => {
    expect(lastNote((await run("interval-partitioning", { intervals: "0-4,1-3,3-5,4-7" })).steps)).toContain("2");
  });

  it("optimal merge pattern", async () => {
    expect(lastNote((await run("optimal-merge-pattern", { sizes: "5,10,20,30" })).steps)).toContain("115");
  });

  it("greedy set cover succeeds and detects an uncoverable universe", async () => {
    expect(lastNote((await run("greedy-set-cover", { universe: "A,B,C,D,E", subsets: "A,B;B,C,D;D,E" })).steps)).toContain("3");
    expect((await run("greedy-set-cover", { universe: "A,B,C", subsets: "A;B" })).steps.at(-1)?.phase).toBe("failure");
  });

  it("graph coloring handles satisfiable and unsatisfiable triangles", async () => {
    expect((await run("graph-coloring", { vertices: "3", edges: "0-1,1-2,0-2", colors: "3" })).steps.at(-1)?.phase).toBe("result");
    expect((await run("graph-coloring", { vertices: "3", edges: "0-1,1-2,0-2", colors: "2" })).steps.at(-1)?.phase).toBe("failure");
  });

  it("knight's tour handles the one-square base case", async () => {
    expect((await run("knights-tour", { size: "1", startRow: "0", startCol: "0" })).steps.at(-1)?.phase).toBe("result");
  });

  it("word search accepts a legal path and rejects cell reuse", async () => {
    expect((await run("word-search", { board: "ABCE;SFCS;ADEE", word: "ABCCED" })).steps.at(-1)?.phase).toBe("result");
    expect((await run("word-search", { board: "AB;CD", word: "ABA" })).steps.at(-1)?.phase).toBe("failure");
  });

  it("generate parentheses produces Catalan(3)=5 unique balanced strings", async () => {
    const { steps } = await run("generate-parentheses", { pairs: "3" });
    const output = (steps.at(-1)?.frame as { output: string[] }).output;
    expect(new Set(output).size).toBe(5);
    expect(output.every((value) => {
      let balance = 0;
      for (const ch of value) {
        balance += ch === "(" ? 1 : -1;
        if (balance < 0) return false;
      }
      return balance === 0;
    })).toBe(true);
  });
});

describe("expansion D trace and adversarial behavior", () => {
  it("emits separate candidate/write transitions for recurrence algorithms", async () => {
    for (const slug of ["matrix-chain-multiplication", "rod-cutting", "egg-dropping"] as const) {
      const algorithm = (await loaders[slug]()).default;
      const input = algorithm.defaultInput(1, createRNG(7));
      const phases = algorithm.generate(input).map((entry) => entry.phase);
      expect(phases).toContain("candidate");
      expect(phases.some((phase) => phase?.includes("write"))).toBe(true);
    }
  });

  it("emits explicit choose/recurse/backtrack transitions where a failed branch exists", async () => {
    const coloring = await run("graph-coloring", { vertices: "3", edges: "0-1,1-2,0-2", colors: "2" });
    expect(coloring.steps.map((entry) => entry.phase)).toEqual(expect.arrayContaining(["try", "recurse", "backtrack", "failure"]));
    const search = await run("word-search", { board: "AB;CD", word: "ACB" });
    expect(search.steps.map((entry) => entry.phase)).toContain("backtrack");
  });

  it("rejects malformed and out-of-contract inputs", async () => {
    const matrix = (await loaders["matrix-chain-multiplication"]()).default;
    const coloring = (await loaders["graph-coloring"]()).default;
    const board = (await loaders["word-search"]()).default;
    const coins = (await loaders["greedy-coin-change"]()).default;
    expect(() => matrix.parseInput({ dimensions: "10,20" })).toThrow();
    expect(() => coloring.parseInput({ vertices: "3", edges: "0-3", colors: "2" })).toThrow();
    expect(() => board.parseInput({ board: "AB;C", word: "ABC" })).toThrow();
    expect(() => coins.parseInput({ coins: "5,0,1", amount: "9" })).toThrow();
  });
});
