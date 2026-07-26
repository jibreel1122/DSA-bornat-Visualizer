import { describe, expect, it } from "vitest";
import { loaders, metas } from "@/lib/algorithms/expansion-a";
import { createRNG } from "@/lib/engine/random";
import { LANGUAGES, type AlgorithmModule, type ArrayFrame, type CallStackFrame, type Level, type StringFrame, type TableFrame } from "@/lib/engine/types";
import { validateFrame } from "../helpers/validate-frame";

const expected = [
  "cycle-sort", "gnome-sort", "odd-even-sort", "bitonic-sort", "introsort", "tree-sort",
  "fibonacci-search", "sentinel-search", "quickselect", "binary-search-first-last",
  "manacher", "aho-corasick", "suffix-array", "rolling-hash",
  "modular-inverse", "chinese-remainder-theorem", "euler-totient", "miller-rabin",
  "recursive-binary-search",
];
const load = async <F = unknown, I = unknown>(slug: string): Promise<AlgorithmModule<F, I>> =>
  (await loaders[slug]()).default as unknown as AlgorithmModule<F, I>;
const final = <F, I>(algorithm: AlgorithmModule<F, I>, input: I): F => {
  const steps = algorithm.generate(input);
  expect(steps.length).toBeGreaterThan(0);
  return steps.at(-1)!.frame;
};

describe("expansion pack A registration and contracts", () => {
  it("registers exactly the requested 19 unique modules", () => {
    expect(metas.map((meta) => meta.slug)).toEqual(expected);
    expect(Object.keys(loaders)).toEqual(expected);
    expect(new Set(expected).size).toBe(19);
  });

  it.each(expected)("%s has complete bilingual/module data and works at all levels", async (slug) => {
    const algorithm = await load(slug);
    expect(algorithm.slug).toBe(slug);
    expect(algorithm.titleAr?.trim()).toBeTruthy();
    expect(algorithm.summaryAr?.trim()).toBeTruthy();
    expect(algorithm.tagsAr?.length).toBe(algorithm.tags.length);
    expect(algorithm.contentAr?.overview.trim()).toBeTruthy();
    expect(algorithm.contentAr?.howItWorks.length).toBeGreaterThan(0);
    for (const language of LANGUAGES) expect(algorithm.code[language.id].trim(), language.id).not.toBe("");
    for (const level of [1, 2, 3, 4, 5] as Level[]) {
      const input = algorithm.defaultInput(level, createRNG(700 + level));
      expect(algorithm.parseInput(algorithm.serializeInput(input))).toEqual(input);
      const steps = algorithm.generate(input);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.description.trim()).not.toBe("");
        expect(step.descriptionAr?.trim()).not.toBe("");
        expect(validateFrame(algorithm.renderer, step.frame)).toEqual([]);
        for (const value of Object.values(step.counters ?? {})) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("expansion pack A final correctness", () => {
  it.each(expected.slice(0, 6))("%s sorts duplicates and negatives", async (slug) => {
    const algorithm = await load<{ values: number[] }, { values: number[] }>(slug);
    const input = { values: slug === "bitonic-sort" ? [3, -1, 3, 2, 0, 2, -5, 8] : [3, -1, 3, 2, 0, 2, -5] };
    const frame = final(algorithm, input) as ArrayFrame;
    expect(frame.values).toEqual([...input.values].sort((a, b) => a - b));
  });

  it("search modules find present targets and reject absent ones", async () => {
    for (const slug of ["fibonacci-search", "sentinel-search", "recursive-binary-search"]) {
      const algorithm = await load<unknown, { values: number[]; target: number }>(slug);
      const present = algorithm.generate({ values: [8, 1, 5, 3, 5], target: 5 });
      expect(JSON.stringify(present.at(-1)!.frame)).toMatch(/found|5/);
      const absent = algorithm.generate({ values: [8, 1, 5, 3], target: 99 });
      expect(absent.at(-1)!.description.toLowerCase()).toMatch(/absent|not present/);
    }
  });

  it("quickselect returns the requested order statistic", async () => {
    const algorithm = await load<ArrayFrame, { values: number[]; k: number }>("quickselect");
    const frame = final(algorithm, { values: [9, 1, 7, 3, 5, 3], k: 4 });
    const found = Object.entries(frame.states ?? {}).find(([, state]) => state === "found");
    expect(found).toBeTruthy();
    expect(frame.values[Number(found![0])]).toBe(5);
  });

  it("first/last search returns exact duplicate boundaries", async () => {
    const algorithm = await load<ArrayFrame, { values: number[]; target: number }>("binary-search-first-last");
    const frame = final(algorithm, { values: [1, 2, 2, 2, 4], target: 2 });
    expect(frame.aux?.find((row) => row.label.includes("Result"))?.values).toEqual([1, 3]);
  });

  it("string algorithms return certified reference results", async () => {
    const manacher = final(await load("manacher"), { text: "forgeeksskeegfor" }) as StringFrame;
    expect(manacher.aux?.find((row) => row.label === "Longest palindrome")?.values.join("")).toBe("geeksskeeg");
    const suffix = final(await load("suffix-array"), { text: "banana" }) as StringFrame;
    expect(suffix.aux?.find((row) => row.label === "Suffix array")?.values).toEqual([5, 3, 1, 0, 4, 2]);
    const rolling = final(await load("rolling-hash"), { text: "aaaaa", pattern: "aa" }) as StringFrame;
    expect(rolling.aux?.find((row) => row.label === "Matches")?.values).toEqual([0, 1, 2, 3]);
    const aho = final(await load("aho-corasick"), { text: "ushers", patterns: ["he", "she", "his", "hers"] }) as StringFrame;
    expect(aho.aux?.find((row) => row.label === "Matches")?.values).toEqual(expect.arrayContaining(["she@1", "he@2", "hers@2"]));
  });

  it("number-theory modules return known exact values", async () => {
    const inverse = final(await load("modular-inverse"), { a: 3, modulus: 11 }) as TableFrame;
    expect(inverse.aux?.[0].values).toEqual([4]);
    const crt = final(await load("chinese-remainder-theorem"), { residues: [2, 3, 2], moduli: [3, 5, 7] }) as TableFrame;
    expect(crt.aux?.[0].values).toEqual([23, 105]);
    const phi = final(await load("euler-totient"), { n: 36 }) as ArrayFrame;
    expect(phi.aux?.find((row) => row.label === "Totient")?.values).toEqual([12]);
    for (const [n, label] of [[97, "prime"], [91, "composite"]] as const) {
      const primality = final(await load("miller-rabin"), { n }) as CallStackFrame;
      expect(primality.output).toEqual([label]);
    }
  });
});

describe("representative trace legality", () => {
  it("sentinel search restores the input after its temporary write", async () => {
    const algorithm = await load<ArrayFrame, { values: number[]; target: number }>("sentinel-search");
    const input = { values: [4, 8, 1, 6], target: 9 };
    const steps = algorithm.generate(input);
    expect((steps[1].frame as ArrayFrame).values.at(-1)).toBe(9);
    expect((steps.at(-1)!.frame as ArrayFrame).values).toEqual(input.values);
  });

  it("bitonic compare-exchange transitions preserve the multiset", async () => {
    const algorithm = await load<ArrayFrame, { values: number[] }>("bitonic-sort");
    const input = { values: [8, 3, 7, 4, 2, 6, 5, 1] };
    const canonical = [...input.values].sort((a, b) => a - b);
    for (const step of algorithm.generate(input)) {
      expect([...(step.frame as ArrayFrame).values].sort((a, b) => a - b)).toEqual(canonical);
    }
  });

  it("recursive binary search shrinks every nested interval", async () => {
    const algorithm = await load<CallStackFrame, { values: number[]; target: number }>("recursive-binary-search");
    const steps = algorithm.generate({ values: [1, 3, 5, 7, 9, 11, 13], target: 13 });
    const ranges = steps
      .filter((step) => step.description.startsWith("Call search"))
      .map((step) => (step.frame as CallStackFrame).stack.at(-1)!.label.match(/(-?\d+), (-?\d+)/)!.slice(1).map(Number));
    for (let i = 1; i < ranges.length; i++) expect(ranges[i][1] - ranges[i][0]).toBeLessThan(ranges[i - 1][1] - ranges[i - 1][0]);
  });
});
