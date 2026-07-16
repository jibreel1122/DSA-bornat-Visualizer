"use client";

import * as React from "react";
import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks";
import type { Level } from "@/lib/engine/types";

export interface AppSettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  defaultSpeed: number;
  defaultLevel: Level;
  /** Advanced aids remain opt-in so the standard study surface stays focused. */
  debugMode: boolean;
  realWorldMode: boolean;
  gamification: boolean;
  pauseBeforeTransformations: boolean;
}

const DEFAULTS: AppSettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  defaultSpeed: 1,
  defaultLevel: 2,
  debugMode: false,
  realWorldMode: false,
  gamification: true,
  pauseBeforeTransformations: true,
};

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>("bdsv:settings", DEFAULTS);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("reduced-motion", settings.reducedMotion);
    el.classList.toggle("high-contrast", settings.highContrast);
    el.classList.toggle("large-text", settings.largeText);
  }, [settings.reducedMotion, settings.highContrast, settings.largeText]);

  const update = React.useCallback(
    (patch: Partial<AppSettings>) => setSettings((s) => ({ ...s, ...patch })),
    [setSettings],
  );

  return (
    <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
