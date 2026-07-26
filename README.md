# Bornat Data Structure Visualizer

Learn, visualize, experiment with, and master data structures & algorithms through
interactive, step-by-step animations — with full English and Arabic (RTL) support.

Built by **Jibreel Bornat** — Computer Engineering, Birzeit University.

## What's inside

- **224 algorithm visualizers** across 13 categories:

  | Category | Count | Category | Count |
  |---|---|---|---|
  | Sorting | 32 | Trees & Heaps | 34 |
  | Graphs | 42 | Backtracking | 13 |
  | Searching | 14 | Stacks & Queues | 9 |
  | Dynamic Programming | 22 | Strings | 14 |
  | Greedy | 11 | Mathematics | 13 |
  | Hashing | 9 | Recursion | 5 |
  | Linked Lists | 6 | | |

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
  toasts, forms, everything) **and** complete per-algorithm content translation —
  every one of the 224 modules has a fully bilingual title, tags, summary, theory,
  quiz, and step-by-step narration. Code samples and pseudocode intentionally stay
  English/Latin notation in every language, by design (`translation-brief.md`).
- Favorites, view history, notes per algorithm, command palette (⌘K), and
  light/dark theme. Guest state is persisted locally; optional PostgreSQL-backed
  accounts add cross-device synchronization, password recovery, export, and deletion.

## Architecture in one paragraph

Every algorithm is a self-contained module entry exporting metadata, educational
content, and a pure `generate(input) => Step<Frame>[]` function that emits immutable snapshot
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
    algorithms/<category>/     core algorithm modules
    algorithms/expansion-*/    additional catalog modules grouped by domain
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

## Routes (272 generated pages)

| Route | Purpose |
|---|---|
| `/` | Home |
| `/algorithms`, `/data-structures` | Full catalog, filterable |
| `/[category]` (×13) | One category's algorithms |
| `/visualizer/[slug]` (×224) | One algorithm's visualizer page |
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
npm run build      # production build (272 generated pages)
npm run check      # typecheck + lint (zero warnings) + all tests
```

> **Note:** on some Windows/OneDrive setups `next dev` fails to serve CSS
> correctly (a known Next.js + OneDrive file-watcher quirk). If styling looks
> broken under `npm run dev`, use `npm run build && npm run start` instead.

Guest state (favorites, notes, saved runs, quiz progress, language) lives in
`localStorage`. Signed-in users can synchronize supported state through the
optional PostgreSQL account service.

### Optional accounts and sync

Guests can use the entire platform without registration. A PostgreSQL-backed account layer is available for cross-device synchronization, password recovery, account export, and deletion. See [the VPS deployment guide](docs/DEPLOYMENT.md) and `.env.example` to enable it.

## Testing

`npm test` runs 8,000+ Vitest tests:

- **Universal invariants** (`tests/algorithms/invariants.test.ts`) over every
  algorithm module: metadata completeness, input round-trips, structural frame
  validity per renderer, determinism, counter semantics (cumulative unless
  explicitly allow-listed as a live gauge) — at three difficulty levels × two RNG
  seeds, for all 224 modules.
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

**Complete — 224/224 modules across all 13 categories.** Every algorithm has a fully
bilingual title, tags, summary, theory/quiz content, and per-step narration,
verified by the bilingual invariants suite. Confirm any time:

```bash
for d in src/lib/algorithms/*/index.ts; do
  cat=$(basename $(dirname "$d")); n=$(grep -c '^\s*slug:' "$d")
  tr=$(grep -l "contentAr" "$(dirname $d)"/*.ts 2>/dev/null | grep -v index.ts | wc -l)
  echo "$cat: $tr/$n"
done
```

The translation spec/glossary (`.superpowers/sdd/translation-brief.md`) remains
useful reference if new algorithm modules are added later and need Arabic content.

## Session history (high level)

1. **Foundation and expansion** — 79→224 algorithm modules, shared engine, 9 renderers, catalog/nav.
2. **Validation infrastructure** — Vitest, ESLint 9, per-renderer frame validators,
   universal invariants suite, 21 bugs found and fixed across 34 modules.
3. **Interactive builder** — live Insert/Delete/Edit/Search, undo/redo, grid
   click-to-edit, save/load/export/import.
4. **Arabic i18n + RTL** — full UI translation (~420 keys), logical-properties RTL
   sweep, language switcher.
5. **Comparison mode** — `/compare` routes, synced/independent side-by-side panels.
6. **Arabic content translation** — complete per-algorithm bilingual content
   (see above).

Full plan-by-plan detail with commit hashes: `.superpowers/sdd/progress.md`.
