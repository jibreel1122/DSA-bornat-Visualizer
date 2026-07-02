import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "factorial",
    title: "Factorial (Recursion)",
    category: "recursion",
    difficulty: "Beginner",
    tags: ["recursion", "base case", "call stack"],
    summary: "Computes n! by recursion, showing the call stack winding up to the base case and unwinding with results.",
    renderer: "callstack",
  },
  {
    slug: "tower-of-hanoi",
    title: "Tower of Hanoi",
    category: "recursion",
    difficulty: "Intermediate",
    tags: ["recursion", "divide & conquer", "exponential"],
    summary: "Moves a stack of disks between pegs one at a time, never placing a larger disk on a smaller one.",
    renderer: "callstack",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  factorial: () => import("./factorial"),
  "tower-of-hanoi": () => import("./tower-of-hanoi"),
};
