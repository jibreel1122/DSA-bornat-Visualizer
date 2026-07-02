import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "activity-selection",
    title: "Activity Selection",
    category: "greedy",
    difficulty: "Beginner",
    tags: ["greedy", "interval scheduling", "sorting"],
    summary: "Selects the maximum number of non-overlapping activities by always taking the one that finishes earliest.",
    renderer: "table",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "activity-selection": () => import("./activity-selection"),
};
