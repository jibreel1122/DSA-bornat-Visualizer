import { describe, expect, it } from "vitest";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";
import { createRNG } from "@/lib/engine/random";
import { validateFrame } from "../helpers/validate-frame";

const NEW_SLUGS = [
  "cycle-sort", "gnome-sort", "odd-even-sort", "bitonic-sort", "introsort", "tree-sort",
  "fibonacci-search", "sentinel-search", "quickselect", "binary-search-first-last",
  "manacher", "aho-corasick", "suffix-array", "rolling-hash",
  "modular-inverse", "chinese-remainder-theorem", "euler-totient", "miller-rabin",
  "recursive-binary-search",
  "singly-linked-list-operations", "circular-linked-list",
  "deque-operations", "priority-queue", "monotonic-stack", "queue-using-stacks",
  "cuckoo-hashing", "robin-hood-hashing", "bloom-filter",
  "splay-tree", "treap", "max-heap", "two-three-tree", "kd-tree", "interval-tree",
  "expression-tree", "threaded-binary-tree",
  "bidirectional-bfs", "iterative-deepening-dfs", "articulation-points", "bridges",
  "bipartite-check", "eulerian-path", "hamiltonian-path", "johnson-algorithm", "spfa",
  "edmonds-karp", "dinic",
  "matrix-chain-multiplication", "rod-cutting", "subset-sum-dp", "word-break",
  "egg-dropping", "longest-palindromic-subsequence", "palindrome-partitioning",
  "catalan-numbers", "greedy-coin-change", "interval-partitioning",
  "optimal-merge-pattern", "greedy-set-cover", "graph-coloring", "knights-tour",
  "word-search", "generate-parentheses",
] as const;

describe("63-module catalog expansion", () => {
  it("retains all 63 first-wave additions in the expanded catalog", () => {
    expect(ALGORITHMS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(ALGORITHMS.map(({ slug }) => slug)).size).toBe(ALGORITHMS.length);
    const registered = new Set(ALGORITHMS.map(({ slug }) => slug));
    NEW_SLUGS.forEach((slug) => expect(registered.has(slug), slug).toBe(true));
  });

  it.each(NEW_SLUGS)("%s loads and produces valid bilingual teaching frames", async (slug) => {
    const meta = ALGORITHMS.find((candidate) => candidate.slug === slug)!;
    const algorithm = await loadAlgorithm(slug);
    expect(algorithm, slug).not.toBeNull();
    const input = algorithm!.defaultInput(3, createRNG(6300 + NEW_SLUGS.indexOf(slug)));
    expect(algorithm!.parseInput(algorithm!.serializeInput(input))).toEqual(input);
    const steps = algorithm!.generate(input);
    expect(steps.length).toBeGreaterThan(1);
    steps.forEach((step, index) => {
      expect(step.description.trim(), `${slug} step ${index} English`).not.toBe("");
      expect(step.descriptionAr?.trim(), `${slug} step ${index} Arabic`).not.toBe("");
      expect(validateFrame(meta.renderer, step.frame), `${slug} step ${index}`).toEqual([]);
    });
  });
});
