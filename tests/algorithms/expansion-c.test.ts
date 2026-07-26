import { describe, expect, it } from "vitest";
import { createRNG } from "@/lib/engine/random";
import { LANGUAGES, type AlgorithmModule, type GraphFrame, type Level, type Step } from "@/lib/engine/types";
import { loaders, metas, modules } from "@/lib/algorithms/expansion-c";
import type { GraphInput } from "@/lib/algorithms/expansion-c/common";
import { validateFrame } from "../helpers/validate-frame";

const SLUGS = [
  "bidirectional-bfs",
  "iterative-deepening-dfs",
  "articulation-points",
  "bridges",
  "bipartite-check",
  "eulerian-path",
  "hamiltonian-path",
  "johnson-algorithm",
  "spfa",
  "edmonds-karp",
  "dinic",
] as const;

const bySlug = Object.fromEntries(modules.map((algorithm) => [algorithm.slug, algorithm])) as Record<
  (typeof SLUGS)[number],
  AlgorithmModule<GraphFrame, GraphInput>
>;

function run(slug: (typeof SLUGS)[number], fields: Record<string, string>): Step<GraphFrame>[] {
  const algorithm = bySlug[slug];
  return algorithm.generate(algorithm.parseInput(fields));
}

function finalRow(steps: Step<GraphFrame>[], label: string): (string | number)[] {
  const row = steps.at(-1)!.frame.aux?.find((candidate) => candidate.label === label);
  expect(row, `missing final row "${label}"`).toBeDefined();
  return row!.values;
}

function parseDistanceRow(values: (string | number)[]): Record<string, string> {
  return Object.fromEntries(values.map((value) => {
    const [node, distance] = String(value).split(":");
    return [node, distance];
  }));
}

describe("expansion C registration and module contracts", () => {
  it("registers exactly the requested eleven graph modules", async () => {
    expect(modules.map((module) => module.slug)).toEqual(SLUGS);
    expect(metas.map((meta) => meta.slug)).toEqual(SLUGS);
    expect(Object.keys(loaders)).toEqual(SLUGS);
    expect(new Set(SLUGS).size).toBe(11);
    for (const slug of SLUGS) {
      const loaded = await loaders[slug]();
      expect(loaded.default.slug).toBe(slug);
    }
  });

  it.each(modules.map((algorithm) => [algorithm.slug, algorithm] as const))(
    "%s has complete bilingual educational and code content",
    (_slug, algorithm) => {
      expect(algorithm.category).toBe("graphs");
      expect(algorithm.renderer).toBe("graph");
      expect(algorithm.titleAr?.trim()).toBeTruthy();
      expect(algorithm.summaryAr?.trim()).toBeTruthy();
      expect(algorithm.tagsAr).toHaveLength(algorithm.tags.length);
      expect(algorithm.contentAr).toBeDefined();
      expect(algorithm.contentAr!.howItWorks.length).toBeGreaterThan(0);
      expect(algorithm.contentAr!.applications.length).toBeGreaterThan(0);
      expect(algorithm.contentAr!.quiz).toHaveLength(algorithm.content.quiz.length);
      for (const language of LANGUAGES) expect(algorithm.code[language.id].trim()).not.toBe("");
    },
  );

  for (const level of [1, 2, 3, 4, 5] as Level[]) {
    it(`round-trips and emits legal bilingual deterministic steps at level ${level}`, () => {
      for (const algorithm of modules) {
        const input = algorithm.defaultInput(level, createRNG(1700 + level));
        const parsed = algorithm.parseInput(algorithm.serializeInput(input));
        expect(parsed, `${algorithm.slug} round-trip`).toEqual(input);
        const steps = algorithm.generate(parsed);
        const repeated = algorithm.generate(parsed);
        expect(steps.length, algorithm.slug).toBeGreaterThan(0);
        expect(steps.length, algorithm.slug).toBeLessThanOrEqual(5000);
        expect(repeated, `${algorithm.slug} determinism`).toEqual(steps);
        for (const [index, step] of steps.entries()) {
          expect(step.description.trim(), `${algorithm.slug} step ${index} English`).not.toBe("");
          expect(step.descriptionAr?.trim(), `${algorithm.slug} step ${index} Arabic`).not.toBe("");
          expect(step.codeLine, `${algorithm.slug} step ${index} code line`).toBeGreaterThanOrEqual(0);
          expect(step.codeLine, `${algorithm.slug} step ${index} code line`).toBeLessThan(algorithm.pseudocode.length);
          expect(validateFrame("graph", step.frame), `${algorithm.slug} step ${index}`).toEqual([]);
        }
      }
    });
  }
});

describe("expansion C final correctness and adversarial cases", () => {
  it("bidirectional BFS returns a shortest unweighted path and handles disconnection", () => {
    const found = run("bidirectional-bfs", {
      nodes: "A, B, C, D",
      edges: "A-B, B-C, A-D, D-C",
      start: "A",
      target: "C",
    });
    const path = finalRow(found, "Result path").map(String);
    expect(path[0]).toBe("A");
    expect(path.at(-1)).toBe("C");
    expect(path).toHaveLength(3);
    expect(finalRow(run("bidirectional-bfs", {
      nodes: "A, B, C",
      edges: "A-B",
      start: "A",
      target: "C",
    }), "Result path")).toEqual(["none"]);
  });

  it("IDDFS finds the shallowest directed target and terminates on a cycle", () => {
    const path = finalRow(run("iterative-deepening-dfs", {
      nodes: "A, B, C, D",
      edges: "A>B, B>C, C>A, A>D",
      start: "A",
      target: "D",
    }), "Result path");
    expect(path).toEqual(["A", "D"]);
    expect(finalRow(run("iterative-deepening-dfs", {
      nodes: "A, B, C",
      edges: "A>B, B>A",
      start: "A",
      target: "C",
    }), "Result path")).toEqual(["none"]);
  });

  it("computes articulation points and bridges across disconnected components", () => {
    const fields = { nodes: "A, B, C, D, E, X, Y, Z", edges: "A-B, B-C, B-D, D-E, X-Y, Y-Z, Z-X" };
    expect(finalRow(run("articulation-points", fields), "Result")).toEqual(["B", "D"]);
    expect(new Set(finalRow(run("bridges", fields), "Result"))).toEqual(new Set(["A-B", "B-C", "B-D", "D-E"]));
  });

  it("accepts even/disconnected bipartite graphs and rejects odd cycles and self-loops", () => {
    expect(finalRow(run("bipartite-check", {
      nodes: "A, B, C, D, X",
      edges: "A-B, B-C, C-D, D-A",
    }), "Result")).toEqual(["bipartite"]);
    expect(finalRow(run("bipartite-check", {
      nodes: "A, B, C",
      edges: "A-B, B-C, C-A",
    }), "Result")).toEqual(["not bipartite"]);
    expect(finalRow(run("bipartite-check", { nodes: "A", edges: "A-A" }), "Result")).toEqual(["not bipartite"]);
  });

  it("constructs a directed Euler trail using every edge once and rejects invalid degree/connectivity", () => {
    const path = finalRow(run("eulerian-path", {
      nodes: "A, B, C, D",
      edges: "A>B, B>C, C>A, A>D",
    }), "Result path").map(String);
    expect(path).toHaveLength(5);
    const used = path.slice(1).map((node, index) => `${path[index]}>${node}`);
    expect(new Set(used)).toEqual(new Set(["A>B", "B>C", "C>A", "A>D"]));
    expect(finalRow(run("eulerian-path", {
      nodes: "A, B, C, D",
      edges: "A>B, A>C, D>A",
    }), "Result")).toEqual(["none"]);
  });

  it("finds a valid Hamiltonian path and proves a disconnected case impossible", () => {
    const path = finalRow(run("hamiltonian-path", {
      nodes: "A, B, C, D",
      edges: "A-B, B-C, C-D, A-D",
    }), "Result path").map(String);
    expect(new Set(path)).toEqual(new Set(["A", "B", "C", "D"]));
    expect(path).toHaveLength(4);
    expect(finalRow(run("hamiltonian-path", {
      nodes: "A, B, C, D",
      edges: "A-B, C-D",
    }), "Result path")).toEqual(["none"]);
  });

  it("Johnson returns correct all-pairs distances and rejects a negative cycle", () => {
    const steps = run("johnson-algorithm", {
      nodes: "A, B, C, D",
      edges: "A>B:1, A>C:4, B>C:-2, C>D:2",
    });
    expect(parseDistanceRow(finalRow(steps, "Distances from A"))).toEqual({ A: "0", B: "1", C: "-1", D: "1" });
    const negative = run("johnson-algorithm", { nodes: "A, B", edges: "A>B:-1, B>A:-1" });
    expect(negative.at(-1)!.frame.note).toContain("negative cycle");
  });

  it("SPFA returns shortest distances, keeps unreachable infinity, and detects reachable negative cycles", () => {
    const distances = parseDistanceRow(finalRow(run("spfa", {
      nodes: "A, B, C, D, X",
      edges: "A>B:4, A>C:5, B>C:-2, C>D:3",
      start: "A",
    }), "Distances"));
    expect(distances).toEqual({ A: "0", B: "4", C: "2", D: "5", X: "∞" });
    expect(finalRow(run("spfa", {
      nodes: "A, B, C",
      edges: "A>B:1, B>C:-2, C>B:-2",
      start: "A",
    }), "Result")).toEqual(["negative cycle"]);
  });

  it.each(["edmonds-karp", "dinic"] as const)("%s computes max flow 5 and respects capacities", (slug) => {
    const steps = run(slug, {
      nodes: "S, A, B, T",
      edges: "S>A:3, S>B:2, A>B:1, A>T:2, B>T:3",
      start: "S",
      target: "T",
    });
    expect(finalRow(steps, "Max flow")).toEqual([5]);
    for (const entry of finalRow(steps, "Edge flow/capacity").map(String)) {
      const match = entry.match(/:(-?\d+)\/(\d+)$/);
      expect(match).not.toBeNull();
      expect(Number(match![1])).toBeGreaterThanOrEqual(0);
      expect(Number(match![1])).toBeLessThanOrEqual(Number(match![2]));
    }
    const noPath = run(slug, {
      nodes: "S, A, T",
      edges: "S>A:4",
      start: "S",
      target: "T",
    });
    expect(finalRow(noPath, "Max flow")).toEqual([0]);
  });
});

describe("expansion C trace legality", () => {
  it("low-link traces only decrease low values after discovery", () => {
    for (const slug of ["articulation-points", "bridges"] as const) {
      const steps = run(slug, { nodes: "A, B, C, D", edges: "A-B, B-C, C-A, C-D" });
      const previous: Record<string, number> = {};
      for (const step of steps) {
        for (const [node, annotation] of Object.entries(step.frame.nodeAnnotations ?? {})) {
          const match = annotation.match(/low=(\d+)/);
          if (!match) continue;
          const low = Number(match[1]);
          if (previous[node] !== undefined) expect(low).toBeLessThanOrEqual(previous[node]);
          previous[node] = low;
        }
      }
    }
  });

  it("flow traces are monotone and expose BFS/level and augmentation phases", () => {
    const fields = {
      nodes: "S, A, B, T",
      edges: "S>A:3, S>B:2, A>B:1, A>T:2, B>T:3",
      start: "S",
      target: "T",
    };
    const ek = run("edmonds-karp", fields);
    const dinic = run("dinic", fields);
    for (const steps of [ek, dinic]) {
      const totals = steps.map((step) => step.counters?.maxFlow ?? 0);
      totals.slice(1).forEach((value, index) => expect(value).toBeGreaterThanOrEqual(totals[index]));
    }
    expect(new Set(ek.map((step) => step.phase))).toEqual(expect.objectContaining(new Set(["bfs-start", "augment", "complete"])));
    expect(dinic.some((step) => step.phase === "level-edge")).toBe(true);
    expect(dinic.some((step) => step.phase === "push")).toBe(true);
  });
});
