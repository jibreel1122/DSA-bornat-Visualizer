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
  {
    slug: "fibonacci-recursive",
    title: "Fibonacci (Naive Recursion)",
    category: "recursion",
    difficulty: "Beginner",
    tags: ["recursion", "call stack", "exponential", "overlapping subproblems"],
    summary: "Computes fib(n) = fib(n−1) + fib(n−2) directly by recursion — simple, but exponential because subproblems are solved again and again.",
    renderer: "callstack",
  },
  {
    slug: "power-set",
    title: "Power Set (Subsets by Recursion)",
    category: "recursion",
    difficulty: "Intermediate",
    tags: ["recursion", "backtracking", "subsets", "combinatorics", "O(2^n)"],
    summary: "Generates every subset of a set by recursively branching into 'include this element' and 'exclude it' at each position.",
    renderer: "callstack",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  factorial: () => import("./factorial"),
  "tower-of-hanoi": () => import("./tower-of-hanoi"),
  "fibonacci-recursive": () => import("./fibonacci-recursive"),
  "power-set": () => import("./power-set"),
};
