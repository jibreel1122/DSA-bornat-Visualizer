import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "bubble-sort",
    title: "Bubble Sort",
    category: "sorting",
    difficulty: "Beginner",
    tags: ["comparison sort", "stable", "in-place", "quadratic"],
    summary: "Repeatedly swaps adjacent out-of-order elements, bubbling the largest to the end each pass.",
    renderer: "array",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "bubble-sort": () => import("./bubble-sort"),
};
