# Multi-Algorithm Comparison Mode — Design Document

**Date:** 2026-07-05
**Status:** Approved by user. Pending implementation.
**Depends on:** `2026-07-05-interactive-builder-design.md` (must land first —
this spec reuses its `LiveSession`/adapter API for synchronized dual
interaction; do not start implementation until the builder's core API
exists).

---

## 1. Purpose

Let the user compare two (or more) algorithms of the **same structural
family** (tree vs. tree, graph vs. graph, sort vs. sort, etc.) side by side —
same input, live actions applied to both at once, full visualization and
stats for each, not just one summary metric.

## 2. Approach

Two (or more) `VisualizerShell` instances rendered side by side, each bound to
its own algorithm selection (same category, user picks which two/more
algorithms from that category's registry), sharing a `useCompareSession` hook
built on top of the builder spec's `LiveSession`:

- **Synced mode (default):** one shared live input state; every insert/
  delete/edit/search action is applied to both sides' `LiveSession`
  simultaneously via their respective category adapters, so e.g. "insert 5"
  animates on the AVL tree and the Red-Black tree at the same time, same
  starting data.
- **Independent mode (toggle):** each side has its own `LiveSession` and its
  own full-input/autoplay controls, for comparing behavior on deliberately
  different inputs.

Reuses the builder spec's per-category adapters as-is — comparison mode adds
no new insert/delete/edit/search semantics, only a wrapper that fans a single
user action out to N sessions.

## 3. Scope

- Same-category only (tree-with-tree, graph-with-graph, sort-with-sort,
  etc.) — cross-category comparison (e.g. tree vs. graph) is not meaningful
  and is out of scope.
- Start at 2-up; support N-up (3+) via the same fan-out mechanism, laid out
  in a responsive grid rather than hard-coding a 2-column layout.
- Each panel keeps its own stats panel (operation counts, complexity,
  step counter) — comparison is "everything side by side," not a single
  merged metric.

## 4. Architecture

```
src/components/visualizer/
  compare-shell.tsx        # top-level page: algorithm pickers (N of them,
                            # filtered to current category) + layout grid
  compare-session.ts       # useCompareSession(): synced/independent toggle,
                            # fans LiveSession actions out to N shells
src/app/compare/[category]/page.tsx   # new route, category-scoped picker
```

**Data flow:** user lands on `/compare/trees` (or a category picker if no
category yet) → selects N algorithms from that category → picks synced or
independent mode → in synced mode, one `LiveBuilderPanel` (from the builder
spec) drives all N `LiveSession`s at once; in independent mode, each
`VisualizerShell` shows its own full builder panel.

## 5. UI

Grid of `VisualizerShell` instances (2-up side by side by default, wraps to
multi-row for 3+), one shared control bar at the top for synced mode showing
the single set of Insert/Delete/Edit/Search buttons, or per-panel control
bars when in independent mode.

## 6. Testing & verification

- Manual spot-check: pick two tree algorithms (e.g. AVL vs. Red-Black),
  synced mode, insert/delete a sequence of values, confirm both panels
  animate correctly and stay independently correct per their own
  `generate()` output.
- Confirm switching between synced/independent mode mid-session doesn't
  corrupt either side's live input state.
- `npx tsc --noEmit` + `npm run build`.
