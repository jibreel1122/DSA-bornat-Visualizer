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
  FileDown,
  FileUp,
  FolderOpen,
  Gauge,
  ImageDown,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useVisualizerPlayer } from "@/lib/engine/player";
import { createRNG, randomSeed } from "@/lib/engine/random";
import { LEVELS, MAX_STEPS, type AlgorithmModule, type Level, type Step } from "@/lib/engine/types";
import { useSettings } from "@/components/providers/settings-provider";
import { cn, downloadText, readFileAsText } from "@/lib/utils";
import { RendererSwitch } from "./renderers";
import { ZoomPan, type ZoomPanHandle } from "./zoom-pan";
import { StatsPanel } from "./stats-panel";
import { InputDialog } from "./input-dialog";

interface SavedState {
  slug: string;
  fields: Record<string, string>;
  cursor: number;
}

/**
 * Universal interactive visualization shell. Provides the full control
 * surface for any algorithm module: playback, scrubbing, speed, difficulty,
 * random/manual input, undo/redo, save/load, JSON + PNG/SVG export,
 * zoom/pan/fullscreen, keyboard shortcuts, pseudocode + stats side panel.
 */
export function VisualizerShell({ module }: { module: AlgorithmModule }) {
  const { settings } = useSettings();
  const [level, setLevel] = React.useState<Level>(settings.defaultLevel);
  const [inputOpen, setInputOpen] = React.useState(false);

  // ---- input history (undo/redo over dataset edits) ----
  const initialInput = React.useMemo(
    () => module.defaultInput(settings.defaultLevel, createRNG(randomSeed())),
    // module identity is stable per page; defaultLevel only seeds the first input
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module],
  );
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
      return { steps: [], error: e instanceof Error ? e.message : "Failed to generate steps." };
    }
  }, [module, input]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const player = useVisualizerPlayer(steps.length, settings.defaultSpeed);
  const step = steps[player.cursor];

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

  const exportJson = () => {
    const payload: SavedState = {
      slug: module.slug,
      fields: module.serializeInput(input),
      cursor: player.cursor,
    };
    downloadText(`${module.slug}-state.json`, JSON.stringify(payload, null, 2), "application/json");
    toast.success("State exported as JSON.");
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
        toast.success("State imported.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not import file.");
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
    toast.success("Saved. Use Load to restore it any time.");
  };

  const loadLocal = () => {
    const raw = localStorage.getItem(`bdsv:save:${module.slug}`);
    if (!raw) {
      toast.info("No saved state for this algorithm yet.");
      return;
    }
    try {
      const data = JSON.parse(raw) as SavedState;
      pushInput(module.parseInput(data.fields));
      toast.success("Saved state loaded.");
    } catch {
      toast.error("Saved state is corrupted.");
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
      toast.success("Screenshot saved as PNG.");
    } catch {
      toast.error("Screenshot failed.");
    }
  };

  const exportSvg = () => {
    const svg = canvasRef.current?.querySelector("svg");
    if (!svg) {
      toast.info("This visualization has no SVG canvas — use PNG instead.");
      return;
    }
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    downloadText(`${module.slug}.svg`, clone.outerHTML, "image/svg+xml");
    toast.success("Exported SVG.");
  };

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
    <div ref={rootRef} className="flex flex-col gap-3 bg-background">
      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* canvas */}
          <div
            ref={canvasRef}
            data-viz-canvas
            className="relative h-[380px] bg-background/60 sm:h-[440px] lg:border-r lg:border-border"
          >
            <ZoomPan ref={zoomRef} onFullscreen={fullscreen}>
              {step ? (
                <RendererSwitch kind={module.renderer} frame={step.frame} />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  {error ?? "No steps to display."}
                </div>
              )}
            </ZoomPan>
          </div>

          {/* side panel */}
          <aside className="flex max-h-[440px] flex-col border-t border-border lg:border-t-0">
            <Tabs defaultValue="pseudocode" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="m-2 grid grid-cols-2">
                <TabsTrigger value="pseudocode">Pseudocode</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
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
          {step?.description ?? "Generate an input to begin."}
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
              aria-label="Step scrubber"
              className="flex-1"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-between">
            <div className="flex items-center gap-1">
              <IconBtn label="Reset (R)" onClick={player.reset} disabled={player.atStart}>
                <RotateCcw />
              </IconBtn>
              <IconBtn label="First step" onClick={() => player.goto(0)} disabled={player.atStart}>
                <ChevronFirst />
              </IconBtn>
              <IconBtn label="Previous (←)" onClick={player.prev} disabled={player.atStart}>
                <ChevronLeft />
              </IconBtn>
              <Button
                size="icon"
                onClick={player.toggle}
                aria-label={player.playing ? "Pause (Space)" : "Play (Space)"}
                className="mx-1 rounded-full shadow-lg shadow-primary/30"
              >
                {player.playing ? <Pause /> : <Play className="ml-0.5" />}
              </Button>
              <IconBtn label="Next (→)" onClick={player.next} disabled={player.atEnd}>
                <ChevronRight />
              </IconBtn>
              <IconBtn label="Last step" onClick={player.goToEnd} disabled={player.atEnd}>
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
            <Dices /> Random
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setInputOpen(true)}>
            <SlidersHorizontal /> Custom input
          </Button>

          <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

          <IconBtn label="Undo input change" onClick={() => setHIndex((i) => i - 1)} disabled={!canUndo}>
            <Undo2 />
          </IconBtn>
          <IconBtn label="Redo input change" onClick={() => setHIndex((i) => i + 1)} disabled={!canRedo}>
            <Redo2 />
          </IconBtn>

          <div className="ml-auto flex items-center gap-1.5">
            <IconBtn label="Save state" onClick={saveLocal}>
              <Save />
            </IconBtn>
            <IconBtn label="Load saved state" onClick={loadLocal}>
              <FolderOpen />
            </IconBtn>
            <IconBtn label="Export JSON" onClick={exportJson}>
              <FileDown />
            </IconBtn>
            <IconBtn label="Import JSON" onClick={importJson}>
              <FileUp />
            </IconBtn>
            <IconBtn label="Screenshot (PNG)" onClick={screenshot}>
              <Camera />
            </IconBtn>
            <IconBtn label="Export SVG" onClick={exportSvg}>
              <ImageDown />
            </IconBtn>
          </div>
        </div>
      </Card>

      <InputDialog
        open={inputOpen}
        onOpenChange={setInputOpen}
        fields={module.inputFields}
        initial={module.serializeInput(input)}
        onSubmit={applyFields}
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
