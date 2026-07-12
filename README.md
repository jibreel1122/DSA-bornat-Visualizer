# Bornat Data Structure Visualizer

Learn, visualize, experiment with, and master data structures & algorithms through
interactive, step-by-step animations — with full English and Arabic (RTL) support.

Built by **Jibreel Bornat** — Computer Engineering, Birzeit University.

## What's inside

- **87 algorithm visualizers** across 13 categories: sorting, searching, trees,
  graphs, dynamic programming, backtracking, greedy, hashing, linked lists,
  stacks & queues, strings, mathematics, and recursion.
- **A neural-network visualizer** (`/neural-network`): a mathematically correct
  multilayer perceptron with live training, editable architecture, decision-boundary
  heatmap, loss curve, and a per-neuron calculation inspector.
- **Interactive builder**: insert/delete/edit/search live on the current dataset,
  click-to-edit grid cells (Sudoku, mazes, pathfinding), custom inputs with validation.
- **Comparison mode** (`/compare/<category>`): N same-family algorithms side by side
  (2–4 panels), either synced (one shared control bar drives every panel from
  identical data) or independent (each panel has its own full toolbar).
- **Playground**: draw your own graph or array, then run any compatible algorithm on it
  via shareable deep links.
- **Practice mode**: quiz sprints and predict-the-next-step challenges with
  per-category mastery tracking.
- **Full learning content per algorithm**: theory, complexity, applications,
  interview questions, quizzes, and reference implementations in 12 languages.
- **Arabic localization**: complete UI translation with RTL layout, plus
  per-algorithm content translation in progress — title, tags, summary, theory,
  quiz, and step-by-step narration are fully bilingual for 43 of 87 modules
  (9 of 13 categories; the rest fall back to English until translated). Code
  samples and pseudocode intentionally stay English in every language.

## Architecture in one paragraph

Every algorithm is a single self-contained module
(`src/lib/algorithms/<category>/<slug>.ts`) exporting metadata, educational content,
and a pure `generate(input) => Step<Frame>[]` function that emits immutable snapshot
frames. One shared `VisualizerShell` plus nine renderers (array, list, tree, graph,
grid, table, callstack, string, hash) replay those steps — so play/pause/scrub/undo/
export are correct by construction, and adding an algorithm never touches the engine.
See [docs/AUTHORING.md](docs/AUTHORING.md) for the full contract.

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

- **Universal invariants** over every algorithm module (metadata completeness,
  input round-trips, structural frame validity per renderer, determinism,
  counter semantics) at three difficulty levels × two RNG seeds.
- **Bilingual content invariants**: for any module with `contentAr`, its
  Arabic theory/quiz must be complete and match the English quiz's option
  counts and answer indices; every step's `descriptionAr` must be present and
  must embed every number that appears in the English narration.
- **Deep correctness suites** for sorting (final order vs. `Array.sort`, counter
  theorems like bubble-sort swaps = inversion count) and searching (found-marker
  semantics across hit/miss/duplicate cases).
- **Golden snapshots** guarding refactors of shared step-builder helpers.
- **i18n dictionary tests**: en/ar key parity, no empty values, matching
  interpolation placeholders.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4
(logical properties for RTL) · Framer Motion · Radix UI · Vitest · ESLint 9.
