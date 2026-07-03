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
  {
    slug: "rat-in-maze",
    title: "Rat in a Maze",
    category: "backtracking",
    difficulty: "Intermediate",
    tags: ["backtracking", "maze", "grid", "recursion"],
    summary: "Finds a path through a grid maze from the top-left to the bottom-right using recursive backtracking.",
    renderer: "grid",
  },
  {
    slug: "permutations",
    title: "Permutations (Backtracking)",
    category: "backtracking",
    difficulty: "Intermediate",
    tags: ["backtracking", "recursion", "permutations", "combinatorics"],
    summary: "Generates every ordering of a set by placing each unused element at the next position and backtracking.",
    renderer: "callstack",
  },
  {
    slug: "subset-sum",
    title: "Subset Sum (Backtracking)",
    category: "backtracking",
    difficulty: "Intermediate",
    tags: ["backtracking", "recursion", "subset", "pruning"],
    summary: "Decides whether any subset of numbers adds up to a target, exploring include/exclude choices with pruning.",
    renderer: "callstack",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "n-queens": () => import("./n-queens"),
  "rat-in-maze": () => import("./rat-in-maze"),
  "permutations": () => import("./permutations"),
  "subset-sum": () => import("./subset-sum"),
};
