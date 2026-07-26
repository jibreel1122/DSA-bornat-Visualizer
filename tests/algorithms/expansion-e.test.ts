import { describe, expect, it } from "vitest";
import { loaders, metas } from "@/lib/algorithms/expansion-e";
import { createRNG } from "@/lib/engine/random";
import {
  LANGUAGES,
  type AlgorithmModule,
  type ArrayFrame,
  type Level,
  type TableFrame,
} from "@/lib/engine/types";
import { validateFrame } from "../helpers/validate-frame";

const sorting = [
  "binary-insertion-sort",
  "stooge-sort",
  "strand-sort",
  "patience-sort",
  "tournament-sort",
  "smoothsort",
  "block-sort",
  "pigeonhole-sort",
  "american-flag-sort",
  "bead-sort",
  "library-sort",
  "spreadsort",
] as const;

const searching = [
  "rotated-array-search",
  "peak-finding",
  "matrix-search",
  "lower-upper-bound",
] as const;

const strings = [
  "suffix-automaton",
  "eertree",
  "longest-common-substring",
  "wildcard-matching",
  "booth-minimum-rotation",
] as const;

const expected = [...sorting, ...searching, ...strings];

async function load<F = unknown, I = unknown>(slug: string): Promise<AlgorithmModule<F, I>> {
  return (await loaders[slug]()).default as AlgorithmModule<F, I>;
}

function finalFrame<F, I>(algorithm: AlgorithmModule<F, I>, input: I): F {
  const steps = algorithm.generate(input);
  expect(steps.length).toBeGreaterThan(0);
  return steps.at(-1)!.frame;
}

function aux(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) {
  return frame.aux?.find((row) => row.label === label)?.values;
}

describe("Expansion E registration and complete module contracts", () => {
  it("exports exactly the requested 21 unique modules in the requested order", () => {
    expect(metas.map((meta) => meta.slug)).toEqual(expected);
    expect(Object.keys(loaders)).toEqual(expected);
    expect(new Set(expected).size).toBe(21);
    expect(metas.filter((meta) => meta.category === "sorting")).toHaveLength(12);
    expect(metas.filter((meta) => meta.category === "searching")).toHaveLength(4);
    expect(metas.filter((meta) => meta.category === "strings")).toHaveLength(5);
  });

  it.each(expected)("%s has complete bilingual content, inputs, code, and valid deterministic traces", async (slug) => {
    const algorithm = await load(slug);
    expect(algorithm.slug).toBe(slug);
    expect(algorithm.titleAr?.trim()).toBeTruthy();
    expect(algorithm.summaryAr?.trim()).toBeTruthy();
    expect(algorithm.tagsAr).toHaveLength(algorithm.tags.length);
    expect(algorithm.content.overview.trim()).not.toBe("");
    expect(algorithm.content.howItWorks.length).toBeGreaterThan(0);
    expect(algorithm.contentAr?.overview.trim()).not.toBe("");
    expect(algorithm.contentAr?.howItWorks.length).toBeGreaterThan(0);
    expect(algorithm.inputFields.length).toBeGreaterThan(0);
    for (const field of algorithm.inputFields) expect(field.labelAr?.trim(), field.key).toBeTruthy();
    for (const language of LANGUAGES) {
      expect(algorithm.code[language.id].trim(), `${slug}:${language.id}`).not.toBe("");
      expect(algorithm.code[language.id], `${slug}:${language.id}`).toContain(algorithm.title);
    }

    for (const level of [1, 2, 3, 4, 5] as Level[]) {
      const input = algorithm.defaultInput(level, createRNG(9100 + level));
      const serialized = algorithm.serializeInput(input);
      expect(algorithm.parseInput(serialized)).toEqual(input);
      const first = algorithm.generate(input);
      const second = algorithm.generate(input);
      expect(second).toEqual(first);
      expect(first.length).toBeGreaterThan(0);
      for (const current of first) {
        expect(current.description.trim()).not.toBe("");
        expect(current.descriptionAr?.trim()).not.toBe("");
        expect(current.phase?.trim()).not.toBe("");
        expect(current.why?.trim()).not.toBe("");
        expect(current.whyAr?.trim()).not.toBe("");
        expect(current.codeLine).toBeGreaterThanOrEqual(0);
        expect(current.codeLine).toBeLessThan(algorithm.pseudocode.length);
        expect(validateFrame(algorithm.renderer, current.frame)).toEqual([]);
        for (const value of Object.values(current.counters ?? {})) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("Expansion E sorting output oracles", () => {
  it.each(sorting.filter((slug) => slug !== "bead-sort"))("%s agrees with an independent numeric ordering oracle", async (slug) => {
    const algorithm = await load<ArrayFrame, { values: number[] }>(slug);
    const cases = slug === "stooge-sort"
      ? [[7, -3, 7, 0, 2, -3], [5, 4, 3, 2, 1], [4, 4, 4, 4]]
      : [
        [7, -3, 7, 0, 2, -3, 9],
        [9, 8, 7, 6, 5, 4, 3, 2, 1],
        [-5, -1, -3, 0, 2, 2, 9],
        [4, 4, 4, 4, 4],
      ];
    for (const values of cases) {
      const frame = finalFrame(algorithm, { values });
      expect(frame.values, `${slug}:${values}`).toEqual([...values].sort((a, b) => a - b));
    }
  });

  it("bead sort agrees with numeric ordering and preserves the total number of beads", async () => {
    const algorithm = await load<ArrayFrame, { values: number[] }>("bead-sort");
    for (const values of [[5, 3, 1, 7, 4, 1], [0, 0, 3, 2], [6, 6, 1]]) {
      const steps = algorithm.generate({ values });
      expect((steps.at(-1)!.frame as ArrayFrame).values).toEqual([...values].sort((a, b) => a - b));
      for (const current of steps) {
        expect((current.frame as ArrayFrame).values.reduce((sum, value) => sum + value, 0)).toBe(
          values.reduce((sum, value) => sum + value, 0),
        );
      }
    }
  });

  it("all sorting modules pass seeded duplicate-heavy property cases", async () => {
    const rng = createRNG(424242);
    for (const slug of sorting) {
      const algorithm = await load<ArrayFrame, { values: number[] }>(slug);
      for (let trial = 0; trial < 12; trial++) {
        const length = slug === "stooge-sort" ? rng.int(2, 7) : rng.int(2, 14);
        const values = Array.from({ length }, () => slug === "bead-sort" ? rng.int(0, 12) : rng.int(-9, 9));
        const result = finalFrame(algorithm, { values }).values;
        expect(result, `${slug} trial ${trial}`).toEqual([...values].sort((a, b) => a - b));
      }
    }
  });
});

describe("Expansion E searching output and decision oracles", () => {
  it("rotated-array search agrees with membership on rotations, duplicates, and missing targets", async () => {
    const algorithm = await load<ArrayFrame, { values: number[]; target: number }>("rotated-array-search");
    const cases = [
      { values: [4, 5, 6, 7, 0, 1, 2], target: 0 },
      { values: [2, 2, 2, 3, 4, 2], target: 3 },
      { values: [1], target: 1 },
      { values: [4, 5, 1, 2, 3], target: 8 },
    ];
    for (const input of cases) {
      const frame = finalFrame(algorithm, input);
      const index = Number(aux(frame, "Result")?.[0]);
      expect(index >= 0 ? input.values[index] : undefined).toBe(
        input.values.includes(input.target) ? input.target : undefined,
      );
    }
  });

  it("peak finding always returns a legal local peak", async () => {
    const algorithm = await load<ArrayFrame, { values: number[] }>("peak-finding");
    for (const values of [[1, 3, 5, 4, 2], [9, 7, 5, 3], [1, 2, 3, 4], [2, 2, 2], [-3]]) {
      const frame = finalFrame(algorithm, { values });
      const [index, value] = aux(frame, "Peak")!.map(Number);
      expect(value).toBe(values[index]);
      expect(value).toBeGreaterThanOrEqual(index > 0 ? values[index - 1] : Number.NEGATIVE_INFINITY);
      expect(value).toBeGreaterThanOrEqual(index + 1 < values.length ? values[index + 1] : Number.NEGATIVE_INFINITY);
    }
  });

  it("matrix search agrees with a direct coordinate oracle", async () => {
    const algorithm = await load<TableFrame, { matrix: number[][]; target: number }>("matrix-search");
    const matrix = [
      [1, 4, 7, 11],
      [2, 5, 8, 12],
      [3, 6, 9, 16],
      [10, 13, 14, 17],
    ];
    for (const target of [1, 8, 10, 17, 15]) {
      const frame = finalFrame(algorithm, { matrix, target });
      const [row, column] = aux(frame, "Result")!.map(Number);
      const direct = matrix.flatMap((values, r) => values.map((value, c) => ({ value, r, c }))).find((entry) => entry.value === target);
      expect([row, column]).toEqual(direct ? [direct.r, direct.c] : [-1, -1]);
    }
  });

  it("lower and upper bounds agree with direct predicate scans", async () => {
    const algorithm = await load<ArrayFrame, { values: number[]; target: number }>("lower-upper-bound");
    for (const input of [
      { values: [1, 2, 2, 2, 4], target: 2 },
      { values: [1, 3, 5], target: 0 },
      { values: [1, 3, 5], target: 9 },
      { values: [-2, -2, 0, 4], target: -2 },
    ]) {
      const frame = finalFrame(algorithm, input);
      const lower = input.values.findIndex((value) => value >= input.target);
      const upper = input.values.findIndex((value) => value > input.target);
      expect(aux(frame, "Bounds")).toEqual([
        lower < 0 ? input.values.length : lower,
        upper < 0 ? input.values.length : upper,
      ]);
    }
  });
});

function brutePalindromes(text: string): string[] {
  const chars = [...text];
  const found = new Set<string>();
  for (let start = 0; start < chars.length; start++) {
    for (let end = start + 1; end <= chars.length; end++) {
      const candidate = chars.slice(start, end);
      if (candidate.join("") === [...candidate].reverse().join("")) found.add(candidate.join(""));
    }
  }
  return [...found].sort();
}

function bruteLongestCommonSubstring(first: string, second: string): { length: number; values: Set<string> } {
  const a = [...first];
  let length = 0;
  const values = new Set<string>();
  for (let start = 0; start < a.length; start++) {
    for (let end = start + 1; end <= a.length; end++) {
      const candidate = a.slice(start, end).join("");
      if (!second.includes(candidate)) continue;
      if (end - start > length) {
        length = end - start;
        values.clear();
      }
      if (end - start === length) values.add(candidate);
    }
  }
  if (length === 0) values.add("");
  return { length, values };
}

function bruteWildcard(text: string, pattern: string): boolean {
  const source = [...text];
  const mask = [...pattern];
  const memo = new Map<string, boolean>();
  const visit = (i: number, j: number): boolean => {
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    let result: boolean;
    if (j === mask.length) result = i === source.length;
    else if (mask[j] === "*") result = visit(i, j + 1) || (i < source.length && visit(i + 1, j));
    else result = i < source.length && (mask[j] === "?" || mask[j] === source[i]) && visit(i + 1, j + 1);
    memo.set(key, result);
    return result;
  };
  return visit(0, 0);
}

function bruteRotation(text: string): { rotation: string; index: number } {
  const chars = [...text];
  const candidates = chars.map((_, index) => ({
    rotation: chars.slice(index).concat(chars.slice(0, index)).join(""),
    index,
  }));
  const compareCodePoints = (first: string, second: string) => {
    const a = [...first].map((ch) => ch.codePointAt(0)!);
    const b = [...second].map((ch) => ch.codePointAt(0)!);
    for (let index = 0; index < Math.min(a.length, b.length); index++) {
      if (a[index] !== b[index]) return a[index] - b[index];
    }
    return a.length - b.length;
  };
  candidates.sort((a, b) => compareCodePoints(a.rotation, b.rotation) || a.index - b.index);
  return candidates[0];
}

describe("Expansion E string output oracles", () => {
  it("suffix automaton agrees with direct substring search, including Unicode", async () => {
    const algorithm = await load<TableFrame, TextPatternInput>("suffix-automaton");
    for (const input of [
      { text: "abracadabra", pattern: "cada" },
      { text: "aaaaa", pattern: "aaa" },
      { text: "abcabc", pattern: "cab" },
      { text: "🙂a🙂b", pattern: "a🙂" },
      { text: "banana", pattern: "xyz" },
    ]) {
      const frame = finalFrame(algorithm, input);
      const codePointIndex = input.text.includes(input.pattern)
        ? [...input.text.slice(0, input.text.indexOf(input.pattern))].length
        : -1;
      expect(aux(frame, "Matches")).toEqual([codePointIndex]);
    }
  });

  it("Eertree distinct palindrome nodes agree with exhaustive enumeration", async () => {
    const algorithm = await load<TableFrame, { text: string }>("eertree");
    for (const text of ["ababa", "aaaa", "abc", "🙂a🙂"]) {
      const frame = finalFrame(algorithm, { text });
      expect([...aux(frame, "Distinct palindromes")!.map(String)].sort()).toEqual(brutePalindromes(text));
    }
  });

  it("longest common substring agrees with exhaustive substring enumeration", async () => {
    const algorithm = await load<TableFrame, { first: string; second: string }>("longest-common-substring");
    for (const input of [
      { first: "xabxac", second: "abcabxabcd" },
      { first: "aaaa", second: "baaa" },
      { first: "abc", second: "xyz" },
      { first: "🙂ab🙂", second: "x🙂abz" },
    ]) {
      const frame = finalFrame(algorithm, input);
      const [result, lengthValue] = aux(frame, "Longest common substring")!;
      const oracle = bruteLongestCommonSubstring(input.first, input.second);
      expect(Number(lengthValue)).toBe(oracle.length);
      expect(oracle.values.has(String(result))).toBe(true);
    }
  });

  it("wildcard matching agrees with an independent memoized recognizer", async () => {
    const algorithm = await load<TableFrame, { text: string; pattern: string }>("wildcard-matching");
    for (const input of [
      { text: "adceb", pattern: "*a*b" },
      { text: "acdcb", pattern: "a*c?b" },
      { text: "", pattern: "*" },
      { text: "", pattern: "?" },
      { text: "abc", pattern: "abc*" },
      { text: "🙂ab", pattern: "?*b" },
    ]) {
      const frame = finalFrame(algorithm, input);
      expect(aux(frame, "Matches")).toEqual([String(bruteWildcard(input.text, input.pattern))]);
    }
  });

  it("Booth minimum rotation agrees with exhaustive rotation ordering", async () => {
    const algorithm = await load<TableFrame, { text: string }>("booth-minimum-rotation");
    for (const text of ["bbaaccaadd", "caba", "aaaa", "banana", "🙂b🙂a"]) {
      const frame = finalFrame(algorithm, { text });
      const [rotation, index] = aux(frame, "Minimum rotation")!;
      const oracle = bruteRotation(text);
      expect(String(rotation)).toBe(oracle.rotation);
      expect(Number(index)).toBe(oracle.index);
    }
  });
});

describe("Expansion E trace semantics and adversarial validation", () => {
  const requiredPhases: Record<(typeof sorting)[number], string[]> = {
    "binary-insertion-sort": ["binary-search", "shift", "insert"],
    "stooge-sort": ["compare-endpoints", "swap"],
    "strand-sort": ["extract", "merge"],
    "patience-sort": ["place", "extract-min"],
    "tournament-sort": ["match", "extract-winner"],
    smoothsort: ["leonardo-merge", "sift-compare", "split-heap", "extract-max"],
    "block-sort": ["block-insertion", "block-merge"],
    "pigeonhole-sort": ["count", "collect"],
    "american-flag-sort": ["cycle-leader", "digit-partition"],
    "bead-sort": ["place-beads", "gravity"],
    "library-sort": ["shelf-search", "gapped-insert", "rebalance"],
    spreadsort: ["spread-distribute", "small-bucket"],
  };

  it.each(sorting)("%s exposes its named algorithm's characteristic phases", async (slug) => {
    const algorithm = await load<ArrayFrame, { values: number[] }>(slug);
    const values = slug === "bead-sort"
      ? [5, 1, 4, 2, 3]
      : slug === "stooge-sort"
        ? [6, 5, 4, 3, 2, 1]
        : [9, 1, 8, 2, 7, 3, 6, 4, 5];
    const phases = new Set(algorithm.generate({ values }).map((current) => current.phase));
    for (const phase of requiredPhases[slug]) expect(phases.has(phase), `${slug}:${phase}`).toBe(true);
  });

  it("American Flag Sort never marks an empty bucket boundary outside the array", async () => {
    const algorithm = await load<ArrayFrame, { values: number[] }>("american-flag-sort");
    for (const level of [1, 2, 3, 4, 5] as Level[]) {
      const input = algorithm.defaultInput(level, createRNG(9100 + level));
      for (const current of algorithm.generate(input)) {
        expect(validateFrame("array", current.frame)).toEqual([]);
        for (const key of Object.keys(current.frame.states ?? {})) {
          expect(Number(key)).toBeGreaterThanOrEqual(0);
          expect(Number(key)).toBeLessThan(current.frame.values.length);
        }
      }
    }
  });

  it("suffix automaton visibly clones a conflicting state and Eertree visibly links new palindrome nodes", async () => {
    const sam = await load<TableFrame, TextPatternInput>("suffix-automaton");
    expect(sam.generate({ text: "abb", pattern: "bb" }).some((current) => current.phase === "clone-state")).toBe(true);
    const tree = await load<TableFrame, { text: string }>("eertree");
    const phases = tree.generate({ text: "ababa" }).map((current) => current.phase);
    expect(phases).toContain("create-node");
    expect(phases).toContain("set-suffix-link");
  });

  it("dynamic string algorithms write cells only from their documented predecessor states", async () => {
    const lcs = await load<TableFrame, { first: string; second: string }>("longest-common-substring");
    const lcsSteps = lcs.generate({ first: "abca", second: "zbc" });
    expect(lcsSteps.filter((current) => current.phase === "dp-write")).toHaveLength(12);
    const wildcard = await load<TableFrame, { text: string; pattern: string }>("wildcard-matching");
    const wildcardSteps = wildcard.generate({ text: "abc", pattern: "a*c" });
    expect(wildcardSteps.filter((current) => current.phase === "dp-write")).toHaveLength(9);
  });

  it("rejects invalid domain inputs rather than silently changing algorithm semantics", async () => {
    const rotated = await load("rotated-array-search");
    expect(() => rotated.parseInput({ values: "2, 1, 3", target: "1" })).toThrow(/rotation/i);
    const bounds = await load("lower-upper-bound");
    expect(() => bounds.parseInput({ values: "3, 1, 2", target: "1" })).toThrow(/sorted/i);
    const matrix = await load("matrix-search");
    expect(() => matrix.parseInput({ matrix: "1, 4; 3, 2", target: "2" })).toThrow(/row|column/i);
    const bead = await load("bead-sort");
    expect(() => bead.parseInput({ values: "2, -1, 3" })).toThrow();
    const stooge = await load("stooge-sort");
    expect(() => stooge.parseInput({ values: "9,8,7,6,5,4,3,2,1,0" })).toThrow();
  });
});

type TextPatternInput = { text: string; pattern: string };
