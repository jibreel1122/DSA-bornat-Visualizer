"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/utils";

export interface PlayerControls {
  cursor: number;
  playing: boolean;
  /** speed multiplier: 0.25 … 4 */
  speed: number;
  atStart: boolean;
  atEnd: boolean;
  play: () => void;
  /** Start playback at an exact operation boundary without replaying earlier history. */
  playFrom: (i: number) => void;
  restartAndPlay: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  goToEnd: () => void;
  goto: (i: number) => void;
  setSpeed: (s: number) => void;
}

const BASE_STEP_MS = 900;

/**
 * Playback state machine over an immutable step array.
 * Only the cursor moves; steps never change during playback.
 */
export function useVisualizerPlayer(stepCount: number, initialSpeed = 1): PlayerControls {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = Math.max(0, stepCount - 1);

  // Reset cursor when the step array is replaced (new input / algorithm)
  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [stepCount]);

  useEffect(() => {
    if (!playing) return;
    if (cursor >= last) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => {
      setCursor((c) => clamp(c + 1, 0, last));
    }, BASE_STEP_MS / speed);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, cursor, speed, last]);

  const play = useCallback(() => {
    setCursor((c) => (c >= last ? 0 : c));
    setPlaying(true);
  }, [last]);
  const playFrom = useCallback((i: number) => {
    const start = clamp(Math.round(i), 0, last);
    setCursor(start);
    setPlaying(start < last);
  }, [last]);
  const restartAndPlay = useCallback(() => {
    setCursor(0);
    setPlaying(last > 0);
  }, [last]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p) setCursor((c) => (c >= last ? 0 : c));
      return !p;
    });
  }, [last]);
  const next = useCallback(() => {
    setPlaying(false);
    setCursor((c) => clamp(c + 1, 0, last));
  }, [last]);
  const prev = useCallback(() => {
    setPlaying(false);
    setCursor((c) => clamp(c - 1, 0, last));
  }, [last]);
  const reset = useCallback(() => {
    setPlaying(false);
    setCursor(0);
  }, []);
  const goToEnd = useCallback(() => {
    setPlaying(false);
    setCursor(last);
  }, [last]);
  const goto = useCallback(
    (i: number) => {
      setPlaying(false);
      setCursor(clamp(Math.round(i), 0, last));
    },
    [last],
  );
  const setSpeed = useCallback((s: number) => setSpeedState(clamp(s, 0.25, 4)), []);

  return {
    cursor,
    playing,
    speed,
    atStart: cursor === 0,
    atEnd: cursor >= last,
    play,
    playFrom,
    restartAndPlay,
    pause,
    toggle,
    next,
    prev,
    reset,
    goToEnd,
    goto,
    setSpeed,
  };
}
