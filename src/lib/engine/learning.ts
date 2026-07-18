import type { AlgorithmMeta, CategoryId, Step } from "./types";

const TRANSFORMATION_WORDS: Record<string, "balance" | "rebuild" | "resize" | "reorder" | "rehash"> = {
  rotate: "balance",
  balance: "balance",
  rebalance: "balance",
  rebuild: "rebuild",
  resize: "resize",
  reorder: "reorder",
  rehash: "rehash",
};

/** Adds safe defaults to legacy modules without mutating their frozen frames. */
export function enrichSteps<F>(steps: Step<F>[]): Step<F>[] {
  return steps.map((step) => {
    const text = step.description.toLowerCase();
    const matched = Object.keys(TRANSFORMATION_WORDS).find((word) => text.includes(word));
    const phase = step.phase ?? inferPhase(text);
    return {
      ...step,
      phase,
      why: step.why ?? inferWhy(phase),
      transformation: step.transformation ?? (matched ? { kind: TRANSFORMATION_WORDS[matched] } : undefined),
    };
  });
}

function inferPhase(text: string) {
  if (text.includes("compare")) return "compare";
  if (text.includes("swap")) return "swap";
  if (text.includes("visit")) return "visit";
  if (text.includes("backtrack")) return "backtrack";
  if (text.includes("rotate") || text.includes("balance")) return "transform";
  if (text.includes("insert")) return "insert";
  if (text.includes("delete") || text.includes("remove")) return "delete";
  return "execute";
}

function inferWhy(phase: string) {
  const reasons: Record<string, string> = {
    compare: "This comparison determines which value or path should be considered next.",
    swap: "The values move to preserve the algorithm's required order.",
    visit: "Marking this item prevents repeated work and records progress.",
    backtrack: "This choice cannot lead to a valid solution, so the algorithm safely tries another path.",
    transform: "The structure changes to preserve its invariants and keep future operations efficient.",
    insert: "The new value is placed where the structure's rules remain valid.",
    delete: "The value is removed while preserving the structure's invariants.",
    execute: "This advances the algorithm toward its result.",
  };
  return reasons[phase] ?? reasons.execute;
}

/**
 * Keeps edits continuous for legacy generators. New input begins from a
 * reversible bridge step, then continues through the normal shared generator.
 */
export function bridgeIncrementalSteps<F>(
  current: Step<F> | undefined,
  next: Step<F>[],
  detail: string,
): Step<F>[] {
  if (!current || next.length === 0) return next;
  const target = next[0];
  return [
    {
      ...current,
      description: `Current state before ${detail}.`,
      why: "Start from the structure the learner is currently inspecting.",
      phase: "prepare",
    },
    {
      ...target,
      description: `Apply ${detail} to the current structure.`,
      why: "This is the requested edit; any required internal transformation is shown next.",
      phase: "edit",
    },
    ...next.slice(1),
  ];
}

export interface LearningProgress {
  byCategory: Partial<Record<CategoryId, { attempts: number; correct: number; lastSeen: number }>>;
  byAlgorithm: Record<string, { category?: CategoryId; attempts: number; correct: number; mistakes: number; lastSeen: number }>;
}

export function recommendedNext(progress: LearningProgress, algorithms: AlgorithmMeta[]) {
  return [...algorithms]
    .map((algorithm) => {
      const record = progress.byAlgorithm[algorithm.slug];
      const accuracy = record && record.attempts ? record.correct / record.attempts : 0;
      const freshness = record?.lastSeen ?? 0;
      // New, low-accuracy, and long-unseen concepts surface first.
      const score = (record ? 1 - accuracy : 1.25) + Math.min(0.5, (Date.now() - freshness) / 30 / 86_400_000);
      return { algorithm, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ algorithm }) => algorithm);
}
