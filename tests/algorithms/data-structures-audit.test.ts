import { describe, expect, it } from "vitest";
import { loadAlgorithm } from "@/lib/algorithms";
import type {
  AlgorithmModule,
  ArrayFrame,
  CallStackFrame,
  GraphFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  TableFrame,
  TreeFrame,
} from "@/lib/engine/types";

async function run<F>(slug: string, fields: Record<string, string>) {
  const algorithm = (await loadAlgorithm(slug)) as AlgorithmModule<F, unknown> | null;
  if (!algorithm) throw new Error(`Missing algorithm ${slug}`);
  const input = algorithm.parseInput(fields);
  const steps = algorithm.generate(input);
  return { algorithm, input, steps, final: steps.at(-1)!.frame };
}

function auxValues(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) {
  return frame.aux?.find((row) => row.label === label)?.values;
}

function listOrder(frame: ListFrame): (string | number)[] {
  if (frame.nodes.length === 0) return [];
  const incoming = new Set(frame.links.filter((link) => link.kind !== "prev" && link.kind !== "loop").map((link) => link.to));
  const byId = new Map(frame.nodes.map((node) => [node.id, node]));
  const next = new Map(frame.links.filter((link) => link.kind !== "prev" && link.kind !== "loop").map((link) => [link.from, link.to]));
  let id = frame.nodes.find((node) => !incoming.has(node.id))?.id;
  const values: (string | number)[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    values.push(byId.get(id)!.value);
    id = next.get(id);
  }
  return values;
}

function numericInorder(frame: TreeFrame): number[] {
  const visit = (id: string | null | undefined): number[] => {
    if (!id) return [];
    const node = frame.nodes[id];
    return [...visit(node.left), Number(node.value), ...visit(node.right)];
  };
  return visit(frame.rootId);
}

function assertAvl(frame: TreeFrame) {
  const visit = (id: string | null | undefined, min = -Infinity, max = Infinity): number => {
    if (!id) return 0;
    const node = frame.nodes[id];
    const value = Number(node.value);
    expect(value).toBeGreaterThan(min);
    expect(value).toBeLessThan(max);
    const left = visit(node.left, min, value);
    const right = visit(node.right, value, max);
    expect(Math.abs(left - right), `balance at ${value}`).toBeLessThanOrEqual(1);
    expect(node.extra, `displayed balance at ${value}`).toBe(String(left - right));
    return Math.max(left, right) + 1;
  };
  visit(frame.rootId);
}

function assertRedBlack(frame: TreeFrame) {
  if (!frame.rootId) return;
  expect(frame.nodes[frame.rootId].color).toBe("black");
  const visit = (id: string | null | undefined, min = -Infinity, max = Infinity): number => {
    if (!id) return 1;
    const node = frame.nodes[id];
    const value = Number(node.value);
    expect(value).toBeGreaterThan(min);
    expect(value).toBeLessThan(max);
    if (node.color === "red") {
      if (node.left) expect(frame.nodes[node.left].color).toBe("black");
      if (node.right) expect(frame.nodes[node.right].color).toBe("black");
    }
    const left = visit(node.left, min, value);
    const right = visit(node.right, value, max);
    expect(left, `black height at ${value}`).toBe(right);
    return left + (node.color === "black" ? 1 : 0);
  };
  visit(frame.rootId);
}

function liveHashKeys(frame: HashFrame): number[] {
  return frame.buckets
    .flatMap((bucket) => bucket.items.map((item) => item.key))
    .filter((key) => key !== "×")
    .map(Number)
    .sort((a, b) => a - b);
}

describe("linked lists", () => {
  it("reverses duplicates and negative values without losing node identity", async () => {
    const { final } = await run<ListFrame>("reverse-linked-list", { values: "-2, 5, 5, 0" });
    expect(listOrder(final)).toEqual([0, 5, 5, -2]);
    expect(new Set(final.nodes.map((node) => node.id)).size).toBe(4);
  });

  it("keeps doubly-linked next/prev links symmetric after head insertion and deletion", async () => {
    const { final } = await run<ListFrame>("doubly-linked-list", {
      values: "-5, 0, 8, 8",
      insertHead: "12",
      deleteValue: "8",
    });
    expect(final.nodes.map((node) => node.value)).toEqual([12, -5, 0, 8]);
    for (let i = 0; i < final.nodes.length - 1; i++) {
      const a = final.nodes[i].id;
      const b = final.nodes[i + 1].id;
      expect(final.links).toContainEqual({ from: a, to: b, kind: "next" });
      expect(final.links).toContainEqual({ from: b, to: a, kind: "prev" });
    }
  });

  it("merges sorted lists while preserving duplicates", async () => {
    const { final } = await run<ListFrame>("merge-two-sorted-lists", { a: "4, -1, 4", b: "3, -1, 9" });
    expect(final.nodes.map((node) => node.value)).toEqual([-1, -1, 3, 4, 4, 9]);
  });

  it("finds a cycle entry and handles an acyclic list", async () => {
    const cyclic = await run<ListFrame>("floyd-cycle-detection", { values: "3, 2, 0, -4", cyclePos: "1" });
    expect(cyclic.final.pointers?.filter((pointer) => pointer.label.includes("slow") || pointer.label.includes("fast")).map((pointer) => pointer.nodeId)).toEqual(["n1", "n1"]);
    const acyclic = await run<ListFrame>("floyd-cycle-detection", { values: "3, 2, 0, -4", cyclePos: "-1" });
    expect(acyclic.final.links.some((link) => link.kind === "loop")).toBe(false);
    expect(acyclic.steps.at(-1)!.description.toLowerCase()).toContain("no cycle");
  });
});

describe("stacks and queues", () => {
  it("applies stack LIFO operations and safe underflow", async () => {
    const { final, steps } = await run<CallStackFrame>("stack-operations", { ops: "pop, push -2, push 7, peek, pop, push 0" });
    expect(final.stack.map((item) => Number(item.label))).toEqual([-2, 0]);
    expect(final.output).toEqual(["7"]);
    expect(steps.some((step) => step.description.toLowerCase().includes("underflow"))).toBe(true);
  });

  it("applies queue FIFO operations and safe underflow", async () => {
    const { final, steps } = await run<ListFrame>("queue-operations", { ops: "dequeue, enqueue -2, enqueue 7, front, dequeue, enqueue 0" });
    expect(final.nodes.map((node) => node.value)).toEqual([7, 0]);
    expect(auxValues(final, "Dequeued")).toEqual([-2]);
    expect(steps.some((step) => step.description.toLowerCase().includes("underflow"))).toBe(true);
  });

  it("shows each bracket exactly once while reporting balanced and mismatched inputs", async () => {
    const balanced = await run<CallStackFrame>("balanced-parentheses", { expr: "([{}])" });
    expect(auxValues(balanced.final, "expression")).toEqual(["(", "[", "{", "}", "]", ")"]);
    expect(balanced.steps.at(-1)!.description).toContain("Balanced");
    const mismatch = await run<CallStackFrame>("balanced-parentheses", { expr: "([)]" });
    expect(mismatch.steps.at(-1)!.description).toContain("Not balanced");
  });

  it("maintains O(1) minimum metadata after repeated pops", async () => {
    const { final } = await run<CallStackFrame>("min-stack", { values: "5, -2, 7, -4, 9", popCount: "2" });
    expect(final.stack.map((item) => Number(item.label))).toEqual([5, -2, 7]);
    expect(auxValues(final, "getMin()")).toEqual([-2]);
  });

  it("preserves FIFO order through circular wraparound and reports overflow", async () => {
    const { final, steps, algorithm } = await run<ArrayFrame>("circular-queue", { capacity: "3", ops: "E -1, E 2, E 3, E 4, D, E 5" });
    const front = final.pointers?.find((pointer) => pointer.label === "front")?.index ?? 0;
    const size = Number(String(auxValues(final, "size / capacity")?.[0]).split("/")[0].trim());
    const order = Array.from({ length: size }, (_, i) => final.values[(front + i) % final.values.length]);
    expect(order).toEqual([2, 3, 5]);
    expect(steps.some((step) => step.description.toLowerCase().includes("full"))).toBe(true);
    expect(() => algorithm.parseInput({ capacity: "3", ops: "E 1000" })).toThrow(/-999 to 999/);
  });
});

describe("hashing", () => {
  for (const slug of ["hash-chaining", "linear-probing", "quadratic-probing", "double-hashing"]) {
    it(`${slug} handles collisions, duplicates, negative keys, deletion, and reinsertion`, async () => {
      const { final, steps, algorithm } = await run<HashFrame>(slug, {
        size: "7",
        ops: "insert -1, insert 6, insert 13, insert 6, search 13, delete 6, search 6, search 13, insert 20",
      });
      expect(liveHashKeys(final)).toEqual([-1, 13, 20]);
      expect(steps.some((step) => step.description.includes("13") && step.description.toLowerCase().includes("found"))).toBe(true);
      expect(steps.some((step) => step.description.includes("6") && step.description.toLowerCase().match(/not found|not in/))).toBe(true);
      expect(() => algorithm.parseInput({ size: "7", ops: "insert 10000" })).toThrow(/-9999 to 9999/);
    });
  }
});

describe("trees, heaps, and advanced structures", () => {
  it("performs BST insert/search and all deletion shapes", async () => {
    const { final, steps } = await run<TreeFrame>("binary-search-tree", {
      ops: "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, search 40, delete 20, delete 30, delete 50",
    });
    expect(numericInorder(final)).toEqual([40, 60, 70, 80]);
    expect(steps.some((step) => step.description.includes("Found 40"))).toBe(true);
  });

  it("produces correct traversal orders with negative values", async () => {
    const values = "0, -2, 4, -3, -1, 2, 5";
    const expected: Record<string, number[]> = {
      inorder: [-3, -2, -1, 0, 2, 4, 5],
      preorder: [0, -2, -3, -1, 4, 2, 5],
      postorder: [-3, -1, -2, 2, 5, 4, 0],
      levelorder: [0, -2, 4, -3, -1, 2, 5],
    };
    for (const [order, output] of Object.entries(expected)) {
      const { final } = await run<TreeFrame>("binary-tree-traversals", { values, order });
      expect(auxValues(final, "Visited")).toEqual(output);
    }
  });

  it("maintains min-heap order and removes the requested minima", async () => {
    const { final } = await run<TreeFrame>("min-heap", { values: "5, -2, 7, -2, 9, 0", extractCount: "2" });
    const heap = auxValues(final, "heap array")!.map(Number);
    expect(heap.slice().sort((a, b) => a - b)).toEqual([0, 5, 7, 9]);
    heap.forEach((value, i) => {
      if (2 * i + 1 < heap.length) expect(value).toBeLessThanOrEqual(heap[2 * i + 1]);
      if (2 * i + 2 < heap.length) expect(value).toBeLessThanOrEqual(heap[2 * i + 2]);
    });
  });

  it("keeps AVL invariants for LL, RR, LR, RL, and the reported regression", async () => {
    for (const values of ["30, 20, 10", "10, 20, 30", "30, 10, 20", "10, 30, 20", "6, 7, 88, 99", "0, -10, -20, 15, 10"]) {
      const { final, steps } = await run<TreeFrame>("avl-tree", { values });
      assertAvl(final);
      expect(steps.some((step) => step.description.toLowerCase().includes("rotation")), values).toBe(true);
      const rotationSteps = steps.filter((step) => step.transformation?.label?.startsWith("AVL"));
      expect(rotationSteps.length, values).toBe(steps.at(-1)!.counters?.rotations);
    }
  });

  it("keeps red-black invariants across adversarial insertion orders", async () => {
    for (const values of ["1, 2, 3, 4, 5, 6, 7, 8", "8, 7, 6, 5, 4, 3, 2, 1", "10, -5, 20, -10, 0, 15, 30, 25"]) {
      const { final, steps } = await run<TreeFrame>("red-black-tree", { values });
      assertRedBlack(final);
      expect(steps.some((step) => step.transformation?.kind === "balance"), values).toBe(true);
    }
  });

  it("keeps B-tree keys ordered, bounded, unique, and leaves at one depth", async () => {
    const { final, steps } = await run<TreeFrame>("b-tree", { values: "10, 20, 5, 6, 12, 30, 7, 17, -1, 25, 40, 50" });
    const depths = new Set<number>();
    const allKeys: number[] = [];
    const visit = (id: string, depth: number, min: number, max: number) => {
      const node = final.nodes[id];
      const keys = String(node.value).split("|").map(Number);
      expect(keys).toEqual(keys.slice().sort((a, b) => a - b));
      expect(keys.length).toBeGreaterThanOrEqual(id === final.rootId ? 1 : 1);
      expect(keys.length).toBeLessThanOrEqual(3);
      keys.forEach((key) => { expect(key).toBeGreaterThan(min); expect(key).toBeLessThan(max); });
      allKeys.push(...keys);
      const children = (node.children ?? []).filter((child): child is string => Boolean(child));
      if (children.length === 0) depths.add(depth);
      else {
        expect(children.length).toBe(keys.length + 1);
        children.forEach((child, i) => visit(child, depth + 1, i === 0 ? min : keys[i - 1], i === keys.length ? max : keys[i]));
      }
    };
    visit(final.rootId!, 0, -Infinity, Infinity);
    expect(depths.size).toBe(1);
    expect(allKeys.slice().sort((a, b) => a - b)).toEqual([-1, 5, 6, 7, 10, 12, 17, 20, 25, 30, 40, 50]);
    expect(steps.filter((step) => step.frame.note === "split").every((step) => step.transformation?.kind === "rebuild")).toBe(true);
  });

  it("distinguishes exact trie words from prefixes and missing words", async () => {
    const exact = await run<TreeFrame>("trie", { words: "car, card, care, dog", search: "car" });
    expect(exact.steps.at(-1)!.description.toLowerCase()).toContain("present");
    const prefix = await run<TreeFrame>("trie", { words: "card, care, dog", search: "car" });
    expect(prefix.steps.at(-1)!.description.toLowerCase()).toContain("prefix");
    const missing = await run<TreeFrame>("trie", { words: "card, care, dog", search: "cat" });
    expect(missing.steps.at(-1)!.description.toLowerCase()).toContain("not in the trie");
  });

  it("updates segment and Fenwick trees without corrupting aggregate sums", async () => {
    const segment = await run<TreeFrame>("segment-tree", { values: "1, -2, 3, 4", queryL: "1", queryR: "3", updateIdx: "2", updateVal: "10" });
    expect(Number(segment.final.nodes[segment.final.rootId!].value)).toBe(13);
    expect(auxValues(segment.final, "array")).toEqual([1, -2, 10, 4]);
    const fenwick = await run<ArrayFrame>("fenwick-tree", { values: "1, -2, 3, 4", queryIdx: "4", updateIdx: "2", updateDelta: "5" });
    expect(fenwick.final.values[4]).toBe(11);
  });
});

describe("graphs", () => {
  it("BFS and DFS visit exactly the reachable component", async () => {
    for (const slug of ["bfs", "dfs"]) {
      const { final } = await run<GraphFrame>(slug, { edges: "A-B, B-C, X-Y", start: "B" });
      expect(Object.keys(final.nodeStates ?? {}).filter((id) => final.nodeStates?.[id] === "visited").sort()).toEqual(["A", "B", "C"]);
    }
  });

  it("computes Dijkstra distances and rejects negative weights", async () => {
    const { final, algorithm } = await run<GraphFrame>("dijkstra", { edges: "A-B:4, A-C:1, C-B:2, B-D:1, X-Y:3", start: "A" });
    expect(final.nodeAnnotations).toMatchObject({ A: "0", B: "3", C: "1", D: "4", X: "∞", Y: "∞" });
    expect(() => algorithm.parseInput({ edges: "A-B:-1", start: "A" })).toThrow();
  });

  it("computes the same MST weight with Prim and Kruskal and identifies disconnected input", async () => {
    const fields = { edges: "A-B:4, A-C:1, C-B:2, B-D:5, C-D:8" };
    const prim = await run<GraphFrame>("prim", fields);
    const kruskal = await run<GraphFrame>("kruskal", fields);
    expect(auxValues(prim.final, "MST weight")).toEqual([8]);
    expect(auxValues(kruskal.final, "MST weight")).toEqual([8]);
    const disconnected = await run<GraphFrame>("kruskal", { edges: "A-B:1, C-D:2" });
    expect(disconnected.steps.at(-1)!.description.toLowerCase()).toContain("disconnected");
  });

  it("returns a valid topological order and rejects a cycle in the result", async () => {
    const dag = await run<GraphFrame>("topological-sort", { edges: "A>B, A>C, B>D, C>D" });
    const order = auxValues(dag.final, "Order")!.map(String);
    const position = new Map(order.map((node, i) => [node, i]));
    for (const [from, to] of [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]) expect(position.get(from)!).toBeLessThan(position.get(to)!);
    const cycle = await run<GraphFrame>("topological-sort", { edges: "A>B, B>C, C>A" });
    expect(cycle.steps.at(-1)!.description.toLowerCase()).toContain("cycle");
  });

  it("computes shortest paths with negative edges and detects negative cycles", async () => {
    const shortest = await run<GraphFrame>("bellman-ford", { edges: "A>B:4, A>C:5, B>C:-2, C>D:3", start: "A" });
    expect(shortest.final.nodeAnnotations).toMatchObject({ A: "0", B: "4", C: "2", D: "5" });
    const cycle = await run<GraphFrame>("bellman-ford", { edges: "A>B:1, B>C:-2, C>A:0", start: "A" });
    expect(cycle.steps.at(-1)!.description.toLowerCase()).toMatch(/negative.*cycle/);
  });

  it("computes Floyd-Warshall all-pairs distances", async () => {
    const { final } = await run<TableFrame>("floyd-warshall", { edges: "A>B:3, B>C:-2, A>C:8, C>D:4" });
    const at = (from: string, to: string) => final.cells[final.rowLabels.indexOf(from)][final.colLabels.indexOf(to)].value;
    expect(at("A", "C")).toBe(1);
    expect(at("A", "D")).toBe(5);
    expect(at("D", "A")).toBe("∞");
  });

  it("maintains union-find component counts and handles duplicate unions", async () => {
    const { final } = await run<GraphFrame>("union-find", { n: "6", ops: "0-1, 2-3, 1-2, 0-3, 4-5" });
    expect(auxValues(final, "components")).toEqual([2]);
  });

  it("finds the same SCC count with Tarjan and Kosaraju", async () => {
    const fields = { edges: "A>B, B>C, C>A, C>D, D>E, E>D, E>F" };
    const tarjan = await run<GraphFrame>("tarjan-scc", fields);
    const kosaraju = await run<GraphFrame>("kosaraju-scc", fields);
    expect(auxValues(tarjan.final, "SCCs found")).toEqual([3]);
    expect(auxValues(kosaraju.final, "SCCs found")).toEqual([3]);
  });

  it("shows the complete optimal A* path and handles no-path grids", async () => {
    const path = await run<GridFrame>("a-star", { grid: "111 / 101 / 111" });
    const frame = path.final;
    expect(frame.cells.flat().filter((cell) => cell.state === "sorted")).toHaveLength(5);
    expect(frame.cells[2][2].value).toBe("G");
    const blocked = await run<GridFrame>("a-star", { grid: "10 / 01" });
    expect(blocked.steps.at(-1)!.description.toLowerCase()).toContain("no path");
    expect(() => path.algorithm.parseInput({ grid: "01 / 11" })).toThrow(/Start cell/);
    expect(() => path.algorithm.parseInput({ grid: "11 / 10" })).toThrow(/Goal cell/);
  });

  it("computes max flow and merges parallel directed capacities", async () => {
    const flow = await run<GraphFrame>("max-flow", { edges: "S>A:2, S>A:3, A>T:4, S>T:1", source: "S", sink: "T" });
    expect(auxValues(flow.final, "max flow so far")).toEqual([5]);
    expect(flow.final.edges.filter((edge) => edge.from === "S" && edge.to === "A")).toHaveLength(1);
    const opposite = await run<GraphFrame>("max-flow", { edges: "S>A:5, A>S:3, A>T:5", source: "S", sink: "T" });
    expect(opposite.final.edges.every((edge) => (edge.weight ?? 0) >= 0)).toBe(true);
  });
});
