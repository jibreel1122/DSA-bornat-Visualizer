# Bornat Data Structure Visualizer

Learn, visualize, experiment with, and master data structures & algorithms through
interactive, step-by-step animations — with full English and Arabic (RTL) support.

Built by **Jibreel Bornat** — Computer Engineering, Birzeit University.

## What's inside

- **87 algorithm visualizers** across 13 categories:

  | Category | Count | Category | Count |
  |---|---|---|---|
  | Sorting | 14 | Trees & Heaps | 10 |
  | Graphs | 13 | Backtracking | 6 |
  | Searching | 6 | Stacks & Queues | 5 |
  | Dynamic Programming | 7 | Strings | 5 |
  | Greedy | 4 | Mathematics | 5 |
  | Hashing | 4 | Recursion | 4 |
  | Linked Lists | 4 | | |

- **A neural-network visualizer** (`/neural-network`): a mathematically correct
  multilayer perceptron with live training, editable architecture, decision-boundary
  heatmap, loss curve, and a per-neuron calculation inspector.
- **Interactive builder**: insert/delete/edit/search live on the current dataset,
  click-to-edit grid cells (Sudoku, mazes, pathfinding), custom inputs with validation,
  undo/redo history, save/load/export/import, PNG/SVG export.
- **Comparison mode** (`/compare`, `/compare/<category>`): N same-family algorithms
  side by side (2–4 panels), either synced (one shared control bar drives every panel
  from identical data) or independent (each panel has its own full toolbar). Only
  same-category comparisons are offered (tree-vs-tree, sort-vs-sort, etc.).
- **Playground** (`/playground`): draw your own graph or array, then run any
  compatible algorithm on it via shareable deep links.
- **Practice mode** (`/practice`): quiz sprints and predict-the-next-step challenges
  with per-category mastery tracking.
- **Full learning content per algorithm**: overview, how-it-works steps, complexity
  (best/average/worst time + space, with notes), real-world applications, advantages,
  disadvantages, common mistakes, interview questions, and a scored quiz — plus
  reference implementations in 12 languages (pseudocode, C, C++, Java, Python,
  JavaScript, TypeScript, C#, Go, Rust, Kotlin, Swift).
- **Arabic localization**: complete UI translation with RTL layout (buttons, nav,
  toasts, forms, everything). Per-algorithm **content** translation (title, tags,
  summary, full theory/quiz, step-by-step narration) is rolling out category by
  category — see [Translation status](#arabic-content-translation-status) below.
  Code samples and pseudocode intentionally stay English/Latin notation in every
  language, by design (`translation-brief.md`).
- Favorites, view history, notes per algorithm, command palette (⌘K), light/dark
  theme, all persisted to `localStorage` — **no backend, fully static-exportable.**

## Architecture in one paragraph

Every algorithm is a single self-contained module
(`src/lib/algorithms/<category>/<slug>.ts`) exporting metadata, educational content,
and a pure `generate(input) => Step<Frame>[]` function that emits immutable snapshot
frames. One shared `VisualizerShell` plus nine renderers (array, list, tree, graph,
grid, table, callstack, string, hash) replay those steps — so play/pause/scrub/undo/
export are correct by construction, and adding an algorithm never touches the engine.
**Read [docs/AUTHORING.md](docs/AUTHORING.md) before touching any algorithm module —
it is the exact contract every module must satisfy**, enforced by the universal
invariants test suite.

## Directory map

```
src/
  app/                        Next.js App Router pages (see Routes below)
  components/
    visualizer/                VisualizerShell, CompareShell, 9 renderers, toolbars
    visualizer/renderers/      array/list/tree/graph/grid/table/callstack/string/hash views
    catalog/                   algorithm cards, lists, category chrome, compare CTA
    layout/                    navbar, footer, command palette
    home/, practice/, playground/, nn/   page-specific components
    providers/                 theme + settings context
    ui/                        shadcn/ui primitives (button, dialog, select, ...)
  lib/
    algorithms/<category>/     THE algorithm modules — one file per algorithm
    algorithms/index.ts        central registry: ALGORITHMS, loadAlgorithm(), byCategory()
    engine/types.ts            Step, AlgorithmModule, AlgorithmMeta, Frame types, LEVELS
    engine/player.ts           useVisualizerPlayer (play/pause/scrub/speed)
    engine/random.ts           seeded RNG (createRNG, randomSeed) for deterministic defaults
    engine/use-live-input.ts   shared insert/delete/edit/search/undo-redo hook
    i18n/                      LocaleProvider, en.json, ar.json, interpolate()
    nn/                        neural-network math (forward/backward pass, training loop)
    categories.ts              the 13 CategoryInfo entries (icon, color, title, description)
tests/
  algorithms/invariants.test.ts   the universal per-module test suite (read this first)
  helpers/validate-frame.ts       per-renderer structural frame validators
  i18n/                           dictionary parity/interpolation tests
docs/
  AUTHORING.md                 the algorithm-module contract — read before editing algorithms
  superpowers/specs/           original feature design docs (builder, i18n, comparison mode)
.superpowers/sdd/
  translation-brief.md         the exact spec for Arabic content translation (read before translating)
  progress.md                  running ledger of every plan/task/commit across all sessions
  translate-<category>-report.md   per-category translation agent reports
```

## Routes (114 static)

| Route | Purpose |
|---|---|
| `/` | Home |
| `/algorithms`, `/data-structures` | Full catalog, filterable |
| `/[category]` (×13) | One category's algorithms |
| `/visualizer/[slug]` (×87) | One algorithm's visualizer page |
| `/compare` | Comparison-mode category picker |
| `/compare/[category]` (×13, only categories with 2+ algorithms) | Side-by-side comparison |
| `/neural-network` | Neural-network visualizer |
| `/playground` | Custom graph/array sandbox |
| `/practice` | Quiz & prediction challenges |
| `/about`, `/docs`, `/settings` | Static/informational pages |

## Getting started

```bash
npm install
npm run dev        # local development
npm run build      # production build (114 static routes)
npm run check      # typecheck + lint (zero warnings) + all tests
```

> **Note:** on some Windows/OneDrive setups `next dev` fails to serve CSS
> correctly (a known Next.js + OneDrive file-watcher quirk). If styling looks
> broken under `npm run dev`, use `npm run build && npm run start` instead.

All state (favorites, notes, saved runs, quiz progress, language) lives in
`localStorage` — no backend, fully static-exportable.

## Testing

`npm test` runs 3,000+ Vitest tests:

- **Universal invariants** (`tests/algorithms/invariants.test.ts`) over every
  algorithm module: metadata completeness, input round-trips, structural frame
  validity per renderer, determinism, counter semantics (cumulative unless
  explicitly allow-listed as a live gauge) — at three difficulty levels × two RNG
  seeds, for all 87 modules.
- **Bilingual content invariants**: for any module with `contentAr`, its Arabic
  theory/quiz must be complete and match the English quiz's option counts and
  answer indices exactly; every step's `descriptionAr` must be present and must
  embed every number that appears in the English narration (regex-checked).
- **Deep correctness suites** for sorting (final order vs. `Array.sort`, counter
  theorems like bubble-sort swaps = inversion count) and searching (found-marker
  semantics across hit/miss/duplicate cases).
- **Golden snapshots** guarding refactors of shared step-builder helpers.
- **i18n dictionary tests**: en/ar key parity, no empty values, matching
  interpolation placeholders.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4
(logical properties for RTL) · Framer Motion · Radix UI · Vitest · ESLint 9 (flat
config) · `@xyflow/react` (graph rendering) · `d3-hierarchy` (tree layout) ·
`html-to-image` (PNG/SVG export) · `cmdk` (command palette) · `sonner` (toasts).

## Arabic content translation status

Per-algorithm content (title, tags, summary, full theory, quiz, step narration) is
being translated category by category, verified by the bilingual invariants suite
before each category is committed. Check live status any time:

```bash
for d in src/lib/algorithms/*/index.ts; do
  cat=$(basename $(dirname "$d")); n=$(grep -c '^\s*slug:' "$d")
  tr=$(grep -l "contentAr" "$(dirname $d)"/*.ts 2>/dev/null | grep -v index.ts | wc -l)
  echo "$cat: $tr/$n"
done
```

As of this writing: **backtracking, dynamic-programming, greedy, hashing,
linked-lists, mathematics, recursion, searching, stacks-queues, strings, trees are
done (11/13 categories, 60/87 modules)**; `sorting` and `graphs` are the two
remaining categories. See [CODEX_HANDOFF.md](CODEX_HANDOFF.md) if you're
continuing this specific task. Untranslated modules render correctly in English —
this is a content gap, not a bug.

## Session history (high level)

1. **Foundation** — 79→87 algorithm modules, shared engine, 9 renderers, catalog/nav.
2. **Validation infrastructure** — Vitest, ESLint 9, per-renderer frame validators,
   universal invariants suite, 21 bugs found and fixed across 34 modules.
3. **Interactive builder** — live Insert/Delete/Edit/Search, undo/redo, grid
   click-to-edit, save/load/export/import.
4. **Arabic i18n + RTL** — full UI translation (~420 keys), logical-properties RTL
   sweep, language switcher.
5. **Comparison mode** — `/compare` routes, synced/independent side-by-side panels.
6. **Arabic content translation** — per-algorithm bilingual content, in progress
   (see above).

Full plan-by-plan detail with commit hashes: `.superpowers/sdd/progress.md`.
