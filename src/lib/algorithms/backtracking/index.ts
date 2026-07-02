import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "n-queens",
    title: "N-Queens",
    category: "backtracking",
    difficulty: "Intermediate",
    tags: ["backtracking", "constraint satisfaction", "recursion"],
    summary: "Places N queens on an N×N board so none attack each other, backtracking whenever a conflict arises.",
    renderer: "grid",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "n-queens": () => import("./n-queens"),
};
