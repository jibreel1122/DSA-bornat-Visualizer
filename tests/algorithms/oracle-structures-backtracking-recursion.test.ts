import { describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type {
  AlgorithmModule,
  ArrayFrame,
  CallStackFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  TreeFrame,
} from "@/lib/engine/types";

type Fields = Record<string, string>;

const categories = ["trees", "hashing", "linked-lists", "stacks-queues", "backtracking", "recursion"] as const;

async function run<F>(slug: string, fields: Fields) {
  const algorithm = await loadAlgorithm(slug) as AlgorithmModule<F, unknown> | null;
  if (!algorithm) throw new Error(`Missing registered module: ${slug}`);
  const input = algorithm.parseInput(fields);
  const steps = algorithm.generate(input);
  expect(steps.length, `${slug} should render at least one step`).toBeGreaterThan(0);
  return { algorithm, input, steps, final: steps.at(-1)! };
}

function aux(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) {
  return frame.aux?.find((row) => row.label.toLowerCase() === label.toLowerCase())?.values ?? [];
}

function listOrder(frame: ListFrame): (string | number)[] {
  const byId = new Map(frame.nodes.map((node) => [node.id, node]));
  const next = new Map(frame.links.filter((link) => link.kind !== "prev" && link.kind !== "loop").map((link) => [link.from, link.to]));
  const incoming = new Set(next.values());
  let current = frame.nodes.find((node) => !incoming.has(node.id))?.id;
  const values: (string | number)[] = [];
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    values.push(byId.get(current)!.value);
    current = next.get(current);
  }
  return values;
}

function inorder(frame: TreeFrame, id = frame.rootId): number[] {
  if (!id) return [];
  const node = frame.nodes[id];
  return [...inorder(frame, node.left), Number(node.value), ...inorder(frame, node.right)];
}

function assertBinarySearchTree(frame: TreeFrame, id = frame.rootId, min = -Infinity, max = Infinity): void {
  if (!id) return;
  const node = frame.nodes[id];
  const value = Number(node.value);
  expect(value).toBeGreaterThan(min);
  expect(value).toBeLessThan(max);
  assertBinarySearchTree(frame, node.left, min, value);
  assertBinarySearchTree(frame, node.right, value, max);
}

function assertAvl(frame: TreeFrame, id = frame.rootId): number {
  if (!id) return 0;
  const node = frame.nodes[id];
  const left = assertAvl(frame, node.left);
  const right = assertAvl(frame, node.right);
  expect(Math.abs(left - right), `AVL balance at ${node.value}`).toBeLessThanOrEqual(1);
  expect(node.extra).toBe(`${left - right}`);
  return 1 + Math.max(left, right);
}

function assertRedBlack(frame: TreeFrame, id = frame.rootId): number {
  if (!id) return 1;
  const node = frame.nodes[id];
  if (node.color === "red") {
    if (node.left) expect(frame.nodes[node.left].color).toBe("black");
    if (node.right) expect(frame.nodes[node.right].color).toBe("black");
  }
  const left = assertRedBlack(frame, node.left);
  const right = assertRedBlack(frame, node.right);
  expect(left, `black height at ${node.value}`).toBe(right);
  return left + (node.color === "black" ? 1 : 0);
}

function allPermutations(items: string[]): string[] {
  if (items.length === 0) return [""];
  return items.flatMap((item, index) => allPermutations([...items.slice(0, index), ...items.slice(index + 1)])
    .map((tail) => `${item}${tail}`));
}

function allCombinations(items: string[], k: number, start = 0): string[] {
  if (k === 0) return ["{}"];
  const result: string[] = [];
  for (let index = start; index <= items.length - k; index++) {
    for (const tail of allCombinations(items, k - 1, index + 1)) {
      const values = tail === "{}" ? [items[index]] : [items[index], ...tail.slice(1, -1).split(", ")];
      result.push(`{${values.join(", ")}}`);
    }
  }
  return result;
}

function hasSubsetSum(values: number[], target: number): boolean {
  return Array.from({ length: 2 ** values.length }, (_, mask) => values
    .filter((_, index) => mask & (1 << index))
    .reduce((sum, value) => sum + value, 0))
    .includes(target);
}

function validSudoku(frame: GridFrame): boolean {
  const values = frame.cells.map((row) => row.map((cell) => Number(cell.value)));
  const unitValid = (unit: number[]) => new Set(unit).size === 9 && unit.every((value) => value >= 1 && value <= 9);
  return values.every(unitValid)
    && Array.from({ length: 9 }, (_, col) => unitValid(values.map((row) => row[col])))
    && Array.from({ length: 3 }, (_, boxRow) => Array.from({ length: 3 }, (_, boxCol) =>
      unitValid(Array.from({ length: 9 }, (_, index) => values[boxRow * 3 + Math.floor(index / 3)][boxCol * 3 + index % 3]))
    )).flat().every(Boolean);
}

const representativeInputs: Record<string, Fields> = {
  "binary-tree-traversals": { values: "5, 3, 7, 2, 4", order: "inorder" },
  "binary-search-tree": { ops: "insert 5, insert 3, insert 7, delete 3" },
  "level-order-traversal": { values: "5, 3, 7, 2, 4" },
  "min-heap": { values: "5, 1, 4, 1", extractCount: "1" },
  trie: { words: "cat, car, card", search: "car" },
  "avl-tree": { values: "30, 10, 20" },
  "segment-tree": { values: "1, 3, 5, 7", queryL: "1", queryR: "3", updateIdx: "2", updateVal: "9" },
  "fenwick-tree": { values: "3, 2, 5, 1", queryIdx: "3", updateIdx: "2", updateDelta: "4" },
  "red-black-tree": { values: "10, 20, 30" },
  "b-tree": { values: "10, 20, 5, 6, 12" },
  "hash-chaining": { size: "7", ops: "insert -1, insert 6, search -1, delete 6" },
  "linear-probing": { size: "7", ops: "insert -1, insert 6, search -1, delete 6" },
  "quadratic-probing": { size: "7", ops: "insert -1, insert 6, search -1, delete 6" },
  "double-hashing": { size: "7", ops: "insert -1, insert 6, search -1, delete 6" },
  "reverse-linked-list": { values: "1, 2, 3" },
  "doubly-linked-list": { values: "1, 2, 3", insertHead: "0", deleteValue: "2" },
  "merge-two-sorted-lists": { a: "1, 4", b: "2, 3" },
  "floyd-cycle-detection": { values: "1, 2, 3", cyclePos: "1" },
  "stack-operations": { ops: "push 1, push 2, pop" },
  "queue-operations": { ops: "enqueue 1, enqueue 2, dequeue" },
  "balanced-parentheses": { expr: "([{}])" },
  "min-stack": { values: "3, 1, 2", popCount: "1" },
  "circular-queue": { capacity: "3", ops: "E 1, E 2, D, E 3" },
  "n-queens": { n: "4" },
  "rat-in-maze": { grid: "1100 / 1110 / 0110 / 0011" },
  permutations: { items: "A, B, C" },
  "subset-sum": { items: "3, 34, 4, 12, 5, 2", target: "9" },
  combinations: { items: "A, B, C, D", k: "2" },
  "sudoku-solver": { grid: ".2345.7.9 / ...7.912. / 7..1..456 / 234567.91 / .6..912.. / 891234.6. / 3.....912 / ......34. / .12.....8" },
  factorial: { n: "5" },
  "tower-of-hanoi": { disks: "3" },
  "fibonacci-recursive": { n: "7" },
  "power-set": { items: "A, B, C" },
};

describe("registered structure, backtracking, and recursion modules", () => {
  const registered = Object.keys(representativeInputs);

  it("keeps every original scoped module represented by the oracle matrix", () => {
    expect(registered).toHaveLength(33);
    const available = new Set(categories.flatMap((category) => byCategory(category).map(({ slug }) => slug)));
    registered.forEach((slug) => expect(available.has(slug), slug).toBe(true));
  });

  it.each(registered)("%s parses and generates a non-empty execution", async (slug) => {
    await run(slug, representativeInputs[slug]);
  });
});

describe("tree outputs against independent tree invariants", () => {
  it("returns all four canonical traversals and a FIFO level traversal", async () => {
    const values = "5, 3, 7, 2, 4, 6, 8";
    const expected: Record<string, number[]> = {
      inorder: [2, 3, 4, 5, 6, 7, 8],
      preorder: [5, 3, 2, 4, 7, 6, 8],
      postorder: [2, 4, 3, 6, 8, 7, 5],
      levelorder: [5, 3, 7, 2, 4, 6, 8],
    };
    for (const [order, result] of Object.entries(expected)) {
      const { final } = await run<TreeFrame>("binary-tree-traversals", { values, order });
      expect(aux(final.frame, "Visited")).toEqual(result);
    }
    const level = await run<TreeFrame>("level-order-traversal", { values });
    expect(aux(level.final.frame, "visit order")).toEqual(expected.levelorder);
  });

  it("BST deletion agrees with a set oracle for leaf, one-child, two-child, and missing-key cases", async () => {
    const { final } = await run<TreeFrame>("binary-search-tree", {
      ops: "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, delete 20, delete 30, delete 50, delete 999",
    });
    assertBinarySearchTree(final.frame);
    expect(inorder(final.frame)).toEqual([40, 60, 70, 80]);
  });

  it("heap, AVL, red-black, B-tree, trie, range trees all match their mathematical contracts", async () => {
    const heap = await run<TreeFrame>("min-heap", { values: "5, -2, 7, -2, 9, 0", extractCount: "2" });
    const heapValues = aux(heap.final.frame, "heap array").map(Number);
    expect(heapValues.slice().sort((a, b) => a - b)).toEqual([0, 5, 7, 9]);
    heapValues.forEach((value, index) => {
      if (2 * index + 1 < heapValues.length) expect(value).toBeLessThanOrEqual(heapValues[2 * index + 1]);
      if (2 * index + 2 < heapValues.length) expect(value).toBeLessThanOrEqual(heapValues[2 * index + 2]);
    });

    for (const values of [[30, 20, 10], [10, 20, 30], [30, 10, 20], [10, 30, 20], [6, 7, 88, 99]]) {
      const avl = await run<TreeFrame>("avl-tree", { values: values.join(", ") });
      assertBinarySearchTree(avl.final.frame);
      assertAvl(avl.final.frame);
      expect(inorder(avl.final.frame)).toEqual(values.slice().sort((a, b) => a - b));
    }

    for (const values of [[1, 2, 3, 4, 5, 6, 7], [7, 6, 5, 4, 3, 2, 1], [10, -5, 20, -10, 0, 15, 30]]) {
      const redBlack = await run<TreeFrame>("red-black-tree", { values: values.join(", ") });
      assertBinarySearchTree(redBlack.final.frame);
      expect(redBlack.final.frame.nodes[redBlack.final.frame.rootId!].color).toBe("black");
      assertRedBlack(redBlack.final.frame);
    }

    const bTree = await run<TreeFrame>("b-tree", { values: "10, 20, 5, 6, 12, 30, 7, 17, 3, 4, 2, 25, 27" });
    const allKeys: number[] = [];
    const leafDepths = new Set<number>();
    const checkBTree = (id: string, depth: number, min: number, max: number): void => {
      const node = bTree.final.frame.nodes[id];
      const keys = String(node.value).split("|").map(Number);
      expect(keys).toEqual(keys.slice().sort((a, b) => a - b));
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.length).toBeLessThanOrEqual(3);
      keys.forEach((key) => { expect(key).toBeGreaterThan(min); expect(key).toBeLessThan(max); });
      allKeys.push(...keys);
      const children = (node.children ?? []).filter((child): child is string => Boolean(child));
      if (children.length === 0) leafDepths.add(depth);
      else children.forEach((child, index) => checkBTree(child, depth + 1, index === 0 ? min : keys[index - 1], index === keys.length ? max : keys[index]));
    };
    checkBTree(bTree.final.frame.rootId!, 0, -Infinity, Infinity);
    expect(leafDepths.size).toBe(1);
    expect(allKeys.sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 10, 12, 17, 20, 25, 27, 30]);

    const trie = await run<TreeFrame>("trie", { words: "cat, car, card, cave", search: "car" });
    expect(trie.final.description).toContain("present");
    const prefixOnly = await run<TreeFrame>("trie", { words: "card, care", search: "car" });
    expect(prefixOnly.final.description).toContain("only a prefix");

    const segment = await run<TreeFrame>("segment-tree", { values: "1, 3, 5, 7", queryL: "1", queryR: "3", updateIdx: "2", updateVal: "9" });
    expect(aux(segment.final.frame, "array")).toEqual([1, 3, 9, 7]);
    expect(segment.final.frame.nodes[segment.final.frame.rootId!].value).toBe(20);

    const fenwick = await run<ArrayFrame>("fenwick-tree", { values: "3, 2, 5, 1", queryIdx: "3", updateIdx: "2", updateDelta: "4" });
    const bit = fenwick.final.frame.values.map(Number);
    expect(bit.slice(1)).toEqual([3, 9, 5, 15]);
    expect(bit[3] + bit[2]).toBe(14); // independent prefix sum after a[2] += 4
  });
});

describe("hash tables, lists, and queues against container oracles", () => {
  it.each(["hash-chaining", "linear-probing", "quadratic-probing", "double-hashing"])("%s matches a Set through collisions, tombstones, and negatives", async (slug) => {
    const { final, steps } = await run<HashFrame>(slug, {
      size: "7",
      ops: "insert -1, insert 6, insert 13, insert 6, delete 6, insert 20, search -1, search 6, search 20",
    });
    const keys = final.frame.buckets.flatMap((bucket) => bucket.items.map((item) => item.key))
      .filter((key) => key !== "×")
      .map(Number)
      .sort((a, b) => a - b);
    expect(keys).toEqual([-1, 13, 20]);
    expect(steps.some((step) => step.description.includes("-1") && /found/i.test(step.description))).toBe(true);
    expect(steps.some((step) => step.description.includes("6") && /not found|not in/i.test(step.description))).toBe(true);
  });

  it("list, stack, queue, min-stack, and ring-buffer sequences agree with native reference containers", async () => {
    const reverse = await run<ListFrame>("reverse-linked-list", { values: "-2, 5, 5, 0" });
    expect(listOrder(reverse.final.frame)).toEqual([0, 5, 5, -2]);

    const doubly = await run<ListFrame>("doubly-linked-list", { values: "-5, 0, 8, 8", insertHead: "12", deleteValue: "8" });
    expect(doubly.final.frame.nodes.map((node) => node.value)).toEqual([12, -5, 0, 8]);
    for (let index = 0; index < doubly.final.frame.nodes.length - 1; index++) {
      const left = doubly.final.frame.nodes[index].id;
      const right = doubly.final.frame.nodes[index + 1].id;
      expect(doubly.final.frame.links).toContainEqual({ from: left, to: right, kind: "next" });
      expect(doubly.final.frame.links).toContainEqual({ from: right, to: left, kind: "prev" });
    }

    const merged = await run<ListFrame>("merge-two-sorted-lists", { a: "4, -1, 4", b: "3, -1, 9" });
    expect(merged.final.frame.nodes.map((node) => node.value)).toEqual([-1, -1, 3, 4, 4, 9]);
    const cycle = await run<ListFrame>("floyd-cycle-detection", { values: "3, 2, 0, -4", cyclePos: "1" });
    expect(cycle.final.frame.pointers?.filter((pointer) => /slow|fast/.test(pointer.label)).map((pointer) => pointer.nodeId)).toEqual(["n1", "n1"]);

    const stack = await run<CallStackFrame>("stack-operations", { ops: "pop, push -2, push 7, peek, pop, push 0" });
    expect(stack.final.frame.stack.map((item) => Number(item.label))).toEqual([-2, 0]);
    expect(stack.final.frame.output).toEqual(["7"]);
    const queue = await run<ListFrame>("queue-operations", { ops: "dequeue, enqueue -2, enqueue 7, front, dequeue, enqueue 0" });
    expect(queue.final.frame.nodes.map((node) => node.value)).toEqual([7, 0]);
    expect(aux(queue.final.frame, "Dequeued")).toEqual([-2]);

    const minStack = await run<CallStackFrame>("min-stack", { values: "5, -2, 7, -4, 9", popCount: "2" });
    expect(minStack.final.frame.stack.map((item) => Number(item.label))).toEqual([5, -2, 7]);
    expect(aux(minStack.final.frame, "getMin()")).toEqual([-2]);
    const parentheses = await run<CallStackFrame>("balanced-parentheses", { expr: "([{}])" });
    expect(parentheses.final.description).toContain("Balanced");
    expect((await run<CallStackFrame>("balanced-parentheses", { expr: "([)]" })).final.description).toContain("Not balanced");

    const circular = await run<ArrayFrame>("circular-queue", { capacity: "3", ops: "E -1, E 2, E 3, D, E 5" });
    const front = circular.final.frame.pointers?.find((pointer) => pointer.label === "front")?.index ?? 0;
    expect([0, 1, 2].map((offset) => circular.final.frame.values[(front + offset) % 3])).toEqual([2, 3, 5]);
  });
});

describe("backtracking and recursion results against exhaustive or closed-form oracles", () => {
  it("finds valid N-Queens and maze solutions and a valid completed Sudoku", async () => {
    const queens = await run<GridFrame>("n-queens", { n: "5" });
    const positions = queens.final.frame.cells.flatMap((row, rowIndex) => row.map((cell, column) => cell.value === "♛" ? [rowIndex, column] : null).filter((value): value is number[] => Boolean(value)));
    expect(positions).toHaveLength(5);
    for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
      expect(positions[i][1]).not.toBe(positions[j][1]);
      expect(Math.abs(positions[i][0] - positions[j][0])).not.toBe(Math.abs(positions[i][1] - positions[j][1]));
    }
    const maze = await run<GridFrame>("rat-in-maze", { grid: "1100 / 1110 / 0110 / 0011" });
    const path = maze.final.frame.cells.flatMap((row, r) => row.map((cell, c) => cell.state === "sorted" ? [r, c] : null).filter((value): value is number[] => Boolean(value)));
    expect(path[0]).toEqual([0, 0]);
    expect(path.at(-1)).toEqual([3, 3]);
    expect(path.every((cell, index) => index === 0 || Math.abs(cell[0] - path[index - 1][0]) + Math.abs(cell[1] - path[index - 1][1]) === 1)).toBe(true);

    const sudoku = await run<GridFrame>("sudoku-solver", { grid: ".2345.7.9 / ...7.912. / 7..1..456 / 234567.91 / .6..912.. / 891234.6. / 3.....912 / ......34. / .12.....8" });
    expect(validSudoku(sudoku.final.frame)).toBe(true);
  });

  it("enumerates exact permutations, combinations, subsets, and subset-sum results", async () => {
    const permutations = await run<CallStackFrame>("permutations", { items: "A, B, C" });
    expect([...(permutations.final.frame.output ?? [])].sort()).toEqual(allPermutations(["A", "B", "C"]).sort());
    const combinations = await run<CallStackFrame>("combinations", { items: "A, B, C, D", k: "2" });
    expect([...(combinations.final.frame.output ?? [])].sort()).toEqual(allCombinations(["A", "B", "C", "D"], 2).sort());
    const subset = await run<CallStackFrame>("subset-sum", { items: "3, 34, 4, 12, 5, 2", target: "9" });
    expect(hasSubsetSum([3, 34, 4, 12, 5, 2], 9)).toBe(true);
    expect((subset.final.frame.output ?? []).map(Number).reduce((sum, value) => sum + value, 0)).toBe(9);
    const noSubset = await run<CallStackFrame>("subset-sum", { items: "4, 6, 10", target: "7" });
    expect(hasSubsetSum([4, 6, 10], 7)).toBe(false);
    expect(noSubset.final.description).toMatch(/no subset/i);
    const power = await run<CallStackFrame>("power-set", { items: "A, B, C" });
    expect(new Set(power.final.frame.output ?? [])).toEqual(new Set(["{}", "{A}", "{B}", "{C}", "{A, B}", "{A, C}", "{B, C}", "{A, B, C}"]));
  });

  it("matches factorial, Fibonacci, and Tower-of-Hanoi closed forms", async () => {
    const factorial = await run<CallStackFrame>("factorial", { n: "20" });
    expect(factorial.final.frame.output).toEqual(["2432902008176640000"]);
    const fibonacci = await run<CallStackFrame>("fibonacci-recursive", { n: "10" });
    expect(fibonacci.final.frame.output).toEqual([55]);
    const hanoi = await run<CallStackFrame>("tower-of-hanoi", { disks: "4" });
    expect(hanoi.final.counters?.moves).toBe(15);
    expect(aux(hanoi.final.frame, "Peg A")).toEqual([]);
    expect(aux(hanoi.final.frame, "Peg B")).toEqual([]);
    expect(aux(hanoi.final.frame, "Peg C")).toEqual([4, 3, 2, 1]);
  });
});
