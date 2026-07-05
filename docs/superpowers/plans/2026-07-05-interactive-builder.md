# Interactive Step-by-Step Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users build/search/edit any data structure live, one action at a time, with Insert/Delete/Edit/Search as primary always-visible buttons (not tiny hidden icons), while keeping the existing full-input/autoplay mode intact.

**Architecture:** Two toolbar actions (Insert/Delete/Search) already exist in `visualizer-shell.tsx` but only work for modules whose input has a field literally named `"values"`, and there is no Edit action and no auto-play after an action (a real bug: the player's own reset effect silently cancels any `play()` call made in the same tick, landing back at frame 0 with playback stopped). This plan: (1) generalizes those actions to work off any field a module tags as list-shaped or search-shaped, via a new optional `list`/`search` property on `InputField` — falling back to the current hardcoded behavior so nothing regresses before every module is tagged; (2) adds a real Edit action; (3) fixes the auto-play sequencing bug so live actions visibly animate; (4) makes the four buttons prominent, labeled, primary-styled buttons instead of small ghost icon buttons; (5) tags every one of the 87 algorithm modules' `inputFields` per a locked mapping (see spec); (6) adds click-to-edit-a-cell support for the three grid-shaped modules (Sudoku, Rat-in-Maze, A*) which don't fit the comma-list mechanism.

**Tech Stack:** Next.js 15, React 19, TypeScript, existing `AlgorithmModule`/`Step`/`InputField` engine types.

**Spec:** `docs/superpowers/specs/2026-07-05-interactive-builder-design.md`

## Global Constraints

- Every existing "full input + autoplay/scrub" flow must keep working unchanged — this plan is additive only.
- No task may remove the current fallback: any module not yet tagged with the new `list`/`search` fields must keep behaving exactly as it does today (this is what makes each task independently shippable).
- `npx tsc --noEmit` and `npm run build` must stay green after every task.
- Algorithm names and code samples are out of scope for this plan (no i18n here — separate plan).

---

### Task 1: Add `list`/`search` roles to `InputField` + generalize field detection

**Files:**
- Modify: `src/lib/engine/types.ts:326-331` (`InputField` interface)
- Modify: `src/components/visualizer/visualizer-shell.tsx:58` (`SEARCH_FIELD_KEYS`), `:89-96` (field detection), `:216-256` (insert/remove/search actions)

**Interfaces:**
- Produces: `InputField.list?: boolean`, `InputField.search?: boolean` — later tasks (3-8, 10) set these on individual modules' `inputFields` arrays.
- Produces: `listFieldKey: string | undefined` and `searchFieldKey: string | undefined` (replacing `hasValuesField`), used by Task 2's UI.

- [ ] **Step 1: Extend `InputField`**

In `src/lib/engine/types.ts`, find:

```typescript
export interface InputField {
  key: string;
  label: string;
  placeholder: string;
  help?: string;
}
```

Replace with:

```typescript
export interface InputField {
  key: string;
  label: string;
  placeholder: string;
  help?: string;
  /** This field holds a comma-separated collection the live builder can insert/delete/edit into. */
  list?: boolean;
  /** This field is what the live "Search" action sets before re-generating. */
  search?: boolean;
}
```

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors (optional properties are backward compatible with every existing `inputFields` array).

- [ ] **Step 3: Generalize field detection in the shell**

In `src/components/visualizer/visualizer-shell.tsx`, find:

```typescript
const SEARCH_FIELD_KEYS = ["target", "search", "pattern"];
```

Leave this line as-is (it remains the legacy fallback). Then find:

```typescript
  const searchFieldKey = React.useMemo(
    () => module.inputFields.find((f) => SEARCH_FIELD_KEYS.includes(f.key))?.key,
    [module],
  );
  const hasValuesField = React.useMemo(
    () => module.inputFields.some((f) => f.key === "values"),
    [module],
  );
```

Replace with:

```typescript
  const searchFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.search || SEARCH_FIELD_KEYS.includes(f.key))?.key,
    [module],
  );
  const listFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.list || f.key === "values")?.key,
    [module],
  );
```

- [ ] **Step 4: Run the type check again**

Run: `npx tsc --noEmit`
Expected: errors at every remaining `hasValuesField` usage (lines ~617, ~626) — expected, fixed in Task 2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/types.ts src/components/visualizer/visualizer-shell.tsx
git commit -m "feat(builder): add list/search roles to InputField, generalize field detection"
```

---

### Task 2: Fix auto-play bug, add Edit action, make CRUD buttons primary

**Files:**
- Modify: `src/components/visualizer/value-prompt-button.tsx` (new `EditPromptButton` export)
- Modify: `src/components/visualizer/visualizer-shell.tsx` (actions + toolbar JSX)

**Interfaces:**
- Consumes: `listFieldKey`, `searchFieldKey` from Task 1.
- Produces: `editValue(oldRaw: string, newRaw: string): void` action; `EditPromptButton` component with props `{ icon, label, oldPlaceholder?, newPlaceholder?, confirmLabel, onSubmit: (oldValue: string, newValue: string) => void }`.

**Context — the bug:** `useVisualizerPlayer` (`src/lib/engine/player.ts:38-41`) has `useEffect(() => { setCursor(0); setPlaying(false); }, [stepCount])`. If you call `player.play()` synchronously inside an action handler (same tick as `pushInput`), the new `steps.length` hasn't been computed yet — `player.play()`'s closure still has the *old* `last`, so it's a no-op or wrong. Then, after the render where `steps` recomputes, this reset effect fires and force-sets `playing=false` — silently cancelling any play state you tried to set. The fix: trigger `play()` from a *new* effect declared textually after the `useVisualizerPlayer(...)` call, keyed on `steps.length`, gated by a ref so it only fires right after a live action (not on mount or on Random/Custom-input changes) — because React runs a component's effects in declaration order, this new effect runs *after* the player's internal reset effect on the same commit, so it wins.

- [ ] **Step 1: Add `EditPromptButton` to `value-prompt-button.tsx`**

Append to `src/components/visualizer/value-prompt-button.tsx` (after the existing `ValuePromptButton` export):

```tsx
/**
 * Two-field popover: "change X to Y" — the Edit action for any list-shaped
 * field. Mirrors ValuePromptButton's shape but takes an old + new value.
 */
export function EditPromptButton({
  icon,
  label,
  oldPlaceholder,
  newPlaceholder,
  confirmLabel,
  onSubmit,
}: {
  icon: React.ReactNode;
  label: string;
  oldPlaceholder?: string;
  newPlaceholder?: string;
  confirmLabel: string;
  onSubmit: (oldValue: string, newValue: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [oldValue, setOldValue] = React.useState("");
  const [newValue, setNewValue] = React.useState("");

  const submit = () => {
    const o = oldValue.trim();
    const n = newValue.trim();
    if (!o || !n) return;
    onSubmit(o, n);
    setOldValue("");
    setNewValue("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setOldValue("");
          setNewValue("");
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" aria-label={label}>
              {icon} {confirmLabel}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64">
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            value={oldValue}
            onChange={(e) => setOldValue(e.target.value)}
            placeholder={oldPlaceholder ?? "Current value"}
            className="h-8 text-xs"
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={newPlaceholder ?? "New value"}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm">
            {confirmLabel}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Also make `ValuePromptButton`'s trigger emphasizable**

In `src/components/visualizer/value-prompt-button.tsx`, find the `ValuePromptButton` props destructuring:

```tsx
export function ValuePromptButton({
  icon,
  label,
  placeholder,
  confirmLabel,
  onSubmit,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
}) {
```

Replace with:

```tsx
export function ValuePromptButton({
  icon,
  label,
  placeholder,
  confirmLabel,
  onSubmit,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
  /** Render as a prominent labeled button instead of a small ghost icon — for the primary Insert/Delete/Search actions. */
  emphasized?: boolean;
}) {
```

Then find the trigger button:

```tsx
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={label}>
              {icon}
            </Button>
          </PopoverTrigger>
```

Replace with:

```tsx
          <PopoverTrigger asChild>
            {emphasized ? (
              <Button variant="secondary" size="sm" aria-label={label}>
                {icon} {confirmLabel}
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" aria-label={label}>
                {icon}
              </Button>
            )}
          </PopoverTrigger>
```

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Add the auto-play-after-live-action effect and rewrite the actions**

In `src/components/visualizer/visualizer-shell.tsx`, find:

```typescript
  const player = useVisualizerPlayer(steps.length, settings.defaultSpeed);
  const step = steps[player.cursor];
```

Replace with:

```typescript
  const player = useVisualizerPlayer(steps.length, settings.defaultSpeed);
  const step = steps[player.cursor];

  // Auto-play through a live insert/delete/edit/search so the user watches
  // the new operation animate instead of landing silently on frame 0.
  // Must be declared AFTER useVisualizerPlayer so this effect runs after its
  // internal reset-on-stepCount-change effect — otherwise that effect's
  // setPlaying(false) wins and playback never starts.
  const liveActionRef = React.useRef(false);
  React.useEffect(() => {
    if (liveActionRef.current) {
      liveActionRef.current = false;
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);
```

Then find the existing `insertValue`/`removeValue`/`searchValue` actions:

```typescript
  const insertValue = (raw: string) => {
    const fields = module.serializeInput(input);
    const current = fields.values ?? "";
    const next = { ...fields, values: current ? `${current}, ${raw}` : raw };
    try {
      pushInput(module.parseInput(next));
      toast.success(`Inserted ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not insert.");
    }
  };

  const removeValue = (raw: string) => {
    const fields = module.serializeInput(input);
    const tokens = (fields.values ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === raw.trim());
    if (idx === -1) {
      toast.info(`"${raw}" is not in the current values.`);
      return;
    }
    tokens.splice(idx, 1);
    const next = { ...fields, values: tokens.join(", ") };
    try {
      pushInput(module.parseInput(next));
      toast.success(`Removed ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove.");
    }
  };

  const searchValue = (raw: string) => {
    if (!searchFieldKey) return;
    const fields = module.serializeInput(input);
    const next = { ...fields, [searchFieldKey]: raw };
    try {
      pushInput(module.parseInput(next));
      toast.success(`Searching for ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not search.");
    }
  };
```

Replace with:

```typescript
  const insertValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const current = fields[listFieldKey] ?? "";
    const next = { ...fields, [listFieldKey]: current ? `${current}, ${raw}` : raw };
    try {
      pushInput(module.parseInput(next));
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
      pushInput(module.parseInput(next));
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
      pushInput(module.parseInput(next));
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
      pushInput(module.parseInput(next));
      liveActionRef.current = true;
      toast.success(`Searching for ${raw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not search.");
    }
  };
```

- [ ] **Step 5: Replace the toolbar buttons**

In `src/components/visualizer/visualizer-shell.tsx`, find:

```tsx
          {hasValuesField && (
            <ValuePromptButton
              icon={<ListPlus />}
              label="Insert a value"
              placeholder="e.g. 42"
              confirmLabel="Insert"
              onSubmit={insertValue}
            />
          )}
          {hasValuesField && (
            <ValuePromptButton
              icon={<ListMinus />}
              label="Remove a value"
              placeholder="e.g. 42"
              confirmLabel="Remove"
              onSubmit={removeValue}
            />
          )}
          {searchFieldKey && (
            <ValuePromptButton
              icon={<Search />}
              label="Search for a value"
              placeholder="e.g. 42"
              confirmLabel="Search"
              onSubmit={searchValue}
            />
          )}
```

Replace with:

```tsx
          {(listFieldKey || searchFieldKey) && (
            <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-1">
              {listFieldKey && (
                <ValuePromptButton
                  icon={<ListPlus />}
                  label="Insert a value"
                  placeholder="e.g. 42"
                  confirmLabel="Insert"
                  onSubmit={insertValue}
                  emphasized
                />
              )}
              {listFieldKey && (
                <ValuePromptButton
                  icon={<ListMinus />}
                  label="Delete a value"
                  placeholder="e.g. 42"
                  confirmLabel="Delete"
                  onSubmit={removeValue}
                  emphasized
                />
              )}
              {listFieldKey && (
                <EditPromptButton
                  icon={<Pencil />}
                  label="Edit a value"
                  oldPlaceholder="current value"
                  newPlaceholder="new value"
                  confirmLabel="Edit"
                  onSubmit={editValue}
                />
              )}
              {searchFieldKey && (
                <ValuePromptButton
                  icon={<Search />}
                  label="Search for a value"
                  placeholder="e.g. 42"
                  confirmLabel="Search"
                  onSubmit={searchValue}
                  emphasized
                />
              )}
            </div>
          )}
```

Then add the `Pencil` icon and `EditPromptButton` import. Find:

```typescript
import {
  Camera,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Dices,
  Eraser,
  FileDown,
  FileUp,
  FolderOpen,
  Gauge,
  HelpCircle,
  ImageDown,
  ListMinus,
  ListPlus,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
```

Replace with (adds `Pencil`):

```typescript
import {
  Camera,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Dices,
  Eraser,
  FileDown,
  FileUp,
  FolderOpen,
  Gauge,
  HelpCircle,
  ImageDown,
  ListMinus,
  ListPlus,
  Pause,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
```

Find:

```typescript
import { ValuePromptButton } from "./value-prompt-button";
```

Replace with:

```typescript
import { EditPromptButton, ValuePromptButton } from "./value-prompt-button";
```

- [ ] **Step 6: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Manual browser verification (AVL tree — the user's own example)**

Start the dev server (`npm run build && npm run start`, or the project's preview flow — do NOT rely on `next dev` per project convention, see `docs/superpowers/specs` note on OneDrive dev-server churn). Navigate to the AVL Tree algorithm page.

Confirm:
- Insert/Delete/Edit/Search render as labeled buttons grouped in a highlighted box in the toolbar, not small icon-only buttons.
- Clicking Insert, typing a value, confirming: the tree **animates** through to the new state (does not silently snap to the empty starting frame).
- Clicking Delete on an existing value: same animated behavior, value removed.
- Clicking Edit with an existing value and a new value: value replaced, animates.
- Clicking Search with a value: re-runs and animates to the search result.
- The existing Random/Custom input/Shuffle/Clear/Undo/Redo/Save/Load/Export controls still all work exactly as before.

- [ ] **Step 9: Commit**

```bash
git add src/components/visualizer/value-prompt-button.tsx src/components/visualizer/visualizer-shell.tsx
git commit -m "feat(builder): fix auto-play bug, add Edit action, make CRUD buttons primary"
```

---

### Task 3: Tag list/search fields — Trees category

**Files:**
- Modify: `src/lib/algorithms/trees/trie.ts` (inputFields)
- Modify: `src/lib/algorithms/trees/binary-search-tree.ts` (inputFields)

Every other module in this category (avl-tree, b-tree, binary-tree-traversals, fenwick-tree, level-order-traversal, min-heap, red-black-tree, segment-tree) already uses a field literally named `"values"`, which Task 1's fallback (`f.key === "values"`) already covers — no change needed for those 8 files.

- [ ] **Step 1: Tag `trie.ts`**

In `src/lib/algorithms/trees/trie.ts`, find:

```typescript
    { key: "words", label: "Words to insert", placeholder: "cat, car, card, cave", help: "2–12 lowercase words (letters only, up to 12 letters each)." },
    { key: "search", label: "Word to search", placeholder: "card", help: "One lowercase word to look up (up to 12 letters)." },
```

Replace with:

```typescript
    { key: "words", label: "Words to insert", placeholder: "cat, car, card, cave", help: "2–12 lowercase words (letters only, up to 12 letters each).", list: true },
    { key: "search", label: "Word to search", placeholder: "card", help: "One lowercase word to look up (up to 12 letters).", search: true },
```

(`search` key already matched the legacy `SEARCH_FIELD_KEYS` list, so the `search: true` tag is redundant but explicit and future-proof — keep it.)

- [ ] **Step 2: Tag `binary-search-tree.ts`**

Open `src/lib/algorithms/trees/binary-search-tree.ts`, find the `inputFields` array (around line 366) with a field `key: "ops"`. Add `list: true` to that field object, following the same pattern as Step 1 (add the property, keep every other property unchanged).

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

In the browser, open Trie and Binary Search Tree pages. Confirm Insert/Delete/Edit buttons now appear (previously did not, since neither field was named `"values"`) and work as in Task 2's AVL test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/algorithms/trees/trie.ts src/lib/algorithms/trees/binary-search-tree.ts
git commit -m "feat(builder): tag list/search fields for trie and binary-search-tree"
```

---

### Task 4: Tag list/search fields — Graphs category

**Files:**
- Modify: `src/lib/algorithms/graphs/{union-find,floyd-warshall,topological-sort,dfs,tarjan-scc,kruskal,prim,kosaraju-scc,max-flow,bellman-ford,dijkstra,bfs}.ts`

`a-star.ts` is excluded here — its `grid` field is maze-shaped, not a comma-list, and is handled in Task 9 alongside the other grid-based modules.

**Mechanical rule:** in each file's `inputFields` array,
1. add `list: true` to the field whose key is `"edges"` or `"ops"` (the comma-separated edge/operation list), and
2. add `search: true` to the field whose key is `"start"`, only in the four files that have one: `dfs.ts`, `bellman-ford.ts`, `dijkstra.ts`, `bfs.ts`.

- [ ] **Step 1: Worked example — `bellman-ford.ts`**

Find:

```typescript
    { key: "edges", label: "Directed weighted edges", placeholder: "A>B:4, B>C:-3, C>D:4", help: "Format A>B:w; negative weights allowed. Up to 20 nodes." },
    { key: "start", label: "Source vertex", placeholder: "A", help: "Must be one of the vertices." },
```

Replace with:

```typescript
    { key: "edges", label: "Directed weighted edges", placeholder: "A>B:4, B>C:-3, C>D:4", help: "Format A>B:w; negative weights allowed. Up to 20 nodes.", list: true },
    { key: "start", label: "Source vertex", placeholder: "A", help: "Must be one of the vertices.", search: true },
```

- [ ] **Step 2: Apply the same `list: true` tag to the `edges`/`ops` field in the remaining 11 files**

`union-find.ts` (field key `"ops"`), `floyd-warshall.ts` (`"edges"`), `topological-sort.ts` (`"edges"`), `dfs.ts` (`"edges"`), `tarjan-scc.ts` (`"edges"`), `kruskal.ts` (`"edges"`), `prim.ts` (`"edges"`), `kosaraju-scc.ts` (`"edges"`), `max-flow.ts` (`"edges"`), `dijkstra.ts` (`"edges"`), `bfs.ts` (`"edges"`).

- [ ] **Step 3: Apply the `search: true` tag to `"start"` in the remaining 3 files**

`dfs.ts`, `dijkstra.ts`, `bfs.ts` each have `{ key: "start", label: "Start node", placeholder: "A" }` — add `search: true`.

- [ ] **Step 4: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Open BFS, Dijkstra, and Kruskal pages. Confirm Insert/Delete/Edit appear for edges on all three, and Search appears for BFS/Dijkstra (not Kruskal — no single start node for MST).

- [ ] **Step 6: Commit**

```bash
git add src/lib/algorithms/graphs/union-find.ts src/lib/algorithms/graphs/floyd-warshall.ts src/lib/algorithms/graphs/topological-sort.ts src/lib/algorithms/graphs/dfs.ts src/lib/algorithms/graphs/tarjan-scc.ts src/lib/algorithms/graphs/kruskal.ts src/lib/algorithms/graphs/prim.ts src/lib/algorithms/graphs/kosaraju-scc.ts src/lib/algorithms/graphs/max-flow.ts src/lib/algorithms/graphs/bellman-ford.ts src/lib/algorithms/graphs/dijkstra.ts src/lib/algorithms/graphs/bfs.ts
git commit -m "feat(builder): tag list/search fields for graphs category"
```

---

### Task 5: Tag list fields — Stacks/Queues category

**Files:**
- Modify: `src/lib/algorithms/stacks-queues/{circular-queue,queue-operations,stack-operations}.ts`

`min-stack.ts` already uses `"values"` (Task 1 fallback covers it). `balanced-parentheses.ts`'s `expr` field is a single bracket string, not a comma list — no natural insert/delete/edit mapping; it keeps working via the existing "Custom input" dialog only (documented, no code change).

- [ ] **Step 1: Worked example — `stack-operations.ts`**

Find:

```typescript
    { key: "ops", label: "Operations", placeholder: "push 3, push 7, peek, pop, push 5", help: "Comma-separated: push N, pop, peek." },
```

Replace with:

```typescript
    { key: "ops", label: "Operations", placeholder: "push 3, push 7, peek, pop, push 5", help: "Comma-separated: push N, pop, peek.", list: true },
```

- [ ] **Step 2: Apply the same tag to `circular-queue.ts` and `queue-operations.ts`**

Both have a field with key `"ops"` — add `list: true` the same way.

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Manual verification**

Open Stack Operations and Queue Operations pages, confirm Insert/Delete/Edit appear and work (e.g. Insert "push 9").

- [ ] **Step 5: Commit**

```bash
git add src/lib/algorithms/stacks-queues/circular-queue.ts src/lib/algorithms/stacks-queues/queue-operations.ts src/lib/algorithms/stacks-queues/stack-operations.ts
git commit -m "feat(builder): tag list fields for stacks-queues category"
```

---

### Task 6: Tag list fields — Hashing category

**Files:**
- Modify: `src/lib/algorithms/hashing/{hash-chaining,linear-probing,quadratic-probing,double-hashing}.ts`

- [ ] **Step 1: Worked example — `hash-chaining.ts`**

Find:

```typescript
    { key: "ops", label: "Operations", placeholder: "insert 21, insert 14, insert 28, search 14, delete 21", help: "Comma-separated: insert N, search N, delete N (max 50)." },
```

Replace with:

```typescript
    { key: "ops", label: "Operations", placeholder: "insert 21, insert 14, insert 28, search 14, delete 21", help: "Comma-separated: insert N, search N, delete N (max 50).", list: true },
```

- [ ] **Step 2: Apply to `linear-probing.ts`**

Confirmed field: `{ key: "ops", label: "Operations", placeholder: "insert 21, insert 32, search 32, delete 21", ... }` — add `list: true` the same way.

- [ ] **Step 3: Apply to `quadratic-probing.ts` and `double-hashing.ts`**

Open each file and locate its `inputFields` array. If the operations field is also keyed `"ops"` (expected, matching the category's established convention), add `list: true` to it the same way. If a file uses a different key for the same comma-separated operations concept, tag that field instead — the rule is "the field holding the comma-separated insert/search/delete operation list gets `list: true`", not the literal string `"ops"`.

- [ ] **Step 4: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Manual verification**

Open all 4 hashing pages, confirm Insert/Delete/Edit appear and work.

- [ ] **Step 6: Commit**

```bash
git add src/lib/algorithms/hashing/hash-chaining.ts src/lib/algorithms/hashing/linear-probing.ts src/lib/algorithms/hashing/quadratic-probing.ts src/lib/algorithms/hashing/double-hashing.ts
git commit -m "feat(builder): tag list fields for hashing category"
```

---

### Task 7: Tag list fields — Dynamic Programming category

**Files:**
- Modify: `src/lib/algorithms/dynamic-programming/coin-change.ts`
- Modify: `src/lib/algorithms/dynamic-programming/knapsack-01.ts`

`longest-increasing-subsequence.ts` and `maximum-subarray.ts` already use `"values"` (Task 1 fallback covers them). `edit-distance.ts` and `longest-common-subsequence.ts` take two whole strings (`a`, `b`) with no list-shaped field — no natural insert/delete/edit mapping, documented as relying on the existing "Custom input" dialog. `fibonacci-dp.ts` takes a single scalar `n` — same, no change.

- [ ] **Step 1: Tag `coin-change.ts`**

Find:

```typescript
    { key: "coins", label: "Coin denominations", placeholder: "1, 3, 4", help: "Comma-separated positive integers (up to 10)." },
    { key: "amount", label: "Target amount", placeholder: "6", help: "0–40." },
```

Replace with:

```typescript
    { key: "coins", label: "Coin denominations", placeholder: "1, 3, 4", help: "Comma-separated positive integers (up to 10).", list: true },
    { key: "amount", label: "Target amount", placeholder: "6", help: "0–40." },
```

(`amount` stays untagged — it's a single target value, not a search-lookup field; it's edited via the existing Custom input dialog.)

- [ ] **Step 2: Tag `knapsack-01.ts`**

Find:

```typescript
    { key: "items", label: "Items (weight:value)", placeholder: "2:3, 3:4, 4:5, 5:6", help: "Comma-separated weight:value pairs (up to 12)." },
```

Replace with:

```typescript
    { key: "items", label: "Items (weight:value)", placeholder: "2:3, 3:4, 4:5, 5:6", help: "Comma-separated weight:value pairs (up to 12).", list: true },
```

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Manual verification**

Open Coin Change and 0/1 Knapsack pages, confirm Insert/Delete/Edit appear for coins/items and work.

- [ ] **Step 5: Commit**

```bash
git add src/lib/algorithms/dynamic-programming/coin-change.ts src/lib/algorithms/dynamic-programming/knapsack-01.ts
git commit -m "feat(builder): tag list fields for dynamic-programming category"
```

---

### Task 8: Tag list fields — Greedy category

**Files:**
- Modify: `src/lib/algorithms/greedy/{job-sequencing,activity-selection,fractional-knapsack}.ts`

`huffman-coding.ts` takes a whole `text` string (frequencies are counted automatically) — no list field, no change; relies on the existing Custom input dialog.

- [ ] **Step 1: Tag `activity-selection.ts`**

Find:

```typescript
    { key: "activities", label: "Activities (start-finish)", placeholder: "1-4, 3-5, 0-6, 5-7, 3-9, 8-9", help: "Comma-separated start-finish pairs (up to 20)." },
```

Replace with:

```typescript
    { key: "activities", label: "Activities (start-finish)", placeholder: "1-4, 3-5, 0-6, 5-7, 3-9, 8-9", help: "Comma-separated start-finish pairs (up to 20).", list: true },
```

- [ ] **Step 2: Tag `job-sequencing.ts`**

Find the field with key `"jobs"` and add `list: true` the same way.

- [ ] **Step 3: Tag `fractional-knapsack.ts`**

Find the field with key `"items"` and add `list: true` the same way (`capacity` stays untagged, same reasoning as Task 7).

- [ ] **Step 4: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Manual verification**

Open all 3 pages, confirm Insert/Delete/Edit appear and work.

- [ ] **Step 6: Commit**

```bash
git add src/lib/algorithms/greedy/job-sequencing.ts src/lib/algorithms/greedy/activity-selection.ts src/lib/algorithms/greedy/fractional-knapsack.ts
git commit -m "feat(builder): tag list fields for greedy category"
```

---

### Task 9: Click-to-edit grid cells — Sudoku, Rat-in-Maze, A*

**Files:**
- Modify: `src/components/visualizer/renderers/grid-view.tsx` (add optional click handler)
- Modify: `src/components/visualizer/renderers/index.tsx` (`RendererSwitch` — thread the handler through)
- Modify: `src/components/visualizer/visualizer-shell.tsx` (own the click-to-edit logic + wiring)

These three modules' primary field (`grid`) is row-per-line text (`"1100 / 1110 / 0110 / 0011"` style, one character per cell), not a comma-list — the Task 1-8 mechanism doesn't fit. Instead: clicking a rendered cell opens a small popover to set that cell's value, edits the row's text at that character position, and re-parses.

**Interfaces:**
- Produces: `GridView` prop `onCellClick?: (row: number, col: number) => void`.
- Produces: shell function `setGridCell(fieldKey: string, row: number, col: number, char: string): void`.

- [ ] **Step 1: Add the click handler prop to `GridView`**

In `src/components/visualizer/renderers/grid-view.tsx`, find:

```tsx
export function GridView({ frame }: { frame: GridFrame }) {
```

Replace with:

```tsx
export function GridView({
  frame,
  onCellClick,
}: {
  frame: GridFrame;
  onCellClick?: (row: number, col: number) => void;
}) {
```

Find:

```tsx
              return (
                <div
                  key={`${r}-${col}`}
                  className="grid origin-center place-items-center rounded-md font-mono text-xs font-semibold transition-all duration-200"
                  style={{
                    width: cell,
                    height: cell,
                    background: isDefault ? "var(--muted)" : vizFill(c.state),
                    color: isDefault ? "var(--foreground)" : "white",
                    transform: isEmphasized(c.state) ? "scale(1.1)" : "scale(1)",
                    boxShadow: isEmphasized(c.state)
                      ? `0 0 0 2px color-mix(in oklch, ${vizFill(c.state)} 60%, transparent)`
                      : "none",
                  }}
                >
                  {c.value ?? ""}
                </div>
              );
```

Replace with:

```tsx
              return (
                <div
                  key={`${r}-${col}`}
                  role={onCellClick ? "button" : undefined}
                  tabIndex={onCellClick ? 0 : undefined}
                  onClick={onCellClick ? () => onCellClick(r, col) : undefined}
                  className="grid origin-center place-items-center rounded-md font-mono text-xs font-semibold transition-all duration-200"
                  style={{
                    width: cell,
                    height: cell,
                    background: isDefault ? "var(--muted)" : vizFill(c.state),
                    color: isDefault ? "var(--foreground)" : "white",
                    transform: isEmphasized(c.state) ? "scale(1.1)" : "scale(1)",
                    boxShadow: isEmphasized(c.state)
                      ? `0 0 0 2px color-mix(in oklch, ${vizFill(c.state)} 60%, transparent)`
                      : "none",
                    cursor: onCellClick ? "pointer" : undefined,
                  }}
                >
                  {c.value ?? ""}
                </div>
              );
```

- [ ] **Step 2: Thread the prop through `RendererSwitch`**

Read `src/components/visualizer/renderers/index.tsx`. Find the `case "grid":` branch that renders `<GridView frame={...} />` and add an `onCellClick` prop, passed down from a new optional prop on `RendererSwitch` itself:

```tsx
case "grid":
  return <GridView frame={frame as GridFrame} onCellClick={onCellClick} />;
```

Add `onCellClick?: (row: number, col: number) => void;` to `RendererSwitch`'s own props type, and thread it into the component's parameter destructuring (it will be `undefined` for every renderer kind except grid, which is fine — other `case` branches simply don't reference it).

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`
Expected: errors wherever `<RendererSwitch frame={...} />` is called without the new (optional) prop — none, since it's optional. Expected: no errors.

- [ ] **Step 4: Add `setGridCell` to the shell and wire it in**

In `src/components/visualizer/visualizer-shell.tsx`, add a new function near the other live actions (after `searchValue`):

```typescript
  const gridFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.key === "grid")?.key,
    [module],
  );

  const setGridCell = (row: number, col: number, char: string) => {
    if (!gridFieldKey) return;
    const fields = module.serializeInput(input);
    const rows = (fields[gridFieldKey] ?? "").split("/").map((r) => r.trim());
    if (row < 0 || row >= rows.length || col < 0 || col >= rows[row].length) return;
    const chars = rows[row].split("");
    chars[col] = char;
    rows[row] = chars.join("");
    const next = { ...fields, [gridFieldKey]: rows.join(" / ") };
    try {
      pushInput(module.parseInput(next));
      liveActionRef.current = true;
      toast.success(`Set cell (${row}, ${col}) to "${char}".`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not edit that cell.");
    }
  };

  const [cellEditTarget, setCellEditTarget] = React.useState<{ row: number; col: number } | null>(null);
```

Then find where `<RendererSwitch` is rendered inside the canvas (around line 419-436) and add the `onCellClick` prop:

```tsx
<RendererSwitch
  {/* ...existing props... */}
  onCellClick={gridFieldKey ? (row, col) => setCellEditTarget({ row, col }) : undefined}
/>
```

- [ ] **Step 5: Add the cell-edit popover**

After the toolbar's live-action button group (from Task 2, Step 5), add a small controlled dialog that opens when `cellEditTarget` is set:

```tsx
{cellEditTarget && (
  <InputDialog
    open={!!cellEditTarget}
    onOpenChange={(o) => {
      if (!o) setCellEditTarget(null);
    }}
    fields={[
      {
        key: "value",
        label: `Cell (${cellEditTarget.row}, ${cellEditTarget.col})`,
        placeholder: "new character",
        help: "One character — a digit, '.', '0', or '1' depending on this puzzle's format.",
      },
    ]}
    initial={{ value: "" }}
    onSubmit={(fields) => {
      setGridCell(cellEditTarget.row, cellEditTarget.col, (fields.value || ".").trim()[0] ?? ".");
      setCellEditTarget(null);
    }}
  />
)}
```

- [ ] **Step 6: Run the type check and build**

Run: `npx tsc --noEmit`
Run: `npm run build`
Expected: both succeed.

- [ ] **Step 7: Manual verification**

Open Sudoku Solver, Rat in a Maze, and A* Pathfinding pages. Confirm: clicking any grid cell opens a small prompt; entering a value updates that cell and the grid animates/re-renders with the change.

- [ ] **Step 8: Commit**

```bash
git add src/components/visualizer/renderers/grid-view.tsx src/components/visualizer/renderers/index.tsx src/components/visualizer/visualizer-shell.tsx
git commit -m "feat(builder): click-to-edit grid cells for Sudoku, Rat-in-Maze, A*"
```

---

### Task 10: Tag list fields — Backtracking (non-grid) and Recursion categories

**Files:**
- Modify: `src/lib/algorithms/backtracking/{combinations,permutations,subset-sum}.ts`
- Modify: `src/lib/algorithms/recursion/power-set.ts`

`n-queens.ts` (scalar `n` only) and `sudoku-solver.ts`/`rat-in-maze.ts` (handled in Task 9) are excluded from this task. `tower-of-hanoi.ts`, `fibonacci-recursive.ts`, `factorial.ts` take a single scalar (`disks`/`n`) with no list field — no change, relies on the existing Custom input dialog.

- [ ] **Step 1: Tag `combinations.ts`**

Find:

```typescript
    { key: "items", label: "Elements (distinct)", placeholder: "A, B, C, D", help: "3–10 distinct symbols or numbers." },
```

Replace with:

```typescript
    { key: "items", label: "Elements (distinct)", placeholder: "A, B, C, D", help: "3–10 distinct symbols or numbers.", list: true },
```

(`k` stays untagged — a scalar count, edited via Custom input.)

- [ ] **Step 2: Tag `permutations.ts`**

Find the `items` field and add `list: true` the same way.

- [ ] **Step 3: Tag `subset-sum.ts`**

Find the `items` field and add `list: true` the same way. Its `target` field already matches the legacy `SEARCH_FIELD_KEYS` (`"target"` is in that list) — no change needed there; Search already works.

- [ ] **Step 4: Tag `power-set.ts`**

Find:

```typescript
  inputFields: [{ key: "items", label: "Elements (distinct)", placeholder: "A, B, C", help: "2–10 distinct symbols or numbers (2^n subsets — 10 elements = 1024 subsets)." }],
```

Replace with:

```typescript
  inputFields: [{ key: "items", label: "Elements (distinct)", placeholder: "A, B, C", help: "2–10 distinct symbols or numbers (2^n subsets — 10 elements = 1024 subsets).", list: true }],
```

- [ ] **Step 5: Run the type check**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Manual verification**

Open Combinations, Permutations, Subset Sum, and Power Set pages, confirm Insert/Delete/Edit appear and work; confirm Subset Sum's Search (on `target`) still works.

- [ ] **Step 7: Commit**

```bash
git add src/lib/algorithms/backtracking/combinations.ts src/lib/algorithms/backtracking/permutations.ts src/lib/algorithms/backtracking/subset-sum.ts src/lib/algorithms/recursion/power-set.ts
git commit -m "feat(builder): tag list fields for backtracking and recursion categories"
```

---

### Task 11: Verify Strings and Mathematics categories need no code change

**Files:** none modified — this is a verification-only task.

Every module in Strings (`boyer-moore`, `kmp`, `naive-pattern-matching`, `rabin-karp`, `z-algorithm`) takes two whole strings (`text`, `pattern`) — not comma-lists, so Insert/Delete/Edit have no natural mapping via this plan's mechanism. Every module in Mathematics (`euclidean-gcd`, `extended-euclidean`, `fast-power`, `prime-factorization`, `sieve-of-eratosthenes`) takes 1-3 scalar numbers — same reasoning.

Both categories keep working via the existing "Custom input" dialog (already a prominent, primary-styled button per Task 2's toolbar — no change needed there). Search is already functional in Strings today: `pattern` is already in the legacy `SEARCH_FIELD_KEYS` list (`["target", "search", "pattern"]`), so the Search quick-button already works for every Strings module without any tagging.

- [ ] **Step 1: Manual verification**

Open KMP (Strings) and Euclidean GCD (Mathematics) pages. Confirm:
- Strings: the Search button appears and re-runs the pattern match on a new pattern.
- Strings: no Insert/Delete/Edit buttons appear (expected — no list field exists).
- Mathematics: no Insert/Delete/Edit/Search buttons appear (expected — no list or search field exists).
- Both: "Custom input" button is present, labeled, and lets the user change `text`/`pattern`/`a`/`b` etc.

- [ ] **Step 2: No commit needed** (no files changed).

---

### Task 12: Final regression pass

**Files:** none modified — verification only.

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: succeeds, same route count as before this plan (87 algorithm routes + shared pages).

- [ ] **Step 3: Spot-check one module per category that received NO tagging in this plan**

Open one page each from: Sorting (e.g. Bubble Sort), Linked Lists (e.g. Reverse Linked List), Searching (e.g. Binary Search) — these already worked via the legacy `"values"`/`"target"` fallback and must still work identically (Insert/Delete/Edit/Search visible and functional, now with the primary button styling from Task 2).

- [ ] **Step 4: Spot-check the full CRUD cycle end-to-end on one newly-enabled category**

On the Dijkstra page (Graphs): start from Random input, Delete an edge, Insert a new edge, Edit an edge's weight, Search from a different start node — confirm each animates and the final graph/shortest-path result is correct.

- [ ] **Step 5: Commit** (only if Step 3/4 surfaced fixes; otherwise skip — nothing to commit for a clean pass)
