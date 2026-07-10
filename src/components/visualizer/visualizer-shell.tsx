"use client";

import * as React from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useVisualizerPlayer } from "@/lib/engine/player";
import { createRNG, randomSeed } from "@/lib/engine/random";
import { LEVELS, MAX_STEPS, type AlgorithmModule, type Level, type Step } from "@/lib/engine/types";
import { useSettings } from "@/components/providers/settings-provider";
import { useLocale } from "@/lib/i18n";
import { cn, downloadText, readFileAsText } from "@/lib/utils";
import { RendererSwitch } from "./renderers";
import { ZoomPan, type ZoomPanHandle } from "./zoom-pan";
import { StatsPanel } from "./stats-panel";
import { InputDialog } from "./input-dialog";
import { isListValue } from "./chip-list-input";
import { EditPromptButton, ValuePromptButton } from "./value-prompt-button";
import type { DictKey } from "@/lib/i18n";

interface SavedState {
  slug: string;
  fields: Record<string, string>;
  cursor: number;
}

const SEARCH_FIELD_KEYS = ["target", "search", "pattern"];

const SHORTCUTS: { keys: string[]; labelKey: DictKey }[] = [
  { keys: ["Space"], labelKey: "shell.shortcutPlayPause" },
  { keys: ["←"], labelKey: "shell.shortcutPrevStep" },
  { keys: ["→"], labelKey: "shell.shortcutNextStep" },
  { keys: ["R"], labelKey: "shell.shortcutReset" },
  { keys: ["F"], labelKey: "shell.shortcutFullscreen" },
  { keys: ["+"], labelKey: "shell.shortcutSpeedUp" },
  { keys: ["-"], labelKey: "shell.shortcutSlowDown" },
];

/**
 * Universal interactive visualization shell. Provides the full control
 * surface for any algorithm module: playback, scrubbing, speed, difficulty,
 * random/manual input, undo/redo, save/load, JSON + PNG/SVG export,
 * zoom/pan/fullscreen, keyboard shortcuts, pseudocode + stats side panel.
 */
export function VisualizerShell({
  module,
  initialFields,
}: {
  module: AlgorithmModule;
  /** optional pre-filled manual input (deep links, playground hand-off) */
  initialFields?: Record<string, string>;
}) {
  const { settings } = useSettings();
  const { t } = useLocale();
  const [level, setLevel] = React.useState<Level>(settings.defaultLevel);
  const [inputOpen, setInputOpen] = React.useState(false);
  const [dialogPreset, setDialogPreset] = React.useState<Record<string, string> | null>(null);

  const searchFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.search || SEARCH_FIELD_KEYS.includes(f.key))?.key,
    [module],
  );
  const listFieldKey = React.useMemo(
    () => module.inputFields.find((f) => f.list || f.key === "values")?.key,
    [module],
  );

  // ---- input history (undo/redo over dataset edits) ----
  const initialInput = React.useMemo(() => {
    if (initialFields) {
      try {
        return module.parseInput(initialFields);
      } catch {
        // fall through to a random dataset on malformed deep links
      }
    }
    return module.defaultInput(settings.defaultLevel, createRNG(randomSeed()));
    // module identity is stable per page; defaultLevel only seeds the first input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, initialFields]);
  const [history, setHistory] = React.useState<unknown[]>([initialInput]);
  const [hIndex, setHIndex] = React.useState(0);
  const input = history[hIndex];

  const pushInput = React.useCallback(
    (next: unknown) => {
      setHistory((h) => [...h.slice(0, hIndex + 1), next].slice(-50));
      setHIndex((i) => Math.min(i + 1, 49));
    },
    [hIndex],
  );

  // ---- steps ----
  const { steps, error } = React.useMemo((): { steps: Step[]; error: string | null } => {
    try {
      const s = module.generate(input) as Step[];
      return { steps: s.slice(0, MAX_STEPS), error: null };
    } catch (e) {
      return { steps: [], error: e instanceof Error ? e.message : t("shell.failedToGenerate") };
    }
  }, [module, input, t]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

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
      player.goto(0);
      player.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hIndex]);

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

  // ---- actions ----
  const randomize = React.useCallback(
    (lvl: Level = level) => {
      pushInput(module.defaultInput(lvl, createRNG(randomSeed())));
    },
    [module, level, pushInput],
  );

  const applyFields = (fields: Record<string, string>) => {
    const parsed = module.parseInput(fields); // throws friendly errors
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
      toast.info(t("shell.nothingToShuffle"));
      return;
    }
    try {
      pushInput(module.parseInput(next));
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
      pushInput(module.parseInput(next));
      toast.success(t("shell.cleared"));
    } catch {
      setDialogPreset(next);
      setInputOpen(true);
      toast.info(t("shell.enterNewValues"));
    }
  };

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
      toast.error(e instanceof Error ? e.message : t("shell.couldNotInsert"));
    }
  };

  const removeValue = (raw: string) => {
    if (!listFieldKey) return;
    const fields = module.serializeInput(input);
    const tokens = (fields[listFieldKey] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t === raw.trim());
    if (idx === -1) {
      toast.info(`"${raw}" ${t("shell.notInCurrentValues")}`);
      return;
    }
    tokens.splice(idx, 1);
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      pushInput(module.parseInput(next));
      liveActionRef.current = true;
      toast.success(`Removed ${raw}.`);
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
      toast.info(`"${oldRaw}" ${t("shell.notInCurrentValues")}`);
      return;
    }
    tokens[idx] = newRaw.trim();
    const next = { ...fields, [listFieldKey]: tokens.join(", ") };
    try {
      pushInput(module.parseInput(next));
      liveActionRef.current = true;
      toast.success(`Changed ${oldRaw} to ${newRaw}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shell.couldNotEdit"));
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
      toast.error(e instanceof Error ? e.message : t("shell.couldNotSearch"));
    }
  };

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

  const exportJson = () => {
    const payload: SavedState = {
      slug: module.slug,
      fields: module.serializeInput(input),
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
        const parsed = module.parseInput(data.fields);
        pushInput(parsed);
        toast.success(t("shell.stateImported"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("shell.couldNotImport"));
      }
    };
    picker.click();
  };

  const saveLocal = () => {
    const payload: SavedState = {
      slug: module.slug,
      fields: module.serializeInput(input),
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
      pushInput(module.parseInput(data.fields));
      toast.success(t("shell.savedStateLoaded"));
    } catch {
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
          player.toggle();
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
  }, [player.toggle, player.next, player.prev, player.reset, player.setSpeed, player.speed]);

  const canUndo = hIndex > 0;
  const canRedo = hIndex < history.length - 1;

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
              <TabsList className="m-2 grid grid-cols-2">
                <TabsTrigger value="pseudocode">{t("shell.tabPseudocode")}</TabsTrigger>
                <TabsTrigger value="stats">{t("shell.tabStatistics")}</TabsTrigger>
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
            </Tabs>
          </aside>
        </div>

        {/* narration */}
        <div className="border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
          <span className="mr-2 rounded-md bg-primary/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary tabular-nums">
            {steps.length === 0 ? "—" : `${player.cursor + 1}/${steps.length}`}
          </span>
          {step?.description ?? t("shell.generateToBegin")}
        </div>

        {/* playback */}
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
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-between">
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
                onClick={player.toggle}
                aria-label={player.playing ? t("shell.pause") : t("shell.play")}
                className="mx-1 rounded-full shadow-lg shadow-primary/30"
              >
                {player.playing ? <Pause /> : <Play className="ml-0.5" />}
              </Button>
              <IconBtn label={t("shell.next")} onClick={player.next} disabled={player.atEnd}>
                <ChevronRight />
              </IconBtn>
              <IconBtn label={t("shell.lastStep")} onClick={player.goToEnd} disabled={player.atEnd}>
                <ChevronLast />
              </IconBtn>
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
                aria-label="Animation speed"
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

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border bg-muted/30 px-4 py-2.5">
          <Select
            value={String(level)}
            onValueChange={(v) => {
              const lvl = Number(v) as Level;
              setLevel(lvl);
              randomize(lvl);
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.level} value={String(l.level)}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" size="sm" onClick={() => randomize()}>
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
          <IconBtn label={t("shell.shuffleValues")} onClick={shuffleInput}>
            <Shuffle />
          </IconBtn>
          <IconBtn label={t("shell.clearValues")} onClick={clearInput}>
            <Eraser />
          </IconBtn>
          {(listFieldKey || searchFieldKey) && (
            <div className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-1">
              {listFieldKey && (
                <ValuePromptButton
                  icon={<ListPlus />}
                  label={t("shell.insertValue")}
                  placeholder="e.g. 42"
                  confirmLabel="Insert"
                  onSubmit={insertValue}
                  emphasized
                />
              )}
              {listFieldKey && (
                <ValuePromptButton
                  icon={<ListMinus />}
                  label={t("shell.deleteValue")}
                  placeholder="e.g. 42"
                  confirmLabel="Delete"
                  onSubmit={removeValue}
                  emphasized
                />
              )}
              {listFieldKey && (
                <EditPromptButton
                  icon={<Pencil />}
                  label={t("shell.editValue")}
                  oldPlaceholder="current value"
                  newPlaceholder="new value"
                  confirmLabel="Edit"
                  onSubmit={editValue}
                />
              )}
              {searchFieldKey && (
                <ValuePromptButton
                  icon={<Search />}
                  label={t("shell.searchValue")}
                  placeholder="e.g. 42"
                  confirmLabel="Search"
                  onSubmit={searchValue}
                  emphasized
                />
              )}
            </div>
          )}

          <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

          <IconBtn label={t("shell.undo")} onClick={() => setHIndex((i) => i - 1)} disabled={!canUndo}>
            <Undo2 />
          </IconBtn>
          <IconBtn label={t("shell.redo")} onClick={() => setHIndex((i) => i + 1)} disabled={!canRedo}>
            <Redo2 />
          </IconBtn>

          <div className="ml-auto flex items-center gap-1.5">
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
        initial={dialogPreset ?? module.serializeInput(input)}
        onSubmit={applyFields}
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
