import { describe, expect, it } from "vitest";
import { LANGUAGES, type AlgorithmModule, type RNG, type TreeFrame } from "@/lib/engine/types";
import {
  bloomFilter,
  circularLinkedList,
  cuckooHashing,
  dequeOperations,
  expressionTree,
  intervalTree,
  kdTree,
  loaders,
  maxHeap,
  metas,
  modules,
  monotonicStack,
  priorityQueue,
  queueUsingStacks,
  robinHoodHashing,
  singlyLinkedListOperations,
  splayTree,
  threadedBinaryTree,
  treap,
  twoThreeTree,
} from "@/lib/algorithms/expansion-b";

type TestModule = AlgorithmModule<unknown, unknown>;

const asTestModule = (module: unknown) => module as TestModule;
const finalFrame = <F>(steps: { frame: F }[]) => steps.at(-1)!.frame;
const auxValues = (frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) =>
  frame.aux?.find((row) => row.label === label)?.values ?? [];

let rngState = 0;
const rng: RNG = {
  next: () => 0.42,
  int: (minimum, maximum) => minimum + (rngState++ % (maximum - minimum + 1)),
  pick: <T>(items: readonly T[]) => items[0],
  shuffle: <T>(items: readonly T[]) => [...items],
};

const expectedSlugs = [
  "singly-linked-list-operations",
  "circular-linked-list",
  "deque-operations",
  "priority-queue",
  "monotonic-stack",
  "queue-using-stacks",
  "cuckoo-hashing",
  "robin-hood-hashing",
  "bloom-filter",
  "splay-tree",
  "treap",
  "max-heap",
  "two-three-tree",
  "kd-tree",
  "interval-tree",
  "expression-tree",
  "threaded-binary-tree",
] as const;

function assertTreeLinks(frame: TreeFrame) {
  expect(frame.rootId === null || frame.nodes[frame.rootId]).toBeTruthy();
  for (const node of Object.values(frame.nodes)) {
    for (const child of [node.left, node.right, ...(node.children ?? [])]) {
      if (child != null) expect(frame.nodes[child]).toBeTruthy();
    }
  }
}

function parseNumber(value: string | number) {
  const parts = String(value).split("=");
  return Number(parts.at(-1));
}

describe("expansion B exact scope and contracts", () => {
  it("exports exactly the requested 17 unique modules, metas, and loaders", async () => {
    expect(modules.map((module) => module.slug)).toEqual(expectedSlugs);
    expect(new Set(modules.map((module) => module.slug)).size).toBe(17);
    expect(metas.map((meta) => meta.slug)).toEqual(expectedSlugs);
    expect(Object.keys(loaders)).toEqual(expectedSlugs);
    for (const slug of expectedSlugs) {
      expect((await loaders[slug]()).default.slug).toBe(slug);
    }
  });

  it.each(modules.map((module) => [module.slug, module] as const))("%s has a complete bilingual executable contract", (_, rawModule) => {
    const algorithm = asTestModule(rawModule);
    expect(algorithm.titleAr?.trim()).toBeTruthy();
    expect(algorithm.summaryAr?.trim()).toBeTruthy();
    expect(algorithm.tagsAr?.length).toBe(algorithm.tags.length);
    expect(algorithm.contentAr?.overview.trim()).toBeTruthy();
    expect(algorithm.contentAr?.howItWorks.length).toBeGreaterThan(0);
    expect(algorithm.inputFields.every((field) => field.labelAr?.trim())).toBe(true);
    expect(algorithm.pseudocode.length).toBeGreaterThan(2);
    for (const language of LANGUAGES) expect(algorithm.code[language.id].trim()).toBeTruthy();

    const input = algorithm.defaultInput(3, rng);
    const serialized = algorithm.serializeInput(input);
    expect(algorithm.serializeInput(algorithm.parseInput(serialized))).toEqual(serialized);
    const steps = algorithm.generate(input);
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.every((step) => step.description.trim() && step.descriptionAr?.trim())).toBe(true);
  });
});

describe("linked structures and queue logic", () => {
  it("rewires singly and circular list links without losing surviving nodes", () => {
    const singly = singlyLinkedListOperations.generate(singlyLinkedListOperations.parseInput({ ops: "^4, +7, +9, -7, ?9" }));
    const singlyFinal = finalFrame(singly);
    expect(singlyFinal.nodes.map((node) => node.value)).toEqual([4, 9]);
    expect(singlyFinal.links.map((link) => [link.from, link.to, link.kind])).toEqual([[singlyFinal.nodes[0].id, singlyFinal.nodes[1].id, "next"]]);

    const circular = circularLinkedList.generate(circularLinkedList.parseInput({ ops: "+4, +7, +9, -4" }));
    const circularFinal = finalFrame(circular);
    expect(circularFinal.nodes.map((node) => node.value)).toEqual([7, 9]);
    expect(circularFinal.links).toContainEqual({ from: circularFinal.nodes[1].id, to: circularFinal.nodes[0].id, kind: "loop" });
    expect(circular.some((step) => step.phase === "delete" && step.frame.nodes.some((node) => node.value === 4))).toBe(true);
  });

  it("preserves deque ends, stable priority order, monotonic answers, and FIFO transfer", () => {
    const deque = finalFrame(dequeOperations.generate(dequeOperations.parseInput({ ops: "F+4, B+7, F+2, B-, B+9, F-" })));
    expect(deque.nodes.map((node) => node.value)).toEqual([4, 9]);

    const prioritySteps = priorityQueue.generate(priorityQueue.parseInput({ entries: "40:3, 10:1, 20:2, 11:1" }));
    expect(auxValues(finalFrame(prioritySteps), "removed")).toEqual([10, 11, 20, 40]);
    expect(prioritySteps.some((step) => step.phase === "insert" && Object.values(step.frame.states ?? {}).includes("swap"))).toBe(true);

    const monotonic = finalFrame(monotonicStack.generate({ values: [2, 1, 2, 4, 3] }));
    expect(auxValues(monotonic, "next greater")).toEqual([4, 2, 4, -1, -1]);

    const queue = queueUsingStacks.generate(queueUsingStacks.parseInput({ ops: "+4, +7, -, +9, ?, -" }));
    expect(auxValues(finalFrame(queue), "dequeued")).toEqual([4, 7]);
    expect(queue.filter((step) => step.phase === "transfer").length).toBeGreaterThanOrEqual(4);
  });
});

describe("hashing correctness and probes", () => {
  it("stores every unique cuckoo key in one legal table and searches only its two homes", () => {
    const keys = [20, 50, 53, 75, 100, 67];
    const steps = cuckooHashing.generate({ values: keys, query: 75 });
    const frame = finalFrame(steps);
    const stored = frame.buckets.flatMap((bucket) => bucket.items.map((item) => Number(item.key)));
    expect([...stored].sort((a, b) => a - b)).toEqual([...new Set(keys)].sort((a, b) => a - b));
    expect(steps.filter((step) => step.phase === "search").length).toBeLessThanOrEqual(4);
    expect(steps.some((step) => step.description.includes("Found 75"))).toBe(true);
  });

  it("maintains Robin Hood probe distances and Bloom-filter no-false-negative bits", () => {
    const robin = finalFrame(robinHoodHashing.generate({ values: [0, 8, 16, 24, 3], query: 24 }));
    const distances = auxValues(robin, "probe distance");
    robin.buckets.forEach((bucket, index) => {
      if (bucket.items.length === 0) return;
      const key = Number(bucket.items[0].key);
      const expected = (index - (((key % robin.buckets.length) + robin.buckets.length) % robin.buckets.length) + robin.buckets.length) % robin.buckets.length;
      expect(distances[index]).toBe(expected);
    });

    const inserted = [5, 12, 29];
    for (const query of inserted) {
      const bloom = bloomFilter.generate({ values: inserted, query });
      expect(bloom.at(-1)!.description).toContain("may be present");
      expect(bloom.at(-1)!.frame.values.filter((bit) => bit === 1).length).toBeGreaterThan(0);
    }
  });
});

describe("balanced-tree invariants and structural traces", () => {
  it("splays an accessed key to the root with separated rotation preparation/completion frames", () => {
    const steps = splayTree.generate({ values: [40, 20, 60, 10, 30, 50, 70], access: 30 });
    expect(finalFrame(steps).nodes[finalFrame(steps).rootId!].value).toBe(30);
    const rotations = steps.filter((step) => step.phase === "rotate");
    expect(rotations.length).toBeGreaterThanOrEqual(2);
    expect(rotations.some((step) => step.transformation?.label?.includes("Splay"))).toBe(true);
    steps.forEach((step) => assertTreeLinks(step.frame));
  });

  it("keeps treap BST key order and min-heap priority order after every completed rotation", () => {
    const steps = treap.generate(treap.parseInput({ entries: "50:40, 30:20, 70:60, 20:10, 40:30, 60:50" }));
    const frame = finalFrame(steps);
    const walk = (id: string | null, low = -Infinity, high = Infinity) => {
      if (!id) return;
      const node = frame.nodes[id];
      const key = Number(node.value);
      const priority = Number(node.extra?.slice(1));
      expect(key).toBeGreaterThan(low);
      expect(key).toBeLessThan(high);
      for (const childId of [node.left, node.right]) {
        if (childId) expect(Number(frame.nodes[childId].extra?.slice(1))).toBeGreaterThanOrEqual(priority);
      }
      walk(node.left ?? null, low, key);
      walk(node.right ?? null, key, high);
    };
    walk(frame.rootId);
    expect(steps.some((step) => step.transformation?.label === "Treap priority rotation")).toBe(true);
  });

  it("preserves complete max-heap order and exposes every sift swap", () => {
    const steps = maxHeap.generate({ values: [10, 4, 15, 20, 3, 17], extracts: 2 });
    const frame = finalFrame(steps);
    const heap = auxValues(frame, "heap array").map(Number);
    expect(auxValues(frame, "extracted")).toEqual([20, 17]);
    heap.forEach((value, index) => {
      if (index > 0) expect(heap[Math.floor((index - 1) / 2)]).toBeGreaterThanOrEqual(value);
    });
    expect(steps.filter((step) => step.transformation?.label?.includes("sift")).length).toBeGreaterThan(0);
  });

  it("keeps 2-3 nodes ordered with one/two keys and all leaves at equal depth", () => {
    const steps = twoThreeTree.generate({ values: [40, 20, 60, 10, 30, 50, 70, 25, 27, 26] });
    const frame = finalFrame(steps);
    const leafDepths: number[] = [];
    const walk = (id: string, depth: number, low: number, high: number) => {
      const node = frame.nodes[id];
      const keys = String(node.value).split("|").map(Number);
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.length).toBeLessThanOrEqual(2);
      expect(keys).toEqual([...keys].sort((a, b) => a - b));
      expect(keys.every((key) => key > low && key < high)).toBe(true);
      const children = (node.children ?? []).filter((child): child is string => child !== null);
      if (children.length === 0) leafDepths.push(depth);
      else {
        expect(children.length).toBe(keys.length + 1);
        const bounds = [low, ...keys, high];
        children.forEach((child, index) => walk(child, depth + 1, bounds[index], bounds[index + 1]));
      }
    };
    walk(frame.rootId!, 0, -Infinity, Infinity);
    expect(new Set(leafDepths).size).toBe(1);
    expect(steps.some((step) => step.phase === "split")).toBe(true);
  });
});

describe("specialized-tree correctness", () => {
  it("KD nearest-neighbor result matches brute force and each depth uses the correct split axis", () => {
    const points: [number, number][] = [[30, 40], [5, 25], [70, 70], [10, 12], [50, 30], [35, 45]];
    const query: [number, number] = [45, 35];
    const frame = finalFrame(kdTree.generate({ points, query }));
    const expected = points.reduce((best, point) =>
      (point[0] - query[0]) ** 2 + (point[1] - query[1]) ** 2 <
      (best[0] - query[0]) ** 2 + (best[1] - query[1]) ** 2 ? point : best);
    expect(frame.nodes[Object.keys(frame.states ?? {}).find((id) => frame.states?.[id] === "sorted")!].value).toBe(`(${expected[0]},${expected[1]})`);
    const walk = (id: string | null, depth: number) => {
      if (!id) return;
      expect(frame.nodes[id].extra).toBe(depth % 2 === 0 ? "split x" : "split y");
      walk(frame.nodes[id].left ?? null, depth + 1);
      walk(frame.nodes[id].right ?? null, depth + 1);
    };
    walk(frame.rootId, 0);
  });

  it("interval max augmentation is exact and overlap result is valid", () => {
    const query: [number, number] = [6, 7];
    const frame = finalFrame(intervalTree.generate({ intervals: [[15, 20], [10, 30], [17, 19], [5, 20], [12, 15], [30, 40]], query }));
    const check = (id: string | null): number => {
      if (!id) return -Infinity;
      const node = frame.nodes[id];
      const [low, high] = String(node.value).slice(1, -1).split(",").map(Number);
      const maximum = Math.max(high, check(node.left ?? null), check(node.right ?? null));
      expect(node.extra).toBe(`max=${maximum}`);
      if (frame.states?.[id] === "found") expect(low <= query[1] && query[0] <= high).toBe(true);
      return maximum;
    };
    check(frame.rootId);
  });

  it("builds and evaluates an expression tree with correct precedence", () => {
    const steps = expressionTree.generate({ expression: "3 + 4 * (2 - 1) ^ 2" });
    const frame = finalFrame(steps);
    expect(parseNumber(frame.nodes[frame.rootId!].value)).toBe(7);
    expect(steps.filter((step) => step.phase === "build").length).toBeGreaterThan(4);
    expect(steps.some((step) => step.transformation?.label === "Expression subtree construction")).toBe(true);
  });

  it("creates exact predecessor/successor threads and traverses in sorted order", () => {
    const values = [40, 20, 60, 10, 30, 50, 70];
    const steps = threadedBinaryTree.generate({ values });
    const frame = finalFrame(steps);
    expect(auxValues(frame, "inorder")).toEqual([...values].sort((a, b) => a - b));
    expect(steps.filter((step) => step.phase === "traverse").map((step) => Number(step.description.match(/Output (\d+)/)?.[1]))).toEqual([...values].sort((a, b) => a - b));
    expect(auxValues(frame, "threads").length).toBeGreaterThan(0);
  });
});
