"use client";

import * as React from "react";
import { toast } from "sonner";
import { createRNG, randomSeed } from "@/lib/engine/random";
import type { AlgorithmModule, Level, LiveOperationKind, OperationRequest } from "@/lib/engine/types";
import { useLocale } from "@/lib/i18n";
import { isListValue } from "@/components/visualizer/chip-list-input";

const SEARCH_FIELD_KEYS = ["target", "search", "pattern"];

type HasInputFields = Pick<AlgorithmModule, "inputFields">;

/** The list-shaped field a module's Insert/Delete/Edit actions operate on, if any. */
export function listFieldKeyOf(module: HasInputFields): string | undefined {
  return module.inputFields.find((f) => f.list || f.key === "values")?.key;
}

/** The field a module's Search action writes to, if any. */
export function searchFieldKeyOf(module: HasInputFields): string | undefined {
  return module.inputFields.find((f) => f.search || SEARCH_FIELD_KEYS.includes(f.key))?.key;
}

/**
 * Owns the live-input state for one algorithm: difficulty level, an undo/redo
 * history of datasets, and the insert/delete/edit/search/shuffle/clear actions
 * that mutate the serialized field strings and re-parse via the module.
 *
 * Extracted verbatim from `VisualizerShell` so that a standalone page and the
 * multi-panel `CompareShell` can share identical behavior — the shell keeps a
 * private instance when no external one is supplied (zero behavior change), and
 * `useCompareSession` owns N instances and fans one action out to all of them.
 */
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
  /** Parse + push a full field set as a live (auto-playing) edit; throws the module's friendly error on invalid input. Used by the shell's grid-cell editor. */
  commitLiveFields: (fields: Record<string, string>) => void;
  /** True immediately after any live action above — read once by the caller's auto-play effect, which resets it back to false. */
  consumeLiveActionFlag: () => boolean;
  consumeOperation: () => OperationRequest<I> | undefined;
}

export interface UseLiveInputOptions {
  /** Called when Clear can't produce a valid dataset (e.g. a required field emptied) so the caller can prompt for manual input. */
  onClearNeedsManualInput?: (fields: Record<string, string>) => void;
}

export function useLiveInput<I>(
  module: AlgorithmModule<unknown, I>,
  initialFields: Record<string, string> | undefined,
  defaultLevel: Level,
  options?: UseLiveInputOptions,
): LiveInput<I> {
  const { t } = useLocale();
  const [level, setLevel] = React.useState<Level>(defaultLevel);

  const searchFieldKey = React.useMemo(() => searchFieldKeyOf(module), [module]);
  const listFieldKey = React.useMemo(() => listFieldKeyOf(module), [module]);

  const initialInput = React.useMemo(() => {
    if (initialFields) {
      try {
        return module.parseInput(initialFields);
      } catch {
        // fall through to a random dataset on malformed deep links
      }
    }
    return module.defaultInput(defaultLevel, createRNG(randomSeed()));
    // module identity is stable per page; defaultLevel only seeds the first input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, initialFields]);
  const [history, setHistory] = React.useState<I[]>([initialInput as I]);
  const [hIndex, setHIndex] = React.useState(0);
  const input = history[hIndex];

  const liveActionRef = React.useRef(false);
  const operationRef = React.useRef<OperationRequest<I> | undefined>(undefined);
  const consumeLiveActionFlag = React.useCallback(() => {
    const v = liveActionRef.current;
    liveActionRef.current = false;
    return v;
  }, []);
  const consumeOperation = React.useCallback(() => {
    const operation = operationRef.current;
    operationRef.current = undefined;
    return operation;
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

  const commitLiveFields = (fields: Record<string, string>) => {
    const parsed = module.parseInput(fields) as I; // throws friendly errors
    pushInput(parsed);
    liveActionRef.current = true;
    operationRef.current = { kind: "edit-grid", before: input, after: parsed, detail: "the selected cell edit" };
  };

  const commitOperation = (kind: LiveOperationKind, parsed: I, detail: string) => {
    pushInput(parsed);
    liveActionRef.current = true;
    operationRef.current = { kind, before: input, after: parsed, detail };
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
      toast.info(t("shell.nothingToShuffle"));
      return;
    }
    try {
      pushInput(module.parseInput(next) as I);
      toast.success(t("shell.shuffled"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotShuffle"));
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
      toast.info(t("shell.nothingToClear"));
      return;
    }
    try {
      pushInput(module.parseInput(next) as I);
      toast.success(t("shell.cleared"));
    } catch {
      options?.onClearNeedsManualInput?.(next);
      toast.info(t("shell.enterNewValues"));
    }
  };

  const insertValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const current = fields[listFieldKey] ?? "";
    const next = { ...fields, [listFieldKey]: current ? `${current}, ${raw}` : raw };
    try {
      commitOperation("insert", module.parseInput(next) as I, `inserting ${raw}`);
      toast.success(t("shell.toastInserted", { value: raw }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotInsert"));
    }
  };

  const removeValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === raw.trim());
    if (idx === -1) {
      toast.info(t("shell.toastNotInValues", { value: raw }));
      return;
    }
    tokens.splice(idx, 1);
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      commitOperation("delete", module.parseInput(next) as I, `removing ${raw}`);
      toast.success(t("shell.toastRemoved", { value: raw }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotRemove"));
    }
  };

  const editValue = (oldRaw: string, newRaw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === oldRaw.trim());
    if (idx === -1) {
      toast.info(t("shell.toastNotInValues", { value: oldRaw }));
      return;
    }
    tokens[idx] = newRaw.trim();
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      commitOperation("update", module.parseInput(next) as I, `changing ${oldRaw} to ${newRaw}`);
      toast.success(t("shell.toastChanged", { old: oldRaw, new: newRaw }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotEdit"));
    }
  };

  const searchValue = (raw: string) => {
    if (!searchFieldKey) return;
    const fields = module.serializeInput(input);
    const next = { ...fields, [searchFieldKey]: raw };
    try {
      commitOperation("search", module.parseInput(next) as I, `searching for ${raw}`);
      toast.success(t("shell.toastSearching", { value: raw }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotSearch"));
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
    commitLiveFields,
    consumeLiveActionFlag,
    consumeOperation,
  };
}
