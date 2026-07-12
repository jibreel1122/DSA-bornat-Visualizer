# Handoff prompt — read this first

You are picking up a project you have never seen before. Another AI (Claude)
did all prior work across several sessions. Your job in this handoff is
**narrow and mechanical**: finish one remaining checklist item, verify it,
and stop. Do not redesign, refactor, "improve," or touch anything outside
the scope below — the codebase has strict conventions and a large green
test suite that took a long time to build; an unrequested change is more
likely to break something than help.

## What this project is

**Bornat DSA Visualizer** — a Next.js 15 / React 19 / TypeScript app that
animates 87 algorithms across 13 categories step by step, with full English
+ Arabic (RTL) UI, a neural-network visualizer, an interactive dataset
builder, a side-by-side comparison mode, and per-algorithm learning content
(theory, complexity, quiz) in 12 code languages.

Read `README.md` in this repo first — it is accurate and describes the full
architecture. Read `docs/AUTHORING.md` for the exact contract every
algorithm module must satisfy before you touch any algorithm file.

## Your one task: finish the Arabic content translation

Every algorithm module optionally carries Arabic-translated content
alongside its English content — title, tags, summary, full theory/quiz, and
per-step narration. This is being rolled out category by category. Check
current status with:

```bash
for d in src/lib/algorithms/*/index.ts; do
  cat=$(basename $(dirname "$d"))
  n=$(grep -c '^\s*slug:' "$d")
  tr=$(grep -l "contentAr" "$(dirname $d)"/*.ts 2>/dev/null | grep -v index.ts | wc -l)
  echo "$cat: $tr/$n"
done
```

As of this handoff, **11 of 13 categories are done and committed**
(backtracking, dynamic-programming, greedy, hashing, linked-lists,
mathematics, recursion, searching, stacks-queues, strings, trees — 60/87
modules). **Two categories were dispatched to background agents right
before this handoff and may or may not have landed**: `sorting` (14
modules) and `graphs` (13 modules). Check `git log --oneline -15` and
`git status` first to see what's actually committed vs. still pending —
don't assume anything from this document about their state; verify live.

### If sorting and/or graphs are not yet translated

1. Read `.superpowers/sdd/translation-brief.md` — the exact spec for what
   to add to each module (titleAr/tagsAr/summaryAr on the module and its
   category `index.ts` meta, full `contentAr`, and `descriptionAr` on every
   step). It also has the Arabic terminology glossary — use it consistently.
2. Use `src/lib/algorithms/searching/binary-search.ts` and
   `src/lib/algorithms/searching/index.ts` as your reference for the exact
   finished pattern (already committed, passing all tests).
3. Translate one category's modules completely, one at a time. **Do not**
   touch English `description` strings, step order, frames, counters,
   `codeLine`, `pseudocode`, `code` (any of the 12 languages), `inputFields`,
   `defaultInput`, `parseInput`, or `serializeInput` — your diff must be
   purely additive.
4. After each category, verify:
   ```bash
   npx vitest run tests/algorithms/invariants.test.ts   # must stay fully green
   npx tsc --noEmit
   npx eslint src/lib/algorithms --max-warnings 0
   ```
5. Commit each category separately with a message like:
   `feat(i18n): Arabic content for <category> category (N modules)`

### If any partial/broken translation state exists (git status shows modified files that don't pass tests/tsc/lint)

That means a prior agent died mid-edit. Do not try to guess what was
finished — either complete that specific module fully to match the pattern
above, or `git checkout -- <file>` to revert it back to a clean English-only
state and start that module over. Never leave a module half-translated
(e.g. `descriptionAr` on steps but no `contentAr`, or vice versa) — the
test suite treats `contentAr` presence as "this module claims to be fully
translated," so a half-done module will pass mechanically but ship broken
UI text.

## After both remaining categories are done (87/87)

1. Run the full gate: `npm run check && npm run build`.
2. Update the "43 of 87 modules" (or whatever the current number says)
   bilingual-coverage line in `README.md` to `87/87` / "complete".
3. Do **not** do anything else. Do not add new features, refactor existing
   code, change the design, upgrade dependencies, or "clean up" anything you
   notice along the way. If you notice something that looks wrong outside
   the scope of this task, leave a one-line note in your final summary
   instead of touching it.

## Hard rules

- Never run destructive git commands (`reset --hard`, `push --force`,
  `checkout --` on files you didn't just finish translating, `clean -f`).
- Never modify `pseudocode`, `code`, `inputFields`, `defaultInput`,
  `parseInput`, `serializeInput`, or any English `description` string.
- Never touch files outside `src/lib/algorithms/<category>/` for this task.
- Commit only complete, test-passing categories — never a partial category.
- If you are unsure whether something is in scope, it is not in scope.
  Stop and ask rather than guessing.
