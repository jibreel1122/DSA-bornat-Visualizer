import { describe, expect, it } from "vitest";

import bubbleSort from "@/lib/algorithms/sorting/bubble-sort";
import bucketSort from "@/lib/algorithms/sorting/bucket-sort";
import cocktailShakerSort from "@/lib/algorithms/sorting/cocktail-shaker-sort";
import combSort from "@/lib/algorithms/sorting/comb-sort";
import countingSort from "@/lib/algorithms/sorting/counting-sort";
import heapSort from "@/lib/algorithms/sorting/heap-sort";
import insertionSort from "@/lib/algorithms/sorting/insertion-sort";
import mergeSort from "@/lib/algorithms/sorting/merge-sort";
import pancakeSort from "@/lib/algorithms/sorting/pancake-sort";
import quickSort from "@/lib/algorithms/sorting/quick-sort";
import radixSort from "@/lib/algorithms/sorting/radix-sort";
import selectionSort from "@/lib/algorithms/sorting/selection-sort";
import shellSort from "@/lib/algorithms/sorting/shell-sort";
import timSort from "@/lib/algorithms/sorting/tim-sort";
import binarySearch from "@/lib/algorithms/searching/binary-search";
import exponentialSearch from "@/lib/algorithms/searching/exponential-search";
import interpolationSearch from "@/lib/algorithms/searching/interpolation-search";
import jumpSearch from "@/lib/algorithms/searching/jump-search";
import linearSearch from "@/lib/algorithms/searching/linear-search";
import ternarySearch from "@/lib/algorithms/searching/ternary-search";
import boyerMoore from "@/lib/algorithms/strings/boyer-moore";
import kmp from "@/lib/algorithms/strings/kmp";
import naivePatternMatching from "@/lib/algorithms/strings/naive-pattern-matching";
import rabinKarp from "@/lib/algorithms/strings/rabin-karp";
import zAlgorithm from "@/lib/algorithms/strings/z-algorithm";
import euclideanGcd from "@/lib/algorithms/mathematics/euclidean-gcd";
import extendedEuclidean from "@/lib/algorithms/mathematics/extended-euclidean";
import fastPower from "@/lib/algorithms/mathematics/fast-power";
import primeFactorization from "@/lib/algorithms/mathematics/prime-factorization";
import sieveOfEratosthenes from "@/lib/algorithms/mathematics/sieve-of-eratosthenes";
import { metas as sortingMetas } from "@/lib/algorithms/sorting";
import { metas as searchingMetas } from "@/lib/algorithms/searching";
import { metas as stringMetas } from "@/lib/algorithms/strings";
import { metas as mathematicsMetas } from "@/lib/algorithms/mathematics";

type VisualizerModule = {
  slug: string;
  parseInput: (fields: Record<string, string>) => unknown;
  generate: (input: never) => { frame: unknown; description: string }[];
};

const modules = {
  sorting: [bubbleSort, selectionSort, insertionSort, mergeSort, quickSort, heapSort, shellSort, countingSort, radixSort, cocktailShakerSort, combSort, bucketSort, timSort, pancakeSort],
  searching: [linearSearch, binarySearch, jumpSearch, interpolationSearch, exponentialSearch, ternarySearch],
  strings: [naivePatternMatching, kmp, rabinKarp, zAlgorithm, boyerMoore],
  mathematics: [euclideanGcd, sieveOfEratosthenes, fastPower, primeFactorization, extendedEuclidean],
} as const;

function run(mod: VisualizerModule, fields: Record<string, string>) {
  const steps = mod.generate(mod.parseInput(fields) as never);
  expect(steps, `${mod.slug} must produce at least one teaching frame`).not.toHaveLength(0);
  return steps;
}

function lastArrayValues(mod: VisualizerModule, values: number[]) {
  const frame = run(mod, { values: values.join(", ") }).at(-1)!.frame as { values: number[] };
  return frame.values;
}

function statesContainFound(steps: ReturnType<typeof run>) {
  return steps.some(({ frame }) => Object.values((frame as { states?: Record<number, string> }).states ?? {}).includes("found"));
}

function expectedMatches(text: string, pattern: string) {
  const haystack = [...text];
  const needle = [...pattern];
  const matches: number[] = [];
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (needle.every((character, index) => haystack[start + index] === character)) matches.push(start);
  }
  return matches;
}

function visualizedMatches(mod: VisualizerModule, text: string, pattern: string) {
  const final = run(mod, { text, pattern }).at(-1)!.frame as { aux?: { label: string; values: (number | string)[] }[] };
  const values = final.aux?.find((row) => row.label === "Matches" || row.label === "Matches at")?.values ?? [];
  return values.filter((value): value is number => typeof value === "number");
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}

function factorize(n: number) {
  const factors: number[] = [];
  for (let divisor = 2; divisor * divisor <= n; divisor++) {
    while (n % divisor === 0) {
      factors.push(divisor);
      n /= divisor;
    }
  }
  if (n > 1) factors.push(n);
  return factors;
}

function primesUpTo(n: number) {
  return Array.from({ length: Math.max(0, n - 1) }, (_, index) => index + 2).filter((candidate) => {
    for (let divisor = 2; divisor * divisor <= candidate; divisor++) if (candidate % divisor === 0) return false;
    return true;
  });
}

function pseudoRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("registered scope inventory", () => {
  it("covers every registered sorting, searching, string, and mathematics module exactly once", () => {
    expect(modules.sorting.map((mod) => mod.slug).sort()).toEqual(sortingMetas.map((meta) => meta.slug).sort());
    expect(modules.searching.map((mod) => mod.slug).sort()).toEqual(searchingMetas.map((meta) => meta.slug).sort());
    expect(modules.strings.map((mod) => mod.slug).sort()).toEqual(stringMetas.map((meta) => meta.slug).sort());
    expect(modules.mathematics.map((mod) => mod.slug).sort()).toEqual(mathematicsMetas.map((meta) => meta.slug).sort());
  });
});

describe("sorting modules match the language runtime's independent numeric ordering oracle", () => {
  const signedCases = [
    [5, -1, 5, 0, -9, 3, 3],
    [9, 8, 7, 6, 5, 4, 3, 2, 1],
    [-12, -1, -7, -7, 0, 4, 12],
    [1, 1, 1, 1],
  ];
  const nonNegativeCases = [[12, 0, 5, 12, 3, 0, 40, 2], [9, 8, 7, 6, 5, 4, 3], [1, 1, 0, 1]];

  for (const mod of modules.sorting) {
    const cases = mod.slug === "counting-sort" || mod.slug === "radix-sort" ? nonNegativeCases : signedCases;
    it.each(cases.map((values) => [values]))(`${mod.slug} returns the certified ascending permutation for %j`, (values) => {
      expect(lastArrayValues(mod as unknown as VisualizerModule, values)).toEqual([...values].sort((a, b) => a - b));
    });

    it(`${mod.slug} satisfies the ordering oracle over deterministic generated inputs`, () => {
      const random = pseudoRandom(0x5eed + mod.slug.length);
      for (let sample = 0; sample < 16; sample++) {
        const minimumLength = mod.slug === "tim-sort" ? 4 : 2;
        const values = Array.from({ length: minimumLength + Math.floor(random() * 14) }, () => {
          const value = Math.floor(random() * 41);
          return mod.slug === "counting-sort" || mod.slug === "radix-sort" ? value : value - 20;
        });
        expect(lastArrayValues(mod as unknown as VisualizerModule, values)).toEqual([...values].sort((a, b) => a - b));
      }
    });
  }
});

describe("search modules agree with membership in the independently sorted input", () => {
  const cases = [
    { values: [9, -2, 5, 5, 0, 11, -2], target: 5 },
    { values: [9, -2, 5, 5, 0, 11, -2], target: 7 },
    { values: [4, 4, 4, 4], target: 4 },
    { values: [4, 4, 4, 4], target: 3 },
  ];

  for (const mod of modules.searching) {
    it.each(cases)(`${mod.slug} reports membership correctly for %o`, ({ values, target }) => {
      const steps = run(mod as unknown as VisualizerModule, { values: values.join(", "), target: String(target) });
      const final = steps.at(-1)!.frame as { values: number[]; states?: Record<number, string> };
      const expectedValues = mod.slug === "linear-search" ? values : [...values].sort((a, b) => a - b);
      expect(final.values).toEqual(expectedValues);
      expect(statesContainFound(steps)).toBe(values.includes(target));
      for (const step of steps) {
        const frame = step.frame as { values: number[]; states?: Record<number, string> };
        for (const [index, state] of Object.entries(frame.states ?? {})) if (state === "found") expect(frame.values[Number(index)]).toBe(target);
      }
    });

    it(`${mod.slug} agrees with membership over deterministic generated inputs`, () => {
      const random = pseudoRandom(0xc0de + mod.slug.length);
      for (let sample = 0; sample < 20; sample++) {
        const values = Array.from({ length: 2 + Math.floor(random() * 15) }, () => Math.floor(random() * 31) - 15);
        const target = sample % 2 === 0 ? values[Math.floor(random() * values.length)] : 100 + sample;
        const steps = run(mod as unknown as VisualizerModule, { values: values.join(", "), target: String(target) });
        expect(statesContainFound(steps)).toBe(values.includes(target));
      }
    });
  }
});

describe("string matching modules report every overlapping code-point match", () => {
  const cases = [
    { text: "ababa", pattern: "aba" },
    { text: "aaaaa", pattern: "aa" },
    { text: "the quick brown fox", pattern: "cat" },
    { text: "a$ba$ba", pattern: "$ba" },
    { text: "🙂a🙂a🙂", pattern: "🙂a" },
  ];

  for (const mod of modules.strings) {
    it.each(cases)(`${mod.slug} matches the independent scan for %o`, ({ text, pattern }) => {
      expect(visualizedMatches(mod as unknown as VisualizerModule, text, pattern)).toEqual(expectedMatches(text, pattern));
    });

    it(`${mod.slug} matches an independent scan across deterministic generated texts`, () => {
      const random = pseudoRandom(0xabc0 + mod.slug.length);
      const alphabet = ["a", "b", "c", "$", "🙂"];
      for (let sample = 0; sample < 18; sample++) {
        const text = Array.from({ length: 5 + Math.floor(random() * 10) }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
        const patternLength = 1 + Math.floor(random() * Math.min(4, [...text].length));
        const start = Math.floor(random() * ([...text].length - patternLength + 1));
        const pattern = sample % 2 === 0
          ? [...text].slice(start, start + patternLength).join("")
          : Array.from({ length: patternLength }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
        expect(visualizedMatches(mod as unknown as VisualizerModule, text, pattern)).toEqual(expectedMatches(text, pattern));
      }
    });
  }
});

describe("mathematics modules match independent arithmetic oracles", () => {
  it.each([[0, 42], [270, 192], [99991, 97], [123456, 7890]])("euclidean-gcd returns gcd(%i, %i)", (a, b) => {
    const final = run(euclideanGcd as unknown as VisualizerModule, { a: String(a), b: String(b) }).at(-1)!;
    const result = BigInt(final.description.match(/= (\d+)\.$/)![1]);
    expect(result).toBe(gcd(BigInt(Math.max(a, b)), BigInt(Math.min(a, b))));
  });

  it.each([
    { base: 7, exp: 13 },
    { base: 2, exp: 0 },
    { base: 98765, exp: 123, mod: 1000000007 },
    { base: 37, exp: 91, mod: 101 },
  ])("fast-power calculates $base^$exp with optional modulus", ({ base, exp, mod }) => {
    const fields = { base: String(base), exp: String(exp), mod: mod === undefined ? "" : String(mod) };
    const final = run(fastPower as unknown as VisualizerModule, fields).at(-1)!;
    const result = BigInt(final.description.match(/= (-?\d+), using/)![1]);
    const expected = mod === undefined ? BigInt(base) ** BigInt(exp) : BigInt(base) ** BigInt(exp) % BigInt(mod);
    expect(result).toBe(expected);
  });

  it.each([2, 97, 360, 65536, 199982])("prime-factorization decomposes %i into independent trial-division factors", (n) => {
    const final = run(primeFactorization as unknown as VisualizerModule, { n: String(n) }).at(-1)!.frame as { aux: { label: string; values: (number | string)[] }[] };
    const factors = final.aux.find((row) => row.label === "factors")!.values.filter((value): value is number => typeof value === "number");
    expect(factors).toEqual(factorize(n));
  });

  it.each([2, 3, 10, 97, 200])("sieve-of-eratosthenes reports exactly the primes up to %i", (n) => {
    const final = run(sieveOfEratosthenes as unknown as VisualizerModule, { n: String(n) }).at(-1)!.frame as { aux: { label: string; values: number[] }[] };
    expect(final.aux.find((row) => row.label === "Primes")!.values).toEqual(primesUpTo(n));
  });

  it.each([[240, 46], [13, 7], [1_000_000_000_000, 999_999_999_989]])("extended-euclidean returns verified BÃ©zout coefficients for (%i, %i)", (a, b) => {
    const final = run(extendedEuclidean as unknown as VisualizerModule, { a: String(a), b: String(b) }).at(-1)!.frame as { cells: { value: string | null }[][] };
    const x = BigInt(final.cells[0][4].value!);
    const y = BigInt(final.cells[0][5].value!);
    expect(BigInt(a) * x + BigInt(b) * y).toBe(gcd(BigInt(a), BigInt(b)));
  });
});
