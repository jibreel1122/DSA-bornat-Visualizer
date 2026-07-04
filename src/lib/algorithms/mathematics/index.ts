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
  {
    slug: "fast-power",
    title: "Fast Power (Binary Exponentiation)",
    category: "mathematics",
    difficulty: "Intermediate",
    tags: ["number theory", "divide & conquer", "modular arithmetic", "O(log n)"],
    summary: "Computes xⁿ (optionally mod m) in O(log n) multiplications by repeatedly squaring — the engine behind modular exponentiation in cryptography.",
    renderer: "callstack",
  },
  {
    slug: "prime-factorization",
    title: "Prime Factorization (Trial Division)",
    category: "mathematics",
    difficulty: "Beginner",
    tags: ["number theory", "primes", "trial division", "O(√n)"],
    summary: "Decomposes n into its prime factors by dividing out each candidate 2…√n; whatever remains above 1 is itself prime.",
    renderer: "array",
  },
  {
    slug: "extended-euclidean",
    title: "Extended Euclidean Algorithm",
    category: "mathematics",
    difficulty: "Advanced",
    tags: ["number theory", "Bézout identity", "modular inverse", "gcd"],
    summary: "Computes gcd(a, b) plus the Bézout coefficients x, y with a·x + b·y = gcd — the key to modular inverses.",
    renderer: "table",
  },
];

export const loaders: Record<string, ModuleLoader> = {
  "euclidean-gcd": () => import("./euclidean-gcd"),
  "sieve-of-eratosthenes": () => import("./sieve-of-eratosthenes"),
  "fast-power": () => import("./fast-power"),
  "prime-factorization": () => import("./prime-factorization"),
  "extended-euclidean": () => import("./extended-euclidean"),
};
