"use client";

import * as React from "react";
import { clamp } from "@/lib/utils";
import { createRNG, randomSeed } from "@/lib/engine/random";
import type { AlgorithmModule, Level, Step } from "@/lib/engine/types";
import type { LiveInput } from "@/lib/engine/use-live-input";

export type CompareMode = "synced" | "independent";
export type SyncStrategy = "progress" | "phase" | "operation";

export interface SharedPlayback {
  active: boolean;
  playing: boolean;
  speed: number;
  targetFor: (panel: number, steps: Step[]) => number;
  reportTimeline: (panel: number, steps: Step[]) => void;
}

const BASE_STEP_MS = 900;

/** A single comparison clock, with semantic alignment when frames expose phases or operations. */
export function useCompareSession(referenceModule: AlgorithmModule | undefined) {
  const [mode, setMode] = React.useState<CompareMode>("synced");
  const [strategy, setStrategy] = React.useState<SyncStrategy>("phase");
  const [level, setLevel] = React.useState<Level>(3);
  const [clock, setClock] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const registry = React.useRef<Map<number, LiveInput>>(new Map());
  const timelines = React.useRef<Map<number, Step[]>>(new Map());
  const currentDataset = React.useRef<Record<string, string> | undefined>(undefined);
  const [, refreshTimelines] = React.useState(0);

  const referenceTimeline = timelines.current.get(0) ?? [];
  const referenceIndex = Math.round(clock * Math.max(0, referenceTimeline.length - 1));
  const referenceStep = referenceTimeline[referenceIndex];
  const maxLength = Math.max(1, ...[...timelines.current.values()].map((steps) => steps.length));

  React.useEffect(() => {
    if (!playing || mode !== "synced") return;
    if (clock >= 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setClock((value) => Math.min(1, value + 1 / Math.max(1, maxLength - 1))), BASE_STEP_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, mode, clock, speed, maxLength]);

  const register = React.useCallback((index: number) => (live: LiveInput) => {
    const firstRegistration = !registry.current.has(index);
    registry.current.set(index, live);
    if (firstRegistration && mode === "synced" && currentDataset.current) {
      try { live.applyFields(currentDataset.current, { announce: false, autoPlay: false }); } catch { /* incompatible panels keep their own valid input */ }
    }
  }, [mode]);
  const unregister = React.useCallback((index: number) => { registry.current.delete(index); timelines.current.delete(index); refreshTimelines((n) => n + 1); }, []);
  const broadcast = React.useCallback((fn: (live: LiveInput) => void) => { for (const live of registry.current.values()) fn(live); }, []);

  const applyDataset = React.useCallback((fields: Record<string, string>, options?: { autoPlay?: boolean }) => {
    currentDataset.current = fields;
    broadcast((live) => { try { live.applyFields(fields, { announce: false }); } catch { /* incompatible fields keep their own valid input */ } });
    setClock(0);
    setPlaying(options?.autoPlay !== false);
  }, [broadcast]);

  const syncDataset = React.useCallback((lvl: Level, options?: { autoPlay?: boolean }) => {
    if (!referenceModule) return;
    const fields = referenceModule.serializeInput(referenceModule.defaultInput(lvl, createRNG(randomSeed())));
    applyDataset(fields, options);
  }, [referenceModule, applyDataset]);

  const changeLevel = React.useCallback((lvl: Level) => { setLevel(lvl); syncDataset(lvl); }, [syncDataset]);
  const reportTimeline = React.useCallback((panel: number, steps: Step[]) => {
    if (timelines.current.get(panel) === steps) return;
    timelines.current.set(panel, steps);
    refreshTimelines((n) => n + 1);
  }, []);

  const targetFor = React.useCallback((panel: number, steps: Step[]) => {
    if (steps.length <= 1) return 0;
    const proportional = Math.round(clock * (steps.length - 1));
    if (panel === 0 || strategy === "progress" || !referenceStep) return proportional;
    const marker = strategy === "phase" ? referenceStep.phase : referenceStep.debug?.operation ?? referenceStep.phase;
    if (!marker) return proportional;
    const candidates = steps.map((step, index) => ({ step, index })).filter(({ step }) =>
      strategy === "phase" ? step.phase === marker : (step.debug?.operation ?? step.phase) === marker,
    );
    if (!candidates.length) return proportional;
    return candidates.reduce((best, candidate) => Math.abs(candidate.index - proportional) < Math.abs(best.index - proportional) ? candidate : best).index;
  }, [clock, strategy, referenceStep]);

  const playback: SharedPlayback = React.useMemo(() => ({ active: mode === "synced", playing, speed, targetFor, reportTimeline }), [mode, playing, speed, targetFor, reportTimeline]);
  const goto = React.useCallback((position: number) => { setPlaying(false); setClock(clamp(position, 0, 1)); }, []);
  const next = React.useCallback(() => goto(clock + 1 / Math.max(1, maxLength - 1)), [goto, clock, maxLength]);
  const prev = React.useCallback(() => goto(clock - 1 / Math.max(1, maxLength - 1)), [goto, clock, maxLength]);
  const reset = React.useCallback(() => goto(0), [goto]);
  const goToEnd = React.useCallback(() => goto(1), [goto]);
  const toggle = React.useCallback(() => { if (clock >= 1) setClock(0); setPlaying((value) => !value); }, [clock]);
  const play = React.useCallback(() => { if (clock >= 1) setClock(0); setPlaying(true); }, [clock]);

  const getDatasetFields = React.useCallback(() => currentDataset.current, []);

  return { mode, setMode, strategy, setStrategy, level, setLevel, changeLevel, register, unregister, broadcast, applyDataset, getDatasetFields, syncDataset, playback, clock, playing, speed, setSpeed, toggle, play, next, prev, reset, goToEnd, goto, atStart: clock <= 0, atEnd: clock >= 1, referenceStep, maxLength };
}

export type CompareSession = ReturnType<typeof useCompareSession>;
