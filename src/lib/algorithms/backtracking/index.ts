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
  {
    slug: "combinations",
    title: "Combinations (C(n,k) by Backtracking)",
    category: "backtracking",
    difficulty: "Intermediate",
    tags: ["backtracking", "combinatorics", "pruning", "C(n,k)"],
    summary: "Generates every k-element subset of n items using a start-index that only moves forward, so each combination is produced exactly once.",
    renderer: "callstack",
  },
  {
    slug: "sudoku-solver",
    title: "Sudoku Solver (Backtracking)",
    category: "backtracking",
    difficulty: "Advanced",
    tags: ["backtracking", "constraint satisfaction", "pruning", "grid"],
    summary: "Fills the first empty cell with each candidate digit 1–9 that doesn't violate row/column/box rules, recursing and backtracking on dead ends.",
    renderer: "grid",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "n-queens": () => import("./n-queens"),
  "rat-in-maze": () => import("./rat-in-maze"),
  "permutations": () => import("./permutations"),
  "subset-sum": () => import("./subset-sum"),
  "combinations": () => import("./combinations"),
  "sudoku-solver": () => import("./sudoku-solver"),
};
