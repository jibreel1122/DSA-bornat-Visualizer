# Handoff prompt — read this first

You are picking up a project you have never seen before. Another AI (Claude)
did all prior work across several sessions. **The task this file originally
described — translating all algorithm content to Arabic — is now complete.**
This file is kept as a template for the *next* narrowly-scoped handoff, and
as a record of how prior handoffs were run. Do not assume there is
outstanding translation work; verify current state yourself (see below)
before doing anything.

## What this project is

**Bornat DSA Visualizer** — a Next.js 15 / React 19 / TypeScript app that
animates 87 algorithms across 13 categories step by step, with full English
+ Arabic (RTL) UI and content, a neural-network visualizer, an interactive
dataset builder, a side-by-side comparison mode, and per-algorithm learning
content (theory, complexity, quiz) in 12 code languages.

Read `README.md` first — it is accurate and describes the full architecture,
directory map, routes, and tech stack. Read `docs/AUTHORING.md` before
touching any file under `src/lib/algorithms/` — it is the exact contract
every algorithm module must satisfy, enforced by the universal invariants
test suite (`tests/algorithms/invariants.test.ts`).

## Verify current state before doing anything

```bash
git log --oneline -20          # what actually landed
git status                     # anything uncommitted / mid-edit
npm run check                  # typecheck + lint (0 warnings) + all tests — must be green
```

If `git status` shows modified files under `src/lib/algorithms/` that don't
pass `npm run check`, a prior agent died mid-edit. Either finish that file
to match the pattern of an already-committed sibling module in the same
category, or `git checkout -- <file>` to revert it and start over — never
leave a module half-translated (e.g. Arabic step narration but no Arabic
theory content, or vice versa).

## Working rules for ANY task you're given here

- **Scope discipline is the most important rule on this project.** Do
  exactly what you were asked, verify it, and stop. Do not refactor,
  "improve," upgrade dependencies, or touch files outside the stated scope
  — even if you notice something that looks wrong. Leave a one-line note
  about it in your final summary instead.
- If your task touches `src/lib/algorithms/<category>/`: never modify
  `pseudocode`, `code` (any of the 12 languages), `inputFields`,
  `defaultInput`, `parseInput`, `serializeInput`, English `description`
  strings, step order, frames, counters, or `codeLine`. Additions
  (`titleAr`, `tagsAr`, `summaryAr`, `contentAr`, `descriptionAr`, or a
  wholly new algorithm module following the `AUTHORING.md` contract) are
  fine; changes to existing English content or behavior are not, unless
  explicitly requested.
- After any change to `src/lib/algorithms/`, run:
  ```bash
  npx vitest run tests/algorithms/invariants.test.ts   # must stay fully green
  npx tsc --noEmit
  npx eslint src/lib/algorithms --max-warnings 0
  ```
- Commit only complete, test-passing units of work — never something
  half-done. Use the existing commit style (see `git log`): short, scoped,
  imperative, with a body explaining what and why when non-obvious.
- Never run destructive git commands (`reset --hard`, `push --force`,
  `checkout --` on files you didn't just finish yourself, `clean -f`).
- If you are unsure whether something is in scope, it is not in scope —
  stop and ask rather than guessing.

## Where to look for what's already been decided

- `.superpowers/sdd/progress.md` — running ledger of every plan/task/commit
  across all sessions, with commit hashes.
- `.superpowers/sdd/translation-brief.md` — the exact spec + Arabic
  terminology glossary used for all algorithm-content translation, useful
  if new algorithm modules are ever added and need Arabic content.
- `docs/superpowers/specs/` — original design docs for major features
  (interactive builder, i18n, comparison mode).
