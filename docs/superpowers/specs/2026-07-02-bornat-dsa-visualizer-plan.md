# Implementation Plan — Bornat Data Structure Visualizer

Companion to `2026-07-02-bornat-dsa-visualizer-design.md`.

## Phases

1. **Scaffold** — Next.js 15 + TS + Tailwind v4 at repo root, git init,
   deps installed (framer-motion, radix, lucide, next-themes, d3-hierarchy,
   @xyflow/react, cmdk, sonner, react-syntax-highlighter, html-to-image).
2. **Design system & primitives** — tokens in `globals.css`, ui/ primitives
   (Button, Card, Badge, Tabs, Slider, Select, Dialog, Tooltip, Switch),
   Navbar with category nav + command palette, Footer (spec-mandated
   credits), ThemeProvider + Settings context.
3. **Engine** — `lib/engine/` types, seeded RNG + difficulty dataset
   generators, `useVisualizer` player hook.
4. **Visualizer shell & renderers** — VisualizerShell (playback, speed,
   scrubber, zoom/pan, fullscreen, stats, export/import, manual input,
   difficulty, keyboard shortcuts, pseudocode panel, code viewer, quiz,
   notes, favorites) + renderers: ArrayView, ListView, TreeView, GraphView,
   GridView, TableView, CallStackView, StringView, HashView, BitsetView.
5. **Exemplar modules** (hand-written gold standards): bubble-sort (array),
   binary-search (array+target), bst (tree ops), bfs (graph), fibonacci-dp
   (table+recursion), n-queens (grid). These define the authoring template.
6. **Fan-out authoring (Workflow)** — one agent per category writes the
   remaining ~70 algorithm modules as self-contained files matching the
   exemplar contract; disjoint file ownership; each agent also emits
   registry metadata entries.
7. **Pages** — home, category indexes, universal visualizer page, practice,
   playground, docs, about, settings.
8. **Integration & build gate** — registry assembly, `next build`
   + `tsc --noEmit` fix loop until green.
9. **Review (Workflow)** — adversarial verification of step-generator
   correctness (final frames vs reference results) + UI/content consistency;
   fix confirmed findings; drop any module that fails review rather than
   ship a broken visualizer.
10. **Verify & ship** — dev-server smoke test of representative pages,
    screenshots, final commit, report.

## Module authoring contract (given to every agent)

One file `src/lib/algorithms/<category>/<slug>.ts`, default-exporting an
`AlgorithmModule` (see `lib/engine/types.ts`): meta, `defaultInput(level,
rng)`, `parseInput/fields`, `generate(input) => Step<Frame>[]` (immutable
frames, cumulative counters, narration, pseudocode line refs), full
educational content, quiz (≥4 questions), pseudocode lines, and code
snippets for all 12 languages. Cap steps at 5,000. No React, no imports
beyond engine types + frame types.
