# Plan 2 — Arabic i18n Completion & RTL Sweep

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Arabic localization — translate every remaining UI-chrome component (catalog, visualizer sub-components, command palette, page titles, the entire neural-network area), add `t()` interpolation so dynamic toasts translate, fix the one empty `ar.json` key, convert all remaining physical Tailwind direction classes to logical properties, and lock it all in with dictionary tests plus an Arabic-quality review.

**Architecture:** The existing system is `src/lib/i18n/index.tsx` (LocaleProvider + `useLocale()` returning `t(key)`) backed by flat-key `en.json`/`ar.json` (333 keys each, verified in perfect parity). This plan extends `t` to `t(key, vars?)` via a pure `interpolate()` helper, adds new key namespaces (`catalog.*`, `cmdk.*`, `notFound.*`, `nn.*`, and additions to `shell.*`), and converts remaining components to consume it. A dictionary-parity test makes en/ar drift and empty values impossible from now on.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4 logical properties (`ms-/me-/ps-/pe-/start-/end-/text-start/text-end`), Vitest (infrastructure from Plan 1: `npm run check` = typecheck + lint --max-warnings 0 + 2400 tests).

## Global Constraints

- Work on branch `plan2/arabic-rtl` off `main`.
- After EVERY task: `npm run check` green. `npm run build` green at Tasks 6 and 7 (expect 112 routes; the multiple-lockfiles workspace-root warning is known and acceptable).
- **Scope boundary (established product decisions — do NOT change):** category names/descriptions from `src/lib/categories.ts` stay English; algorithm-module content (titles, summaries, step descriptions, pseudocode, quiz/theory, tags) stays English. This plan translates UI chrome only.
- Arabic style: Modern Standard Arabic, consistent CS terminology (queue = طابور, stack = مكدس, tree = شجرة, graph = رسم بياني, array = مصفوفة, algorithm = خوارزمية, search = بحث, sort = ترتيب), full sentences per key — never compose sentence fragments across keys except via `{var}` interpolation.
- No dictionary key may be empty or whitespace in either locale (Task 1's test enforces this forever).
- `"use client"` pages cannot export `metadata` — when converting a server page, drop its page-level `metadata` export, matching the existing `src/app/settings/page.tsx` precedent (note it in the commit message).
- Numbers, code blocks, and pseudocode remain LTR under RTL: use `dir="ltr"` on data containers (precedent: commit 8670185 "keep numeric tables LTR under RTL locale").
- Dev server is unreliable on this OneDrive path — verify in browser via the prod config (`npm run build` + launch.json `prod`), never `next dev`.
- Commit style: `feat(i18n): …` / `fix(i18n): …`; end every commit message with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## Current-state facts (verified 2026-07-10)

- `t` today: `t: (key: DictKey) => string` at `src/lib/i18n/index.tsx:16,33` — no interpolation.
- `ar.json` has exactly one empty value: `docs.sectionPlaygroundBodyPrefix` (its English value is `"The"`, composed with a Playground link on the docs page).
- Files already translated (have `useLocale`): navbar, footer, settings, docs, about, home-sections, practice-client, quiz-sprint, predict-step, playground-client, array-lab, graph-builder, algorithm-page, visualizer-shell, i18n/index.
- Untranslated (no `useLocale`): `src/components/nn/*` (5 files) + `src/app/neural-network/page.tsx`, `src/components/catalog/algorithm-list.tsx`, `algorithm-card.tsx`, `page-header.tsx`, `src/components/visualizer/{code-viewer,chip-list-input,input-dialog,stats-panel,zoom-pan,quiz-panel}.tsx`, `src/components/layout/command-palette.tsx`, `src/app/not-found.tsx`, `src/app/algorithms/page.tsx`, `src/app/data-structures/page.tsx`, plus untranslated template-literal toasts inside visualizer-shell (lines ~243-263).
- Files still containing physical direction classes (`ml-/mr-/pl-/pr-/left-N/right-N/text-left/text-right`): algorithm-list, home-sections, calc-inspector, nn-visualizer, quiz-sprint, ui/select, chip-list-input, quiz-panel, renderers/string-view, renderers/table-view, visualizer-shell, viz-utils, zoom-pan.

---

### Task 1: Dictionary-parity test, `interpolate()`, `t(key, vars?)`, empty-key fix

**Files:**
- Create: `src/lib/i18n/interpolate.ts`
- Create: `tests/i18n/interpolate.test.ts`
- Create: `tests/i18n/dictionaries.test.ts`
- Modify: `src/lib/i18n/index.tsx:13-23,33` (context type, default value, `t` impl)
- Modify: `src/lib/i18n/ar.json` (the one empty key)

**Interfaces:**
- Produces: `t(key: DictKey, vars?: Record<string, string | number>): string` — replaces every `{name}` in the dictionary string with `String(vars.name)`; unknown placeholders are left as-is. Also `interpolate(template: string, vars?: Record<string, string | number>): string` (pure, same rules). Tasks 2–5 rely on both.

- [ ] **Step 1: Write failing tests for `interpolate`**

```ts
// tests/i18n/interpolate.test.ts
import { describe, expect, it } from "vitest";
import { interpolate } from "@/lib/i18n/interpolate";

describe("interpolate", () => {
  it("replaces a single placeholder", () => {
    expect(interpolate("Inserted {value}.", { value: 42 })).toBe("Inserted 42.");
  });

  it("replaces multiple distinct placeholders", () => {
    expect(interpolate("Changed {old} to {new}.", { old: 3, new: "7" })).toBe("Changed 3 to 7.");
  });

  it("replaces repeated placeholders everywhere", () => {
    expect(interpolate("{x} and {x}", { x: "a" })).toBe("a and a");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });

  it("returns the template unchanged when vars is omitted", () => {
    expect(interpolate("Plain text")).toBe("Plain text");
  });

  it("works with RTL text around placeholders", () => {
    expect(interpolate("تمت إضافة {value}.", { value: 5 })).toBe("تمت إضافة 5.");
  });
});
```

- [ ] **Step 2: Write the dictionary-parity test (will fail on the empty ar key)**

```ts
// tests/i18n/dictionaries.test.ts
import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import ar from "@/lib/i18n/ar.json";

const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();

describe("i18n dictionaries", () => {
  it("en and ar have identical key sets", () => {
    expect(arKeys).toEqual(enKeys);
  });

  it("no key has an empty or whitespace-only value in either locale", () => {
    const emptyEn = enKeys.filter((k) => (en as Record<string, string>)[k].trim() === "");
    const emptyAr = arKeys.filter((k) => (ar as Record<string, string>)[k].trim() === "");
    expect(emptyEn).toEqual([]);
    expect(emptyAr).toEqual([]);
  });

  it("placeholders match between locales for every key", () => {
    const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    const mismatched = enKeys.filter(
      (k) =>
        JSON.stringify(placeholders((en as Record<string, string>)[k])) !==
        JSON.stringify(placeholders((ar as Record<string, string>)[k])),
    );
    expect(mismatched).toEqual([]);
  });
});
```

- [ ] **Step 3: Run both to verify failures**

Run: `npx vitest run tests/i18n/`
Expected: interpolate tests FAIL (module not found); dictionaries "no empty value" FAILS listing `docs.sectionPlaygroundBodyPrefix`.

- [ ] **Step 4: Implement `interpolate`**

```ts
// src/lib/i18n/interpolate.ts
/** Replaces {name} placeholders. Unknown placeholders are left as-is. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
```

- [ ] **Step 5: Extend `t` in `src/lib/i18n/index.tsx`**

Change the interface, default context, and implementation (three edits):

```tsx
import { interpolate } from "./interpolate";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key, vars) => interpolate(en[key], vars),
});

// inside LocaleProvider:
const t = React.useCallback(
  (key: DictKey, vars?: Record<string, string | number>) =>
    interpolate(DICTS[locale][key] ?? DICTS.en[key], vars),
  [locale],
);
```

- [ ] **Step 6: Fix the empty ar key**

Read `src/app/docs/page.tsx` to see how `docs.sectionPlaygroundBodyPrefix` composes with the Playground link and the following body text, then write a grammatical Arabic value that reads naturally in that composition (the English is `"The"` leading into a linked word — Arabic will need a different construction, e.g. a noun phrase like `"توفّر صفحة"` leading into the link; pick what reads correctly against the actual surrounding sentence).

- [ ] **Step 7: Run all gates**

Run: `npx vitest run tests/i18n/ && npm run check`
Expected: all i18n tests pass; full gate green (2400 + new tests).

- [ ] **Step 8: Commit**

```bash
git add src/lib/i18n/ tests/i18n/
git commit -m "feat(i18n): add t() interpolation, dictionary-parity tests, fix empty ar key"
```

---

### Task 2: Interpolated toasts in visualizer-shell

**Files:**
- Modify: `src/components/visualizer/visualizer-shell.tsx:243-263` (and any other template-literal toasts in the file)
- Modify: `src/lib/i18n/en.json`, `src/lib/i18n/ar.json`

**Interfaces:**
- Consumes: `t(key, vars?)` from Task 1.

- [ ] **Step 1: Find every untranslated toast in the file**

Run: `grep -n "toast\." src/components/visualizer/visualizer-shell.tsx`
Known sites: `` toast.success(`Inserted ${raw}.`) `` (~line 243), `` toast.info(`"${raw}" ${t("shell.notInCurrentValues")}`) `` (~line 255), `` toast.success(`Removed ${raw}.`) `` (~line 263). Expect similar `Changed … to …` / `Searching for …` sites nearby — convert every template-literal toast you find.

- [ ] **Step 2: Add full-sentence keys to BOTH dictionaries**

```json
"shell.toastInserted": "Inserted {value}.",
"shell.toastRemoved": "Removed {value}.",
"shell.toastChanged": "Changed {old} to {new}.",
"shell.toastSearching": "Searching for {value}.",
"shell.toastNotInValues": "\"{value}\" is not in the current values."
```

Arabic:

```json
"shell.toastInserted": "تمت إضافة {value}.",
"shell.toastRemoved": "تمت إزالة {value}.",
"shell.toastChanged": "تم تغيير {old} إلى {new}.",
"shell.toastSearching": "جارٍ البحث عن {value}.",
"shell.toastNotInValues": "\"{value}\" ليست ضمن القيم الحالية."
```

(Adjust the exact key list to match every site found in Step 1 — same full-sentence pattern. If `shell.notInCurrentValues` becomes unused after replacing the composed toast, delete it from BOTH dictionaries.)

- [ ] **Step 3: Convert the call sites**

Example: `` toast.success(`Inserted ${raw}.`) `` → `toast.success(t("shell.toastInserted", { value: raw }))`.

- [ ] **Step 4: Verify no template-literal toasts remain, run gates**

Run: `grep -n 'toast\.\w*(\`' src/components/visualizer/visualizer-shell.tsx` → no matches.
Run: `npm run check` → green (parity + placeholder-match tests confirm both locales).

- [ ] **Step 5: Commit**

```bash
git add src/components/visualizer/visualizer-shell.tsx src/lib/i18n/
git commit -m "feat(i18n): translate dynamic toasts via t() interpolation"
```

---

### Task 3: Catalog, listing pages, command palette, not-found

**Files:**
- Modify: `src/components/catalog/algorithm-list.tsx` (search placeholder :77, Category select :102-105, difficulty chips :86-89, "No algorithms match your filters." :147, favorites/reset controls)
- Modify: `src/components/catalog/algorithm-card.tsx:57` (difficulty badge) + any other user-visible strings in the file
- Modify: `src/components/catalog/page-header.tsx` (only if it hardcodes strings — it mostly renders props)
- Modify: `src/app/algorithms/page.tsx` ("All Visualizations" + description), `src/app/data-structures/page.tsx` (title + description), `src/app/[category]/page.tsx` (chrome only — category title/description data stays English), `src/app/not-found.tsx`
- Modify: `src/components/layout/command-palette.tsx:51-125` (label, placeholder, headings Favorites / Recently viewed / Categories / Algorithms, empty-state text)
- Modify: `src/lib/i18n/en.json`, `ar.json`

**Interfaces:**
- Consumes: `t(key, vars?)`. New namespaces produced: `catalog.*`, `cmdk.*`, `notFound.*`, `pages.*`.
- Difficulty labels: map the `AlgoDifficulty` VALUE (stays `"Beginner" | "Intermediate" | "Advanced"` internally) to `catalog.difficultyBeginner` / `catalog.difficultyIntermediate` / `catalog.difficultyAdvanced` at render time. Task 4 reuses this exact mapping convention if it meets difficulty chips.

- [ ] **Step 1: Sweep each file for user-visible strings** (JSX text, `placeholder=`, `aria-label=`, `title=` attributes) and add keys. English values = the current strings verbatim. Arabic values: native-quality MSA per the Global Constraints terminology table. Suggested keys (extend as the sweep finds more): `catalog.searchPlaceholder`, `catalog.categoryFilter`, `catalog.allCategories`, `catalog.noMatches`, `catalog.favoritesFirst`, `catalog.resetFilters`, `catalog.difficultyBeginner/Intermediate/Advanced`, `cmdk.label`, `cmdk.placeholder`, `cmdk.favorites`, `cmdk.recentlyViewed`, `cmdk.categories`, `cmdk.algorithms`, `cmdk.noResults`, `notFound.title`, `notFound.body`, `notFound.backHome`, `pages.allVisualizationsTitle`, `pages.allVisualizationsDesc`, `pages.dataStructuresTitle`, `pages.dataStructuresDesc`.
- [ ] **Step 2: Convert components to `useLocale()`.** Server pages that must translate become client pages (add `"use client"`, drop `metadata` export per the settings precedent). `[category]/page.tsx`: translate only its chrome; if it has none, leave it untouched and say so in the report.
- [ ] **Step 3: Verify sweep completeness**

Run: `grep -nE 'placeholder="[A-Z]|aria-label="[A-Z]|>[A-Z][a-z]+ [a-z]' src/components/catalog/*.tsx src/components/layout/command-palette.tsx src/app/not-found.tsx` — remaining hits must be non-UI (component names, category data props) — justify each survivor in the report.

- [ ] **Step 4: Gates + commit**

Run: `npm run check` → green.

```bash
git add src/components/catalog/ src/components/layout/command-palette.tsx src/app/ src/lib/i18n/
git commit -m "feat(i18n): translate catalog, listing pages, command palette, not-found"
```

---

### Task 4: Visualizer sub-components

**Files:**
- Modify: `src/components/visualizer/code-viewer.tsx:74,81` (Copy code / Download code arias + any copied-toast)
- Modify: `src/components/visualizer/chip-list-input.tsx:128,131` (placeholder "Add value…", aria "Add value")
- Modify: `src/components/visualizer/input-dialog.tsx:94,164` ("Custom input", "Generate" + field labels/help it hardcodes)
- Modify: `src/components/visualizer/stats-panel.tsx:28` ("Legend")
- Modify: `src/components/visualizer/zoom-pan.tsx:69,80,96,106` (Zoom out / Zoom in / Reset view / Fullscreen arias)
- Modify: `src/components/visualizer/quiz-panel.tsx` (sweep: check/next/score strings)
- Modify: `src/lib/i18n/en.json`, `ar.json` (new keys under the existing `shell.*` namespace)

**Interfaces:**
- Consumes: `t(key, vars?)`. If the shell renders difficulty-level labels from `LEVELS` in `src/lib/engine/types.ts` ("Very Easy"…"Expert"), map them at render via `shell.level1`–`shell.level5` keys — the `LEVELS` data itself stays English.

- [ ] **Step 1:** Sweep each listed file; add `shell.*` keys (e.g. `shell.copyCode`, `shell.downloadCode`, `shell.addValuePlaceholder`, `shell.addValue`, `shell.customInput`, `shell.generate`, `shell.legend`, `shell.zoomIn`, `shell.zoomOut`, `shell.resetView`, `shell.fullscreen`, plus whatever quiz-panel needs) to BOTH dictionaries; convert components to `useLocale()`.
- [ ] **Step 2:** Verify: `grep -nE 'aria-label="[A-Z]|placeholder="[A-Z]' src/components/visualizer/*.tsx` → remaining hits justified in report (renderer files are Task 6's concern only for direction classes, not strings — but flag any user-visible English you notice there).
- [ ] **Step 3:** `npm run check` → green. Commit:

```bash
git add src/components/visualizer/ src/lib/i18n/
git commit -m "feat(i18n): translate visualizer sub-components (code viewer, inputs, stats, zoom, quiz)"
```

---

### Task 5: Neural-network area

**Files:**
- Modify: `src/app/neural-network/page.tsx`, `src/components/nn/nn-visualizer.tsx` (largest: title, Architecture, Decision boundary, Loss over epochs, Calculation inspector, ~8 aria-labels like "One epoch"/"Reset weights"/"New random init"/"Remove neuron"/"Add neuron"/"Previous step"/"Next step", button labels, hints), `calc-inspector.tsx` (Output/Hidden, term/weight/input labels, "Click to edit"), `decision-boundary.tsx`, `loss-chart.tsx`, `network-diagram.tsx` (sweep each)
- Modify: `src/lib/i18n/en.json`, `ar.json` (new `nn.*` namespace)

**Interfaces:**
- Consumes: `t(key, vars?)`.
- Math notation (σ, w·a, ∂L/∂w, axis numbers) is NOT text to translate — keep as-is, wrap in `dir="ltr"` where it would reorder under RTL.

- [ ] **Step 1:** Sweep all 6 files; create `nn.*` keys in BOTH dictionaries; convert to `useLocale()`. Arabic for ML terms: neural network = شبكة عصبية, layer = طبقة, neuron = عصبون, weight = وزن, bias = انحياز, epoch = حقبة تدريب, learning rate = معدل التعلم, loss = دالة الخسارة, activation = دالة التفعيل, dataset = مجموعة البيانات.
- [ ] **Step 2:** If `neural-network/page.tsx` exports `metadata` and must become client-rendered, follow the settings precedent (drop metadata, note in commit).
- [ ] **Step 3:** Verify: `grep -nE 'aria-label="[A-Z]|placeholder="[A-Z]|title="[A-Z]' src/components/nn/*.tsx src/app/neural-network/page.tsx` → no unjustified hits.
- [ ] **Step 4:** `npm run check` → green. Commit:

```bash
git add src/components/nn/ src/app/neural-network/ src/lib/i18n/
git commit -m "feat(i18n): translate neural-network visualizer"
```

---

### Task 6: RTL logical-properties sweep

**Files:**
- Modify (13 files, verified to contain physical classes): `src/components/catalog/algorithm-list.tsx`, `src/components/home/home-sections.tsx`, `src/components/nn/calc-inspector.tsx`, `src/components/nn/nn-visualizer.tsx`, `src/components/practice/quiz-sprint.tsx`, `src/components/ui/select.tsx`, `src/components/visualizer/chip-list-input.tsx`, `src/components/visualizer/quiz-panel.tsx`, `src/components/visualizer/renderers/string-view.tsx`, `src/components/visualizer/renderers/table-view.tsx`, `src/components/visualizer/visualizer-shell.tsx`, `src/components/visualizer/viz-utils.tsx`, `src/components/visualizer/zoom-pan.tsx`

**Conversion table (Tailwind v4 supports all logical utilities):**
`ml-*`→`ms-*`, `mr-*`→`me-*`, `pl-*`→`ps-*`, `pr-*`→`pe-*`, `left-*`→`start-*`, `right-*`→`end-*`, `text-left`→`text-start`, `text-right`→`text-end`, `rounded-l-*`→`rounded-s-*`, `rounded-r-*`→`rounded-e-*`, `border-l-*`→`border-s-*`, `border-r-*`→`border-e-*` (also convert any you find beyond the greps).

**Exceptions — leave PHYSICAL and add a `{/* physical: … */}` comment stating why:**
1. Anything inside a `dir="ltr"` region (code blocks, numeric tables, string/array data rows) — physical there is intentional; if a data region reorders under RTL and has no `dir="ltr"` yet, ADD `dir="ltr"` to the data container rather than converting its classes.
2. Decorative absolutely-positioned background blobs in `home-sections.tsx` where mirroring is visually irrelevant — converting is also acceptable; pick one and be consistent.

- [ ] **Step 1:** Convert file-by-file using the table. For renderers (string-view, table-view) check first whether the element is inside the existing forced-LTR data region from commit 8670185.
- [ ] **Step 2:** Verify no unjustified physical classes remain:

Run: `grep -rEn "\b(ml|mr|pl|pr)-[0-9.]+|\bleft-[0-9]|\bright-[0-9]|text-left|text-right|rounded-[lr]-|border-[lr]-[0-9]" src --include="*.tsx"`
Every remaining hit must be inside a `dir="ltr"` region or carry the `physical:` comment.

- [ ] **Step 3:** `npm run check && npm run build` → green, 112 routes.
- [ ] **Step 4:** Commit:

```bash
git add src/
git commit -m "feat(i18n): convert remaining physical direction classes to logical properties"
```

---

### Task 7: Arabic quality pass + browser verification

**Files:**
- Modify: `src/lib/i18n/ar.json` (quality fixes only — no key additions/removals)

- [ ] **Step 1: Terminology & grammar review.** Read `ar.json` end-to-end against `en.json`. Fix: inconsistent renderings of the same English term (build a small glossary as you go — the Global Constraints table is the seed), grammatical agreement, unnatural machine-translation phrasing, punctuation (Arabic comma «،», question mark «؟»), untranslated English words that have standard Arabic equivalents. Technical identifiers that convention keeps in English (e.g. "API", proper nouns like "Bornat") may remain. Record every change in the report with before/after.
- [ ] **Step 2:** `npm run check` → green (parity + placeholder tests catch structural mistakes).
- [ ] **Step 3: Browser verification (prod server, NOT dev).** Build, launch the `prod` config from `.claude/launch.json`, then in the browser: switch language to العربية in Settings; verify (a) home page fully Arabic + RTL, (b) an algorithm page — visualizer chrome Arabic, toolbar mirrored, numeric array data still LTR, toasts Arabic (insert a value via the builder), (c) /algorithms — search placeholder, difficulty chips, category filter Arabic; layout mirrored, (d) command palette (Ctrl+K) Arabic, (e) /neural-network fully Arabic with math notation intact LTR, (f) /docs Playground section sentence reads grammatically (the fixed key). Screenshot each; note any visual RTL breakage found and fix it (layout fixes belong to Task 6's conversion table rules).
- [ ] **Step 4:** Commit:

```bash
git add src/lib/i18n/ar.json
git commit -m "fix(i18n): Arabic terminology and grammar quality pass"
```

---

## Completion checklist (controller)

- All 7 tasks committed, `npm run check` + `npm run build` green.
- `grep -rL "useLocale" src/components/nn src/components/catalog --include="*.tsx"` returns nothing lacking translation except files with zero user-visible strings (justified in reports).
- Final whole-branch review, then merge to `main` per superpowers:finishing-a-development-branch.
