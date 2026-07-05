# Interactive Step-by-Step Builder — Design Document

**Date:** 2026-07-05
**Status:** Approved by user. Pending implementation.
**Depended on by:** `2026-07-05-comparison-mode-design.md`

---

## 1. Purpose

Today every algorithm follows a "give full input up front → watch a
pre-computed `Step[]` sequence play back" model. The user wants to instead
**build a structure from scratch, one live action at a time** — e.g. start
with an empty AVL tree, click Insert, type a value, watch it animate in
immediately, then Insert again, Delete a node, Search for a value, etc. — for
every algorithm across all 13 categories. The current small/hard-to-find
input controls must become primary, always-visible buttons. Everything that
exists today (full-input + autoplay/scrub mode) must keep working unchanged.

## 2. Approaches considered

1. **New incremental engine per algorithm** (each module gets a hand-written
   `applyOp(state, op) => Step[]` that mutates in place). Most "native" but
   means rewriting internals of ~87 modules individually — highest effort and
   highest risk of subtle bugs vs. already-verified `generate()` functions.
2. **✅ Chosen: replay-on-mutate.** Keep a live **input state** per session
   (e.g. the running list of inserted values, or adjacency list, or grid).
   Every user action (insert/delete/edit/search) mutates that stored input,
   then calls the algorithm's *existing, already-verified* `generate()` again
   on the updated input. Playback auto-scrubs to the newly-produced step
   range so the user watches just that operation animate, landing on the
   updated structure. Net-new work is a **per-category adapter** (~13 files)
   defining what each verb does to that category's input shape, not a rewrite
   of all 87 modules.
3. **Client-side incremental diffing of two full step arrays** (compute full
   old-state and new-state step arrays, diff them, animate only the delta).
   More "correct" looking transitions in theory, but full-array diffing is
   unnecessary complexity — approach 2's auto-scrub achieves the same
   perceived effect for these dataset sizes (teaching-scale, not production
   scale).

## 3. Per-category verb mapping

Locked so behavior is consistent across all 87 modules — an agent authoring
one category's adapter should not invent semantics ad hoc:

| Category | Insert | Delete | Edit | Search |
|---|---|---|---|---|
| Trees, Graphs, Linked-lists, Hashing, Heaps | add node/edge/key | remove node/edge/key | change value/weight | find/traverse to value |
| Stacks/Queues | push/enqueue | pop/dequeue | update top/front value | peek |
| Sorting | append value to array | remove value | change a value in place | highlight target's position pre-sort |
| Searching (fixed array) | add value to array | remove value | change a value | run the search for a target (existing "run" repurposed) |
| DP | append element to sequence | remove element | change element | look up a subproblem cell |
| Backtracking (grid-based) | place a value/queen/wall | clear a cell | change a cell's value | run solver from current state |
| Greedy | add item (job/coin/activity) | remove item | change item's value/weight | N/A — omit button |
| Math | add operand/term | remove term | change value | check a property (e.g. divisibility) |
| Recursion, Strings | append element/char | remove element/char | change element/char | run the algorithm on current input |

All four verbs are implemented per category per the table above; where a verb
has no clean equivalent (currently only Greedy/Search), the button is omitted
rather than forcing an artificial action.

## 4. Architecture

```
src/lib/engine/
  live-session.ts          # LiveSession<TInput>: holds live input state,
                            # exposes insert/delete/edit/search, calls
                            # module.generate() and returns the new Step[]
                            # + the index range to auto-scrub to
src/lib/algorithms/<category>/live-adapter.ts   # one per category (13 total)
                            # defines: verb -> (liveInput, args) => newInput
                            # per the mapping table above
src/components/visualizer/
  live-builder-panel.tsx   # primary-button toolbar: Insert/Delete/Edit/Search
                            # (only the verbs the category adapter supports)
  visualizer-shell.tsx     # wires LiveBuilderPanel in; existing full-input +
                            # autoplay/scrub UI unchanged, sits alongside it
```

**Data flow:** `LiveBuilderPanel` button click → prompts for value/args (reuse
existing `ValuePromptButton`/`InputDialog` patterns) → `LiveSession.apply(verb,
args)` → category adapter transforms live input → `generate(newInput)` called
→ `LiveSession` diffs old/new step-array lengths to find the new step range →
player auto-scrubs through that range → lands on final frame → live input
state persists for the next action.

**Per-category adapter contract:** each adapter exports
`{ supportedVerbs: Verb[], apply(liveInput, verb, args): NewInput }`. Delete
must be able to fail gracefully (e.g. deleting a value not present) — surfaced
as an inline toast, consistent with existing input-validation error handling.

## 5. UI placement

`LiveBuilderPanel` renders as a persistent toolbar row in `visualizer-shell.tsx`,
same visual weight (size, prominence) as the existing Play/Pause/Reset
controls — not a secondary menu, not collapsed behind an icon. Buttons are
disabled (not hidden) when the live session is empty where an action doesn't
apply yet (e.g. Delete/Search on an empty structure).

## 6. What stays unchanged

The existing "provide full input (random/manual/JSON import), then autoplay
or scrub through the whole `Step[]`" mode remains fully intact and is not
replaced. `LiveBuilderPanel` is additive — a mode toggle or simply a second
control row lets users do either.

## 7. Testing & verification

- Extend the existing `scratch-verify-<category>.ts` brute-force pattern:
  after a sequence of live insert/delete/edit ops, the resulting live input
  state must match what a single `generate()` call on the equivalent final
  input would produce (structural equivalence check).
- `npx tsc --noEmit` + `npm run build` as the correctness gate, per existing
  project convention.
- Manual spot-check in the browser preview: AVL tree (from the user's own
  example) insert/delete/search sequence, plus one non-tree category
  (sorting or backtracking) to confirm the verb-mapping table holds up.

## 8. Known risk

Per project memory, prior multi-agent fan-outs on this account have hit
session limits mid-run. A pass touching the adapter for every one of 13
categories plus the shared panel is substantial agent work; if the limit is
hit, remaining category adapters fall back to sequential hand-authoring
(established fallback pattern from the original algorithm-authoring push).
