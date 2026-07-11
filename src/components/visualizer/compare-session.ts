"use client";

import * as React from "react";
import { createRNG, randomSeed } from "@/lib/engine/random";
import type { AlgorithmModule, Level } from "@/lib/engine/types";
import type { LiveInput } from "@/lib/engine/use-live-input";

export type CompareMode = "synced" | "independent";

/**
 * Coordinates N side-by-side `VisualizerShell` panels for comparison mode.
 *
 * Each panel keeps its OWN `useLiveInput` (so it parses/serializes datasets
 * through its own module) and reports it up via `register`. In synced mode a
 * single shared control bar fans one user action out to every registered
 * panel through `broadcast`; `syncDataset` seeds every panel with identical
 * field values so a shared insert/delete/search sequence keeps them in lockstep.
 * In independent mode each panel drives itself and this session stays idle.
 */
export function useCompareSession(referenceModule: AlgorithmModule | undefined) {
  const [mode, setMode] = React.useState<CompareMode>("synced");
  const [level, setLevel] = React.useState<Level>(3);
  const registry = React.useRef<Map<number, LiveInput>>(new Map());

  const register = React.useCallback(
    (index: number) => (live: LiveInput) => {
      registry.current.set(index, live);
    },
    [],
  );

  const unregister = React.useCallback((index: number) => {
    registry.current.delete(index);
  }, []);

  /** Run an action against every currently-mounted panel's live input. */
  const broadcast = React.useCallback((fn: (live: LiveInput) => void) => {
    for (const live of registry.current.values()) fn(live);
  }, []);

  /** Seed every panel with one identical field set (derived from the reference module) so synced edits stay in lockstep. */
  const syncDataset = React.useCallback(
    (lvl: Level) => {
      if (!referenceModule) return;
      const fields = referenceModule.serializeInput(
        referenceModule.defaultInput(lvl, createRNG(randomSeed())),
      );
      broadcast((live) => {
        try {
          live.applyFields(fields);
        } catch {
          // a panel whose module can't parse the reference fields keeps its own data
        }
      });
    },
    [referenceModule, broadcast],
  );

  const changeLevel = React.useCallback(
    (lvl: Level) => {
      setLevel(lvl);
      syncDataset(lvl);
    },
    [syncDataset],
  );

  return {
    mode,
    setMode,
    level,
    setLevel,
    changeLevel,
    register,
    unregister,
    broadcast,
    syncDataset,
  };
}

export type CompareSession = ReturnType<typeof useCompareSession>;
