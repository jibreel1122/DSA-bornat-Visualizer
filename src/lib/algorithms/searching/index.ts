import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "linear-search",
    title: "Linear Search",
    category: "searching",
    difficulty: "Beginner",
    tags: ["sequential", "unsorted ok", "O(n)"],
    summary: "Scans elements one by one until the target is found or the array ends — works on any array.",
    renderer: "array",
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    category: "searching",
    difficulty: "Beginner",
    tags: ["divide & conquer", "sorted required", "O(log n)"],
    summary: "Repeatedly halves a sorted array, comparing the middle element to the target — O(log n) lookups.",
    renderer: "array",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "linear-search": () => import("./linear-search"),
  "binary-search": () => import("./binary-search"),
};
