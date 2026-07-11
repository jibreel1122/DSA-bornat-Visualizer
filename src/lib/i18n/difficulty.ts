import type { AlgoDifficulty } from "@/lib/engine/types";
import type { DictKey } from "@/lib/i18n";

/** Render-time mapping only — the AlgoDifficulty union stays English in data. */
export const DIFFICULTY_KEY: Record<AlgoDifficulty, DictKey> = {
  Beginner: "catalog.difficultyBeginner",
  Intermediate: "catalog.difficultyIntermediate",
  Advanced: "catalog.difficultyAdvanced",
};
