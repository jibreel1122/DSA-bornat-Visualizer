"use client";

import * as React from "react";
import { ALGORITHMS } from "@/lib/algorithms";
import { useLocalStorage } from "@/lib/hooks";
import { recommendedNext, type LearningProgress } from "@/lib/engine/learning";
import type { CategoryId } from "@/lib/engine/types";

export interface LearnerState {
  progress: LearningProgress;
  xp: number;
  streak: number;
  lastStudyDay?: string;
  achievements: string[];
  /** Immutable client events make account merging idempotent instead of guessing from totals. */
  events: LearningEvent[];
}

type LearningEvent = { id: string; type: "attempt" | "study"; slug: string; category: CategoryId; correct?: boolean; createdAt: number };

const EMPTY_PROGRESS: LearningProgress = { byCategory: {}, byAlgorithm: {} };
const EMPTY_STATE: LearnerState = { progress: EMPTY_PROGRESS, xp: 0, streak: 0, achievements: [], events: [] };

function eventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface LearningContextValue {
  state: LearnerState;
  recommendations: ReturnType<typeof recommendedNext>;
  recordStudy: (slug: string, category: CategoryId) => void;
  recordAttempt: (slug: string, category: CategoryId, correct: boolean) => void;
}

const LearningContext = React.createContext<LearningContextValue>({
  state: EMPTY_STATE,
  recommendations: [],
  recordStudy: () => {},
  recordAttempt: () => {},
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useLocalStorage<LearnerState>("bdsv:learning", EMPTY_STATE);

  const updateStudyDay = React.useCallback((current: LearnerState) => {
    const day = today();
    if (current.lastStudyDay === day) return current;
    const previous = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    return {
      ...current,
      lastStudyDay: day,
      streak: current.lastStudyDay === previous ? current.streak + 1 : 1,
    };
  }, []);

  const recordStudy = React.useCallback((slug: string, category: CategoryId) => {
    setState((current) => {
      const base = updateStudyDay(current);
      const previous = base.progress.byAlgorithm[slug];
      return {
        ...base,
        events: [...(base.events ?? []), { id: eventId(), type: "study" as const, slug, category, createdAt: Date.now() }].slice(-1000),
        progress: {
          ...base.progress,
          byAlgorithm: {
            ...base.progress.byAlgorithm,
            [slug]: { category, attempts: previous?.attempts ?? 0, correct: previous?.correct ?? 0, mistakes: previous?.mistakes ?? 0, lastSeen: Date.now() },
          },
          byCategory: {
            ...base.progress.byCategory,
            [category]: base.progress.byCategory[category] ?? { attempts: 0, correct: 0, lastSeen: Date.now() },
          },
        },
      };
    });
  }, [setState, updateStudyDay]);

  const recordAttempt = React.useCallback((slug: string, category: CategoryId, correct: boolean) => {
    setState((current) => {
      const base = updateStudyDay(current);
      const algorithm = base.progress.byAlgorithm[slug] ?? { category, attempts: 0, correct: 0, mistakes: 0, lastSeen: Date.now() };
      const categoryProgress = base.progress.byCategory[category] ?? { attempts: 0, correct: 0, lastSeen: Date.now() };
      const xp = base.xp + (correct ? 10 : 2);
      const achievements = new Set(base.achievements);
      if (xp >= 100) achievements.add("first-century");
      if (base.streak >= 7) achievements.add("weekly-learner");
      return {
        ...base,
        xp,
        achievements: [...achievements],
        events: [...(base.events ?? []), { id: eventId(), type: "attempt" as const, slug, category, correct, createdAt: Date.now() }].slice(-1000),
        progress: {
          ...base.progress,
          byAlgorithm: { ...base.progress.byAlgorithm, [slug]: { ...algorithm, category, attempts: algorithm.attempts + 1, correct: algorithm.correct + (correct ? 1 : 0), mistakes: algorithm.mistakes + (correct ? 0 : 1), lastSeen: Date.now() } },
          byCategory: { ...base.progress.byCategory, [category]: { attempts: categoryProgress.attempts + 1, correct: categoryProgress.correct + (correct ? 1 : 0), lastSeen: Date.now() } },
        },
      };
    });
  }, [setState, updateStudyDay]);

  const recommendations = React.useMemo(() => recommendedNext(state.progress, ALGORITHMS), [state.progress]);
  const value = React.useMemo(() => ({ state, recommendations, recordStudy, recordAttempt }), [state, recommendations, recordStudy, recordAttempt]);
  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  return React.useContext(LearningContext);
}
