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
- **Playground**: draw your own graph or array, then run any compatible algorithm on it
  via shareable deep links.
- **Practice mode**: quiz sprints and predict-the-next-step challenges with
  per-category mastery tracking.
- **Full learning content per algorithm**: theory, complexity, applications,
  interview questions, quizzes, and reference implementations in 12 languages.
- **Arabic localization**: complete UI translation with RTL layout
  (algorithm content intentionally remains English).

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
npm run build      # production build (112 static routes)
npm run check      # typecheck + lint (zero warnings) + all tests
```

All state (favorites, notes, saved runs, quiz progress, language) lives in
`localStorage` — no backend, fully static-exportable.

## Testing

`npm test` runs 2,400+ Vitest tests:

- **Universal invariants** over every algorithm module (metadata completeness,
  input round-trips, structural frame validity per renderer, determinism,
  counter semantics) at three difficulty levels × two RNG seeds.
- **Deep correctness suites** for sorting (final order vs. `Array.sort`, counter
  theorems like bubble-sort swaps = inversion count) and searching (found-marker
  semantics across hit/miss/duplicate cases).
- **Golden snapshots** guarding refactors of shared step-builder helpers.
- **i18n dictionary tests**: en/ar key parity, no empty values, matching
  interpolation placeholders.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4
(logical properties for RTL) · Framer Motion · Radix UI · Vitest · ESLint 9.
