# Arabic Localization — Design Document

**Date:** 2026-07-05
**Status:** Approved by user. Pending implementation.
**Independent of:** the other two 2026-07-05 specs (touches every UI file, but
purely additive string-wrapping — should be rebased/merged carefully if it
lands around the same time as the builder work, since both touch
`visualizer-shell.tsx` and `algorithm-page.tsx`).

---

## 1. Purpose

Add Arabic as a full second language for the entire website (nav, buttons,
labels, theory/quiz content, settings, tooltips, error messages, everything
user-facing). Algorithm names, pseudocode, and source code samples (the
12-language code viewer) stay in English always, per explicit instruction —
these are technical identifiers/reference material, not prose.

## 2. Approach

**Centralized dictionary + `t()` hook**, not ad hoc per-page conditionals.

```
src/lib/i18n/
  en.json                  # flat or nested key -> English string
  ar.json                  # same keys -> Arabic string
  index.ts                 # LocaleProvider (React context), useLocale() hook
                            # exposing { locale, setLocale, t(key, vars?) }
```

Components call `const { t } = useLocale(); <button>{t('visualizer.insert')}</button>`
instead of hardcoding text. `LocaleProvider` wraps the app in `layout.tsx`,
persists the chosen locale to localStorage (consistent with existing
localStorage-only persistence model), and sets `<html lang="ar" dir="rtl">`
/ `<html lang="en" dir="ltr">` accordingly.

## 3. RTL layout

- `dir="rtl"` toggle on `<html>` drives native browser RTL for text flow and
  flex/grid direction.
- Replace directional Tailwind utilities (`ml-*`, `mr-*`, `pl-*`, `pr-*`,
  `left-*`, `right-*`, `text-left`, `text-right`) with logical equivalents
  (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) throughout shared
  layout/UI components so mirroring is automatic rather than hand-flipped
  per page.
- Icons that imply direction (arrows, chevrons for back/forward/next/prev)
  get mirrored via a CSS rule (`[dir="rtl"] .icon-directional { transform:
  scaleX(-1); }`) rather than swapped per-usage.
- Charts/diagrams (React Flow graphs, tree renderers, code viewer) stay
  LTR internally even in Arabic mode — data structure visualizations and code
  are not language content and mirroring them would misrepresent the
  structure. Only surrounding chrome (labels, buttons, panels) flips.

## 4. Scope of translation

Every route under `src/app/` and every component under `src/components/`
that renders user-facing text: home, category pages, algorithm pages
(theory/complexity/quiz text — not code), practice, playground, settings,
docs, about, neural-network visualizer, nav/footer/command palette, toasts
and validation error messages, the new `LiveBuilderPanel` from the builder
spec once it lands.

**Out of scope (stays English always):** algorithm/data-structure names,
pseudocode, the 12-language code viewer contents, variable/technical
identifiers in narration text (e.g. "insert(5)" stays as-is, only the
surrounding sentence translates).

## 5. Content translation strategy

Given the volume (87+ algorithms × theory/complexity/quiz text), authoring
agents translate content directly into `ar.json` rather than leaving
placeholders — spot-check a sample against a native-quality bar (natural
phrasing, correct technical terminology) before treating a batch as done.

## 6. Language switcher

A locale toggle (EN/AR) in the navbar, always visible, mirroring the existing
theme switcher's placement/prominence.

## 7. Testing & verification

- `npx tsc --noEmit` + `npm run build` — the dictionary is typed so a missing
  key is a compile error, not a silent blank string.
- Manual spot-check in browser preview: toggle to Arabic, confirm RTL layout
  doesn't break any shared component (navbar, card grids, visualizer shell,
  code viewer stays LTR), confirm a sample of translated pages read
  correctly, confirm algorithm names/code remain English.
- No route should throw or render `undefined`/raw keys when locale is `ar`.
