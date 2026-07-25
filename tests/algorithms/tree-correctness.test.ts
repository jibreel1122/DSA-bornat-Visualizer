import { beforeAll, describe, expect, it } from "vitest";
import { loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, TreeFrame } from "@/lib/engine/types";
import { validateFrame } from "../helpers/validate-frame";

function finalFrame<I>(module: AlgorithmModule<TreeFrame, I>, input: I): TreeFrame {
  const steps = module.generate(input);
  expect(steps.length).toBeGreaterThan(0);
  steps.forEach((step, index) =>
    expect(validateFrame("tree", step.frame), `step ${index}`).toEqual([]),
  );
  return steps.at(-1)!.frame;
}

function binaryValues(frame: TreeFrame): number[] {
  const seen = new Set<string>();
  const walk = (id: string | null | undefined): number[] => {
    if (!id) return [];
    expect(seen.has(id), `cycle or shared child at ${id}`).toBe(false);
    seen.add(id);
    const node = frame.nodes[id];
    expect(node).toBeDefined();
    expect(typeof node.value).toBe("number");
    return [...walk(node.left), Number(node.value), ...walk(node.right)];
  };
  const values = walk(frame.rootId);
  expect(seen.size, "every rendered node is reachable from the root").toBe(
    Object.keys(frame.nodes).length,
  );
  return values;
}

function avlHeight(frame: TreeFrame, id: string | null | undefined): number {
  if (!id) return 0;
  const node = frame.nodes[id];
  const left = avlHeight(frame, node.left);
  const right = avlHeight(frame, node.right);
  expect(Math.abs(left - right), `AVL balance at ${node.value}`).toBeLessThanOrEqual(1);
  return 1 + Math.max(left, right);
}

describe("self-balancing tree correctness", () => {
  let avl: AlgorithmModule<TreeFrame, { values: number[] }>;
  let redBlack: AlgorithmModule<TreeFrame, { values: number[] }>;

  beforeAll(async () => {
    avl = (await loadAlgorithm("avl-tree")) as typeof avl;
    redBlack = (await loadAlgorithm("red-black-tree")) as typeof redBlack;
  });

  const rotationCases = [
    [30, 20, 10], // LL
    [10, 20, 30], // RR
    [30, 10, 20], // LR
    [10, 30, 20], // RL
    [6, 7, 88, 99], // reported regression
    [50, 20, 70, 10, 30, 60, 80, 25, 27],
  ];

  it.each(rotationCases.map((values) => [values] as const))("AVL preserves BST order and height balance for %j", (values) => {
    const frame = finalFrame(avl, { values });
    expect(binaryValues(frame)).toEqual([...values].sort((a, b) => a - b));
    avlHeight(frame, frame.rootId);
  });

  it.each(rotationCases.map((values) => [values] as const))("red-black tree preserves every color invariant for %j", (values) => {
    const frame = finalFrame(redBlack, { values });
    expect(binaryValues(frame)).toEqual([...values].sort((a, b) => a - b));
    expect(frame.nodes[frame.rootId!].color).toBe("black");

    const blackHeight = (id: string | null | undefined): number => {
      if (!id) return 1; // null leaves are black
      const node = frame.nodes[id];
      if (node.color === "red") {
        if (node.left) expect(frame.nodes[node.left].color).not.toBe("red");
        if (node.right) expect(frame.nodes[node.right].color).not.toBe("red");
      }
      const left = blackHeight(node.left);
      const right = blackHeight(node.right);
      expect(left, `black height at ${node.value}`).toBe(right);
      return left + (node.color === "black" ? 1 : 0);
    };
    blackHeight(frame.rootId);
  });
});

describe("heap and B-tree correctness", () => {
  let minHeap: AlgorithmModule<TreeFrame, { values: number[]; extractCount: number }>;
  let bTree: AlgorithmModule<TreeFrame, { values: number[] }>;

  beforeAll(async () => {
    minHeap = (await loadAlgorithm("min-heap")) as typeof minHeap;
    bTree = (await loadAlgorithm("b-tree")) as typeof bTree;
  });

  it.each([0, 1, 3, 7])("min-heap preserves its invariant after %i extractions", (extractCount) => {
    const values = [5, 3, 8, 1, 9, 2, 2];
    const frame = finalFrame(minHeap, { values, extractCount });
    const heap = Object.values(frame.nodes)
      .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
      .map((node) => Number(node.value));
    const removed = Math.min(extractCount, values.length);
    expect([...heap].sort((a, b) => a - b)).toEqual(
      [...values].sort((a, b) => a - b).slice(removed),
    );
    heap.forEach((value, index) => {
      const left = 2 * index + 1;
      const right = left + 1;
      if (left < heap.length) expect(value).toBeLessThanOrEqual(heap[left]);
      if (right < heap.length) expect(value).toBeLessThanOrEqual(heap[right]);
    });
  });

  it("B-tree keeps sorted bounded nodes, valid ranges, and equal leaf depth", () => {
    const values = [10, 20, 5, 6, 12, 30, 7, 17, 3, 4, 2, 25, 27];
    const frame = finalFrame(bTree, { values });
    const allKeys: number[] = [];
    const leafDepths = new Set<number>();

    const visit = (
      id: string,
      depth: number,
      min = Number.NEGATIVE_INFINITY,
      max = Number.POSITIVE_INFINITY,
    ) => {
      const node = frame.nodes[id];
      const keys = String(node.value).split("|").map((key) => Number(key.trim()));
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.length).toBeLessThanOrEqual(3);
      expect(keys).toEqual([...keys].sort((a, b) => a - b));
      keys.forEach((key) => {
        expect(key).toBeGreaterThan(min);
        expect(key).toBeLessThan(max);
        allKeys.push(key);
      });
      const children = (node.children ?? []).filter((child): child is string => Boolean(child));
      if (children.length === 0) {
        leafDepths.add(depth);
        return;
      }
      expect(children.length).toBe(keys.length + 1);
      children.forEach((child, index) =>
        visit(child, depth + 1, index === 0 ? min : keys[index - 1], index === keys.length ? max : keys[index]),
      );
    };

    visit(frame.rootId!, 0);
    expect(leafDepths.size).toBe(1);
    expect(allKeys.sort((a, b) => a - b)).toEqual([...values].sort((a, b) => a - b));
  });
});

describe("binary-search-tree operations", () => {
  it("applies inserts and every deletion shape without violating BST order", async () => {
    type Operation = { kind: "insert" | "search" | "delete"; value: number };
    const bst = (await loadAlgorithm("binary-search-tree")) as AlgorithmModule<
      TreeFrame,
      { ops: Operation[] }
    >;
    const ops: Operation[] = [
      ...[50, 30, 70, 20, 40, 60, 80].map((value) => ({ kind: "insert" as const, value })),
      { kind: "delete", value: 20 }, // leaf
      { kind: "delete", value: 30 }, // one child
      { kind: "delete", value: 50 }, // two children / root
      { kind: "search", value: 60 },
      { kind: "search", value: 999 },
    ];
    const frame = finalFrame(bst, { ops });
    expect(binaryValues(frame)).toEqual([40, 60, 70, 80]);
  });
});
