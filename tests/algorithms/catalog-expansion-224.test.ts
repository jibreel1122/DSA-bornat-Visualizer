import { describe, expect, it } from "vitest";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";
import { createRNG } from "@/lib/engine/random";
import { validateFrame } from "../helpers/validate-frame";

const NEW_SLUGS = [
  "binary-insertion-sort", "stooge-sort", "strand-sort", "patience-sort",
  "tournament-sort", "smoothsort", "block-sort", "pigeonhole-sort",
  "american-flag-sort", "bead-sort", "library-sort", "spreadsort",
  "rotated-array-search", "peak-finding", "matrix-search", "lower-upper-bound",
  "suffix-automaton", "eertree", "longest-common-substring", "wildcard-matching",
  "booth-minimum-rotation",
  "aa-tree", "cartesian-tree", "order-statistic-tree", "radix-tree", "suffix-trie",
  "merkle-tree", "quadtree", "octree", "r-tree", "van-emde-boas-tree",
  "binary-lifting-lca", "morris-traversal", "tree-diameter", "euler-tour-lca",
  "centroid-decomposition", "heavy-light-decomposition",
  "zero-one-bfs", "dial-algorithm", "bidirectional-dijkstra", "dag-shortest-path",
  "boruvka", "reverse-delete-mst", "hierholzer", "fleury", "hopcroft-karp",
  "hungarian-algorithm", "karger-min-cut", "stoer-wagner-min-cut", "pagerank",
  "bron-kerbosch", "edmonds-arborescence", "transitive-closure",
  "biconnected-components", "graph-cycle-detection",
  "held-karp-tsp", "digit-dp", "bitmask-assignment", "weighted-interval-scheduling",
  "optimal-bst", "regex-matching-dp", "maximum-product-subarray",
  "gas-station", "jump-game", "task-scheduler", "alphametic-solver",
  "dancing-links-exact-cover", "kakuro-solver", "pollard-rho", "fermat-primality",
  "lucas-theorem", "matrix-exponentiation", "lru-cache", "lfu-cache",
] as const;

describe("74-module second catalog expansion", () => {
  it("registers exactly 224 unique algorithms including all 74 additions", () => {
    expect(NEW_SLUGS).toHaveLength(74);
    expect(ALGORITHMS).toHaveLength(224);
    expect(new Set(ALGORITHMS.map(({ slug }) => slug)).size).toBe(224);
    const registered = new Set(ALGORITHMS.map(({ slug }) => slug));
    NEW_SLUGS.forEach((slug) => expect(registered.has(slug), slug).toBe(true));
  });

  it.each(NEW_SLUGS)("%s loads and generates valid bilingual frames", async (slug) => {
    const meta = ALGORITHMS.find((candidate) => candidate.slug === slug)!;
    const algorithm = await loadAlgorithm(slug);
    expect(algorithm).not.toBeNull();
    const input = algorithm!.defaultInput(3, createRNG(7400 + NEW_SLUGS.indexOf(slug)));
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
