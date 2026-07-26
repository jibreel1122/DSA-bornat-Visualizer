import { describe, expect, it } from "vitest";
import { loadAlgorithm } from "@/lib/algorithms";
import type {
  AlgorithmModule,
  ArrayFrame,
  CallStackFrame,
  GridFrame,
  Step,
  StringFrame,
  TableFrame,
} from "@/lib/engine/types";

/**
 * These are trace tests, intentionally separate from the result/oracle tests.
 * They check the state a learner sees between the start and finish rather than
 * accepting a correct final frame after an invalid visual transition.
 */
const SORTING = [
  "bubble-sort", "selection-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort",
  "shell-sort", "counting-sort", "radix-sort", "cocktail-shaker-sort", "comb-sort",
  "bucket-sort", "tim-sort", "pancake-sort",
];
const SEARCHING = [
  "linear-search", "binary-search", "jump-search", "interpolation-search",
  "exponential-search", "ternary-search",
];
const STRINGS = ["naive-pattern-matching", "kmp", "rabin-karp", "z-algorithm", "boyer-moore"];
const MATHEMATICS = [
  "euclidean-gcd", "sieve-of-eratosthenes", "fast-power",
  "prime-factorization", "extended-euclidean",
];

function sorted(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function sameNumbers(left: number[], right: number[]) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

function assertCountersNeverGoBack(steps: Step<unknown>[]) {
  const previous: Record<string, number> = {};
  for (const step of steps) {
    for (const [name, value] of Object.entries(step.counters ?? {})) {
      expect(value, `${name} must be finite`).toSatisfy(Number.isFinite);
      expect(value, `${name} regressed in “${step.description}”`).toBeGreaterThanOrEqual(previous[name] ?? 0);
      previous[name] = value;
    }
  }
}

function statesAreInBounds(frame: ArrayFrame) {
  for (const key of Object.keys(frame.states ?? {})) {
    expect(Number(key)).toBeGreaterThanOrEqual(0);
    expect(Number(key)).toBeLessThan(frame.values.length);
  }
  for (const pointer of frame.pointers ?? []) {
    expect(pointer.index, `pointer ${pointer.label}`).toBeGreaterThanOrEqual(0);
    expect(pointer.index, `pointer ${pointer.label}`).toBeLessThan(frame.values.length);
  }
  if (frame.range) {
    expect(frame.range.from).toBeGreaterThanOrEqual(0);
    expect(frame.range.to).toBeLessThan(frame.values.length);
    expect(frame.range.from).toBeLessThanOrEqual(frame.range.to);
  }
}

function aux(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) {
  return frame.aux?.find((row) => row.label === label)?.values ?? [];
}

function occurrences(text: string, pattern: string) {
  const t = [...text];
  const p = [...pattern];
  const result: number[] = [];
  for (let i = 0; i + p.length <= t.length; i++) {
    if (p.every((character, j) => character === t[i + j])) result.push(i);
  }
  return result;
}

function lps(pattern: string[]) {
  const result = new Array(pattern.length).fill(0);
  for (let i = 1; i < pattern.length; i++) {
    for (let length = i; length > 0; length--) {
      if (pattern.slice(0, length).join("") === pattern.slice(i - length + 1, i + 1).join("")) {
        result[i] = length;
        break;
      }
    }
  }
  return result;
}

function zValues(value: string[]) {
  return value.map((_, i) => {
    if (i === 0) return 0;
    let length = 0;
    while (i + length < value.length && value[length] === value[i + length]) length++;
    return length;
  });
}

function isPrime(value: number) {
  if (value < 2) return false;
  for (let divisor = 2; divisor * divisor <= value; divisor++) if (value % divisor === 0) return false;
  return true;
}

function factorsOf(value: number) {
  const factors: number[] = [];
  let remaining = value;
  for (let divisor = 2; divisor * divisor <= remaining; divisor++) {
    while (remaining % divisor === 0) {
      factors.push(divisor);
      remaining /= divisor;
    }
  }
  if (remaining > 1) factors.push(remaining);
  return factors;
}

function gcd(a: number, b: number) {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function pow(base: bigint, exponent: bigint, modulus?: bigint) {
  const zero = BigInt(0);
  const one = BigInt(1);
  const two = BigInt(2);
  let result = one;
  let value = modulus === undefined ? base : ((base % modulus) + modulus) % modulus;
  while (exponent > zero) {
    if ((exponent & one) !== zero) result = modulus === undefined ? result * value : (result * value) % modulus;
    value = modulus === undefined ? value * value : (value * value) % modulus;
    exponent /= two;
  }
  return result;
}

describe("trace audit registration", () => {
  it("covers exactly the 30 requested live algorithms", () => {
    expect(SORTING).toHaveLength(14);
    expect(SEARCHING).toHaveLength(6);
    expect(STRINGS).toHaveLength(5);
    expect(MATHEMATICS).toHaveLength(5);
    expect(new Set([...SORTING, ...SEARCHING, ...STRINGS, ...MATHEMATICS]).size).toBe(30);
  });
});

describe.each(SORTING)("%s trace", (slug) => {
  it("preserves a legal, explained sorting trace over adversarial inputs", async () => {
    const mod = (await loadAlgorithm(slug)) as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const cases = [
      [9, 4, 7, 1, 5, 1, 8, 2, 6, 3],
      [5, 4, 3, 2, 1, 0],
      [0, 0, 0, 0],
    ];
    for (const values of cases) {
      const steps = mod.generate({ values });
      expect(steps.length, `${slug} must expose a trace`).toBeGreaterThan(1);
      expect(steps.at(-1)?.frame.values).toEqual(sorted(values));
      assertCountersNeverGoBack(steps);

      for (const step of steps) {
        expect(step.frame.values).toHaveLength(values.length);
        statesAreInBounds(step.frame);
        // Insertion-based traces temporarily hold the key outside the displayed
        // array. That is a legal state only while the frame explicitly identifies
        // it as the key being compared/shifted/placed.
        if (!sameNumbers(step.frame.values, values)) {
          const bufferedMerge = step.frame.aux?.some((row) => row.label === "left" || row.label === "right");
          expect(bufferedMerge || /(key|shift|place|copy|merge|insert|run)/i.test(step.description)).toBe(true);
        }
      }

      for (let i = 1; i < steps.length; i++) {
        if (JSON.stringify(steps[i - 1].frame.values) !== JSON.stringify(steps[i].frame.values)) {
          const cue = `${steps[i].description} ${Object.values(steps[i].frame.states ?? {}).join(" ")}`;
          expect(cue, `${slug} changed the visual array without an operation frame`).toMatch(
            /(swap|shift|place|copy|flip|gather|concatenate|merge|sorted|compare|active)/i,
          );
        }
      }
    }
  });
});

describe("sorting trace-specific actions", () => {
  it("shows each pancake flip as the exact claimed prefix reversal", async () => {
    const mod = (await loadAlgorithm("pancake-sort")) as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const steps = mod.generate({ values: [3, 6, 1, 5, 2, 4] });
    for (let i = 1; i < steps.length; i++) {
      const current = steps[i];
      const match = current.description.match(/Flip [12]: reverse a\[0\.\.(\d+)\]/);
      if (!match) continue;
      const end = Number(match[1]);
      const previous = steps[i - 1].frame.values;
      expect(current.frame.values).toEqual([...previous.slice(0, end + 1).reverse(), ...previous.slice(end + 1)]);
    }
  });

  it("only marks a quick-sort pivot final after its partition is valid", async () => {
    const mod = (await loadAlgorithm("quick-sort")) as AlgorithmModule<ArrayFrame, { values: number[] }>;
    for (const step of mod.generate({ values: [5, 1, 4, 2, 8, 5, 3] })) {
      if (!step.description.startsWith("Place pivot")) continue;
      const index = Number(step.description.match(/index (\d+)/)?.[1]);
      const pivot = step.frame.values[index];
      expect(step.frame.values.slice(0, index).every((value) => value <= pivot)).toBe(true);
      expect(step.frame.values.slice(index + 1).every((value) => value >= pivot)).toBe(true);
    }
  });

  it("keeps heap-sort’s displayed heap a max-heap before every extraction", async () => {
    const mod = (await loadAlgorithm("heap-sort")) as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const steps = mod.generate({ values: [4, 10, 3, 5, 1, 8, 2] });
    for (const step of steps) {
      if (!step.description.startsWith("Move max")) continue;
      const beforeExtraction = steps[steps.indexOf(step) - 1];
      const size = Number(step.description.match(/shrink heap to (\d+)/)?.[1]);
      for (let parent = 0; parent < size; parent++) {
        for (const child of [2 * parent + 1, 2 * parent + 2]) {
          if (child < size) expect(beforeExtraction.frame.values[parent]).toBeGreaterThanOrEqual(beforeExtraction.frame.values[child]);
        }
      }
      expect(beforeExtraction.frame.values.slice(size)).toEqual(sorted(beforeExtraction.frame.values.slice(size)));
    }
  });
});

describe.each(SEARCHING)("%s trace", (slug) => {
  it("makes only legal probes and reports the target truthfully", async () => {
    const mod = (await loadAlgorithm(slug)) as AlgorithmModule<ArrayFrame, { values: number[]; target: number }>;
    const cases = [
      { values: [31, 4, 17, 9, 23, 45, 12, 29], target: 23 },
      { values: [31, 4, 17, 9, 23, 45, 12, 29], target: 24 },
      { values: [7, 7, 7, 7], target: 7 },
    ];
    for (const input of cases) {
      const steps = mod.generate(input);
      const rendered = slug === "linear-search" ? input.values : sorted(input.values);
      expect(steps.length).toBeGreaterThan(1);
      assertCountersNeverGoBack(steps);
      for (const step of steps) {
        expect(step.frame.values).toEqual(rendered);
        statesAreInBounds(step.frame);
        if (step.frame.range) {
          for (const pointer of step.frame.pointers ?? []) {
            if (step.frame.states?.[pointer.index] === "discarded") continue;
            expect(pointer.index, `${slug} pointer ${pointer.label} escaped its search window`).toBeGreaterThanOrEqual(step.frame.range.from);
            expect(pointer.index, `${slug} pointer ${pointer.label} escaped its search window`).toBeLessThanOrEqual(step.frame.range.to);
          }
        }
        for (const [index, state] of Object.entries(step.frame.states ?? {})) {
          if (state === "found") expect(step.frame.values[Number(index)]).toBe(input.target);
        }
      }
      const found = steps.some((step) => Object.entries(step.frame.states ?? {}).some(([index, state]) => state === "found" && step.frame.values[Number(index)] === input.target));
      expect(found).toBe(rendered.includes(input.target));
    }
  });
});

describe("search trace decision validators", () => {
  it("binary, interpolation, ternary, and exponential traces shrink to the mathematically valid next window", async () => {
    const values = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    for (const slug of ["binary-search", "interpolation-search", "ternary-search", "exponential-search"]) {
      const mod = (await loadAlgorithm(slug)) as AlgorithmModule<ArrayFrame, { values: number[]; target: number }>;
      for (const target of [1, 16, 20, 91, 100]) {
        const steps = mod.generate({ values, target });
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const probe = step.frame.pointers?.find((pointer) => ["mid", "pos", "m1"].includes(pointer.label));
          if (!probe || !step.frame.range) continue;
          if (slug === "ternary-search") {
            const m2 = step.frame.pointers?.find((pointer) => pointer.label === "m2");
            expect(m2, "ternary probe must expose its second midpoint").toBeDefined();
            if (!m2) continue;
            const next = steps[i + 1];
            if (!next || step.frame.values[probe.index] === target || step.frame.values[m2.index] === target) continue;
            const expected = target < step.frame.values[probe.index]
              ? { from: step.frame.range.from, to: probe.index - 1 }
              : target > step.frame.values[m2.index]
                ? { from: m2.index + 1, to: step.frame.range.to }
                : { from: probe.index + 1, to: m2.index - 1 };
            expect(next.frame.range).toEqual(expected.from <= expected.to ? expected : null);
            continue;
          }
          const value = step.frame.values[probe.index];
          const next = steps[i + 1];
          if (!next || value === target) continue;
          const expected = value < target
            ? { from: probe.index + 1, to: step.frame.range.to }
            : { from: step.frame.range.from, to: probe.index - 1 };
          expect(next.frame.range).toEqual(expected.from <= expected.to ? expected : null);
        }
      }
    }
  });

  it("linear and jump search examine candidates in increasing order without bypassing a viable target", async () => {
    for (const slug of ["linear-search", "jump-search"]) {
      const mod = (await loadAlgorithm(slug)) as AlgorithmModule<ArrayFrame, { values: number[]; target: number }>;
      const steps = mod.generate({ values: [2, 5, 8, 12, 16, 23, 38, 56, 72], target: 23 });
      const probes = steps
        .flatMap((step) => step.frame.pointers?.filter((pointer) => pointer.label === "i").map((pointer) => pointer.index) ?? []);
      expect(probes).toEqual([...probes].sort((a, b) => a - b));
      expect(probes.at(-1)).toBe(5);
    }
  });
});

describe.each(STRINGS)("%s trace", (slug) => {
  it("keeps every character comparison, alignment, and reported match valid", async () => {
    const mod = (await loadAlgorithm(slug)) as AlgorithmModule<StringFrame, { text: string; pattern: string }>;
    const cases = [
      { text: "ABABABA", pattern: "ABA" },
      { text: "AAAAA", pattern: "AAA" },
      { text: "NEEDLE IN A HAYSTACK", pattern: "STACK" },
      { text: "😀a😀a😀", pattern: "😀a" },
      { text: "a$b$$ab$", pattern: "$" },
    ];
    for (const input of cases) {
      const steps = mod.generate(input);
      const expected = occurrences(input.text, input.pattern);
      const reported = new Set<number>();
      for (const step of steps) {
        const text = step.frame.text.map(({ ch }) => ch);
        const pattern = step.frame.pattern?.map(({ ch }) => ch) ?? [];
        expect(text.length).toBeGreaterThanOrEqual(pattern.length);
        assertCountersNeverGoBack([step]);
        for (const [index, cell] of step.frame.text.entries()) {
          if (cell.state !== "found") continue;
          const shift = step.frame.shift ?? 0;
          if (index >= shift && index < shift + pattern.length && pattern.length > 0) reported.add(shift);
        }
        const comparison = step.description.match(/text\[(\d+)\].*pattern\[(\d+)\].*→ (match|mismatch)/);
        if (comparison) {
          const [, ti, pi, result] = comparison;
          expect(text[Number(ti)] === pattern[Number(pi)] ? "match" : "mismatch").toBe(result);
          expect(step.frame.shift).toBe(Number(ti) - Number(pi));
        }
        const explicitMatch = step.description.match(/(?:Full|Confirmed) match at (?:shift|index) (\d+)/);
        if (explicitMatch) reported.add(Number(explicitMatch[1]));
      }
      assertCountersNeverGoBack(steps);
      // Z has a concatenated text row; its explicit match frame is the reliable
      // educational signal, while the other modules highlight the text cells.
      if (slug === "z-algorithm") {
        for (const step of steps.filter((step) => step.codeLine === 5)) {
          const match = step.description.match(/text index (\d+)/);
          expect(match).not.toBeNull();
          reported.add(Number(match?.[1]));
        }
      }
      expect([...reported].sort((a, b) => a - b)).toEqual(expected);
    }
  });
});

describe("string trace table validators", () => {
  it("builds legal KMP borders and keeps the completed LPS table exact", async () => {
    const mod = (await loadAlgorithm("kmp")) as AlgorithmModule<StringFrame, { text: string; pattern: string }>;
    const pattern = "ABABAC";
    const expected = lps([...pattern]);
    for (const step of mod.generate({ text: "ABABABABAC", pattern })) {
      const table = aux(step.frame, "LPS");
      if (table.length === 0) continue;
      table.forEach((value, index) => {
        expect(typeof value).toBe("number");
        const length = Number(value);
        expect(length).toBeGreaterThanOrEqual(0);
        expect(length).toBeLessThanOrEqual(index);
        expect(pattern.slice(0, length)).toBe(pattern.slice(index - length + 1, index + 1));
      });
      if ((step.codeLine ?? -1) >= 5) expect(table).toEqual(expected);
    }
  });

  it("uses a valid Z value at every visible Z-table update", async () => {
    const mod = (await loadAlgorithm("z-algorithm")) as AlgorithmModule<StringFrame, { text: string; pattern: string }>;
    for (const step of mod.generate({ text: "a$b$$ab$", pattern: "$" })) {
      const table = aux(step.frame, "Z");
      if (table.length === 0) continue;
      const expected = zValues(step.frame.text.map(({ ch }) => ch));
      table.forEach((value, index) => {
        expect(Number(value)).toBeGreaterThanOrEqual(0);
        expect(Number(value)).toBeLessThanOrEqual(expected[index]);
      });
      // The table is filled left-to-right; only the final frame is required to
      // contain every Z value, while earlier frames intentionally retain zeros
      // for positions not reached yet.
      if (step.codeLine === 6) expect(table).toEqual(expected);
    }
  });
});

describe("mathematics trace validators", () => {
  it("shows every Euclidean division and recursive call correctly", async () => {
    const mod = (await loadAlgorithm("euclidean-gcd")) as AlgorithmModule<CallStackFrame, { a: number; b: number }>;
    for (const input of [{ a: 1071, b: 462 }, { a: 55, b: 34 }, { a: 48, b: 18 }]) {
      const steps = mod.generate(input);
      const calls = steps.filter((step) => step.codeLine === 1).map((step) => step.frame.stack.at(-1)?.label ?? "");
      const expectedCalls: string[] = [];
      let [a, b] = [input.a, input.b];
      do {
        expectedCalls.push(`gcd(${a}, ${b})`);
        [a, b] = [b, a % b];
      } while (expectedCalls.at(-1) !== `gcd(${a}, ${b})` && b !== 0);
      expectedCalls.push(`gcd(${a}, ${b})`);
      expect(calls).toEqual([...new Set(expectedCalls)]);
      for (const step of steps.filter((step) => step.codeLine === 3)) {
        const top = step.frame.stack.at(-1)?.label.match(/gcd\((-?\d+), (-?\d+)\)/);
        expect(top).not.toBeNull();
        expect(step.description).toContain(`${top?.[1]} mod ${top?.[2]} = ${Number(top?.[1]) % Number(top?.[2])}`);
      }
      expect(steps.at(-1)?.description).toContain(`= ${gcd(input.a, input.b)}.`);
    }
  });

  it("shows fast-power’s halving call chain and exact modular/non-modular result", async () => {
    const mod = (await loadAlgorithm("fast-power")) as AlgorithmModule<CallStackFrame, { base: number; exp: number; mod?: number }>;
    for (const input of [{ base: 7, exp: 13 }, { base: 17, exp: 23, mod: 97 }, { base: -3, exp: 9, mod: 17 }]) {
      const steps = mod.generate(input);
      const exponents = steps
        .filter((step) => step.codeLine === 1)
        .map((step) => BigInt(step.frame.stack.at(-1)?.label.match(/, (\d+)\)/)?.[1] ?? "-1"));
      const expected: bigint[] = [];
      for (let exponent = BigInt(input.exp); ; exponent /= BigInt(2)) {
        expected.push(exponent);
        if (exponent === BigInt(0)) break;
      }
      expect(exponents).toEqual(expected);
      const result = pow(BigInt(input.base), BigInt(input.exp), input.mod === undefined ? undefined : BigInt(input.mod));
      expect(steps.at(-1)?.description).toContain(`= ${result}`);
    }
  });

  it("crosses out only composite sieve entries and leaves exactly the primes", async () => {
    const mod = (await loadAlgorithm("sieve-of-eratosthenes")) as AlgorithmModule<GridFrame, { n: number }>;
    for (const n of [2, 30, 49]) {
      const steps = mod.generate({ n });
      for (const step of steps.filter((step) => step.codeLine === 2)) {
        const crossed = step.description.match(/Cross out (\d+) = (\d+) × (\d+)/);
        expect(crossed).not.toBeNull();
        const value = Number(crossed?.[1]);
        const prime = Number(crossed?.[2]);
        expect(isPrime(value)).toBe(false);
        expect(isPrime(prime)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(prime * prime);
      }
      const final = steps.at(-1)!;
      expect(aux(final.frame, "Primes").map(Number)).toEqual(Array.from({ length: n - 1 }, (_, i) => i + 2).filter(isPrime));
      for (const row of final.frame.cells) for (const cell of row) {
        if (typeof cell.value !== "number") continue;
        expect(cell.state).toBe(isPrime(cell.value) ? "sorted" : "discarded");
      }
    }
  });

  it("maintains a valid factorization product after every recorded factor", async () => {
    const mod = (await loadAlgorithm("prime-factorization")) as AlgorithmModule<ArrayFrame, { n: number }>;
    for (const n of [2, 97, 360, 1024, 2 * 101]) {
      const steps = mod.generate({ n });
      for (const step of steps) {
        const factors = aux(step.frame, "factors").filter((value): value is number => typeof value === "number");
        const remaining = Number(aux(step.frame, "remaining n")[0]);
        expect(factors.every(isPrime)).toBe(true);
        expect(factors.reduce((product, factor) => product * factor, 1) * remaining).toBe(n);
      }
      expect(aux(steps.at(-1)!.frame, "factors")).toEqual(factorsOf(n));
    }
  });

  it("keeps every extended-Euclid row and Bézout back-substitution mathematically valid", async () => {
    const mod = (await loadAlgorithm("extended-euclidean")) as AlgorithmModule<TableFrame, { a: number; b: number }>;
    for (const input of [{ a: 240, b: 46 }, { a: 1071, b: 462 }, { a: 17, b: 5 }]) {
      for (const step of mod.generate(input)) {
        for (const row of step.frame.cells) {
          const [a, b, q, r, x, y] = row.map((cell) => cell.value === null ? null : BigInt(String(cell.value)));
          if (a !== null && b !== null && q !== null && r !== null) {
            expect(a).toBe(q * b + r);
            expect(r).toBeGreaterThanOrEqual(BigInt(0));
            expect(r).toBeLessThan(b);
          }
          if (a !== null && b !== null && x !== null && y !== null) {
            expect(a * x + b * y).toBe(BigInt(gcd(Number(a), Number(b))));
          }
        }
      }
    }
  });
});
