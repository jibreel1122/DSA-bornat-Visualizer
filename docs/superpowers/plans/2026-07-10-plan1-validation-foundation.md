# Plan 1 — Test/Lint Foundation & Algorithm Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Vitest + ESLint from scratch, validate all 87 algorithm modules against universal structural invariants, add deep semantic correctness suites for sorting (14) and searching (6), and extract the duplicated array-frame builder shared by 6 comparison sorts — all without changing any algorithm's observable behavior except where a test proves a bug.

**Architecture:** Tests are registry-driven: they iterate `ALGORITHMS` / `byCategory()` from `src/lib/algorithms/index.ts` and load modules via `loadAlgorithm(slug)`, so new algorithms are automatically covered. All algorithm generators are pure functions (`generate(input) => Step<F>[]`) with seeded RNG (`createRNG`), so tests run in a plain `node` environment — no jsdom, no React rendering.

**Tech Stack:** Vitest (node env), ESLint 9 flat config via `eslint-config-next`, TypeScript 5.9 strict, existing engine contracts in `src/lib/engine/types.ts`.

## Global Constraints

- **Never change algorithm behavior in this plan** except to fix a bug proven by a failing test; each such fix is its own commit with the failing test committed first.
- Refactors must keep generated steps **byte-identical** — guarded by snapshot tests (Task 8).
- All test randomness goes through `createRNG(seed)` from `src/lib/engine/random.ts` with fixed seeds. Never `Math.random()` / `Date.now()` in tests.
- Path alias `@/*` → `./src/*` (tsconfig.json:17) must resolve in Vitest.
- Verification command for the app itself is `npm run build`, **not** `next dev` — the dev server 404s CSS under this OneDrive path.
- Windows environment; npm scripts run under cmd, so `&&` chaining inside package.json scripts is fine.
- After every task: `npx tsc --noEmit` must pass (tsconfig `include` covers `tests/**`, so test files are type-checked too).
- Do not touch `src/lib/i18n/**`, UI components, or content strings — those belong to Plans 2–3.

## Engine contract reference (read-only background)

From `src/lib/engine/types.ts` — tests consume exactly these:

- `Step<F> = { frame: F; description: string; codeLine?: number; counters?: Record<string, number> }` — `codeLine` is a 0-based index into `pseudocode`; `counters` are documented as **cumulative** (types.ts:82).
- `MAX_STEPS = 5000` — hard cap on generated steps.
- `AlgorithmModule<F, I>` — `slug, title, category, difficulty, tags, summary, renderer: RendererKind, pseudocode: string[], code: Record<Language, string>, content: AlgorithmContent, inputFields, defaultInput(level, rng) => I, parseInput(fields) => I (throws friendly Error), serializeInput(input) => Record<string,string>, generate(input) => Step<F>[]`.
- `LANGUAGES` — 12 language ids; `LEVELS` — levels 1–5.
- 9 frame contracts: `ArrayFrame, ListFrame, TreeFrame, GraphFrame, GridFrame, TableFrame, CallStackFrame, StringFrame, HashFrame`; shared `CellState` union of 10 values.
- Registry (`src/lib/algorithms/index.ts`): `ALGORITHMS: AlgorithmMeta[]`, `byCategory(category)`, `loadAlgorithm(slug): Promise<AlgorithmModule | null>`.
- RNG: `createRNG(seed: number): RNG` from `src/lib/engine/random.ts:4`.

---

### Task 1: Vitest infrastructure + registry smoke test

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Produces: `npm test` / `npm run test:watch` commands; `tests/**/*.test.ts` as the test file convention; `@/` alias resolution inside tests. All later tasks rely on these.

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest`
Expected: exits 0, `vitest` appears in `package.json` devDependencies.

- [ ] **Step 2: Create the Vitest config**

```ts
// vitest.config.ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Add npm scripts**

In `package.json` `"scripts"`, add (keep existing scripts unchanged):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the smoke test**

```ts
// tests/smoke.test.ts
import { describe, expect, it } from "vitest";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";

describe("algorithm registry", () => {
  it("exposes at least 87 algorithms with unique slugs", () => {
    expect(ALGORITHMS.length).toBeGreaterThanOrEqual(87);
    const slugs = new Set(ALGORITHMS.map((a) => a.slug));
    expect(slugs.size).toBe(ALGORITHMS.length);
  });

  it("loads a full module by slug", async () => {
    const mod = await loadAlgorithm("bubble-sort");
    expect(mod?.slug).toBe("bubble-sort");
    expect(typeof mod?.generate).toBe("function");
  });

  it("returns null for unknown slugs", async () => {
    expect(await loadAlgorithm("no-such-algorithm")).toBeNull();
  });
});
```

- [ ] **Step 5: Run the test suite**

Run: `npm test`
Expected: 3 tests PASS in `tests/smoke.test.ts`.

- [ ] **Step 6: Verify typecheck still passes**

Run: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts package.json package-lock.json
git commit -m "test: add Vitest infrastructure and registry smoke test"
```

---

### Task 2: ESLint flat config + fix surfaced issues

**Files:**
- Create: `eslint.config.mjs`
- Modify: `package.json` (script + devDependencies)
- Modify: any `src/**` files with lint findings (data-dependent)

**Interfaces:**
- Produces: `npm run lint` command that later tasks and Task 9's `check` script rely on; must pass with zero warnings.

- [ ] **Step 1: Install ESLint packages**

Run: `npm i -D eslint @eslint/eslintrc eslint-config-next`
Expected: exits 0.

- [ ] **Step 2: Create the flat config**

```js
// eslint.config.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
```

- [ ] **Step 3: Add the lint script**

In `package.json` `"scripts"`, add:

```json
"lint": "eslint ."
```

- [ ] **Step 4: Run lint and record findings**

Run: `npm run lint`
Expected: likely a handful of findings (this repo has never been linted). Save the full output — it is the worklist for Step 5.

- [ ] **Step 5: Fix every error and warning**

Rules of engagement, in priority order:
1. Unused imports/variables → delete them.
2. `react-hooks/exhaustive-deps` → fix the dependency array *correctly* (add the dep, or wrap the value in `useCallback`/`useMemo` at its definition). Never silence with a disable comment unless the dep is intentionally omitted — then add `// eslint-disable-next-line react-hooks/exhaustive-deps -- <one-line reason>`.
3. `@typescript-eslint/no-explicit-any` in `src/lib/algorithms/index.ts:26-27` already has a disable comment with the registry's rationale — keep it.
4. Findings inside `src/components/ui/*` (vendored shadcn primitives): prefer a targeted disable comment over restructuring vendored code.
5. Behavior must not change. If a fix would change behavior, stop and flag it instead.

- [ ] **Step 6: Verify zero warnings and green build**

Run: `npx eslint . --max-warnings 0 && npx tsc --noEmit && npm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add ESLint flat config and fix all lint findings"
```

---

### Task 3: Frame validators (per-renderer structural checks)

**Files:**
- Create: `tests/helpers/validate-frame.ts`
- Create: `tests/helpers/validate-frame.test.ts`

**Interfaces:**
- Produces: `validateFrame(kind: RendererKind, frame: unknown): string[]` — returns a list of human-readable violations, empty when valid. Task 4 calls this for every step of every algorithm.

- [ ] **Step 1: Write failing unit tests for the validator**

```ts
// tests/helpers/validate-frame.test.ts
import { describe, expect, it } from "vitest";
import { validateFrame } from "./validate-frame";

describe("validateFrame", () => {
  it("accepts a valid ArrayFrame", () => {
    expect(
      validateFrame("array", {
        values: [3, 1, 2],
        states: { 0: "compare", 2: "sorted" },
        pointers: [{ index: 1, label: "i" }],
      }),
    ).toEqual([]);
  });

  it("rejects out-of-range state keys and bad states", () => {
    const violations = validateFrame("array", {
      values: [1, 2],
      states: { 5: "compare", 0: "sparkly" },
    });
    expect(violations.some((v) => v.includes("5"))).toBe(true);
    expect(violations.some((v) => v.includes("sparkly"))).toBe(true);
  });

  it("rejects a TreeFrame whose child ids do not exist", () => {
    const violations = validateFrame("tree", {
      nodes: { a: { id: "a", value: 1, left: "ghost" } },
      rootId: "a",
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it("rejects a GraphFrame edge referencing a missing node", () => {
    const violations = validateFrame("graph", {
      nodes: [{ id: "A", label: "A" }],
      edges: [{ from: "A", to: "B" }],
    });
    expect(violations.length).toBeGreaterThan(0);
  });

  it("rejects a GridFrame with mismatched dimensions", () => {
    const violations = validateFrame("grid", {
      rows: 2,
      cols: 2,
      cells: [[{ value: 1 }]],
    });
    expect(violations.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/helpers/validate-frame.test.ts`
Expected: FAIL — `validate-frame` module not found.

- [ ] **Step 3: Implement the validator**

```ts
// tests/helpers/validate-frame.ts
import type {
  ArrayFrame,
  CallStackFrame,
  CellState,
  GraphFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  RendererKind,
  StringFrame,
  TableFrame,
  TreeFrame,
} from "@/lib/engine/types";

const CELL_STATES = new Set<string>([
  "default", "active", "compare", "swap", "sorted",
  "pivot", "found", "discarded", "visited", "special",
]);

const isFinite_ = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

function checkStates(
  states: Record<string | number, CellState> | undefined,
  isValidKey: (k: string) => boolean,
  out: string[],
  label: string,
) {
  for (const [k, v] of Object.entries(states ?? {})) {
    if (!isValidKey(k)) out.push(`${label} key "${k}" does not reference an existing element`);
    if (!CELL_STATES.has(v)) out.push(`${label}["${k}"] has invalid state "${v}"`);
  }
}

function validateArray(f: ArrayFrame, out: string[]) {
  if (!Array.isArray(f.values)) return void out.push("values is not an array");
  f.values.forEach((v, i) => { if (!isFinite_(v)) out.push(`values[${i}] is not a finite number`); });
  const inRange = (k: string) => {
    const i = Number(k);
    return Number.isInteger(i) && i >= 0 && i < f.values.length;
  };
  checkStates(f.states, inRange, out, "states");
  for (const p of f.pointers ?? []) {
    // -1 (before start) and length (past end) are allowed as sentinel positions
    if (!Number.isInteger(p.index) || p.index < -1 || p.index > f.values.length)
      out.push(`pointer "${p.label}" index ${p.index} out of range`);
  }
  if (f.range && f.range.from > f.range.to)
    out.push(`range.from (${f.range.from}) > range.to (${f.range.to})`);
}

function validateList(f: ListFrame, out: string[]) {
  const ids = new Set(f.nodes.map((n) => n.id));
  if (ids.size !== f.nodes.length) out.push("duplicate node ids");
  for (const l of f.links) {
    if (!ids.has(l.from)) out.push(`link.from "${l.from}" missing`);
    if (!ids.has(l.to)) out.push(`link.to "${l.to}" missing`);
  }
  for (const p of f.pointers ?? [])
    if (p.nodeId !== null && !ids.has(p.nodeId))
      out.push(`pointer "${p.label}" references missing node "${p.nodeId}"`);
  checkStates(f.states, (k) => ids.has(k), out, "states");
}

function validateTree(f: TreeFrame, out: string[]) {
  const ids = new Set(Object.keys(f.nodes));
  if (f.rootId !== null && !ids.has(f.rootId))
    out.push(`rootId "${f.rootId}" missing from nodes`);
  for (const [id, n] of Object.entries(f.nodes)) {
    for (const child of [n.left, n.right, ...(n.children ?? [])]) {
      if (child != null && !ids.has(child))
        out.push(`node "${id}" references missing child "${child}"`);
      if (child === id) out.push(`node "${id}" is its own child`);
    }
  }
  checkStates(f.states, (k) => ids.has(k), out, "states");
}

function validateGraph(f: GraphFrame, out: string[]) {
  const ids = new Set(f.nodes.map((n) => n.id));
  if (ids.size !== f.nodes.length) out.push("duplicate node ids");
  for (const e of f.edges) {
    if (!ids.has(e.from)) out.push(`edge.from "${e.from}" missing`);
    if (!ids.has(e.to)) out.push(`edge.to "${e.to}" missing`);
    if (e.weight !== undefined && !isFinite_(e.weight))
      out.push(`edge ${e.from}->${e.to} has non-finite weight`);
  }
  checkStates(f.nodeStates, (k) => ids.has(k), out, "nodeStates");
  for (const [k, v] of Object.entries(f.edgeStates ?? {})) {
    if (!k.includes("->")) out.push(`edgeStates key "${k}" is not "from->to"`);
    else {
      const [from, to] = k.split("->");
      if (!ids.has(from) || !ids.has(to))
        out.push(`edgeStates key "${k}" references missing node`);
    }
    if (!CELL_STATES.has(v)) out.push(`edgeStates["${k}"] invalid state "${v}"`);
  }
  for (const k of Object.keys(f.nodeAnnotations ?? {}))
    if (!ids.has(k)) out.push(`nodeAnnotations key "${k}" references missing node`);
}

function validateGrid(f: GridFrame, out: string[]) {
  if (f.cells.length !== f.rows)
    out.push(`cells has ${f.cells.length} rows, expected ${f.rows}`);
  f.cells.forEach((row, r) => {
    if (row.length !== f.cols)
      out.push(`row ${r} has ${row.length} cols, expected ${f.cols}`);
    row.forEach((c, cIdx) => {
      if (c.state !== undefined && !CELL_STATES.has(c.state))
        out.push(`cell [${r}][${cIdx}] invalid state "${c.state}"`);
    });
  });
}

function validateTable(f: TableFrame, out: string[]) {
  if (f.cells.length !== f.rowLabels.length)
    out.push(`cells has ${f.cells.length} rows, expected ${f.rowLabels.length}`);
  f.cells.forEach((row, r) => {
    if (row.length !== f.colLabels.length)
      out.push(`row ${r} has ${row.length} cols, expected ${f.colLabels.length}`);
  });
}

function validateCallstack(f: CallStackFrame, out: string[]) {
  const ids = new Set(f.stack.map((s) => s.id));
  if (ids.size !== f.stack.length) out.push("duplicate call-stack item ids");
  for (const s of f.stack)
    if (s.state !== undefined && !CELL_STATES.has(s.state))
      out.push(`stack item "${s.id}" invalid state "${s.state}"`);
}

function validateString(f: StringFrame, out: string[]) {
  for (const t of f.text)
    if (t.state !== undefined && !CELL_STATES.has(t.state))
      out.push(`text char invalid state "${t.state}"`);
  if (f.shift !== undefined && !Number.isInteger(f.shift))
    out.push(`shift ${f.shift} is not an integer`);
}

function validateHash(f: HashFrame, out: string[]) {
  if (typeof f.chained !== "boolean") out.push("chained flag missing");
  for (const b of f.buckets) {
    if (!Number.isInteger(b.index) || b.index < 0)
      out.push(`bucket index ${b.index} invalid`);
    for (const item of b.items)
      if (item.state !== undefined && !CELL_STATES.has(item.state))
        out.push(`bucket ${b.index} item "${item.key}" invalid state`);
  }
}

export function validateFrame(kind: RendererKind, frame: unknown): string[] {
  const out: string[] = [];
  if (frame === null || typeof frame !== "object") return [`frame is not an object`];
  switch (kind) {
    case "array": validateArray(frame as ArrayFrame, out); break;
    case "list": validateList(frame as ListFrame, out); break;
    case "tree": validateTree(frame as TreeFrame, out); break;
    case "graph": validateGraph(frame as GraphFrame, out); break;
    case "grid": validateGrid(frame as GridFrame, out); break;
    case "table": validateTable(frame as TableFrame, out); break;
    case "callstack": validateCallstack(frame as CallStackFrame, out); break;
    case "string": validateString(frame as StringFrame, out); break;
    case "hash": validateHash(frame as HashFrame, out); break;
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/helpers/validate-frame.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/validate-frame.ts tests/helpers/validate-frame.test.ts
git commit -m "test: add per-renderer frame validators"
```

---

### Task 4: Universal invariants suite over all 87 modules

**Files:**
- Create: `tests/algorithms/invariants.test.ts`

**Interfaces:**
- Consumes: `validateFrame` from Task 3.
- Produces: the failure list that Task 5 triages. Nothing downstream imports this file.

- [ ] **Step 1: Write the invariants suite**

```ts
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
```

- [ ] **Step 2: Run the suite and capture the failure list**

Run: `npm test 2>&1 | tee invariant-failures.txt` (keep the file out of git)
Expected: this suite runs 87 modules × 3 levels × 2 seeds; some failures are likely. **Do not fix anything yet.** Record every distinct failing (slug, test, message).

- [ ] **Step 3: Commit the suite (even with failures present)**

```bash
git add tests/algorithms/invariants.test.ts
git commit -m "test: add universal invariant suite for all algorithm modules"
```

---

### Task 5: Triage and fix invariant failures

**Files:**
- Modify: whichever `src/lib/algorithms/**` modules fail (data-dependent)
- Modify: `tests/algorithms/invariants.test.ts` (only the `GAUGE_COUNTERS` allowlist)

**Interfaces:**
- Consumes: the failure list from Task 4 Step 2.
- Produces: a fully green `npm test`.

- [ ] **Step 1: Classify every failure**

For each failing (slug, test), classify as exactly one of:
- **A. Module bug** (wrong codeLine bound, missing description, frame referencing a deleted node, non-determinism from stray `Math.random`, round-trip loss in serialize/parse) → fix the module.
- **B. Gauge counter** (a counter that legitimately fluctuates, e.g. live queue size) → preferred fix: move the value into the frame's `aux` rows so the counter contract stays clean; fallback: add to `GAUGE_COUNTERS` with a justification comment.
- **C. Validator too strict** (a legitimate frame pattern the validator rejects) → loosen the validator with a comment explaining the legitimate pattern. Requires pointing at the renderer code in `src/components/visualizer/renderers/` that proves the pattern renders correctly.

Use superpowers:systematic-debugging for any failure whose cause isn't obvious from the message.

- [ ] **Step 2: Fix category A failures — one commit per module**

For each: reproduce with `npx vitest run tests/algorithms/invariants.test.ts -t "<slug>"`, fix the module, re-run, then:

```bash
git add src/lib/algorithms/<category>/<slug>.ts
git commit -m "fix(<slug>): <one-line description of the proven bug>"
```

- [ ] **Step 3: Apply category B/C changes — one commit total**

```bash
git add -A
git commit -m "test: document gauge counters and legitimate frame patterns from triage"
```

- [ ] **Step 4: Verify everything is green**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, zero failures.

---

### Task 6: Sorting deep-correctness suite (14 modules)

**Files:**
- Create: `tests/algorithms/sorting.test.ts`

**Interfaces:**
- Consumes: registry `byCategory("sorting")`; `ArrayFrame` contract (final step's `frame.values` is the full array).
- Produces: nothing downstream; guards Task 8's refactor semantically.

- [ ] **Step 1: Write the suite**

```ts
// tests/algorithms/sorting.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";

/**
 * Raw field values fed through each module's own parseInput. If a module
 * rejects a case (e.g. counting sort rejecting negatives), the contract is
 * satisfied by a friendly error instead — both branches are asserted.
 */
const CASES: Record<string, string> = {
  "empty input": "",
  "one element": "5",
  "two elements": "2, 1",
  "already sorted": "1, 2, 3, 4, 5, 6, 7, 8",
  "reverse sorted": "9, 8, 7, 6, 5, 4, 3, 2, 1",
  "duplicates": "5, 3, 8, 3, 5, 1, 8, 1",
  "all equal": "7, 7, 7, 7, 7",
  "negative numbers": "-3, 12, -7, 0, 5, -1",
  "extreme values": "999, -999, 500, -500, 0",
  "random": "34, 7, 23, 32, 5, 62, 78, 4, 97, 41, 3, 73",
};

function inversions(a: number[]): number {
  let c = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = i + 1; j < a.length; j++)
      if (a[i] > a[j]) c++;
  return c;
}

describe.each(byCategory("sorting").map((m) => [m.slug] as const))(
  "%s",
  (slug) => {
    let mod: AlgorithmModule<ArrayFrame, { values: number[] }>;

    beforeAll(async () => {
      mod = (await loadAlgorithm(slug)) as typeof mod;
      expect(mod).not.toBeNull();
    });

    for (const [name, raw] of Object.entries(CASES)) {
      it(`handles ${name}`, () => {
        let input: { values: number[] };
        try {
          input = mod.parseInput({ values: raw });
        } catch (e) {
          // Rejection is fine if the message is user-friendly (non-empty prose).
          expect((e as Error).message.trim().length).toBeGreaterThan(3);
          return;
        }
        const steps = mod.generate(input) as Step<ArrayFrame>[];
        const final = steps[steps.length - 1].frame.values;
        const expected = [...input.values].sort((a, b) => a - b);
        expect(final).toEqual(expected);
      });
    }
  },
);

describe("bubble-sort counter theorems", () => {
  let mod: AlgorithmModule<ArrayFrame, { values: number[] }>;

  beforeAll(async () => {
    mod = (await loadAlgorithm("bubble-sort")) as typeof mod;
  });

  function finalCounters(values: number[]) {
    const steps = mod.generate({ values });
    return steps[steps.length - 1].counters ?? {};
  }

  it("swap count equals the inversion count of the input", () => {
    const values = [34, 7, 23, 32, 5, 62, 78, 4];
    expect(finalCounters(values).swaps).toBe(inversions(values));
  });

  it("reverse-sorted input needs n(n-1)/2 comparisons", () => {
    const values = [9, 8, 7, 6, 5, 4, 3, 2, 1];
    const n = values.length;
    expect(finalCounters(values).comparisons).toBe((n * (n - 1)) / 2);
  });

  it("sorted input early-exits: n-1 comparisons, 0 swaps", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8];
    const c = finalCounters(values);
    expect(c.comparisons).toBe(values.length - 1);
    expect(c.swaps).toBe(0);
  });
});
```

- [ ] **Step 2: Run the suite**

Run: `npx vitest run tests/algorithms/sorting.test.ts`
Expected: mostly PASS. Any FAIL is a real correctness bug (final frame not sorted) or an unfriendly parse error.

- [ ] **Step 3: Fix any failures — one commit per module**

Same protocol as Task 5 Step 2: reproduce, fix in the module (never weaken the assertion), commit as `fix(<slug>): ...`.

- [ ] **Step 4: Commit the suite**

```bash
git add tests/algorithms/sorting.test.ts
git commit -m "test: add sorting deep-correctness suite with edge cases"
```

---

### Task 7: Searching deep-correctness suite (6 modules)

**Files:**
- Create: `tests/algorithms/searching.test.ts`

**Interfaces:**
- Consumes: all 6 searching modules share `Input = { values: number[]; target: number }` and field keys `values`/`target` (verified in every `src/lib/algorithms/searching/*.ts:5`). A hit is marked with `CellState "found"` on the target's index.

- [ ] **Step 1: Write the suite**

```ts
// tests/algorithms/searching.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";

type SearchInput = { values: number[]; target: number };

const SORTED = "2, 5, 8, 12, 16, 23, 38, 56, 72, 91";

const CASES: { name: string; values: string; target: string; present: boolean }[] = [
  { name: "target at first index", values: SORTED, target: "2", present: true },
  { name: "target in the middle", values: SORTED, target: "16", present: true },
  { name: "target at last index", values: SORTED, target: "91", present: true },
  { name: "absent within range", values: SORTED, target: "10", present: false },
  { name: "absent above range", values: SORTED, target: "100", present: false },
  { name: "absent below range", values: SORTED, target: "1", present: false },
  { name: "duplicates", values: "1, 3, 3, 3, 7, 9", target: "3", present: true },
  { name: "two elements, hit", values: "4, 9", target: "9", present: true },
  { name: "two elements, miss", values: "4, 9", target: "5", present: false },
];

/** Every step index marked "found", mapped to the value at that index. */
function foundValues(steps: Step<ArrayFrame>[]): number[] {
  const hits: number[] = [];
  for (const s of steps)
    for (const [k, state] of Object.entries(s.frame.states ?? {}))
      if (state === "found") hits.push(s.frame.values[Number(k)]);
  return hits;
}

describe.each(byCategory("searching").map((m) => [m.slug] as const))(
  "%s",
  (slug) => {
    let mod: AlgorithmModule<ArrayFrame, SearchInput>;

    beforeAll(async () => {
      mod = (await loadAlgorithm(slug)) as typeof mod;
      expect(mod).not.toBeNull();
    });

    for (const c of CASES) {
      it(c.name, () => {
        let input: SearchInput;
        try {
          input = mod.parseInput({ values: c.values, target: c.target });
        } catch (e) {
          expect((e as Error).message.trim().length).toBeGreaterThan(3);
          return;
        }
        const steps = mod.generate(input) as Step<ArrayFrame>[];
        const hits = foundValues(steps);
        if (c.present) {
          expect(hits.length, "expected a found marker").toBeGreaterThan(0);
          for (const v of hits) expect(v).toBe(input.target);
        } else {
          expect(hits, "no index may be marked found").toEqual([]);
          const finalDesc = steps[steps.length - 1].description.toLowerCase();
          expect(finalDesc).toMatch(/not (found|present|in)/);
        }
      });
    }

    it("finds the target on an unsorted array or rejects unsorted input", () => {
      // Only linear search must handle unsorted data; the others may either
      // reject it in parseInput or document the sorted-input requirement.
      let input: SearchInput;
      try {
        input = mod.parseInput({ values: "34, 7, 23", target: "7" });
      } catch (e) {
        expect((e as Error).message.trim().length).toBeGreaterThan(3);
        return;
      }
      if (slug === "linear-search") {
        const hits = foundValues(mod.generate(input) as Step<ArrayFrame>[]);
        expect(hits).toEqual([7]);
      }
    });
  },
);
```

- [ ] **Step 2: Run the suite**

Run: `npx vitest run tests/algorithms/searching.test.ts`
Expected: mostly PASS. Failures follow the Task 5 Step 2 fix-and-commit protocol. Note: if a module's "not found" description doesn't match `/not (found|present|in)/`, first read the actual description; if it communicates absence clearly in different words, widen the regex in the test (comment why) rather than rewording the module — copy changes belong to Plan 3.

- [ ] **Step 3: Commit**

```bash
git add tests/algorithms/searching.test.ts
git commit -m "test: add searching deep-correctness suite"
```

---

### Task 8: Extract shared `arrayFrame` builder (6 comparison sorts)

**Files:**
- Create: `tests/algorithms/sorting-golden.test.ts`
- Create: `src/lib/algorithms/step-helpers.ts`
- Create: `tests/algorithms/step-helpers.test.ts`
- Modify: `src/lib/algorithms/sorting/bubble-sort.ts:7-16` (local `frame()` fn)
- Modify: `src/lib/algorithms/sorting/selection-sort.ts`, `insertion-sort.ts`, `shell-sort.ts`, `cocktail-shaker-sort.ts`, `comb-sort.ts` (their local `frame()` equivalents)

**Interfaces:**
- Produces: `arrayFrame(values: number[], states?: Record<number, CellState>, opts?: { sortedFrom?: number; sortedTo?: number; note?: string; pointers?: ArrayFrame["pointers"]; aux?: ArrayFrame["aux"] }): ArrayFrame` — copies `values`, merges `"sorted"` state into indices `[sortedFrom, length)` and `[0, sortedTo)` without overwriting explicit states.
- Scope guard: ONLY the six files above. The other 8 sorting modules keep their local helpers (different shapes — merge buffers, buckets, digit tables). Counter bookkeeping (`let comparisons/swaps`) stays local — it's 3 lines per file, not worth an abstraction.

- [ ] **Step 1: Write golden snapshot tests (the refactor's safety net)**

```ts
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
```

- [ ] **Step 2: Run once to record baselines, then commit them**

Run: `npx vitest run tests/algorithms/sorting-golden.test.ts`
Expected: 6 tests PASS, snapshot file written under `tests/algorithms/__snapshots__/`.

```bash
git add tests/algorithms/sorting-golden.test.ts tests/algorithms/__snapshots__/
git commit -m "test: record golden step baselines for comparison sorts"
```

- [ ] **Step 3: Write failing unit tests for the helper**

```ts
// tests/algorithms/step-helpers.test.ts
import { describe, expect, it } from "vitest";
import { arrayFrame } from "@/lib/algorithms/step-helpers";

describe("arrayFrame", () => {
  it("copies values (no aliasing)", () => {
    const values = [3, 1, 2];
    const f = arrayFrame(values);
    values[0] = 99;
    expect(f.values).toEqual([3, 1, 2]);
  });

  it("marks a sorted suffix without overwriting explicit states", () => {
    const f = arrayFrame([4, 3, 2, 1], { 2: "swap" }, { sortedFrom: 2 });
    expect(f.states).toEqual({ 2: "swap", 3: "sorted" });
  });

  it("marks a sorted prefix", () => {
    const f = arrayFrame([1, 2, 3, 4], {}, { sortedTo: 2 });
    expect(f.states).toEqual({ 0: "sorted", 1: "sorted" });
  });

  it("passes through note, pointers, and aux", () => {
    const f = arrayFrame([1], {}, {
      note: "hi",
      pointers: [{ index: 0, label: "i" }],
      aux: [{ label: "buf", values: [7] }],
    });
    expect(f.note).toBe("hi");
    expect(f.pointers).toEqual([{ index: 0, label: "i" }]);
    expect(f.aux).toEqual([{ label: "buf", values: [7] }]);
  });
});
```

Run: `npx vitest run tests/algorithms/step-helpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the helper**

```ts
// src/lib/algorithms/step-helpers.ts
import type { ArrayFrame, CellState } from "@/lib/engine/types";

/**
 * Shared frame builder for comparison sorts over a single number array.
 * Merges "sorted" markers for a suffix ([sortedFrom, length)) and/or a
 * prefix ([0, sortedTo)) without overwriting explicit per-index states.
 */
export function arrayFrame(
  values: number[],
  states: Record<number, CellState> = {},
  opts?: {
    sortedFrom?: number;
    sortedTo?: number;
    note?: string;
    pointers?: ArrayFrame["pointers"];
    aux?: ArrayFrame["aux"];
  },
): ArrayFrame {
  const merged: Record<number, CellState> = { ...states };
  if (opts?.sortedFrom !== undefined)
    for (let i = opts.sortedFrom; i < values.length; i++) merged[i] ??= "sorted";
  if (opts?.sortedTo !== undefined)
    for (let i = 0; i < Math.min(opts.sortedTo, values.length); i++) merged[i] ??= "sorted";
  return {
    values: [...values],
    states: merged,
    note: opts?.note,
    pointers: opts?.pointers,
    aux: opts?.aux,
  };
}
```

Run: `npx vitest run tests/algorithms/step-helpers.test.ts`
Expected: 4 tests PASS.

```bash
git add src/lib/algorithms/step-helpers.ts tests/algorithms/step-helpers.test.ts
git commit -m "feat: add shared arrayFrame step helper"
```

- [ ] **Step 5: Refactor the six sorts one file at a time**

For each of the six files, in this order (bubble first — its shape is known):

1. Read the file's local `frame()` helper and note its exact semantics. Bubble's (bubble-sort.ts:7-16) maps to `arrayFrame(values, states, { sortedFrom, note })` directly.
2. Replace the local helper with an import: `import { arrayFrame } from "../step-helpers";` and rewrite call sites. **Watch for**: a local helper whose `undefined` note produces a different key order or an absent property — the golden snapshot compares exact structure, so `note: undefined` vs missing key must match what the original produced. If the original omitted `note` when undefined and `arrayFrame` sets `note: undefined`, the snapshot still matches under Vitest serialization only if the serialized form is identical — if the snapshot fails on this, normalize `arrayFrame` (omit undefined props) rather than the modules.
3. Run: `npx vitest run tests/algorithms/sorting-golden.test.ts tests/algorithms/sorting.test.ts`
   Expected: PASS with **zero snapshot updates**. A snapshot mismatch means the refactor changed behavior — fix the refactor, never `-u`.
4. Commit: `git add -A && git commit -m "refactor(<slug>): use shared arrayFrame helper"`

If a file's local `frame()` turns out to have semantics `arrayFrame` cannot express without contortion (e.g. shell-sort gap highlighting), leave that file unchanged and note it in the commit message of the last refactor — forcing the abstraction is worse than the duplication.

- [ ] **Step 6: Full-suite verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: everything green.

---

### Task 9: `check` script + final gate

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check` — the single command Plans 2–4 run after every task.

- [ ] **Step 1: Add the check script**

In `package.json` `"scripts"`, add:

```json
"check": "npm run typecheck && npm run lint && npm run test"
```

- [ ] **Step 2: Run the full gate**

Run: `npm run check && npm run build`
Expected: typecheck, lint, all test suites, and the production build (112 static routes) all pass.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add combined check script (typecheck + lint + test)"
```

---

## Roadmap (successor plans — NOT part of this plan)

- **Plan 1b (optional follow-on):** deep semantic suites for the remaining 11 categories (trees: BST/AVL/RB invariants after each op; graphs: distances vs. reference Dijkstra/Bellman-Ford, MST weight equality; DP: closed-form answers; backtracking: solution completeness/uniqueness; strings: match positions vs. `indexOf`; mathematics: known values). The universal invariants from Task 4 already cover all 87 structurally.
- **Plan 2 — Arabic i18n + RTL:** translate remaining components (all `src/components/nn/*`, catalog card/list/header, code-viewer, chip-list-input, input-dialog, stats-panel, command-palette, not-found, category page titles); fix the empty `ar.json` `docs.sectionPlaygroundBodyPrefix`; full physical→logical Tailwind sweep (only 3 files were converted); Arabic CS terminology review.
- **Plan 3 — Educational content + UX + accessibility:** step-explanation "why" pass, statistics review, comparison content, keyboard/screen-reader/reduced-motion audit, playback UX polish.
- **Plan 4 — Documentation + release:** README, contribution guide, architecture overview, algorithm authoring guide (extend `docs/AUTHORING.md`), v1.0 checklist.
