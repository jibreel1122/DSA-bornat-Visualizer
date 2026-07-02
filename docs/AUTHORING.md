# Algorithm Module Authoring Guide

Every algorithm in this app is ONE self-contained TypeScript file:
`src/lib/algorithms/<category>/<slug>.ts`, default-exporting an
`AlgorithmModule<Frame, Input>`.

**Read these files before writing anything:**
1. `src/lib/engine/types.ts` — the full contract + all frame types (documented)
2. `src/lib/algorithms/sorting/bubble-sort.ts` — gold-standard exemplar (array renderer)
3. `src/lib/algorithms/graphs/bfs.ts` — gold-standard exemplar (graph renderer + edge-list parsing)
4. The renderer component for your frame family in `src/components/visualizer/renderers/`
   (so you know exactly how each frame field is drawn)
5. `src/lib/engine/random.ts` — seeded RNG helpers + level size presets

## Hard rules

- **No React, no JSX, no imports** other than `@/lib/engine/types`,
  `@/lib/engine/random`, `@/lib/utils` (parseNumberList), and — for graph
  modules — `parseEdgeList` re-exported from `@/lib/algorithms/graphs/bfs`.
- **Frames are immutable snapshots.** Never push a reference you later mutate.
  Spread/copy arrays and records on every step (see exemplars).
- **Counters are CUMULATIVE** per step (`{ comparisons: 5, swaps: 2 }`), not deltas.
  Use 2–3 counters that make sense for your algorithm (comparisons, swaps,
  visits, probes, recursiveCalls, cellsFilled, shifts…).
- **`description`** is one clear narration sentence per step, mentioning concrete
  values ("Compare a[2] = 34 with a[3] = 7."). Vary the phrasing; final step
  summarizes the result.
- **`codeLine`** is a 0-based index into `pseudocode` and should track execution.
- **Step budget:** import `MAX_STEPS`; design `defaultInput` sizes so Level 5
  stays under ~1500 steps (use `LEVEL_SIZES`, cap sizes for expensive algorithms —
  e.g. bogo sort must cap at ~5 elements and bail after a bounded number of shuffles).
- **`parseInput`** must throw `new Error("friendly message")` on bad input and
  enforce sane caps (array ≤ 40, nodes ≤ 26, string ≤ 60, n ≤ reasonable bound).
- **`defaultInput(level, rng)`** must ONLY use the passed rng (determinism) and
  scale meaningfully across all 5 levels.
- **`code`**: ALL 12 languages (c, cpp, java, python, javascript, typescript,
  csharp, go, rust, kotlin, swift, pseudocode). Idiomatic, compilable,
  self-contained functions with the same algorithm as the visualization.
- **`content`**: overview (2–3 paragraphs, plain text, blank-line separated),
  howItWorks (4–6 steps), complexity (with honest best/avg/worst + notes),
  applications (≥4), advantages (≥3), disadvantages (≥3), commonMistakes (≥3),
  interviewQuestions (≥4), summary (2–3 sentences), quiz (exactly 5 questions,
  4 options each, correct `answer` index, explanation). Write like a great
  university TA: precise, concrete, no filler.
- Meta `difficulty` is the LEARNING difficulty: Beginner / Intermediate / Advanced.
- `tags`: 3–5 short lowercase tags. `summary`: one line ≤ 120 chars.

## Frame family notes

- **array** (`ArrayFrame`): `values` are bar heights (keep 5..99 positive for
  random data; manual input may be any numbers). `states` maps index → CellState.
  Use `pointers` for i/j/low/high labels, `range` for active windows (search),
  `aux` rows for merge buffers / count arrays / output. States: `compare` (amber),
  `swap` (red), `sorted` (green), `pivot` (violet), `found`, `active`, `discarded`.
- **graph** (`GraphFrame`): node coords normalized [0,1] — use `circularLayout`
  (from random.ts) computed ONCE per generate() so nodes don't jump. Edge state
  key is `` `${from}->${to}` `` (undirected lookups also check the reverse).
  `nodeAnnotations` shows small text under nodes (distances). `aux` for queue/
  stack/PQ/MST-weight. For weighted graphs set `weighted: true`; directed set
  `directed: true`.
- **tree** (`TreeFrame`): `nodes` is a Record id→node with `left`/`right`
  (binary) or `children` (n-ary). Generate unique string ids (e.g. `n7`, counter-based);
  NEVER reuse an id for two simultaneously-live nodes. `color` renders red/black.
  `extra` shows a small annotation (height/balance factor). Rebuild the nodes
  record fresh on each snapshot.
- **grid** (`GridFrame`): `cells[row][col]` = `{ value?, state? }`. Good for
  boards, mazes, sieves.
- **table** (`TableFrame`): DP tables; `rowLabels`/`colLabels` short strings;
  `cells[r][c].value` = `null` renders as "·" (unfilled).
- **list** (`ListFrame`): nodes in visual order with ids; `links` {from,to,kind}
  where kind "prev" draws the second lane, "loop"/circular draws the arc below;
  `pointers` label nodes (head/tail/slow/fast); nodeId null = pointer to null.
- **callstack** (`CallStackFrame`): stack bottom-first; each item has unique
  stable `id` (e.g. `hanoi(3)-1`), `label` like `fib(4)`, optional `detail`,
  `output` array below.
- **string** (`StringFrame`): text/pattern arrays of `{ch, state}`, `shift` =
  pattern offset; `aux` for LPS/Z arrays with `states` to highlight the cell
  being computed.
- **hash** (`HashFrame`): `chained: true` → per-bucket chains; false → flat
  slot grid (open addressing). Item keys are strings.

## Verification (MANDATORY before you finish)

Write a scratch test at the REPO ROOT named `scratch-test-<category>.ts`
(NOT inside src/), run it, then DELETE it:

```ts
import mod from "@/lib/algorithms/<category>/<slug>";
import { createRNG } from "@/lib/engine/random";
for (const level of [1, 2, 3, 4, 5] as const) {
  const input = mod.defaultInput(level, createRNG(level * 101));
  const steps = mod.generate(input);
  if (steps.length < 3) throw new Error(`${mod.slug} L${level}: too few steps`);
  // + algorithm-specific correctness assertion on the FINAL frame
  // (sorted order, correct distances, correct table value, found index…)
}
console.log("<slug> OK");
```

Run: `npx tsx scratch-test-<category>.ts` (tsconfig paths are supported).
Every module must pass at all 5 levels, and `npx tsc --noEmit` must be clean
for your files. Fix, don't skip. Then delete the scratch file.

## What you do NOT do

- Do NOT edit `src/lib/algorithms/<category>/index.ts` (the orchestrator
  assembles registries afterward — you just report your metas).
- Do NOT edit any file outside your category folder.
- Do NOT add npm dependencies.
