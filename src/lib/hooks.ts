"use client";

import { useCallback, useEffect, useState } from "react";

/** localStorage-backed state; safe on the server (returns initial until mounted). */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // corrupted entry — fall back to initial
    }
    setLoaded(true);
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage full / private mode — state still updates in memory
        }
        return next;
      });
    },
    [key],
  );

  return [value, set, loaded] as const;
}

export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>("bdsv:favorites", []);
  const toggle = useCallback(
    (slug: string) =>
      setFavorites((f) => (f.includes(slug) ? f.filter((s) => s !== slug) : [...f, slug])),
    [setFavorites],
  );
  return { favorites, toggle, isFavorite: (slug: string) => favorites.includes(slug) };
}

export interface HistoryEntry {
  slug: string;
  at: number;
}
export function useHistory() {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>("bdsv:history", []);
  const record = useCallback(
    (slug: string) =>
      setHistory((h) => [{ slug, at: Date.now() }, ...h.filter((e) => e.slug !== slug)].slice(0, 30)),
    [setHistory],
  );
  const clear = useCallback(() => setHistory([]), [setHistory]);
  return { history, record, clear };
}

export function useNotes(slug: string) {
  const [notes, setNotes, loaded] = useLocalStorage<string>(`bdsv:notes:${slug}`, "");
  return { notes, setNotes, loaded };
}

/** true once the component is mounted on the client */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
