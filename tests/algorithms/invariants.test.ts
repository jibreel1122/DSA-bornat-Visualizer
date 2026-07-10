// tests/algorithms/invariants.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";
import { LANGUAGES, MAX_STEPS } from "@/lib/engine/types";
import type { AlgorithmModule, Level } from "@/lib/engine/types";
import { createRNG } from "@/lib/engine/random";
import { validateFrame } from "../helpers/validate-frame";

const TEST_LEVELS: Level[] = [1, 3, 5];
const SEEDS = [1, 42];

/**
 * Counters documented as cumulative (types.ts:82) must be non-decreasing.
 * If triage (Task 5) proves a counter is a legitimate gauge (e.g. a live
 * queue size), EITHER move it into the frame's aux rows in the module,
 * OR add it here with a one-line justification.
 */
const GAUGE_COUNTERS: Record<string, string[]> = {};

describe.each(ALGORITHMS.map((m) => [m.slug, m] as const))(
  "%s",
  (slug, meta) => {
    let mod: AlgorithmModule;

    beforeAll(async () => {
      const loaded = await loadAlgorithm(slug);
      if (!loaded) throw new Error(`loadAlgorithm(${slug}) returned null`);
      mod = loaded;
    });

    it("has complete metadata and content", () => {
      expect(mod.pseudocode.length).toBeGreaterThan(0);
      for (const lang of LANGUAGES)
        expect(mod.code[lang.id]?.trim().length, `code.${lang.id}`).toBeGreaterThan(0);
      const c = mod.content;
      expect(c.overview.trim().length).toBeGreaterThan(0);
      expect(c.summary.trim().length).toBeGreaterThan(0);
      for (const key of ["howItWorks", "applications", "advantages", "disadvantages", "commonMistakes", "interviewQuestions"] as const)
        expect(c[key].length, key).toBeGreaterThan(0);
      expect(c.quiz.length).toBeGreaterThan(0);
      for (const q of c.quiz) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    });

    for (const level of TEST_LEVELS) {
      for (const seed of SEEDS) {
        describe(`level ${level}, seed ${seed}`, () => {
          it("default input round-trips through serialize/parse", () => {
            const input = mod.defaultInput(level, createRNG(seed));
            const roundTripped = mod.parseInput(mod.serializeInput(input));
            expect(roundTripped).toEqual(input);
          });

          it("generates structurally valid steps", () => {
            const input = mod.defaultInput(level, createRNG(seed));
            const steps = mod.generate(input);
            expect(steps.length).toBeGreaterThan(0);
            expect(steps.length).toBeLessThanOrEqual(MAX_STEPS);
            steps.forEach((s, i) => {
              expect(s.description.trim().length, `step ${i} description`).toBeGreaterThan(0);
              if (s.codeLine !== undefined) {
                expect(Number.isInteger(s.codeLine), `step ${i} codeLine`).toBe(true);
                expect(s.codeLine).toBeGreaterThanOrEqual(0);
                expect(s.codeLine, `step ${i} codeLine within pseudocode`).toBeLessThan(mod.pseudocode.length);
              }
              for (const [k, v] of Object.entries(s.counters ?? {})) {
                expect(Number.isFinite(v), `step ${i} counter ${k}`).toBe(true);
                expect(v).toBeGreaterThanOrEqual(0);
              }
              const violations = validateFrame(meta.renderer, s.frame);
              expect(violations, `step ${i} frame violations`).toEqual([]);
            });
          });

          it("is deterministic", () => {
            const a = mod.generate(mod.defaultInput(level, createRNG(seed)));
            const b = mod.generate(mod.defaultInput(level, createRNG(seed)));
            expect(JSON.stringify(a)).toBe(JSON.stringify(b));
          });

          it("counters are cumulative (non-decreasing)", () => {
            const gauges = new Set(GAUGE_COUNTERS[slug] ?? []);
            const steps = mod.generate(mod.defaultInput(level, createRNG(seed)));
            const last: Record<string, number> = {};
            steps.forEach((s, i) => {
              for (const [k, v] of Object.entries(s.counters ?? {})) {
                if (gauges.has(k)) continue;
                expect(v, `step ${i} counter "${k}" decreased`).toBeGreaterThanOrEqual(last[k] ?? 0);
                last[k] = v;
              }
            });
          });
        });
      }
    }
  },
);
