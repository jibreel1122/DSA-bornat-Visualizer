"use client";

import * as React from "react";
import { toast } from "sonner";
import { createRNG, randomSeed } from "@/lib/engine/random";
import type { AlgorithmModule, Level, LiveOperationKind, OperationRequest } from "@/lib/engine/types";
import { useLocale, type DictKey } from "@/lib/i18n";
import { isListValue } from "@/components/visualizer/chip-list-input";
import { supportsGenericSearch } from "@/lib/engine/search-steps";
import { canVisualizeDraft, type DraftMutation } from "@/lib/engine/draft-steps";

const SEARCH_FIELD_KEYS = ["target", "search", "pattern"];
const LEVEL_LABEL_KEYS: Record<Level, DictKey> = {
  1: "shell.level1",
  2: "shell.level2",
  3: "shell.level3",
  4: "shell.level4",
  5: "shell.level5",
};

type HasInputFields = Pick<AlgorithmModule, "inputFields">;

function sameDraftDataset(renderer: AlgorithmModule["renderer"], left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  if (renderer !== "tree") return left.every((value, index) => value === right[index]);
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

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
  revision: number;
  level: Level;
  setLevel: (l: Level) => void;
  input: I;
  /** Serialized fields for the state currently visible/under construction. */
  currentFields: () => Record<string, string>;
  listFieldKey: string | undefined;
  searchFieldKey: string | undefined;
  canSearch: boolean;
  /** Every uncommitted construction edit, in chronological playback order. */
  draftMutations: readonly DraftMutation[];
  draftMutation: DraftMutation | undefined;
  /** Promotes a set built through repeated Insert actions into the full algorithm timeline. */
  runDraft: () => "none" | "started" | "invalid";
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  randomize: (lvl?: Level, options?: { announce?: boolean }) => void;
  applyFields: (fields: Record<string, string>, options?: { announce?: boolean; autoPlay?: boolean }) => void;
  shuffleInput: () => void;
  clearInput: () => void;
  insertValue: (raw: string, options?: { startNewSet?: boolean }) => void;
  removeValue: (raw: string) => void;
  editValue: (oldRaw: string, newRaw: string) => void;
  searchValue: (raw: string) => void;
  /** Parse + push a full field set as a live (auto-playing) edit; throws the module's friendly error on invalid input. Used by the shell's grid-cell editor. */
  commitLiveFields: (fields: Record<string, string>) => void;
  /** True immediately after any live action above — read once by the caller's auto-play effect, which resets it back to false. */
  consumeLiveActionFlag: () => boolean;
  /** One-shot player destination requested by Undo/Redo. */
  consumeNavigationRequest: () => "start" | "end" | undefined;
  consumeOperation: () => OperationRequest<I> | undefined;
}

export interface UseLiveInputOptions {
  /** Called when Clear can't produce a valid dataset (e.g. a required field emptied) so the caller can prompt for manual input. */
  onClearNeedsManualInput?: (fields: Record<string, string>) => void;
  /** Values in the frame the learner is currently viewing, used to continue edits from that state. */
  getCurrentListValues?: () => string[] | undefined;
}

export function useLiveInput<I>(
  module: AlgorithmModule<unknown, I>,
  initialFields: Record<string, string> | undefined,
  defaultLevel: Level,
  options?: UseLiveInputOptions,
): LiveInput<I> {
  const { t, locale } = useLocale();
  const [level, setLevel] = React.useState<Level>(defaultLevel);
  const [revision, setRevision] = React.useState(0);

  const searchFieldKey = React.useMemo(() => searchFieldKeyOf(module), [module]);
  const listFieldKey = React.useMemo(() => listFieldKeyOf(module), [module]);
  const canSearch = Boolean(searchFieldKey || supportsGenericSearch(module));

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
  const navigationRef = React.useRef<"start" | "end" | undefined>(undefined);
  const operationRef = React.useRef<OperationRequest<I> | undefined>(undefined);
  const [draftMutations, setDraftMutations] = React.useState<DraftMutation[]>([]);
  const [draftRedoMutations, setDraftRedoMutations] = React.useState<DraftMutation[]>([]);
  const draftMutation = draftMutations.at(-1);
  const appendDraftMutation = React.useCallback((mutation: DraftMutation, branchFrom?: readonly string[]) => {
    setDraftRedoMutations([]);
    setDraftMutations((current) => {
      let base = current;
      if (branchFrom && !sameDraftDataset(module.renderer, current.at(-1)?.after ?? [], branchFrom)) {
        const branchIndex = current.findLastIndex((item) => sameDraftDataset(module.renderer, item.after, branchFrom));
        base = branchIndex >= 0 ? current.slice(0, branchIndex + 1) : [];
      }
      return [...base, mutation].slice(-50);
    });
  }, [module.renderer]);
  const appendDraftMutations = React.useCallback((mutations: readonly DraftMutation[], branchFrom?: readonly string[]) => {
    if (mutations.length === 0) return;
    setDraftRedoMutations([]);
    setDraftMutations((current) => {
      let base = current;
      if (branchFrom && !sameDraftDataset(module.renderer, current.at(-1)?.after ?? [], branchFrom)) {
        const branchIndex = current.findLastIndex((item) => sameDraftDataset(module.renderer, item.after, branchFrom));
        base = branchIndex >= 0 ? current.slice(0, branchIndex + 1) : [];
      }
      return [...base, ...mutations].slice(-50);
    });
  }, [module.renderer]);
  const clearDraftHistory = React.useCallback(() => {
    setDraftMutations([]);
    setDraftRedoMutations([]);
  }, []);
  const currentDraftValues = () => {
    const visible = options?.getCurrentListValues?.();
    // Playback starts every new operation on its "before" frame. While that
    // short animation is still running the canvas can legitimately be empty
    // (notably for the first tree node). That is not an instruction to throw
    // away the pending operation: continue from the latest constructed set.
    if (!draftMutation || !visible || visible.length === 0) return draftMutation?.after ?? visible;
    const matchingMutation = draftMutations.findLast((item) => sameDraftDataset(module.renderer, item.after, visible));
    return matchingMutation?.after ?? draftMutation.after;
  };
  const consumeLiveActionFlag = React.useCallback(() => {
    const v = liveActionRef.current;
    liveActionRef.current = false;
    return v;
  }, []);
  const consumeNavigationRequest = React.useCallback(() => {
    const request = navigationRef.current;
    navigationRef.current = undefined;
    return request;
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
    (lvl: Level = level, actionOptions?: { announce?: boolean }) => {
      clearDraftHistory();
      operationRef.current = undefined;
      liveActionRef.current = true;
      pushInput(module.defaultInput(lvl, createRNG(randomSeed())) as I);
      setRevision((value) => value + 1);
      if (actionOptions?.announce !== false) {
        const algorithm = locale === "ar" ? module.titleAr ?? module.title : module.title;
        toast.success(t("shell.randomInitialized", { algorithm, difficulty: t(LEVEL_LABEL_KEYS[lvl]) }));
      }
    },
    [module, level, locale, pushInput, t, clearDraftHistory],
  );

  const applyFields = (fields: Record<string, string>, actionOptions?: { announce?: boolean; autoPlay?: boolean }) => {
    const parsed = module.parseInput(fields) as I; // throws friendly errors
    clearDraftHistory();
    operationRef.current = undefined;
    liveActionRef.current = actionOptions?.autoPlay !== false;
    pushInput(parsed);
    setRevision((value) => value + 1);
    if (actionOptions?.announce !== false) {
      const algorithm = locale === "ar" ? module.titleAr ?? module.title : module.title;
      toast.success(t("shell.customInitialized", { algorithm }));
    }
  };

  const commitLiveFields = (fields: Record<string, string>) => {
    const parsed = module.parseInput(fields) as I; // throws friendly errors
    pushInput(parsed);
    liveActionRef.current = true;
    operationRef.current = { kind: "edit-grid", before: input, after: parsed, detail: "the selected cell edit" };
    setRevision((value) => value + 1);
  };

  const commitOperation = (kind: LiveOperationKind, parsed: I, detail: string, value?: string) => {
    pushInput(parsed);
    liveActionRef.current = true;
    operationRef.current = { kind, before: input, after: parsed, detail, value };
    setRevision((current) => current + 1);
  };

  const shuffleInput = () => {
    if (draftMutation) {
      const before = currentDraftValues() ?? draftMutation.after;
      const shuffled = [...before];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      appendDraftMutation({ before, after: shuffled, kind: "shuffle", detail: "shuffling the current set" }, before);
      operationRef.current = undefined;
      liveActionRef.current = true;
      setRevision((value) => value + 1);
      toast.success(t("shell.shuffled"));
      return;
    }
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
      clearDraftHistory();
      toast.success(t("shell.cleared"));
    } catch {
      const currentValues = currentDraftValues()
        ?? (listFieldKey ? (fields[listFieldKey] ?? "").split(",").map((value) => value.trim()).filter(Boolean) : []);
      appendDraftMutation({ before: currentValues, after: [], kind: "clear", detail: "clearing the current set" }, currentValues);
      operationRef.current = undefined;
      liveActionRef.current = true;
      setRevision((value) => value + 1);
      toast.success(t("shell.cleared"));
    }
  };

  const insertValue = (raw: string, actionOptions?: { startNewSet?: boolean }) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const current = fields[listFieldKey] ?? "";
    const currentTokens = currentDraftValues()
      ?? current.split(",").map((token) => token.trim()).filter(Boolean);
    const incoming = raw.split(",").map((token) => token.trim()).filter(Boolean);
    if (incoming.length === 0) return;
    const startingFresh = Boolean(actionOptions?.startNewSet) && !draftMutation;
    const before = startingFresh ? [] : currentTokens;
    const tokens = [...before, ...incoming];
    if ((startingFresh || draftMutation) && canVisualizeDraft(module.renderer, tokens)) {
      // A comma-separated insert is still a series of individual learner
      // actions.  Keeping one mutation per token lets Previous reveal every
      // node/element entering the structure and lets a self-balancing tree
      // animate the balancing caused by each specific key.
      const mutations: DraftMutation[] = [];
      let partial = [...before];
      for (const value of incoming) {
        const next = [...partial, value];
        mutations.push({ before: partial, after: next, kind: "insert", detail: `inserting ${value}` });
        partial = next;
      }
      appendDraftMutations(mutations, before);
      operationRef.current = undefined;
      liveActionRef.current = true;
      setRevision((value) => value + 1);
      toast.success(t("shell.toastInserted", { value: raw }));
      return;
    }
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      commitOperation("insert", module.parseInput(next) as I, `inserting ${raw}`);
      clearDraftHistory();
      toast.success(t("shell.toastInserted", { value: raw }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotInsert"));
    }
  };

  const removeValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = currentDraftValues()
      ?? (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === raw.trim());
    if (idx === -1) {
      toast.info(t("shell.toastNotInValues", { value: raw }));
      return;
    }
    const before = [...tokens];
    tokens.splice(idx, 1);
    if (draftMutation && canVisualizeDraft(module.renderer, tokens)) {
      appendDraftMutation({ before, after: tokens, kind: "delete", detail: `removing ${raw}` }, before);
      operationRef.current = undefined;
      liveActionRef.current = true;
      setRevision((value) => value + 1);
      toast.success(t("shell.toastRemoved", { value: raw }));
      return;
    }
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      commitOperation("delete", module.parseInput(next) as I, `removing ${raw}`);
      clearDraftHistory();
      toast.success(t("shell.toastRemoved", { value: raw }));
    } catch (e) {
      if (canVisualizeDraft(module.renderer, tokens)) {
        appendDraftMutation({ before, after: tokens, kind: "delete", detail: `removing ${raw}` }, before);
        operationRef.current = undefined;
        liveActionRef.current = true;
        setRevision((value) => value + 1);
        toast.success(t("shell.toastRemoved", { value: raw }));
        return;
      }
      toast.error(e instanceof Error ? e.message : t("shell.couldNotRemove"));
    }
  };

  const editValue = (oldRaw: string, newRaw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = currentDraftValues()
      ?? (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === oldRaw.trim());
    if (idx === -1) {
      toast.info(t("shell.toastNotInValues", { value: oldRaw }));
      return;
    }
    const before = [...tokens];
    tokens[idx] = newRaw.trim();
    if (draftMutation && canVisualizeDraft(module.renderer, tokens)) {
      appendDraftMutation({ before, after: tokens, kind: "update", detail: `changing ${oldRaw} to ${newRaw}` }, before);
      operationRef.current = undefined;
      liveActionRef.current = true;
      setRevision((value) => value + 1);
      toast.success(t("shell.toastChanged", { old: oldRaw, new: newRaw }));
      return;
    }
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      commitOperation("update", module.parseInput(next) as I, `changing ${oldRaw} to ${newRaw}`);
      clearDraftHistory();
      toast.success(t("shell.toastChanged", { old: oldRaw, new: newRaw }));
    } catch (e) {
      if (canVisualizeDraft(module.renderer, tokens)) {
        appendDraftMutation({ before, after: tokens, kind: "update", detail: `changing ${oldRaw} to ${newRaw}` }, before);
        operationRef.current = undefined;
        liveActionRef.current = true;
        setRevision((value) => value + 1);
        toast.success(t("shell.toastChanged", { old: oldRaw, new: newRaw }));
        return;
      }
      toast.error(e instanceof Error ? e.message : t("shell.couldNotEdit"));
    }
  };

  const searchValue = (raw: string) => {
    if (!canSearch) return;
    if (draftMutation) {
      operationRef.current = { kind: "search", before: input, after: input, detail: `searching for ${raw}`, value: raw };
      liveActionRef.current = true;
      setRevision((value) => value + 1);
      toast.success(t("shell.toastSearching", { value: raw }));
      return;
    }
    const fields = module.serializeInput(input);
    const next = searchFieldKey ? { ...fields, [searchFieldKey]: raw } : fields;
    try {
      commitOperation("search", module.parseInput(next) as I, `searching for ${raw}`, raw);
      toast.success(t("shell.toastSearching", { value: raw }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotSearch"));
    }
  };

  const runDraft = (): "none" | "started" | "invalid" => {
    if (!draftMutation || !listFieldKey) return "none";
    const fields = module.serializeInput(input);
    try {
      const parsed = module.parseInput({ ...fields, [listFieldKey]: draftMutation.after.join(", ") }) as I;
      clearDraftHistory();
      operationRef.current = undefined;
      liveActionRef.current = true;
      pushInput(parsed);
      setRevision((value) => value + 1);
      const algorithm = locale === "ar" ? module.titleAr ?? module.title : module.title;
      toast.success(t("shell.customInitialized", { algorithm }));
      return "started";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.invalidInput"));
      return "invalid";
    }
  };

  const currentFields = () => {
    const fields = module.serializeInput(input);
    if (!listFieldKey || !draftMutation) return fields;
    const values = currentDraftValues() ?? draftMutation.after;
    return { ...fields, [listFieldKey]: values.join(", ") };
  };

  return {
    revision,
    level,
    setLevel,
    input,
    currentFields,
    listFieldKey,
    searchFieldKey,
    canSearch,
    draftMutations,
    draftMutation,
    runDraft,
    canUndo: draftMutations.length > 0 || hIndex > 0,
    canRedo: draftRedoMutations.length > 0 || hIndex < history.length - 1,
    undo: () => {
      if (draftMutations.length > 0) {
        const mutation = draftMutations.at(-1)!;
        setDraftMutations((current) => current.slice(0, -1));
        setDraftRedoMutations((current) => [mutation, ...current]);
        navigationRef.current = "end";
      } else {
        setHIndex((i) => Math.max(0, i - 1));
        navigationRef.current = "start";
      }
      setRevision((value) => value + 1);
    },
    redo: () => {
      if (draftRedoMutations.length > 0) {
        const mutation = draftRedoMutations[0];
        setDraftRedoMutations((current) => current.slice(1));
        setDraftMutations((current) => [...current, mutation]);
        navigationRef.current = "end";
      } else {
        setHIndex((i) => Math.min(history.length - 1, i + 1));
        navigationRef.current = "start";
      }
      setRevision((value) => value + 1);
    },
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
    consumeNavigationRequest,
    consumeOperation,
  };
}
