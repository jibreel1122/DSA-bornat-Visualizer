import type { AlgorithmMeta } from "@/lib/engine/types";
import type { ModuleLoader } from "..";

export const metas: AlgorithmMeta[] = [
  {
    slug: "euclidean-gcd",
    title: "Euclidean Algorithm (GCD)",
    category: "mathematics",
    difficulty: "Beginner",
    tags: ["number theory", "recursion", "gcd", "modulo"],
    summary: "Finds the greatest common divisor by repeatedly replacing (a, b) with (b, a mod b) until b is 0.",
    renderer: "callstack",
  },
  {
    slug: "sieve-of-eratosthenes",
    title: "Sieve of Eratosthenes",
    category: "mathematics",
    difficulty: "Beginner",
    tags: ["number theory", "primes", "sieve", "O(n log log n)"],
    summary: "Finds all primes up to n by repeatedly crossing out the multiples of each prime.",
    renderer: "grid",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "euclidean-gcd": () => import("./euclidean-gcd"),
  "sieve-of-eratosthenes": () => import("./sieve-of-eratosthenes"),
};
