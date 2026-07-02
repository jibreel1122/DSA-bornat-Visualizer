# Bornat Data Structure Visualizer — Design Document

**Date:** 2026-07-02
**Status:** Implemented in initial build session (autonomous). Pending user review.
**Source spec:** `C:\Users\ASUS\Downloads\Bornat_Data_Structure_Visualizer_Prompt.md`

---

## 1. Purpose

A modern, production-quality educational web app for learning, visualizing, and
experimenting with data structures and algorithms. Target audience: university
students, instructors, and professional engineers. Quality bar: modern SaaS
design language (Linear / Vercel / Stripe class), consistent across every page.

## 2. Scope decisions (autonomous session)

The source spec enumerates 150+ algorithms across 12 categories plus practice,
playground, docs, quizzes, and 12-language code viewers. That is a multi-month
product surface. This build decomposes it:

**Delivered in this session (Phase 1):**
- Complete app shell: home, category pages, algorithm pages, practice,
  playground, documentation, about, settings — all sharing one design system.
- A reusable, step-based **visualization engine** and **universal visualizer
  shell** implementing the full control surface required by the spec
  (play/pause/resume, step forward/back, reset, speed, zoom, pan, fullscreen,
  random + manual input, 5 difficulty levels, export/import JSON, operation
  counters, statistics panel, memory estimate, current-step indicator,
  keyboard shortcuts).
- **50+ fully implemented algorithm visualizers** covering every category in
  the spec: Sorting, Searching, Linked Lists, Stacks & Queues, Hashing, Trees,
  Graphs, Dynamic Programming, Greedy, Backtracking, Recursion, Strings,
  Mathematics.
- Full educational content per algorithm: theory, time/space complexity,
  applications, advantages/disadvantages, common mistakes, interview
  questions, quiz, and code in 12 languages (C, C++, Java, Python, JS, TS,
  C#, Go, Rust, Kotlin, Swift, pseudocode) with syntax highlighting,
  copy, and download.
- Practice mode (quiz engine with scoring/progress in localStorage),
  Playground (custom graph/array builder that runs compatible algorithms),
  global search, favorites, theme system, accessibility settings
  (reduced motion, high contrast, large text).

**Deferred (Phase 2+, architecture already supports):** the long tail of
exotic variants (e.g. Fibonacci/Binomial heaps, suffix trees, cuckoo
filters, max-flow family, XOR lists). Each is one new self-contained module
file + one registry entry; no framework changes needed.

## 3. Approaches considered

1. **Canvas/PixiJS rendering engine** — best raw FPS for huge datasets, but
   poor accessibility, high complexity, hard to keep design-consistent.
2. **Per-algorithm bespoke React components** — fastest first demo, but
   duplicates controls/state logic 50×, guarantees inconsistency. This is the
   failure mode of the reference site.
3. **✅ Chosen: pure-TS step generators + shared SVG/DOM renderers + one
   universal shell.** Each algorithm is *data*: a function
   `(input) => Step[]` plus content metadata. A single player hook and shell
   component provide every control. Renderers (array bars, tree, graph, grid,
   DP table, linked list, call stack, string band) are shared per structural
   family. Framer Motion layout animations give 60fps GPU-composited motion.
   Adding an algorithm touches zero framework code.

## 4. Architecture

```
src/
  app/                         # Next.js App Router
    layout.tsx                 # theme provider, nav, footer, command palette
    page.tsx                   # home (hero, features, stats, previews)
    [category]/page.tsx        # category index pages (from registry)
    visualizer/[slug]/page.tsx # universal algorithm page (from registry)
    practice/ playground/ docs/ about/ settings/
  lib/
    engine/types.ts            # Step, Frame, Highlight, Stats — core contracts
    engine/player.ts           # useVisualizer(): playback state machine
    engine/random.ts           # seeded RNG + 5 difficulty-level dataset gens
    algorithms/<category>/<name>.ts  # one module per algorithm:
                               #   meta, generator(input) => Step[],
                               #   content (theory/complexity/quiz/...),
                               #   code: Record<Language, string>
    registry.ts                # central catalog; drives nav/search/pages
  components/
    ui/                        # shadcn-style primitives (Radix-based)
    visualizer/                # VisualizerShell + shared renderers
    layout/                    # navbar, footer, command palette
```

**Data flow:** page loads module from registry → user picks difficulty/input →
generator produces immutable `Step[]` (each step: frame snapshot + narration +
highlights + counter deltas + optional code-line pointer) → player hook holds
cursor + timer → renderer draws the current frame with animated transitions.
Undo/redo, prev/next, and scrubbing are free because steps are immutable
snapshots. Export/import serializes `{input, seed, cursor}`.

**Error handling:** generators validate input and throw typed errors surfaced
as inline toasts; manual-input parsers are forgiving (commas/spaces); step
count is capped (~5,000) with a friendly notice to prevent runaway inputs.

**Persistence:** localStorage (settings, favorites, notes, practice progress,
saved visualizer states). No backend — fully static-exportable.

## 5. Design system

- Tailwind v4 design tokens; dark mode default, light + system via
  `next-themes`; accent: indigo→violet gradient; glassmorphism cards
  (translucent panels, backdrop blur, 1px inner borders), rounded-2xl radii.
- Framer Motion for micro-interactions and layout animation; honors
  `prefers-reduced-motion` and in-app reduced-motion setting.
- shadcn/ui-style primitives (Button, Card, Tabs, Slider, Select, Dialog,
  Tooltip, Switch, Badge) built on Radix; Lucide icons throughout.
- Typography: Geist Sans / Geist Mono.

## 6. Testing & verification

- `tsc --noEmit` + `next build` as the correctness gate for the whole app.
- Unit-style verification of step generators (deterministic seeds → final
  frame must equal reference result, e.g. sorted array, correct SP distances).
- Multi-agent adversarial review pass over generators and UI consistency
  before completion; live preview smoke test of representative pages.

## 7. Footer / branding requirements (verbatim from spec)

Made with ❤️ by **Jibreel Bornat** — Computer Engineering — Birzeit
University — Bornat Data Structure Visualizer — © All Rights Reserved.
