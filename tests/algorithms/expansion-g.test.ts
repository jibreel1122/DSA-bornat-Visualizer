import { describe, expect, it } from "vitest";
import { createRNG } from "@/lib/engine/random";
import { LANGUAGES, type AlgorithmModule, type GraphFrame, type Level, type Step } from "@/lib/engine/types";
import { loaders, metas, modules } from "@/lib/algorithms/expansion-g";
import type { GraphInput } from "@/lib/algorithms/expansion-g/common";
import { validateFrame } from "../helpers/validate-frame";

const SLUGS = [
  "zero-one-bfs",
  "dial-algorithm",
  "bidirectional-dijkstra",
  "dag-shortest-path",
  "boruvka",
  "reverse-delete-mst",
  "hierholzer",
  "fleury",
  "hopcroft-karp",
  "hungarian-algorithm",
  "karger-min-cut",
  "stoer-wagner-min-cut",
  "pagerank",
  "bron-kerbosch",
  "edmonds-arborescence",
  "transitive-closure",
  "biconnected-components",
  "graph-cycle-detection",
] as const;

type Slug = (typeof SLUGS)[number];
const bySlug = Object.fromEntries(modules.map((module) => [module.slug, module])) as Record<
  Slug,
  AlgorithmModule<GraphFrame, GraphInput>
>;

function run(slug: Slug, fields: Record<string, string>): Step<GraphFrame>[] {
  const algorithm = bySlug[slug];
  return algorithm.generate(algorithm.parseInput(fields));
}

function row(steps: Step<GraphFrame>[], label: string): (string | number)[] {
  const value = steps.at(-1)!.frame.aux?.find((candidate) => candidate.label === label);
  expect(value, `missing final row ${label}`).toBeDefined();
  return value!.values;
}

function parsedDistances(values: (string | number)[]): Record<string, number> {
  return Object.fromEntries(values.map((value) => {
    const [node, raw] = String(value).split(":");
    return [node, raw === "∞" ? Number.POSITIVE_INFINITY : Number(raw)];
  }));
}

function bruteCut(nodes: string[], edges: { from: string; to: string; weight: number }[]): number {
  let best = Number.POSITIVE_INFINITY;
  const anchor = nodes[0];
  for (let mask = 1; mask < (1 << nodes.length) - 1; mask++) {
    const side = new Set(nodes.filter((_, index) => mask & (1 << index)));
    if (!side.has(anchor)) continue;
    const weight = edges.filter((edge) => side.has(edge.from) !== side.has(edge.to)).reduce((sum, edge) => sum + edge.weight, 0);
    best = Math.min(best, weight);
  }
  return best;
}

function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((tail) => [value, ...tail]));
}

function bruteArborescence(
  nodes: string[],
  edges: { from: string; to: string; weight: number }[],
  root: string,
): number {
  const nonRoots = nodes.filter((node) => node !== root);
  let best = Number.POSITIVE_INFINITY;
  const visit = (index: number, selected: typeof edges) => {
    if (index === nonRoots.length) {
      const reachable = new Set([root]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const edge of selected) if (reachable.has(edge.from) && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          changed = true;
        }
      }
      if (reachable.size === nodes.length) best = Math.min(best, selected.reduce((sum, edge) => sum + edge.weight, 0));
      return;
    }
    for (const edge of edges.filter((edge) => edge.to === nonRoots[index])) visit(index + 1, [...selected, edge]);
  };
  visit(0, []);
  return best;
}

function bruteForestWeight(nodes: string[], edges: { from: string; to: string; weight: number }[]): number {
  const originalParent = new Map(nodes.map((node) => [node, node]));
  const find = (parent: Map<string, string>, node: string): string => {
    while (parent.get(node) !== node) node = parent.get(node)!;
    return node;
  };
  const unite = (parent: Map<string, string>, a: string, b: string) => parent.set(find(parent, b), find(parent, a));
  edges.forEach((edge) => unite(originalParent, edge.from, edge.to));
  const componentCount = new Set(nodes.map((node) => find(originalParent, node))).size;
  const needed = nodes.length - componentCount;
  let best = Number.POSITIVE_INFINITY;
  const choose = (index: number, selected: typeof edges) => {
    if (selected.length === needed) {
      const parent = new Map(nodes.map((node) => [node, node]));
      for (const edge of selected) {
        if (find(parent, edge.from) === find(parent, edge.to)) return;
        unite(parent, edge.from, edge.to);
      }
      if (new Set(nodes.map((node) => find(parent, node))).size === componentCount) {
        best = Math.min(best, selected.reduce((sum, edge) => sum + edge.weight, 0));
      }
      return;
    }
    if (index === edges.length) return;
    choose(index + 1, [...selected, edges[index]]);
    choose(index + 1, selected);
  };
  choose(0, []);
  return best;
}

describe("expansion G registration and complete contracts", () => {
  it("exports exactly the requested eighteen modules and loaders", async () => {
    expect(modules.map((module) => module.slug)).toEqual(SLUGS);
    expect(metas.map((meta) => meta.slug)).toEqual(SLUGS);
    expect(Object.keys(loaders)).toEqual(SLUGS);
    expect(new Set(SLUGS).size).toBe(18);
    for (const slug of SLUGS) expect((await loaders[slug]()).default.slug).toBe(slug);
  });

  it.each(modules.map((algorithm) => [algorithm.slug, algorithm] as const))("%s has bilingual content and every language pane", (_slug, algorithm) => {
    expect(algorithm.category).toBe("graphs");
    expect(algorithm.renderer).toBe("graph");
    expect(algorithm.titleAr?.trim()).toBeTruthy();
    expect(algorithm.summaryAr?.trim()).toBeTruthy();
    expect(algorithm.tagsAr).toHaveLength(algorithm.tags.length);
    expect(algorithm.contentAr?.overview.trim()).toBeTruthy();
    expect(algorithm.contentAr?.howItWorks.length).toBe(algorithm.pseudocode.length);
    expect(algorithm.inputFields.every((field) => Boolean(field.labelAr?.trim()))).toBe(true);
    for (const language of LANGUAGES) expect(algorithm.code[language.id].trim()).not.toBe("");
  });

  for (const level of [1, 2, 3, 4, 5] as Level[]) {
    it(`round-trips and emits immutable legal deterministic frames at level ${level}`, () => {
      for (const algorithm of modules) {
        const input = algorithm.defaultInput(level, createRNG(7300 + level));
        const parsed = algorithm.parseInput(algorithm.serializeInput(input));
        expect(parsed, algorithm.slug).toEqual(input);
        const first = algorithm.generate(parsed);
        const repeated = algorithm.generate(parsed);
        expect(first.length, algorithm.slug).toBeGreaterThan(0);
        expect(first.length, algorithm.slug).toBeLessThan(5000);
        expect(repeated, `${algorithm.slug} deterministic`).toEqual(first);
        for (const [index, step] of first.entries()) {
          expect(step.description.trim(), `${algorithm.slug} English step ${index}`).not.toBe("");
          expect(step.descriptionAr?.trim(), `${algorithm.slug} Arabic step ${index}`).not.toBe("");
          expect(step.phase?.trim(), `${algorithm.slug} phase ${index}`).not.toBe("");
          expect(step.codeLine, `${algorithm.slug} line ${index}`).toBeGreaterThanOrEqual(0);
          expect(step.codeLine, `${algorithm.slug} line ${index}`).toBeLessThan(algorithm.pseudocode.length);
          expect(validateFrame("graph", step.frame), `${algorithm.slug} frame ${index}`).toEqual([]);
        }
      }
    });
  }

  it("rejects invalid weight domains and bipartitions", () => {
    expect(() => bySlug["zero-one-bfs"].parseInput({ nodes: "A,B", edges: "A>B:2", start: "A", target: "B" })).toThrow(/0 or 1/);
    expect(() => bySlug["dial-algorithm"].parseInput({ nodes: "A,B", edges: "A>B:-1", start: "A", target: "B" })).toThrow(/nonnegative/);
    expect(() => run("hopcroft-karp", { nodes: "A,B,C", edges: "A-B:1, A-C:1, B-C:1", left: "A" })).toThrow(/bipartition/);
  });
});

describe("expansion G independent final-output oracles", () => {
  it.each(["zero-one-bfs", "dial-algorithm"] as const)("%s matches independently known shortest distances", (slug) => {
    const steps = run(slug, {
      nodes: "A,B,C,D,X",
      edges: slug === "zero-one-bfs" ? "A>B:1, A>C:0, C>B:0, B>D:1, C>D:1" : "A>B:4, A>C:1, C>B:2, B>D:1, C>D:7",
      start: "A",
      target: "D",
    });
    expect(parsedDistances(row(steps, "Distances"))).toEqual(slug === "zero-one-bfs"
      ? { A: 0, B: 0, C: 0, D: 1, X: Number.POSITIVE_INFINITY }
      : { A: 0, B: 3, C: 1, D: 4, X: Number.POSITIVE_INFINITY });
  });

  it("bidirectional Dijkstra returns the independently calculated shortest path", () => {
    const steps = run("bidirectional-dijkstra", {
      nodes: "A,B,C,D,X",
      edges: "A-B:4, A-C:1, C-B:2, B-D:1, C-D:8",
      start: "A",
      target: "D",
    });
    expect(row(steps, "Distance")).toEqual([4]);
    expect(row(steps, "Path")).toEqual(["A", "C", "B", "D"]);
    expect(row(run("bidirectional-dijkstra", {
      nodes: "A,B,X",
      edges: "A-B:1",
      start: "A",
      target: "X",
    }), "Path")).toEqual(["none"]);
  });

  it("DAG shortest path accepts negative edges and explicitly rejects a cycle", () => {
    const valid = run("dag-shortest-path", {
      nodes: "A,B,C,D",
      edges: "A>B:3, A>C:6, B>C:-4, C>D:2",
      start: "A",
      target: "D",
    });
    expect(parsedDistances(row(valid, "Distances"))).toEqual({ A: 0, B: 3, C: -1, D: 1 });
    expect(row(run("dag-shortest-path", {
      nodes: "A,B,C",
      edges: "A>B:1, B>C:1, C>A:1",
      start: "A",
      target: "C",
    }), "Result")).toEqual(["cycle"]);
  });

  it.each(["boruvka", "reverse-delete-mst"] as const)("%s matches exhaustive MST/forest weight", (slug) => {
    const connected = run(slug, {
      nodes: "A,B,C,D",
      edges: "A-B:1, A-C:5, B-C:2, B-D:4, C-D:1",
    });
    expect(row(connected, "Total weight")).toEqual([4]);
    expect(row(connected, "Forest edges")).toHaveLength(3);
    const disconnected = run(slug, {
      nodes: "A,B,C,D",
      edges: "A-B:2, C-D:3",
    });
    expect(row(disconnected, "Total weight")).toEqual([5]);
    expect(disconnected.at(-1)!.frame.note).toContain("forest");
  });

  it("Hierholzer and Fleury consume every edge exactly once", () => {
    const directed = row(run("hierholzer", {
      nodes: "A,B,C,D",
      edges: "A>B:1, B>C:1, C>A:1, A>D:1",
    }), "Trail").map(String);
    expect(directed).toHaveLength(5);
    expect(new Set(directed.slice(1).map((node, index) => `${directed[index]}>${node}`))).toEqual(new Set(["A>B", "B>C", "C>A", "A>D"]));
    const undirected = row(run("fleury", {
      nodes: "A,B,C,D",
      edges: "A-B:1, B-C:1, C-A:1, A-D:1",
    }), "Trail").map(String);
    expect(undirected).toHaveLength(5);
    const used = undirected.slice(1).map((node, index) => [undirected[index], node].sort().join("-"));
    expect(new Set(used)).toEqual(new Set(["A-B", "B-C", "A-C", "A-D"]));
  });

  it("Hopcroft-Karp matches an exhaustive maximum matching cardinality", () => {
    const steps = run("hopcroft-karp", {
      nodes: "L1,L2,L3,R1,R2,R3",
      edges: "L1-R1:1, L1-R2:1, L2-R1:1, L2-R3:1, L3-R2:1",
      left: "L1,L2,L3",
    });
    expect(row(steps, "Size")).toEqual([3]);
    const matching = row(steps, "Matching").map(String);
    expect(new Set(matching.map((entry) => entry.split("-")[0])).size).toBe(3);
    expect(new Set(matching.map((entry) => entry.split("-")[1])).size).toBe(3);
  });

  it("Hungarian assignment equals a brute-force permutation oracle", () => {
    const costs: Record<string, number> = { "A-X": 9, "A-Y": 2, "A-Z": 7, "B-X": 6, "B-Y": 4, "B-Z": 3, "C-X": 5, "C-Y": 8, "C-Z": 1 };
    const brute = Math.min(...permutations(["X", "Y", "Z"]).map((order) => ["A", "B", "C"].reduce((sum, left, index) => sum + costs[`${left}-${order[index]}`], 0)));
    const steps = run("hungarian-algorithm", {
      nodes: "A,B,C,X,Y,Z",
      edges: Object.entries(costs).map(([edge, weight]) => `${edge}:${weight}`).join(","),
      left: "A,B,C",
    });
    expect(row(steps, "Total cost")).toEqual([brute]);
    expect(row(steps, "Assignment")).toHaveLength(3);
  });

  it("Karger returns a valid known minimum cut and Stoer-Wagner matches exhaustive cuts", () => {
    const fields = {
      nodes: "A,B,C,D",
      edges: "A-B:3, A-C:1, B-C:1, B-D:1, C-D:3",
    };
    const exact = bruteCut(["A", "B", "C", "D"], [
      { from: "A", to: "B", weight: 3 },
      { from: "A", to: "C", weight: 1 },
      { from: "B", to: "C", weight: 1 },
      { from: "B", to: "D", weight: 1 },
      { from: "C", to: "D", weight: 3 },
    ]);
    expect(row(run("karger-min-cut", { ...fields, seed: "19" }), "Cut weight")).toEqual([exact]);
    expect(row(run("stoer-wagner-min-cut", fields), "Cut weight")).toEqual([exact]);
  });

  it("PageRank preserves probability mass and symmetry on a directed cycle", () => {
    const steps = run("pagerank", {
      nodes: "A,B,C",
      edges: "A>B:1, B>C:1, C>A:1",
      iterations: "20",
      damping: "0.85",
    });
    const ranks = Object.fromEntries(row(steps, "Ranks").map((entry) => {
      const [node, value] = String(entry).split(":");
      return [node, Number(value)];
    }));
    expect(ranks.A).toBeCloseTo(1 / 3, 5);
    expect(ranks.B).toBeCloseTo(1 / 3, 5);
    expect(ranks.C).toBeCloseTo(1 / 3, 5);
    expect(Number(row(steps, "Rank sum")[0])).toBeCloseTo(1, 6);
  });

  it("Bron-Kerbosch returns exactly the independently known maximal cliques", () => {
    const cliques = row(run("bron-kerbosch", {
      nodes: "A,B,C,D,E",
      edges: "A-B:1, A-C:1, B-C:1, C-D:1, D-E:1",
    }), "Maximal cliques");
    expect(new Set(cliques)).toEqual(new Set(["A,B,C", "C,D", "D,E"]));
  });

  it("Edmonds cycle contraction returns the brute-force minimum rooted arborescence", () => {
    const steps = run("edmonds-arborescence", {
      nodes: "R,A,B,C",
      edges: "R>A:5, R>B:5, R>C:9, A>B:1, B>A:1, A>C:2, B>C:4, C>A:1",
      start: "R",
    });
    expect(row(steps, "Total weight")).toEqual([8]);
    expect(row(steps, "Arborescence")).toHaveLength(3);
    expect(steps.some((step) => step.phase === "contract-cycle")).toBe(true);
    expect(row(run("edmonds-arborescence", {
      nodes: "R,A,X",
      edges: "R>A:1",
      start: "R",
    }), "Arborescence")).toEqual(["none"]);
  });

  it("transitive closure equals independent reachability", () => {
    const pairs = new Set(row(run("transitive-closure", {
      nodes: "A,B,C,D",
      edges: "A>B:1, B>C:1, D>C:1",
    }), "Reachability"));
    expect(pairs).toEqual(new Set(["A>A", "A>B", "A>C", "B>B", "B>C", "C>C", "D>C", "D>D"]));
  });

  it("Tarjan biconnected components partition the known edge blocks", () => {
    const components = row(run("biconnected-components", {
      nodes: "A,B,C,D,E",
      edges: "A-B:1, B-C:1, C-A:1, C-D:1, D-E:1",
    }), "Components").map(String).map((component) => new Set(component.split("|").map((edge) => edge.split("-").sort().join("-"))));
    expect(components.some((component) => component.size === 3 && component.has("A-B") && component.has("A-C") && component.has("B-C"))).toBe(true);
    expect(components.some((component) => component.size === 1 && component.has("C-D"))).toBe(true);
    expect(components.some((component) => component.size === 1 && component.has("D-E"))).toBe(true);
  });

  it("directed cycle detection distinguishes cyclic and acyclic components", () => {
    expect(row(run("graph-cycle-detection", {
      nodes: "A,B,C,D",
      edges: "A>B:1, B>C:1, C>A:1",
    }), "Result")).toEqual(["cycle"]);
    expect(row(run("graph-cycle-detection", {
      nodes: "A,B,C,D",
      edges: "A>B:1, A>C:1, C>D:1",
    }), "Result")).toEqual(["acyclic"]);
  });

  it("matches exhaustive oracles across deterministic adversarial graph families", () => {
    let state = 91;
    const random = () => {
      state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
      return state / 4_294_967_296;
    };
    for (let sample = 0; sample < 12; sample++) {
      const nodes = ["A", "B", "C", "D"];
      const undirected: { from: string; to: string; weight: number }[] = [];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        if (j === i + 1 || random() < 0.6) undirected.push({ from: nodes[i], to: nodes[j], weight: 1 + Math.floor(random() * 9) });
      }
      const fields = {
        nodes: nodes.join(","),
        edges: undirected.map((edge) => `${edge.from}-${edge.to}:${edge.weight}`).join(","),
      };
      const forestOracle = bruteForestWeight(nodes, undirected);
      expect(row(run("boruvka", fields), "Total weight")[0], `Boruvka sample ${sample}`).toBe(forestOracle);
      expect(row(run("reverse-delete-mst", fields), "Total weight")[0], `reverse-delete sample ${sample}`).toBe(forestOracle);
      expect(row(run("stoer-wagner-min-cut", fields), "Cut weight")[0], `Stoer-Wagner sample ${sample}`).toBe(bruteCut(nodes, undirected));

      const directed = nodes.flatMap((from) => nodes
        .filter((to) => to !== from)
        .map((to) => ({ from, to, weight: -2 + Math.floor(random() * 10) })));
      const directedFields = {
        nodes: nodes.join(","),
        edges: directed.map((edge) => `${edge.from}>${edge.to}:${edge.weight}`).join(","),
        start: "A",
      };
      const oracle = bruteArborescence(nodes, directed, "A");
      expect(row(run("edmonds-arborescence", directedFields), "Total weight")[0], `Edmonds sample ${sample}`).toBe(oracle);
    }
  });

  it("reports zero cuts for disconnected graphs", () => {
    const fields = { nodes: "A,B,C,D", edges: "A-B:2, C-D:3" };
    expect(row(run("karger-min-cut", { ...fields, seed: "7" }), "Cut weight")).toEqual([0]);
    expect(row(run("stoer-wagner-min-cut", fields), "Cut weight")).toEqual([0]);
  });
});

describe("expansion G trace semantics", () => {
  it("exposes required queue, relaxation, edge, matching, cut, rank, and low-link transitions", () => {
    const cases: [Slug, Record<string, string>, string][] = [
      ["zero-one-bfs", { nodes: "A,B,C", edges: "A>B:1, A>C:0, C>B:0", start: "A", target: "B" }, "relax"],
      ["boruvka", { nodes: "A,B,C", edges: "A-B:1, B-C:2, A-C:4" }, "edge-choice"],
      ["hopcroft-karp", { nodes: "A,B,X,Y", edges: "A-X:1, A-Y:1, B-X:1", left: "A,B" }, "augment-matching"],
      ["stoer-wagner-min-cut", { nodes: "A,B,C", edges: "A-B:1, B-C:2, A-C:3" }, "cut-result"],
      ["pagerank", { nodes: "A,B", edges: "A>B:1", iterations: "2", damping: "0.85" }, "rank-update"],
      ["biconnected-components", { nodes: "A,B,C,D", edges: "A-B:1, B-C:1, C-A:1, C-D:1" }, "low-link"],
    ];
    for (const [slug, fields, phase] of cases) expect(run(slug, fields).some((step) => step.phase === phase), slug).toBe(true);
  });

  it("distance labels only improve on relaxation frames", () => {
    for (const slug of ["zero-one-bfs", "dial-algorithm"] as const) {
      const steps = run(slug, {
        nodes: "A,B,C,D",
        edges: slug === "zero-one-bfs" ? "A>B:1, A>C:0, C>B:0, B>D:1" : "A>B:5, A>C:1, C>B:2, B>D:1",
        start: "A",
        target: "D",
      });
      const previous: Record<string, number> = {};
      for (const step of steps.filter((candidate) => candidate.phase === "relax" || candidate.phase === "complete")) {
        const values = step.frame.aux?.find((candidate) => candidate.label === "Distances")?.values;
        if (!values) continue;
        for (const [node, value] of Object.entries(parsedDistances(values))) {
          if (Number.isFinite(previous[node])) expect(value).toBeLessThanOrEqual(previous[node]);
          previous[node] = value;
        }
      }
    }
  });

  it("low-link values never exceed their discovery times and matching stays one-to-one", () => {
    const lowSteps = run("biconnected-components", {
      nodes: "A,B,C,D",
      edges: "A-B:1, B-C:1, C-A:1, C-D:1",
    });
    for (const step of lowSteps) for (const annotation of Object.values(step.frame.nodeAnnotations ?? {})) {
      const match = annotation.match(/d=(\d+), low=(\d+)/);
      if (match) expect(Number(match[2])).toBeLessThanOrEqual(Number(match[1]));
    }
    const matchSteps = run("hopcroft-karp", {
      nodes: "A,B,C,X,Y,Z",
      edges: "A-X:1, A-Y:1, B-X:1, B-Z:1, C-Y:1",
      left: "A,B,C",
    });
    for (const step of matchSteps) {
      const entries = step.frame.aux?.find((candidate) => candidate.label === "Matching")?.values.map(String) ?? [];
      expect(new Set(entries.map((entry) => entry.split("-")[0])).size).toBe(entries.length);
      expect(new Set(entries.map((entry) => entry.split("-")[1])).size).toBe(entries.length);
    }
  });
});
