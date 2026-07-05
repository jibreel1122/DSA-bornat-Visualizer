# Multi-Algorithm Comparison Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user pick 2+ algorithms from the same category (tree-vs-tree, graph-vs-graph, etc.) and view them side by side, with a synced mode where one Insert/Delete/Edit/Search action applies to all of them at once on the same input.

**Architecture:** `VisualizerShell` currently owns its live-input state (history, listFieldKey/searchFieldKey detection, insert/delete/edit/search actions) internally, entangled with its playback/UI code. This plan extracts that state into a standalone `useLiveInput(module)` hook, makes `VisualizerShell` accept an optional externally-owned `liveInput` instance (falling back to creating its own when not provided — zero behavior change for every existing single-algorithm page), then builds a `useCompareSession` hook that owns N `useLiveInput` instances and fans a single user action out to all of them in synced mode. A new `CompareShell` component renders N `VisualizerShell`s side by side, each wired to one of those instances.

**Tech Stack:** Next.js 15, React 19, TypeScript.

**Spec:** `docs/superpowers/specs/2026-07-05-comparison-mode-design.md`

## Global Constraints

- **Depends on `docs/superpowers/plans/2026-07-05-interactive-builder.md` — do not start Task 1 until that plan's Task 2 (auto-play fix, Edit action, primary buttons) has landed and been verified.** This plan's hook extraction lifts that exact code out of `visualizer-shell.tsx`.
- Every existing single-algorithm page must keep working identically after the Task 1/2 refactor — this is a behavior-preserving extraction, not a rewrite.
- Same-category comparison only (tree-with-tree, graph-with-graph, etc.) — no cross-category picker.
- `npx tsc --noEmit` and `npm run build` must stay green after every task.

---

### Task 1: Extract `useLiveInput` hook from `VisualizerShell`

**Files:**
- Create: `src/lib/engine/use-live-input.ts`
- Modify: `src/components/visualizer/visualizer-shell.tsx`

**Interfaces:**
- Produces:
```typescript
export interface LiveInput<I = unknown> {
  level: Level;
  setLevel: (l: Level) => void;
  input: I;
  listFieldKey: string | undefined;
  searchFieldKey: string | undefined;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  randomize: (lvl?: Level) => void;
  applyFields: (fields: Record<string, string>) => void;
  shuffleInput: () => void;
  clearInput: () => void;
  insertValue: (raw: string) => void;
  removeValue: (raw: string) => void;
  editValue: (oldRaw: string, newRaw: string) => void;
  searchValue: (raw: string) => void;
  /** True immediately after any of the 4 actions above — read by the caller's auto-play effect, then it must reset this back to false. */
  consumeLiveActionFlag: () => boolean;
}
export function useLiveInput<I>(
  module: AlgorithmModule<unknown, I>,
  initialFields: Record<string, string> | undefined,
  defaultLevel: Level,
): LiveInput<I>;
```

- [ ] **Step 1: Create the hook**

Create `src/lib/engine/use-live-input.ts`:

```typescript
"use client";

import * as React from "react";
import { toast } from "sonner";
import { createRNG, randomSeed } from "@/lib/engine/random";
import type { AlgorithmModule, Level } from "@/lib/engine/types";

const SEARCH_FIELD_KEYS = ["target", "search", "pattern"];

export interface LiveInput<I = unknown> {
  level: Level;
  setLevel: (l: Level) => void;
  input: I;
  listFieldKey: string | undefined;
  searchFieldKey: string | undefined;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  randomize: (lvl?: Level) => void;
  applyFields: (fields: Record<string, string>) => void;
  shuffleInput: () => void;
  clearInput: () => void;
  insertValue: (raw: string) => void;
  removeValue: (raw: string) => void;
  editValue: (oldRaw: string, newRaw: string) => void;
  searchValue: (raw: string) => void;
  consumeLiveActionFlag: () => boolean;
}

/** True if a serialized field value is a comma-separated list (used by chip-list-input's picker too). */
function isListValue(raw: string): boolean {
  return raw.split(",").map((t) => t.trim()).filter(Boolean).length >= 2;
}

export function useLiveInput<I>(
  module: AlgorithmModule<unknown, I>,
  initialFields: Record<string, string> | undefined,
  defaultLevel: Level,
): LiveInput<I> {
  const [level, setLevel] = React.useState<Level>(defaultLevel);

  const searchFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.search || SEARCH_FIELD_KEYS.includes(f.key))?.key,
    [module],
  );
  const listFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.list || f.key === "values")?.key,
    [module],
  );

  const initialInput = React.useMemo(() => {
    if (initialFields) {
      try {
        return module.parseInput(initialFields) as I;
      } catch {
        // fall through to a random dataset on malformed deep links
      }
    }
    return module.defaultInput(defaultLevel, createRNG(randomSeed())) as I;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, initialFields]);
  const [history, setHistory] = React.useState<I[]>([initialInput]);
  const [hIndex, setHIndex] = React.useState(0);
  const input = history[hIndex];

  const liveActionRef = React.useRef(false);
  const consumeLiveActionFlag = React.useCallback(() => {
    const v = liveActionRef.current;
    liveActionRef.current = false;
    return v;
  }, []);

  const pushInput = React.useCallback(
    (next: I) => {
      setHistory((h) => [...h.slice(0, hIndex + 1), next].slice(-50));
      setHIndex((i) => Math.min(i + 1, 49));
    },
    [hIndex],
  );

  const randomize = React.useCallback(
    (lvl: Level = level) => {
      pushInput(module.defaultInput(lvl, createRNG(randomSeed())) as I);
    },
    [module, level, pushInput],
  );

  const applyFields = (fields: Record<string, string>) => {
    const parsed = module.parseInput(fields) as I; // throws friendly errors
    pushInput(parsed);
  };

  const shuffleInput = () => {
    const fields = module.serializeInput(input);
    const next = { ...fields };
    let touched = false;
    for (const k of Object.keys(next)) {
      if (!isListValue(next[k])) continue;
      const tokens = next[k].split(",").map((t) => t.trim()).filter(Boolean);
      for (let i = tokens.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
      }
      next[k] = tokens.join(", ");
      touched = true;
    }
    if (!touched) {
      toast.info("Nothing to shuffle here.");
      return;
    }
    try {
      pushInput(module.parseInput(next) as I);
      toast.success("Shuffled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not shuffle.");
    }
  };

  const clearInput = () => {
    const fields = module.serializeInput(input);
    const next = { ...fields };
    let touched = false;
    for (const k of Object.keys(next)) {
      if (isListValue(next[k])) {
        next[k] = "";
        touched = true;
      }
    }
    if (!touched) {
      toast.info("Nothing to clear here — try Custom input.");
      return;
    }
    try {
      pushInput(module.parseInput(next) as I);
      toast.success("Cleared.");
    } catch {
      toast.info("Enter new values to continue.");
    }
  };

  const insertValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const current = fields[listFieldKey] ?? "";
    const next = { ...fields, [listFieldKey]: current ? `${current}, ${raw}` : raw };
    try {
      pushInput(module.parseInput(next) as I);
      liveActionRef.current = true;
      toast.success(`Inserted ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not insert.");
    }
  };

  const removeValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === raw.trim());
    if (idx === -1) {
      toast.info(`"${raw}" is not in the current values.`);
      return;
    }
    tokens.splice(idx, 1);
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      pushInput(module.parseInput(next) as I);
      liveActionRef.current = true;
      toast.success(`Removed ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    }
  };

  const editValue = (oldRaw: string, newRaw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === oldRaw.trim());
    if (idx === -1) {
      toast.info(`"${oldRaw}" is not in the current values.`);
      return;
    }
    tokens[idx] = newRaw.trim();
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      pushInput(module.parseInput(next) as I);
      liveActionRef.current = true;
      toast.success(`Changed ${oldRaw} to ${newRaw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not edit.");
    }
  };

  const searchValue = (raw: string) => {
    if (!searchFieldKey) return;
    const fields = module.serializeInput(input);
    const next = { ...fields, [searchFieldKey]: raw };
    try {
      pushInput(module.parseInput(next) as I);
      liveActionRef.current = true;
      toast.success(`Searching for ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not search.");
    }
  };

  return {
    level,
    setLevel,
    input,
    listFieldKey,
    searchFieldKey,
    canUndo: hIndex > 0,
    canRedo: hIndex < history.length - 1,
    undo: () => setHIndex((i) => Math.max(0, i - 1)),
    redo: () => setHIndex((i) => Math.min(history.length - 1, i + 1)),
    randomize,
    applyFields,
    shuffleInput,
    clearInput,
    insertValue,
    removeValue,
    editValue,
    searchValue,
    consumeLiveActionFlag,
  };
}
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors (this is a new file, not yet wired into anything).

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/use-live-input.ts
git commit -m "feat(compare): extract useLiveInput hook from VisualizerShell"
```

---

### Task 2: Refactor `VisualizerShell` to consume `useLiveInput` (behavior-preserving)

**Files:**
- Modify: `src/components/visualizer/visualizer-shell.tsx`

**Interfaces:**
- Consumes: `useLiveInput` from Task 1.
- Produces: `VisualizerShell` gains an optional `liveInput?: LiveInput` prop — when provided, the shell uses it instead of calling `useLiveInput` itself. This is what lets `CompareShell` (Task 4) drive multiple shells from externally-owned state.

- [ ] **Step 1: Replace the shell's inline state with the hook**

In `src/components/visualizer/visualizer-shell.tsx`, find the component signature:

```typescript
export function VisualizerShell({
  module,
  initialFields,
}: {
  module: AlgorithmModule;
  initialFields?: Record<string, string>;
}) {
```

Replace with:

```typescript
export function VisualizerShell({
  module,
  initialFields,
  liveInput: externalLiveInput,
}: {
  module: AlgorithmModule;
  initialFields?: Record<string, string>;
  /** Provided by CompareShell to drive this instance from shared/synced state; omit for a standalone page. */
  liveInput?: LiveInput;
}) {
  const { settings } = useSettings();
  const ownLiveInput = useLiveInput(module, initialFields, settings.defaultLevel);
  const live = externalLiveInput ?? ownLiveInput;
```

- [ ] **Step 2: Remove the now-duplicated inline state and rewire every reference**

Delete the following blocks (now owned by the hook): the `level`/`setLevel` state, the `searchFieldKey`/`listFieldKey` memos, the `initialInput`/`history`/`hIndex`/`input`/`pushInput` block, and the `randomize`/`applyFields`/`shuffleInput`/`clearInput`/`insertValue`/`removeValue`/`editValue`/`searchValue` function definitions (all now provided by `live.*`).

Rewire every remaining reference in the file:
- `level` → `live.level`, `setLevel` → `live.setLevel`
- `input` → `live.input`
- `searchFieldKey` → `live.searchFieldKey`, `listFieldKey` → `live.listFieldKey`
- `randomize()` → `live.randomize()`, `applyFields(...)` → `live.applyFields(...)`, `shuffleInput()` → `live.shuffleInput()`, `clearInput()` → `live.clearInput()`
- `insertValue`/`removeValue`/`editValue`/`searchValue` → `live.insertValue`/`live.removeValue`/`live.editValue`/`live.searchValue`
- `canUndo`/`canRedo` (used by the Undo/Redo `IconBtn`s) → `live.canUndo`/`live.canRedo`
- The Undo/Redo `onClick`s (`() => setHIndex((i) => i - 1)` / `() => setHIndex((i) => i + 1)`) → `live.undo` / `live.redo`

Keep everything else — `steps`/`error` computation (still `module.generate(live.input)`), the `player` (`useVisualizerPlayer`), the auto-play effect from the interactive-builder plan (now reading `live.consumeLiveActionFlag()` instead of a local `liveActionRef`):

```typescript
  React.useEffect(() => {
    if (live.consumeLiveActionFlag()) {
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);
```

Also import the hook and its type:

```typescript
import { useLiveInput, type LiveInput } from "@/lib/engine/use-live-input";
```

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors — every usage should resolve once the rewiring in Step 2 is complete.

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual regression pass**

Re-run every check from the interactive-builder plan's Task 2 Step 8 and Task 12 (AVL tree insert/delete/edit/search, undo/redo, save/load/export, a Sorting page, a Graph page) — this refactor must not change any observable behavior on a standalone algorithm page.

- [ ] **Step 6: Commit**

```bash
git add src/components/visualizer/visualizer-shell.tsx
git commit -m "refactor(compare): VisualizerShell consumes useLiveInput, accepts external instance"
```

---

### Task 3: `useCompareSession` — fan out actions to N live-input instances

**Files:**
- Create: `src/lib/engine/use-compare-session.ts`

**Interfaces:**
- Consumes: `useLiveInput`, `LiveInput` from Task 1.
- Produces:
```typescript
export interface CompareSession {
  synced: boolean;
  setSynced: (v: boolean) => void;
  panels: LiveInput[];
  /** Only meaningful when synced — applies to every panel's matching action at once. */
  insertAll: (raw: string) => void;
  removeAll: (raw: string) => void;
  editAll: (oldRaw: string, newRaw: string) => void;
  searchAll: (raw: string) => void;
}
export function useCompareSession(modules: AlgorithmModule[], defaultLevel: Level): CompareSession;
```

- [ ] **Step 1: Create the hook**

Create `src/lib/engine/use-compare-session.ts`:

```typescript
"use client";

import * as React from "react";
import { useLiveInput, type LiveInput } from "@/lib/engine/use-live-input";
import type { AlgorithmModule, Level } from "@/lib/engine/types";

export interface CompareSession {
  synced: boolean;
  setSynced: (v: boolean) => void;
  panels: LiveInput[];
  insertAll: (raw: string) => void;
  removeAll: (raw: string) => void;
  editAll: (oldRaw: string, newRaw: string) => void;
  searchAll: (raw: string) => void;
}

/**
 * Owns one useLiveInput per selected algorithm. In synced mode, a single
 * Insert/Delete/Edit/Search action fans out to every panel that has a
 * matching list/search field — panels without one simply don't receive it,
 * so comparing e.g. two trees with different rotation strategies still works
 * even though one might expose "values" and the other "ops".
 */
export function useCompareSession(modules: AlgorithmModule[], defaultLevel: Level): CompareSession {
  const [synced, setSynced] = React.useState(true);

  // Rules of Hooks: modules.length is fixed per comparison session (the user
  // picks N algorithms up front on /compare/[category] before this mounts),
  // so this fixed-size hook array is safe.
  const panels = modules.map((m) => useLiveInput(m, undefined, defaultLevel));

  const insertAll = (raw: string) => {
    if (!synced) return;
    panels.forEach((p) => p.listFieldKey && p.insertValue(raw));
  };
  const removeAll = (raw: string) => {
    if (!synced) return;
    panels.forEach((p) => p.listFieldKey && p.removeValue(raw));
  };
  const editAll = (oldRaw: string, newRaw: string) => {
    if (!synced) return;
    panels.forEach((p) => p.listFieldKey && p.editValue(oldRaw, newRaw));
  };
  const searchAll = (raw: string) => {
    if (!synced) return;
    panels.forEach((p) => p.searchFieldKey && p.searchValue(raw));
  };

  return { synced, setSynced, panels, insertAll, removeAll, editAll, searchAll };
}
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/engine/use-compare-session.ts
git commit -m "feat(compare): add useCompareSession hook"
```

---

### Task 4: `CompareShell` component — grid of synced panels

**Files:**
- Create: `src/components/visualizer/compare-shell.tsx`

**Interfaces:**
- Consumes: `useCompareSession` (Task 3), `VisualizerShell` with its new `liveInput` prop (Task 2), `ValuePromptButton`/`EditPromptButton` (from the interactive-builder plan).
- Produces: `CompareShell({ modules }: { modules: AlgorithmModule[] })`.

- [ ] **Step 1: Create the component**

Create `src/components/visualizer/compare-shell.tsx`:

```tsx
"use client";

import * as React from "react";
import { ListMinus, ListPlus, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCompareSession } from "@/lib/engine/use-compare-session";
import { useSettings } from "@/components/providers/settings-provider";
import type { AlgorithmModule } from "@/lib/engine/types";
import { VisualizerShell } from "./visualizer-shell";
import { EditPromptButton, ValuePromptButton } from "./value-prompt-button";

export function CompareShell({ modules }: { modules: AlgorithmModule[] }) {
  const { settings } = useSettings();
  const session = useCompareSession(modules, settings.defaultLevel);

  const anyList = session.panels.some((p) => p.listFieldKey);
  const anySearch = session.panels.some((p) => p.searchFieldKey);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <Button
          variant={session.synced ? "default" : "secondary"}
          size="sm"
          onClick={() => session.setSynced(true)}
        >
          Synced
        </Button>
        <Button
          variant={!session.synced ? "default" : "secondary"}
          size="sm"
          onClick={() => session.setSynced(false)}
        >
          Independent
        </Button>

        {session.synced && (
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-1">
            {anyList && (
              <>
                <ValuePromptButton
                  icon={<ListPlus />}
                  label="Insert into every panel"
                  placeholder="e.g. 42"
                  confirmLabel="Insert"
                  onSubmit={session.insertAll}
                  emphasized
                />
                <ValuePromptButton
                  icon={<ListMinus />}
                  label="Delete from every panel"
                  placeholder="e.g. 42"
                  confirmLabel="Delete"
                  onSubmit={session.removeAll}
                  emphasized
                />
                <EditPromptButton
                  icon={<Pencil />}
                  label="Edit every panel"
                  oldPlaceholder="current value"
                  newPlaceholder="new value"
                  confirmLabel="Edit"
                  onSubmit={session.editAll}
                />
              </>
            )}
            {anySearch && (
              <ValuePromptButton
                icon={<Search />}
                label="Search every panel"
                placeholder="e.g. 42"
                confirmLabel="Search"
                onSubmit={session.searchAll}
                emphasized
              />
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(420px, 1fr))` }}>
        {modules.map((m, i) => (
          <VisualizerShell key={m.slug} module={m} liveInput={session.panels[i]} />
        ))}
      </div>
    </div>
  );
}
```

(In independent mode, `session.panels[i]` is still passed as each panel's `liveInput` — this is fine, since each panel's own Insert/Delete/Edit/Search buttons *inside* its `VisualizerShell` instance already call that same panel's own `live.insertValue` etc. directly, only the *shared* toolbar's fan-out (`insertAll` etc.) is gated by `session.synced`.)

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/visualizer/compare-shell.tsx
git commit -m "feat(compare): add CompareShell component"
```

---

### Task 5: `/compare/[category]` route — algorithm picker

**Files:**
- Create: `src/app/compare/[category]/page.tsx`

**Interfaces:**
- Consumes: `byCategory(category)` from `src/lib/algorithms/index.ts`, `loadAlgorithm(slug)`, `CompareShell` (Task 4).

- [ ] **Step 1: Create the picker + shell page**

Create `src/app/compare/[category]/page.tsx`:

```tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule } from "@/lib/engine/types";
import type { CategoryId } from "@/lib/engine/types";
import { CompareShell } from "@/components/visualizer/compare-shell";

export default function ComparePage() {
  const params = useParams<{ category: string }>();
  const category = params.category as CategoryId;
  const metas = React.useMemo(() => byCategory(category), [category]);

  const [selected, setSelected] = React.useState<string[]>([]);
  const [modules, setModules] = React.useState<AlgorithmModule[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const toggle = (slug: string) => {
    setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  };

  const start = async () => {
    setLoading(true);
    const loaded = await Promise.all(selected.map((slug) => loadAlgorithm(slug)));
    setModules(loaded.filter((m): m is AlgorithmModule => m !== null));
    setLoading(false);
  };

  if (modules) {
    return <CompareShell modules={modules} />;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Compare {category}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick 2 or more {category} algorithms to run side by side on the same input.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metas.map((m) => (
          <Card
            key={m.slug}
            onClick={() => toggle(m.slug)}
            className={`cursor-pointer p-3 text-sm transition-colors ${
              selected.includes(m.slug) ? "border-primary bg-primary/10" : ""
            }`}
          >
            {m.title}
          </Card>
        ))}
      </div>
      <Button className="mt-4" disabled={selected.length < 2 || loading} onClick={start}>
        {loading ? "Loading…" : `Compare ${selected.length || ""}`.trim()}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors — check `CategoryId`'s actual export location (`src/lib/engine/types.ts` per Task 1 of the interactive-builder plan's research) and adjust the import path if it's re-exported elsewhere (e.g. `src/lib/categories.ts`).

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: succeeds, one new route `/compare/[category]` appears in the build output.

- [ ] **Step 4: Manual verification**

Navigate to `/compare/trees`. Select AVL Tree and Red-Black Tree. Click Compare. Confirm both render side by side. In Synced mode, click Insert and type a value — confirm BOTH trees animate the same insertion. Click Delete on a shared value — confirm both remove it. Switch to Independent mode, confirm each panel's own toolbar still works but the shared top toolbar's actions no longer fan out.

- [ ] **Step 5: Add a "Compare" entry point from the category page**

Open `src/app/[category]/page.tsx`, add a link/button to `/compare/${category}` near the existing category header (following that page's existing layout conventions), so users can discover comparison mode without typing the URL manually.

- [ ] **Step 6: Run the type check and build again**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/app/compare src/app/\[category\]/page.tsx
git commit -m "feat(compare): add /compare/[category] picker route and entry link"
```

---

### Task 6: Final regression pass

**Files:** none modified — verification only.

- [ ] **Step 1: Full type check and build**

Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: both succeed.

- [ ] **Step 2: Cross-category spot-check**

Try `/compare/graphs` with Dijkstra + Bellman-Ford (both have `edges` list + `start` search fields per the interactive-builder plan) — confirm synced Insert/Delete/Search works across both despite them being different algorithms. Try `/compare/sorting` with Bubble Sort + Quick Sort (both use `values`) — confirm synced Insert/Delete/Edit works.

- [ ] **Step 3: 3-up test**

On `/compare/trees`, select 3 algorithms (e.g. AVL, Red-Black, B-Tree). Confirm the grid lays out responsively (wraps to a second row) rather than squeezing 3 panels into one row unreadably.

- [ ] **Step 4: Confirm standalone pages are unaffected**

Spot-check 2-3 ordinary (non-compare) algorithm pages one more time to confirm the Task 1/2 hook extraction introduced no regression.

- [ ] **Step 5: Commit** (only if any of the above surfaced a fix; otherwise nothing to commit)
