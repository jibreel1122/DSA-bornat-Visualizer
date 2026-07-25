"use client";

import * as React from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import {
  Camera,
  Bug,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Dices,
  Eraser,
  FileDown,
  FileUp,
  FastForward,
  FolderOpen,
  Gauge,
  HelpCircle,
  ImageDown,
  ListMinus,
  ListPlus,
  Lightbulb,
  Pause,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Rewind,
  Save,
  Search,
  Shuffle,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useVisualizerPlayer } from "@/lib/engine/player";
import { LEVELS, MAX_STEPS, type AlgorithmModule, type ArrayFrame, type Level, type ListFrame, type Step, type TreeFrame } from "@/lib/engine/types";
import { bridgeIncrementalSteps, enrichSteps } from "@/lib/engine/learning";
import { buildGenericSearchSteps } from "@/lib/engine/search-steps";
import { buildDraftMutationTimelineSteps, resolveDraftMutationFrames } from "@/lib/engine/draft-steps";
import { useLiveInput, type LiveInput } from "@/lib/engine/use-live-input";
import { useSettings } from "@/components/providers/settings-provider";
import { useLearning } from "@/components/providers/learning-provider";
import { useLocale } from "@/lib/i18n";
import { cn, downloadText, readFileAsText } from "@/lib/utils";
import { RendererSwitch } from "./renderers";
import { ZoomPan, type ZoomPanHandle } from "./zoom-pan";
import { StatsPanel } from "./stats-panel";
import { InputDialog } from "./input-dialog";
import { EditPromptButton, ValuePromptButton } from "./value-prompt-button";
import type { SharedPlayback } from "./compare-session";
import type { DictKey } from "@/lib/i18n";

interface SavedState {
  slug: string;
  fields: Record<string, string>;
  cursor: number;
}

const LEVEL_LABEL_KEYS: Record<Level, DictKey> = {
  1: "shell.level1",
  2: "shell.level2",
  3: "shell.level3",
  4: "shell.level4",
  5: "shell.level5",
};

const SHORTCUTS: { keys: string[]; labelKey: DictKey }[] = [
  { keys: ["Space"], labelKey: "shell.shortcutPlayPause" },
  { keys: ["←"], labelKey: "shell.shortcutPrevStep" },
  { keys: ["→"], labelKey: "shell.shortcutNextStep" },
  { keys: ["R"], labelKey: "shell.shortcutReset" },
  { keys: ["F"], labelKey: "shell.shortcutFullscreen" },
  { keys: ["+"], labelKey: "shell.shortcutSpeedUp" },
  { keys: ["-"], labelKey: "shell.shortcutSlowDown" },
];

function visibleListValues(step: Step | undefined, renderer: AlgorithmModule["renderer"]): string[] | undefined {
  if (!step) return undefined;
  if (renderer === "array") return (step.frame as ArrayFrame).values.map(String);
  if (renderer === "list") return (step.frame as ListFrame).nodes.map((node) => String(node.value));
  if (renderer === "tree") {
    const frame = step.frame as TreeFrame;
    const values: string[] = [];
    const queue = frame.rootId ? [frame.rootId] : [];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const node = frame.nodes[id];
      if (!node) continue;
      values.push(String(node.value));
      for (const child of node.children ?? [node.left, node.right]) if (child) queue.push(child);
    }
    return values;
  }
  return undefined;
}

/**
 * Universal interactive visualization shell. Provides the full control
 * surface for any algorithm module: playback, scrubbing, speed, difficulty,
 * random/manual input, undo/redo, save/load, JSON + PNG/SVG export,
 * zoom/pan/fullscreen, keyboard shortcuts, pseudocode + stats side panel.
 */
export function VisualizerShell({
  module,
  initialFields,
  liveInput: externalLiveInput,
  showBuilderBar = true,
  onLiveReady,
  sharedPlayback,
  panelIndex,
}: {
  module: AlgorithmModule;
  /** optional pre-filled manual input (deep links, playground hand-off) */
  initialFields?: Record<string, string>;
  /** Provided by CompareShell to drive this panel from shared/synced state; omit for a standalone page. */
  liveInput?: LiveInput;
  /** Set false to hide the inline Insert/Delete/Edit/Search group (CompareShell drives these from a shared bar in synced mode). */
  showBuilderBar?: boolean;
  /** Reports this panel's own live-input up so a shared bar can broadcast actions to every panel (synced compare mode). */
  onLiveReady?: (live: LiveInput) => void;
  /** A compare page can replace this panel's local clock with one shared, semantic clock. */
  sharedPlayback?: SharedPlayback;
  panelIndex?: number;
}) {
  const { settings } = useSettings();
  const { recordStudy } = useLearning();
  const { t, locale } = useLocale();
  const [inputOpen, setInputOpen] = React.useState(false);
  const [dialogPreset, setDialogPreset] = React.useState<Record<string, string> | null>(null);
  const lastVisibleStep = React.useRef<Step | undefined>(undefined);

  // Live-input state (level, undo/redo history, insert/delete/edit/search).
  // Standalone pages own a private instance; CompareShell passes a shared one.
  const ownLiveInput = useLiveInput(module, initialFields, settings.defaultLevel, {
    onClearNeedsManualInput: (fields) => {
      setDialogPreset(fields);
      setInputOpen(true);
    },
    getCurrentListValues: () => sharedPlayback?.active
      ? undefined
      : visibleListValues(lastVisibleStep.current, module.renderer),
  });
  const live = externalLiveInput ?? ownLiveInput;
  const { level, listFieldKey, searchFieldKey, canSearch, revision, consumeOperation } = live;
  const input = live.input;
  const serializedInput = live.currentFields();

  React.useEffect(() => {
    recordStudy(module.slug, module.category);
  }, [module.slug, module.category, recordStudy]);

  // Report our own live-input up so a shared compare bar can drive every panel.
  React.useEffect(() => {
    onLiveReady?.(ownLiveInput);
  });

  // ---- steps ----
  const { steps, error, liveStartIndex } = React.useMemo((): { steps: Step[]; error: string | null; liveStartIndex: number } => {
    try {
      const operation = consumeOperation();
      const genericSearch = operation?.kind === "search" && !searchFieldKey
        ? buildGenericSearchSteps(
            module,
            // Search must start from the complete current structure, not
            // whichever intermediate insertion frame happened to be on screen
            // when the learner opened the search dialog. Draft sets are the
            // exception: their timeline is the source of truth until Run.
            live.draftMutation
              ? lastVisibleStep.current
              : (module.generate(input).at(-1) as Step | undefined) ?? lastVisibleStep.current,
            operation.value ?? "",
          )
        : [];
      const draftSteps = live.draftMutations.length > 0 && !operation
        ? buildDraftMutationTimelineSteps(
            module.renderer,
            live.draftMutations,
            live.draftMutations.map((mutation) =>
              resolveDraftMutationFrames(module, input, listFieldKey, mutation),
            ),
          )
        : [];
      const generated = genericSearch.length > 0
        ? genericSearch
        : draftSteps.length > 0
          ? draftSteps
        : operation && module.generateOperation
          ? module.generateOperation(operation)
          : module.generate(input);
      const continuous = operation && !module.generateOperation && genericSearch.length === 0 && !live.draftMutation
        ? bridgeIncrementalSteps(lastVisibleStep.current, generated as Step[], operation.detail ?? operation.kind)
        : generated as Step[];
      return {
        steps: enrichSteps(continuous.slice(0, MAX_STEPS)),
        error: null,
        liveStartIndex: draftSteps.length > 0 ? Math.max(0, draftSteps.length - 2) : 0,
      };
    } catch (e) {
      return { steps: [], error: e instanceof Error ? e.message : t("shell.failedToGenerate"), liveStartIndex: 0 };
    }
  }, [module, input, listFieldKey, searchFieldKey, consumeOperation, live.draftMutation, live.draftMutations, t]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const player = useVisualizerPlayer(steps.length, settings.defaultSpeed);
  const pendingRestoreCursor = React.useRef<number | null>(null);
  const { goto: gotoPlayer } = player;
  const step = steps[player.cursor];

  React.useEffect(() => {
    if (!sharedPlayback || panelIndex === undefined) return;
    sharedPlayback.reportTimeline(panelIndex, steps);
    gotoPlayer(sharedPlayback.targetFor(panelIndex, steps));
  }, [sharedPlayback, panelIndex, steps, gotoPlayer]);

  React.useEffect(() => {
    if (step) lastVisibleStep.current = step;
  }, [step]);

  const playerCursor = player.cursor;
  const playerPlaying = player.playing;
  const pausePlayer = player.pause;
  const previousCursor = React.useRef(playerCursor);
  React.useEffect(() => {
    const enteredTransformation = playerCursor > previousCursor.current && Boolean(step?.transformation);
    previousCursor.current = playerCursor;
    if (settings.pauseBeforeTransformations && playerPlaying && enteredTransformation) pausePlayer();
  }, [settings.pauseBeforeTransformations, playerCursor, playerPlaying, pausePlayer, step?.transformation]);

  // Auto-play through a live insert/delete/edit/search so the user watches
  // the new operation animate instead of landing silently on frame 0.
  // Must be declared AFTER useVisualizerPlayer so this effect runs after its
  // internal reset-on-stepCount-change effect — otherwise that effect's
  // setPlaying(false) wins and playback never starts.
  React.useEffect(() => {
    const liveAction = live.consumeLiveActionFlag();
    const navigation = live.consumeNavigationRequest();
    if (liveAction) {
      if (!sharedPlayback?.active) player.playFrom(liveStartIndex);
    } else if (!sharedPlayback?.active && navigation === "end") {
      player.goToEnd();
    } else if (!sharedPlayback?.active && navigation === "start") {
      player.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  React.useEffect(() => {
    if (pendingRestoreCursor.current === null) return;
    player.goto(pendingRestoreCursor.current);
    pendingRestoreCursor.current = null;
    // The restored input and its new step count settle in the same revision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, steps.length]);

  const draftPlayerAtEnd = player.atEnd;
  const draftPlayerPlaying = player.playing;
  const runDraft = live.runDraft;
  const togglePlayer = player.toggle;
  const togglePlayback = React.useCallback(() => {
    if (!draftPlayerPlaying && draftPlayerAtEnd && runDraft() !== "none") return;
    togglePlayer();
  }, [draftPlayerAtEnd, draftPlayerPlaying, runDraft, togglePlayer]);

  // ---- refs ----
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const zoomRef = React.useRef<ZoomPanHandle>(null);
  const codeListRef = React.useRef<HTMLOListElement>(null);

  // auto-scroll active pseudocode line into view
  React.useEffect(() => {
    if (step?.codeLine === undefined) return;
    const el = codeListRef.current?.children[step.codeLine] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step?.codeLine]);

  // ---- grid-cell editing (backtracking / grid renderers) ----
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
      live.commitLiveFields(next);
      toast.success(t("shell.toastCellSet", { row, col, char }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotEditCell"));
    }
  };

  const [cellEditTarget, setCellEditTarget] = React.useState<{ row: number; col: number } | null>(null);

  const exportJson = () => {
    const payload: SavedState = {
      slug: module.slug,
      fields: live.currentFields(),
      cursor: player.cursor,
    };
    downloadText(`${module.slug}-state.json`, JSON.stringify(payload, null, 2), "application/json");
    toast.success(t("shell.stateExported"));
  };

  const importJson = async () => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "application/json,.json";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await readFileAsText(file)) as SavedState;
        if (data.slug !== module.slug) {
          throw new Error(`This file belongs to "${data.slug}", not "${module.slug}".`);
        }
        pendingRestoreCursor.current = Number.isFinite(data.cursor) ? data.cursor : 0;
        live.applyFields(data.fields, { announce: false, autoPlay: false });
        toast.success(t("shell.stateImported"));
      } catch (e) {
        pendingRestoreCursor.current = null;
        toast.error(e instanceof Error ? e.message : t("shell.couldNotImport"));
      }
    };
    picker.click();
  };

  const saveLocal = () => {
    const payload: SavedState = {
      slug: module.slug,
      fields: live.currentFields(),
      cursor: player.cursor,
    };
    localStorage.setItem(`bdsv:save:${module.slug}`, JSON.stringify(payload));
    toast.success(t("shell.savedUseLoad"));
  };

  const loadLocal = () => {
    const raw = localStorage.getItem(`bdsv:save:${module.slug}`);
    if (!raw) {
      toast.info(t("shell.noSavedState"));
      return;
    }
    try {
      const data = JSON.parse(raw) as SavedState;
      pendingRestoreCursor.current = Number.isFinite(data.cursor) ? data.cursor : 0;
      live.applyFields(data.fields, { announce: false, autoPlay: false });
      toast.success(t("shell.savedStateLoaded"));
    } catch {
      pendingRestoreCursor.current = null;
      toast.error(t("shell.savedStateCorrupted"));
    }
  };

  const screenshot = async () => {
    if (!canvasRef.current) return;
    try {
      const url = await toPng(canvasRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${module.slug}.png`;
      a.click();
      toast.success(t("shell.screenshotSaved"));
    } catch {
      toast.error(t("shell.screenshotFailed"));
    }
  };

  const exportSvg = () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) {
      toast.info(t("shell.noSvgCanvas"));
      return;
    }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    downloadText(`${module.slug}.svg`, clone.outerHTML, "image/svg+xml");
    toast.success(t("shell.exportedSvg"));
  };

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const fullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  };

  // ---- keyboard shortcuts ----
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
        return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayback();
          break;
        case "ArrowRight":
          player.next();
          break;
        case "ArrowLeft":
          player.prev();
          break;
        case "r":
        case "R":
          player.reset();
          break;
        case "f":
        case "F":
          fullscreen();
          break;
        case "+":
        case "=":
          player.setSpeed(player.speed + 0.25);
          break;
        case "-":
          player.setSpeed(player.speed - 0.25);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlayback, player.next, player.prev, player.reset, player.setSpeed, player.speed]);

  const canUndo = live.canUndo;
  const canRedo = live.canRedo;
  let transformationStart = player.cursor;
  let transformationEnd = player.cursor;
  if (step?.transformation) {
    while (transformationStart > 0 && steps[transformationStart - 1]?.transformation) transformationStart--;
    while (transformationEnd < steps.length - 1 && steps[transformationEnd + 1]?.transformation) transformationEnd++;
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-col gap-3 bg-background",
        isFullscreen && "h-screen w-full overflow-y-auto p-3",
      )}
    >
      <Card className={cn("overflow-hidden p-0", isFullscreen && "flex flex-1 flex-col")}>
        <div
          className={cn(
            "grid lg:grid-cols-[minmax(0,1fr)_300px]",
            isFullscreen && "flex-1 lg:grid",
          )}
        >
          {/* canvas */}
          <div
            ref={canvasRef}
            data-viz-canvas
            className={cn(
              "relative bg-background/60 lg:border-r lg:border-border",
              isFullscreen ? "h-[60vh] lg:h-full" : "h-[380px] sm:h-[440px]",
            )}
          >
            <ZoomPan ref={zoomRef} onFullscreen={fullscreen}>
              {step ? (
                <RendererSwitch
                  kind={module.renderer}
                  frame={step.frame}
                  onCellClick={gridFieldKey ? (row, col) => setCellEditTarget({ row, col }) : undefined}
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  {error ?? t("shell.noSteps")}
                </div>
              )}
            </ZoomPan>
          </div>

          {/* side panel */}
          <aside
            className={cn(
              "flex flex-col border-t border-border lg:border-t-0",
              isFullscreen ? "lg:max-h-none" : "max-h-[440px]",
            )}
          >
            <Tabs defaultValue="pseudocode" className="flex min-h-0 flex-1 flex-col">
              <TabsList className={cn("m-2 grid", settings.debugMode ? "grid-cols-3" : "grid-cols-2")}>
                <TabsTrigger value="pseudocode">{t("shell.tabPseudocode")}</TabsTrigger>
                <TabsTrigger value="stats">{t("shell.tabStatistics")}</TabsTrigger>
                {settings.debugMode && <TabsTrigger value="debug"><Bug className="size-3.5" /> {t("learning.debug")}</TabsTrigger>}
              </TabsList>
              <TabsContent value="pseudocode" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <ol ref={codeListRef} className="font-mono text-[11.5px] leading-relaxed">
                  {module.pseudocode.map((line, i) => (
                    <li
                      key={i}
                      className={cn(
                        "whitespace-pre rounded px-2 py-0.5 transition-colors",
                        step?.codeLine === i
                          ? "bg-primary/15 font-semibold text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {line || " "}
                    </li>
                  ))}
                </ol>
              </TabsContent>
              <TabsContent value="stats" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <StatsPanel step={step} cursor={player.cursor} total={steps.length} />
              </TabsContent>
              {settings.debugMode && (
                <TabsContent value="debug" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3 text-xs">
                  <div className="grid gap-3">
                    <DebugRow label={t("learning.phase")} value={step?.phase ?? "execute"} />
                    <DebugRow label="Operation" value={step?.debug?.operation ?? step?.description ?? "—"} />
                    {step?.codeLine !== undefined && <DebugRow label="Pseudocode line" value={step.codeLine + 1} />}
                    {step?.debug?.condition && <DebugRow label={t("learning.condition")} value={step.debug.condition} />}
                    <DebugValues label={t("learning.variables")} values={{ ...step?.debug?.variables, ...step?.debug?.pointers }} />
                    {step?.debug?.dataStructures?.map((item) => (
                      <DebugRow key={item.label} label={item.label} value={item.values.join(", ")} />
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </aside>
        </div>

        {/* narration */}
        <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
          <span className="me-2 rounded-md bg-primary/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary tabular-nums">
            {steps.length === 0 ? "—" : `${player.cursor + 1}/${steps.length}`}
          </span>
          {step ? (locale === "ar" && step.descriptionAr ? step.descriptionAr : step.description) : t("shell.generateToBegin")}
        </div>

        {(step?.why || (settings.realWorldMode && step)) && (
          <div className="grid gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
            {step?.why && (
              <div className="flex gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div><span className="font-medium text-foreground">{t("learning.why")}:</span> {locale === "ar" && step.whyAr ? step.whyAr : step.why}</div>
              </div>
            )}
            {settings.realWorldMode && step && (
              <div className="flex gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-sky-500" />
                <div><span className="font-medium text-foreground">{t("learning.realWorld")}:</span> {locale === "ar" && step.realWorld?.descriptionAr ? step.realWorld.descriptionAr : step.realWorld?.description ?? "Follow the same state change as you would when organizing real items: inspect, decide, then update only what is necessary."}</div>
              </div>
            )}
          </div>
        )}

        {/* playback */}
        {!sharedPlayback?.active && (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Slider
              value={[player.cursor]}
              min={0}
              max={Math.max(0, steps.length - 1)}
              step={1}
              onValueChange={([v]) => player.goto(v)}
              aria-label={t("shell.stepScrubber")}
              className="flex-1"
            />
          </div>
          {/* Timeline controls use fixed chronological directions; dir=ltr prevents accidental RTL icon mirroring. */}
          <div dir="ltr" className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-between">
            <div className="flex items-center gap-1">
              <IconBtn label={t("shell.reset")} onClick={player.reset} disabled={player.atStart}>
                <RotateCcw />
              </IconBtn>
              <IconBtn label={t("shell.firstStep")} onClick={() => player.goto(0)} disabled={player.atStart}>
                <ChevronFirst />
              </IconBtn>
              <IconBtn label={t("shell.previous")} onClick={player.prev} disabled={player.atStart}>
                <ChevronLeft />
              </IconBtn>
              <Button
                size="icon"
                onClick={togglePlayback}
                aria-label={player.playing ? t("shell.pause") : t("shell.play")}
                className="mx-1 rounded-full shadow-lg shadow-primary/30"
              >
                {/* physical: optical nudge for the Play triangle's fixed geometry (icon never mirrors under RTL) */}
                {player.playing ? <Pause /> : <Play className="ml-0.5" />}
              </Button>
              <IconBtn label={t("shell.next")} onClick={player.next} disabled={player.atEnd}>
                <ChevronRight />
              </IconBtn>
              <IconBtn label={t("shell.lastStep")} onClick={player.goToEnd} disabled={player.atEnd}>
                <ChevronLast />
              </IconBtn>
              {step?.transformation && (
                <>
                  <IconBtn label={t("learning.replayTransformation")} onClick={() => player.goto(Math.max(0, transformationStart))}>
                    <Rewind />
                  </IconBtn>
                  <IconBtn label={t("learning.skipTransformation")} onClick={() => player.goto(Math.min(steps.length - 1, transformationEnd + 1))}>
                    <FastForward />
                  </IconBtn>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-muted-foreground" />
              <Slider
                value={[player.speed]}
                min={0.25}
                max={4}
                step={0.25}
                onValueChange={([v]) => player.setSpeed(v)}
                className="w-28"
                aria-label={t("shell.animationSpeed")}
              />
              <span className="w-10 font-mono text-xs text-muted-foreground tabular-nums">
                {player.speed}×
              </span>
            </div>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t("shell.keyboardShortcuts")}>
                      <HelpCircle />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{t("shell.keyboardShortcuts")}</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-64">
                <p className="mb-2 text-sm font-semibold">{t("shell.keyboardShortcuts")}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                  {SHORTCUTS.map(({ keys, labelKey }) => (
                    <React.Fragment key={labelKey}>
                      <dt className="flex items-center gap-1">
                        {keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                          >
                            {k}
                          </kbd>
                        ))}
                      </dt>
                      <dd className="text-muted-foreground">{t(labelKey)}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("shell.shortcutsDisabled")}
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        )}

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-muted/30 px-4 py-2.5">
          {/* input-mutation cluster — hidden in synced compare mode, where a shared bar drives every panel */}
          {showBuilderBar && (
          <>
          <Select
            value={String(level)}
            onValueChange={(v) => {
              const lvl = Number(v) as Level;
              live.setLevel(lvl);
              live.randomize(lvl);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.level} value={String(l.level)}>
                  {t(LEVEL_LABEL_KEYS[l.level])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" size="sm" onClick={() => live.randomize()}>
            <Dices /> {t("shell.random")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDialogPreset(null);
              setInputOpen(true);
            }}
          >
            <SlidersHorizontal /> {t("shell.customInput")}
          </Button>
          <IconBtn label={t("shell.shuffleValues")} onClick={live.shuffleInput}>
            <Shuffle />
          </IconBtn>
          <IconBtn label={t("shell.clearValues")} onClick={live.clearInput}>
            <Eraser />
          </IconBtn>
          {(listFieldKey || canSearch) && (
            <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-1">
              {listFieldKey && (
                <ValuePromptButton
                  icon={<ListPlus />}
                  label={t("shell.insertValue")}
                  placeholder={t("shell.placeholderExample")}
                  confirmLabel={t("shell.confirmInsert")}
                  onSubmit={(value) => live.insertValue(value, { startNewSet: player.atStart && !player.playing })}
                  emphasized
                />
              )}
              {listFieldKey && (
                <ValuePromptButton
                  icon={<ListMinus />}
                  label={t("shell.deleteValue")}
                  placeholder={t("shell.placeholderExample")}
                  confirmLabel={t("shell.confirmDelete")}
                  onSubmit={live.removeValue}
                  emphasized
                />
              )}
              {listFieldKey && (
                <EditPromptButton
                  icon={<Pencil />}
                  label={t("shell.editValue")}
                  oldPlaceholder={t("shell.placeholderCurrentValue")}
                  newPlaceholder={t("shell.placeholderNewValue")}
                  confirmLabel={t("shell.confirmEdit")}
                  onSubmit={live.editValue}
                />
              )}
              {canSearch && (
                <ValuePromptButton
                  icon={<Search />}
                  label={t("shell.searchValue")}
                  placeholder={t("shell.placeholderExample")}
                  confirmLabel={t("shell.confirmSearch")}
                  onSubmit={live.searchValue}
                  emphasized
                />
              )}
            </div>
          )}

          <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

          <IconBtn label={t("shell.undo")} onClick={live.undo} disabled={!canUndo}>
            <Undo2 />
          </IconBtn>
          <IconBtn label={t("shell.redo")} onClick={live.redo} disabled={!canRedo}>
            <Redo2 />
          </IconBtn>
          </>
          )}

          <div className="ms-auto flex items-center gap-1.5">
            <IconBtn label={t("shell.saveState")} onClick={saveLocal}>
              <Save />
            </IconBtn>
            <IconBtn label={t("shell.loadState")} onClick={loadLocal}>
              <FolderOpen />
            </IconBtn>
            <IconBtn label={t("shell.exportJson")} onClick={exportJson}>
              <FileDown />
            </IconBtn>
            <IconBtn label={t("shell.importJson")} onClick={importJson}>
              <FileUp />
            </IconBtn>
            <IconBtn label={t("shell.screenshotPng")} onClick={screenshot}>
              <Camera />
            </IconBtn>
            <IconBtn label={t("shell.exportSvg")} onClick={exportSvg}>
              <ImageDown />
            </IconBtn>
          </div>
        </div>
      </Card>

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

      <InputDialog
        open={inputOpen}
        onOpenChange={(o) => {
          setInputOpen(o);
          if (!o) setDialogPreset(null);
        }}
        fields={module.inputFields}
        initial={dialogPreset ?? serializedInput}
        onSubmit={live.applyFields}
        parseInput={module.parseInput}
      />
    </div>
  );
}

function IconBtn({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DebugRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-0.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="break-words font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

function DebugValues({ label, values }: { label: string; values: Record<string, string | number | boolean | null | undefined> }) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return null;
  return <DebugRow label={label} value={entries.map(([key, value]) => `${key} = ${String(value)}`).join(" · ")} />;
}
