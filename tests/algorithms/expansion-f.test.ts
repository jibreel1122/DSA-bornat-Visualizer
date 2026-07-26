import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  type AlgorithmModule,
  type RNG,
  type TreeFrame,
} from "@/lib/engine/types";
import {
  aaTree,
  binaryLiftingLca,
  cartesianTree,
  centroidDecomposition,
  eulerTourLca,
  heavyLightDecomposition,
  loaders,
  merkleTree,
  metas,
  modules,
  morrisTraversal,
  octree,
  orderStatisticTree,
  quadtree,
  radixTree,
  rTree,
  suffixTrie,
  treeDiameter,
  vanEmdeBoasTree,
} from "@/lib/algorithms/expansion-f";
import { pedagogicalHash } from "@/lib/algorithms/expansion-f/lexical";

const expectedSlugs = [
  "aa-tree",
  "cartesian-tree",
  "order-statistic-tree",
  "radix-tree",
  "suffix-trie",
  "merkle-tree",
  "quadtree",
  "octree",
  "r-tree",
  "van-emde-boas-tree",
  "binary-lifting-lca",
  "morris-traversal",
  "tree-diameter",
  "euler-tour-lca",
  "centroid-decomposition",
  "heavy-light-decomposition",
] as const;

type AnyModule = AlgorithmModule<unknown, unknown>;
const asModule = (module: unknown) => module as AnyModule;

let rngState = 0;
const rng: RNG = {
  next: () => 0.37,
  int: (minimum, maximum) => minimum + (rngState++ % (maximum - minimum + 1)),
  pick: <T>(items: readonly T[]) => items[rngState++ % items.length],
  shuffle: <T>(items: readonly T[]) => [...items],
};

function assertFrame(frame: TreeFrame) {
  expect(frame.rootId === null || frame.nodes[frame.rootId]).toBeTruthy();
  for (const node of Object.values(frame.nodes)) {
    for (const child of [node.left, node.right, ...(node.children ?? [])]) {
      if (child !== null && child !== undefined) expect(frame.nodes[child]).toBeTruthy();
    }
  }
}

function walkBinary(frame: TreeFrame, id: string | null, output: number[]) {
  if (!id) return;
  const node = frame.nodes[id];
  walkBinary(frame, node.left ?? null, output);
  output.push(Number(node.value));
  walkBinary(frame, node.right ?? null, output);
}

function aux(frame: TreeFrame, label: string): (string | number)[] {
  return frame.aux?.find((row) => row.label === label)?.values ?? [];
}

function parseEdges(raw: string) {
  const adjacency = new Map<number, number[]>();
  raw.split(",").map((token) => token.trim()).forEach((token) => {
    const [left, right] = token.split("-").map(Number);
    adjacency.set(left, [...(adjacency.get(left) ?? []), right]);
    adjacency.set(right, [...(adjacency.get(right) ?? []), left]);
  });
  return adjacency;
}

function naiveLca(edges: string, root: number, left: number, right: number): number {
  const adjacency = parseEdges(edges);
  const parent = new Map<number, number>([[root, root]]);
  const depth = new Map<number, number>([[root, 0]]);
  const queue = [root];
  for (let index = 0; index < queue.length; index++) {
    for (const neighbor of adjacency.get(queue[index]) ?? []) {
      if (parent.has(neighbor)) continue;
      parent.set(neighbor, queue[index]);
      depth.set(neighbor, depth.get(queue[index])! + 1);
      queue.push(neighbor);
    }
  }
  while (depth.get(left)! > depth.get(right)!) left = parent.get(left)!;
  while (depth.get(right)! > depth.get(left)!) right = parent.get(right)!;
  while (left !== right) {
    left = parent.get(left)!;
    right = parent.get(right)!;
  }
  return left;
}

describe("expansion F scope and full contracts", () => {
  it("exports exactly 16 unique requested tree modules, metas, and loaders", async () => {
    expect(modules.map((module) => module.slug)).toEqual(expectedSlugs);
    expect(new Set(modules.map((module) => module.slug)).size).toBe(16);
    expect(metas.map((meta) => meta.slug)).toEqual(expectedSlugs);
    expect(Object.keys(loaders)).toEqual(expectedSlugs);
    for (const slug of expectedSlugs) expect((await loaders[slug]()).default.slug).toBe(slug);
  });

  it.each(modules.map((module) => [module.slug, module] as const))("%s has bilingual metadata, content, narration, and all language panes", (_, raw) => {
    const algorithm = asModule(raw);
    expect(algorithm.category).toBe("trees");
    expect(algorithm.renderer).toBe("tree");
    expect(algorithm.titleAr?.trim()).toBeTruthy();
    expect(algorithm.summaryAr?.trim()).toBeTruthy();
    expect(algorithm.tagsAr?.length).toBe(algorithm.tags.length);
    expect(algorithm.contentAr?.overview.trim()).toBeTruthy();
    expect(algorithm.contentAr?.howItWorks.length).toBeGreaterThan(2);
    expect(algorithm.inputFields.every((field) => field.labelAr?.trim() && field.helpAr?.trim())).toBe(true);
    for (const language of LANGUAGES) expect(algorithm.code[language.id].trim()).toContain(algorithm.title);
  });

  it.each([1, 2, 3, 4, 5] as const)("all modules generate legal deterministic reversible frames at difficulty %s", (level) => {
    for (const raw of modules) {
      const algorithm = asModule(raw);
      const input = algorithm.defaultInput(level, rng);
      const serialized = algorithm.serializeInput(input);
      const parsed = algorithm.parseInput(serialized);
      expect(algorithm.serializeInput(parsed)).toEqual(serialized);
      const first = algorithm.generate(parsed);
      const second = algorithm.generate(parsed);
      expect(first).toEqual(second);
      expect(first.length).toBeGreaterThan(1);
      for (const algorithmStep of first) {
        assertFrame(algorithmStep.frame as TreeFrame);
        expect(algorithmStep.description.trim()).toBeTruthy();
        expect(algorithmStep.descriptionAr?.trim()).toBeTruthy();
        expect(algorithmStep.codeLine).toBeGreaterThanOrEqual(0);
        expect(algorithmStep.codeLine).toBeLessThan(algorithm.pseudocode.length);
      }
      const snapshots = first.map((algorithmStep) => JSON.stringify(algorithmStep.frame));
      algorithm.generate(parsed);
      expect(first.map((algorithmStep) => JSON.stringify(algorithmStep.frame))).toEqual(snapshots);
    }
  });

  it("rejects malformed tree, range, rectangle, universe, and query inputs", () => {
    expect(() => aaTree.parseInput({ values: "4, 4" })).toThrow();
    expect(() => quadtree.parseInput({ points: "1:2:3", range: "0:0:10:10" })).toThrow();
    expect(() => octree.parseInput({ points: "1:2", range: "0:0:0:10:10:10" })).toThrow();
    expect(() => rTree.parseInput({ rectangles: "20:20:10:10", query: "0:0:5:5" })).toThrow();
    expect(() => vanEmdeBoasTree.parseInput({ universe: "12", values: "1,2", query: "1" })).toThrow();
    expect(() => binaryLiftingLca.parseInput({ edges: "0-1, 2-3", root: "0", query: "0:1" })).toThrow();
  });
});

describe("balanced and augmented tree logic", () => {
  it("maintains every AA-tree level and BST invariant after adversarial insertions", () => {
    for (const values of [[30, 20, 10], [10, 20, 30], [50, 20, 70, 10, 30, 60, 80, 25, 27, 26]]) {
      const steps = aaTree.generate({ values });
      const frame = steps.at(-1)!.frame;
      const inorder: number[] = [];
      walkBinary(frame, frame.rootId, inorder);
      expect(inorder).toEqual([...values].sort((a, b) => a - b));
      const check = (id: string | null): number => {
        if (!id) return 0;
        const node = frame.nodes[id];
        const level = Number(node.extra?.match(/^L(\d+)/)?.[1]);
        const leftLevel = check(node.left ?? null);
        const rightLevel = check(node.right ?? null);
        expect(leftLevel).toBe(level - 1);
        expect([level, level - 1]).toContain(rightLevel);
        if (node.right) {
          const rightRight = frame.nodes[node.right].right;
          if (rightRight) expect(Number(frame.nodes[rightRight].extra?.match(/^L(\d+)/)?.[1])).toBeLessThan(level);
        }
        if (!node.left && !node.right) expect(level).toBe(1);
        return level;
      };
      check(frame.rootId);
      expect(steps.some((algorithmStep) => algorithmStep.transformation?.label?.startsWith("AA"))).toBe(true);
    }
  });

  it("builds a Cartesian tree with exact inorder sequence and min-heap order", () => {
    const values = [9, 3, 7, 1, 8, 2, 6];
    const frame = cartesianTree.generate({ values }).at(-1)!.frame;
    const inorder: number[] = [];
    walkBinary(frame, frame.rootId, inorder);
    expect(inorder).toEqual(values);
    for (const node of Object.values(frame.nodes)) {
      for (const childId of [node.left, node.right]) if (childId) expect(Number(node.value)).toBeLessThanOrEqual(Number(frame.nodes[childId].value));
    }
  });

  it("stores exact subtree sizes and returns correct rank/select results", () => {
    const values = [40, 20, 60, 10, 30, 50, 70];
    const steps = orderStatisticTree.generate({ values, select: 4, rank: 55 });
    const frame = steps.at(-1)!.frame;
    const size = (id: string | null): number => {
      if (!id) return 0;
      const node = frame.nodes[id];
      const expected = 1 + size(node.left ?? null) + size(node.right ?? null);
      expect(Number(node.extra?.match(/size (\d+)/)?.[1])).toBe(expected);
      return expected;
    };
    size(frame.rootId);
    expect(steps.some((algorithmStep) => algorithmStep.description.includes("4-th smallest key is 40"))).toBe(true);
    expect(steps.at(-1)!.description).toContain("5 stored keys");
  });
});

describe("lexical and authenticated tree logic", () => {
  it("preserves every word across compressed radix-edge splits and distinguishes prefixes", () => {
    const words = ["romane", "romanus", "romulus", "rubens", "ruber", "rubicon"];
    for (const query of [...words, "roman", "ruby"]) {
      const steps = radixTree.generate({ words, query });
      expect(steps.at(-1)!.description.includes("is stored")).toBe(words.includes(query));
    }
    const steps = radixTree.generate({ words, query: "rubicon" });
    expect(steps.some((algorithmStep) => algorithmStep.transformation?.label === "Radix edge split")).toBe(true);
  });

  it("finds exactly the substrings represented by suffix-trie paths", () => {
    const text = "banana";
    for (const pattern of ["b", "ana", "nana", "banana", "apple"]) {
      const steps = suffixTrie.generate({ text, pattern });
      expect(steps.at(-1)!.description.includes("occurs in the text")).toBe(text.includes(pattern));
    }
    const frame = suffixTrie.generate({ text, pattern: "ana" }).at(-1)!.frame;
    expect(aux(frame, "inserted suffixes")).toEqual(["banana", "anana", "nana", "ana", "na", "a"]);
  });

  it("recomputes every Merkle parent and handles an odd duplicated leaf", () => {
    const leaves = ["A", "B", "C", "D", "E"];
    const frame = merkleTree.generate({ leaves, verify: 4 }).at(-1)!.frame;
    const verify = (id: string): string => {
      const node = frame.nodes[id];
      if (node.value === "duplicate digest") return String(node.extra);
      if (!node.left) {
        const expected = pedagogicalHash(`leaf:${node.value}`);
        expect(node.extra).toBe(expected);
        return expected;
      }
      const left = verify(node.left);
      const right = verify(node.right!);
      const expected = pedagogicalHash(`node:${left}:${right}`);
      expect(node.extra).toBe(expected);
      return expected;
    };
    verify(frame.rootId!);
  });
});

describe("spatial and bounded-universe tree logic", () => {
  it("stores each point once and returns exact quadtree and octree range results", () => {
    const points2 = [[10, 10], [80, 80], [25, 25], [55, 40], [45, 70]];
    const quad = quadtree.generate({ points: points2, range: { low: [0, 0], high: [50, 50] } });
    expect(aux(quad.at(-1)!.frame, "range results").sort()).toEqual(["(10,10)", "(25,25)"]);
    expect(quad.some((algorithmStep) => algorithmStep.transformation?.label === "quadtree subdivision")).toBe(true);
    expect(Object.values(quad.at(-1)!.frame.nodes).some((node) => node.children?.length === 4)).toBe(true);

    const points3 = [[10, 10, 10], [80, 80, 80], [25, 25, 25], [55, 40, 30]];
    const oct = octree.generate({ points: points3, range: { low: [0, 0, 0], high: [50, 50, 50] } });
    expect(aux(oct.at(-1)!.frame, "range results").sort()).toEqual(["(10,10,10)", "(25,25,25)"]);
    expect(Object.values(oct.at(-1)!.frame.nodes).some((node) => node.children?.length === 8)).toBe(true);
  });

  it("preserves all R-tree entries and returns exactly overlapping rectangles after splits", () => {
    const rectangles = [
      { id: "re0", lowX: 0, lowY: 0, highX: 10, highY: 10 },
      { id: "re1", lowX: 20, lowY: 20, highX: 30, highY: 30 },
      { id: "re2", lowX: 40, lowY: 40, highX: 50, highY: 50 },
      { id: "re3", lowX: 60, lowY: 60, highX: 70, highY: 70 },
      { id: "re4", lowX: 25, lowY: 0, highX: 35, highY: 12 },
      { id: "re5", lowX: 80, lowY: 5, highX: 90, highY: 15 },
    ];
    const query = { id: "query", lowX: 5, lowY: 5, highX: 32, highY: 32 };
    const steps = rTree.generate({ rectangles, query });
    const frame = steps.at(-1)!.frame;
    expect(rectangles.every((rectangle) => frame.nodes[rectangle.id])).toBe(true);
    const expected = rectangles.filter((rect) => rect.lowX <= query.highX && query.lowX <= rect.highX && rect.lowY <= query.highY && query.lowY <= rect.highY).map((rect) => `[${rect.lowX},${rect.lowY}]–[${rect.highX},${rect.highY}]`).sort();
    expect(aux(frame, "overlapping entries").sort()).toEqual(expected);
    expect(steps.some((algorithmStep) => algorithmStep.transformation?.label?.includes("R-tree"))).toBe(true);
  });

  it("answers vEB successor queries exactly throughout the bounded universe", () => {
    const values = [2, 3, 4, 7, 14];
    for (let query = -1; query < 16; query++) {
      const expected = values.find((value) => value > query) ?? null;
      const last = vanEmdeBoasTree.generate({ values, universe: 16, query }).at(-1)!.description;
      expect(last).toBe(expected === null ? `${query} has no successor.` : `The successor of ${query} is ${expected}.`);
    }
  });
});

describe("tree preprocessing, traversal, and decomposition logic", () => {
  const edges = "0-1, 0-2, 1-3, 1-4, 2-5, 5-6, 5-7";

  it("binary lifting and Euler-tour RMQ return the same independently computed LCA", () => {
    for (const [left, right] of [[3, 4], [3, 6], [6, 7], [0, 7]] as const) {
      const expected = naiveLca(edges, 0, left, right);
      const input = { ...binaryLiftingLca.parseInput({ edges, root: "0", query: `${left}:${right}` }) };
      expect(binaryLiftingLca.generate(input).at(-1)!.description).toContain(`= ${expected}.`);
      expect(eulerTourLca.generate(input).at(-1)!.description).toContain(`= ${expected}.`);
    }
  });

  it("Morris traversal produces sorted inorder output and removes every temporary thread", () => {
    const values = [40, 20, 60, 10, 30, 50, 70, 25];
    const steps = morrisTraversal.generate({ values });
    expect(aux(steps.at(-1)!.frame, "inorder output")).toEqual([...values].sort((a, b) => a - b));
    expect(Object.values(steps.at(-1)!.frame.nodes).every((node) => !node.extra?.includes("thread"))).toBe(true);
    expect(steps.filter((algorithmStep) => algorithmStep.phase === "thread-create" && algorithmStep.transformation).length)
      .toBe(steps.filter((algorithmStep) => algorithmStep.phase === "thread-remove" && algorithmStep.transformation).length);
  });

  it("two-sweep tree diameter equals an all-pairs BFS oracle", () => {
    const input = treeDiameter.parseInput({ edges, root: "0", query: "3:7" });
    const adjacency = parseEdges(edges);
    let expected = 0;
    for (const source of adjacency.keys()) {
      const distance = new Map<number, number>([[source, 0]]);
      const queue = [source];
      for (let index = 0; index < queue.length; index++) {
        for (const next of adjacency.get(queue[index]) ?? []) {
          if (distance.has(next)) continue;
          distance.set(next, distance.get(queue[index])! + 1);
          queue.push(next);
        }
      }
      expected = Math.max(expected, ...distance.values());
    }
    expect(treeDiameter.generate(input).at(-1)!.description).toContain(`Diameter length is ${expected}`);
  });

  it("centroid decomposition assigns every vertex once and exposes each structural split", () => {
    const input = centroidDecomposition.parseInput({ edges, root: "0", query: "3:7" });
    const steps = centroidDecomposition.generate(input);
    const frame = steps.at(-1)!.frame;
    expect(Object.values(frame.nodes).every((node) => node.extra?.startsWith("centroid level"))).toBe(true);
    expect(steps.filter((algorithmStep) => algorithmStep.transformation?.label === "Centroid decomposition split")).toHaveLength(8);
  });

  it("heavy-light preprocessing assigns unique positions and valid chain heads", () => {
    const input = heavyLightDecomposition.parseInput({ edges, root: "0", query: "3:7" });
    const steps = heavyLightDecomposition.generate(input);
    const frame = steps.at(-1)!.frame;
    const positions = Object.values(frame.nodes).map((node) => Number(node.extra?.match(/pos=(\d+)/)?.[1]));
    expect([...positions].sort((a, b) => a - b)).toEqual(Array.from({ length: 8 }, (_, index) => index));
    for (const node of Object.values(frame.nodes)) {
      const head = Number(node.extra?.match(/head=(\d+)/)?.[1]);
      expect(frame.nodes[`n${head}`]).toBeTruthy();
    }
    expect(steps.at(-1)!.description).toContain("contiguous segment");
  });
});
