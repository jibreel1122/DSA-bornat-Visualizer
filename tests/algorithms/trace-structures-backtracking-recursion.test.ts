import { describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type {
  AlgorithmModule,
  ArrayFrame,
  CallStackFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  Step,
  TreeFrame,
} from "@/lib/engine/types";

type Fields = Record<string, string>;
const categories = ["trees", "hashing", "linked-lists", "stacks-queues", "backtracking", "recursion"] as const;

async function run<F>(slug: string, fields: Fields): Promise<Step<F>[]> {
  const mod = await loadAlgorithm(slug) as AlgorithmModule<F, unknown> | null;
  if (!mod) throw new Error(`Missing module: ${slug}`);
  const steps = mod.generate(mod.parseInput(fields));
  expect(steps, `${slug} should expose a trace`).not.toHaveLength(0);
  return steps;
}

function aux(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) {
  return frame.aux?.find((row) => row.label.toLowerCase() === label.toLowerCase())?.values ?? [];
}

function treeValues(frame: TreeFrame): number[] {
  return Object.values(frame.nodes).map((node) => Number(node.value)).sort((a, b) => a - b);
}

function assertTreeWiring(frame: TreeFrame): void {
  if (!frame.rootId) {
    expect(Object.keys(frame.nodes)).toHaveLength(0);
    return;
  }
  expect(frame.nodes[frame.rootId]).toBeDefined();
  const seen = new Set<string>();
  const walk = (id: string) => {
    expect(seen.has(id), `cycle or shared child at ${id}`).toBe(false);
    seen.add(id);
    const node = frame.nodes[id];
    expect(node).toBeDefined();
    const children = node.children ?? [node.left, node.right];
    expect(new Set(children.filter(Boolean)).size).toBe(children.filter(Boolean).length);
    children.filter((child): child is string => Boolean(child)).forEach((child) => {
      expect(frame.nodes[child], `${id} references missing child ${child}`).toBeDefined();
      walk(child);
    });
  };
  walk(frame.rootId);
  expect([...seen].sort()).toEqual(Object.keys(frame.nodes).sort());
}

function assertBst(frame: TreeFrame, id = frame.rootId, lo = -Infinity, hi = Infinity): void {
  if (!id) return;
  const node = frame.nodes[id];
  const value = Number(node.value);
  expect(value).toBeGreaterThan(lo);
  expect(value).toBeLessThan(hi);
  assertBst(frame, node.left, lo, value);
  assertBst(frame, node.right, value, hi);
}

function avlHeight(frame: TreeFrame, id = frame.rootId): number {
  if (!id) return 0;
  const node = frame.nodes[id];
  const left = avlHeight(frame, node.left);
  const right = avlHeight(frame, node.right);
  expect(Number(node.extra)).toBe(left - right);
  return 1 + Math.max(left, right);
}

function assertFinalAvl(frame: TreeFrame): void {
  const walk = (id: string | null | undefined): number => {
    if (!id) return 0;
    const node = frame.nodes[id];
    const left = walk(node.left);
    const right = walk(node.right);
    expect(Math.abs(left - right), `AVL balance at ${node.value}`).toBeLessThanOrEqual(1);
    return 1 + Math.max(left, right);
  };
  assertBst(frame);
  walk(frame.rootId);
}

function blackHeight(frame: TreeFrame, id = frame.rootId): number {
  if (!id) return 1;
  const node = frame.nodes[id];
  expect(node.color).toMatch(/^(red|black)$/);
  if (node.color === "red") {
    if (node.left) expect(frame.nodes[node.left].color).toBe("black");
    if (node.right) expect(frame.nodes[node.right].color).toBe("black");
  }
  const left = blackHeight(frame, node.left);
  const right = blackHeight(frame, node.right);
  expect(left, `black height at ${node.value}`).toBe(right);
  return left + Number(node.color === "black");
}

function assertHeap(values: number[]): void {
  values.forEach((value, i) => {
    for (const child of [2 * i + 1, 2 * i + 2]) {
      if (child < values.length) expect(value).toBeLessThanOrEqual(values[child]);
    }
  });
}

function listLinks(frame: ListFrame): Map<string, string> {
  return new Map(frame.links.filter((link) => link.kind !== "prev" && link.kind !== "loop").map((link) => [link.from, link.to]));
}

function assertListWiring(frame: ListFrame, allowLoop = false): void {
  const ids = new Set(frame.nodes.map((node) => node.id));
  for (const link of frame.links) {
    expect(ids.has(link.from)).toBe(true);
    expect(ids.has(link.to)).toBe(true);
  }
  const next = listLinks(frame);
  expect(new Set(next.keys()).size).toBe(next.size);
  if (!allowLoop) {
    const incoming = new Set(next.values());
    const head = frame.nodes.find((node) => !incoming.has(node.id));
    if (!head) return;
    const seen = new Set<string>();
    let id: string | undefined = head.id;
    while (id) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      id = next.get(id);
    }
  }
}

function liveKeys(frame: HashFrame): number[] {
  return frame.buckets.flatMap((bucket) => bucket.items.map((item) => item.key))
    .filter((key) => key !== "×")
    .map(Number);
}

function readQueue(frame: ArrayFrame): number[] {
  const front = frame.pointers?.find((pointer) => pointer.label === "front")?.index;
  const size = Number(String(aux(frame, "size / capacity")[0]).split("/")[0].trim());
  if (front === undefined) return [];
  return Array.from({ length: size }, (_, i) => frame.values[(front + i) % frame.values.length]);
}

const traceInputs: Record<string, Fields> = {
  "binary-tree-traversals": { values: "8, 4, 12, 2, 6, 10, 14", order: "inorder" },
  "binary-search-tree": { ops: "insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, search 40, delete 20, delete 30, delete 50" },
  "level-order-traversal": { values: "8, 4, 12, 2, 6, 10, 14" },
  "min-heap": { values: "9, 7, 8, 2, 5, 1", extractCount: "2" },
  trie: { words: "car, card, cat, dog", search: "card" },
  "avl-tree": { values: "30, 10, 20, 40, 50, 45" },
  "segment-tree": { values: "2, 7, 1, 8, 2", queryL: "1", queryR: "3", updateIdx: "2", updateVal: "9" },
  "fenwick-tree": { values: "2, 7, 1, 8, 2", queryIdx: "4", updateIdx: "3", updateDelta: "5" },
  "red-black-tree": { values: "41, 38, 31, 12, 19, 8" },
  "b-tree": { values: "10, 20, 5, 6, 12, 30, 7, 17, 3, 4, 2, 25" },
  "hash-chaining": { size: "7", ops: "insert -1, insert 6, insert 13, search 13, delete 6, search 6" },
  "linear-probing": { size: "7", ops: "insert -1, insert 6, insert 13, delete 6, insert 20, search 20, search 6" },
  "quadratic-probing": { size: "7", ops: "insert -1, insert 6, insert 13, delete 6, insert 20, search 20, search 6" },
  "double-hashing": { size: "7", ops: "insert -1, insert 6, insert 13, delete 6, insert 20, search 20, search 6" },
  "reverse-linked-list": { values: "1, 2, 3, 4" },
  "doubly-linked-list": { values: "1, 2, 3", insertHead: "0", deleteValue: "2" },
  "merge-two-sorted-lists": { a: "1, 4, 7", b: "2, 3, 8" },
  "floyd-cycle-detection": { values: "3, 2, 0, -4", cyclePos: "1" },
  "stack-operations": { ops: "pop, push 1, push 2, peek, pop, push 3" },
  "queue-operations": { ops: "dequeue, enqueue 1, enqueue 2, front, dequeue, enqueue 3" },
  "balanced-parentheses": { expr: "([{}])" },
  "min-stack": { values: "5, 2, 2, 7, 1", popCount: "2" },
  "circular-queue": { capacity: "3", ops: "D, E 1, E 2, E 3, E 4, D, E 5" },
  "n-queens": { n: "5" },
  "rat-in-maze": { grid: "1100 / 1110 / 0110 / 0011" },
  permutations: { items: "A, B, C" },
  "subset-sum": { items: "3, 34, 4, 12, 5, 2", target: "9" },
  combinations: { items: "A, B, C, D", k: "2" },
  "sudoku-solver": { grid: ".2345.7.9 / ...7.912. / 7..1..456 / 234567.91 / .6..912.. / 891234.6. / 3.....912 / ......34. / .12.....8" },
  factorial: { n: "6" },
  "tower-of-hanoi": { disks: "4" },
  "fibonacci-recursive": { n: "6" },
  "power-set": { items: "A, B, C" },
};

describe("step-by-step traces: structure, backtracking, and recursion", () => {
  const registered = Object.keys(traceInputs);

  it("covers all 33 original algorithms with an adversarial trace input", () => {
    expect(registered).toHaveLength(33);
    const available = new Set(categories.flatMap((category) => byCategory(category).map(({ slug }) => slug)));
    registered.forEach((slug) => expect(available.has(slug), slug).toBe(true));
  });

  it.each(registered)("%s exposes a non-empty, narratable sequence", async (slug) => {
    const steps = await run<unknown>(slug, traceInputs[slug]);
    steps.forEach((step, index) => {
      expect(step.description, `${slug} frame ${index}`).not.toEqual("");
      expect(step.codeLine, `${slug} frame ${index}`).toBeGreaterThanOrEqual(0);
      expect(step.descriptionAr, `${slug} frame ${index}`).toBeTruthy();
    });
  });
});

describe("tree traces preserve legal structure and expose real balancing work", () => {
  it("keeps every BST/traversal frame wired and ordered through insert, search, and each delete case", async () => {
    const steps = await run<TreeFrame>("binary-search-tree", traceInputs["binary-search-tree"]);
    steps.forEach((step) => {
      assertTreeWiring(step.frame);
      const values = treeValues(step.frame);
      const hasTransientSuccessorCopy = new Set(values).size !== values.length;
      // Copying the in-order successor is a real pointer-machine intermediate:
      // the old successor remains until its dedicated removal frame.  It must
      // be explicitly narrated and cannot leak into the following stable tree.
      if (hasTransientSuccessorCopy) expect(step.description).toMatch(/key has moved|Remove (leaf|node) \d+/i);
      else assertBst(step.frame);
    });
    expect(treeValues(steps.at(-1)!.frame)).toEqual([40, 60, 70, 80]);
    expect(steps.some((step) => /two children/i.test(step.description))).toBe(true);

    for (const slug of ["binary-tree-traversals", "level-order-traversal"] as const) {
      const frames = await run<TreeFrame>(slug, traceInputs[slug]);
      frames.forEach((step) => { assertTreeWiring(step.frame); assertBst(step.frame); });
    }
  });

  it("shows ordinary AVL insertion before each LL/RR/LR/RL repair and never breaks BST links", async () => {
    const cases = [
      { values: "30, 20, 10", label: "LL" },
      { values: "10, 20, 30", label: "RR" },
      { values: "30, 10, 20", label: "LR" },
      { values: "10, 30, 20", label: "RL" },
      { values: "6, 7, 88, 99", label: "reported AVL case" },
    ];
    for (const testCase of cases) {
      const steps = await run<TreeFrame>("avl-tree", { values: testCase.values });
      steps.forEach((step) => {
        assertTreeWiring(step.frame);
        assertBst(step.frame);
        avlHeight(step.frame);
      });
      assertFinalAvl(steps.at(-1)!.frame);
      const rotations = steps.filter((step) => step.transformation?.kind === "balance");
      if (testCase.label !== "reported AVL case") expect(rotations.length, testCase.label).toBeGreaterThan(0);
      for (const rotation of rotations) {
        const at = steps.indexOf(rotation);
        const newLeaf = steps.slice(0, at).some((step) => /Insert \d+ as a leaf|new root/i.test(step.description));
        expect(newLeaf, `${testCase.label} rotation must follow a visible normal insertion`).toBe(true);
      }
    }
  });

  it("keeps red-black frames as BSTs and makes rotation preparation, movement, and completion separately explorable", async () => {
    const steps = await run<TreeFrame>("red-black-tree", traceInputs["red-black-tree"]);
    steps.forEach((step) => { assertTreeWiring(step.frame); assertBst(step.frame); });
    const final = steps.at(-1)!.frame;
    expect(final.nodes[final.rootId!].color).toBe("black");
    blackHeight(final);
    const prepares = steps.filter((step) => /^Prepare (left|right) rotation/.test(step.description));
    expect(prepares.length).toBeGreaterThan(0);
    prepares.forEach((prepare) => {
      const at = steps.indexOf(prepare);
      expect(steps[at + 1].description).toMatch(/^Move pivot/);
      const before = JSON.stringify(prepare.frame);
      const completion = steps.slice(at + 1).find((step) => /^Complete the (left|right) rotation/.test(step.description));
      expect(completion).toBeDefined();
      expect(JSON.stringify(completion!.frame)).not.toBe(before);
    });
  });

  it("traces B-tree splits in the true order: full child, sibling, key migration, then median promotion", async () => {
    const steps = await run<TreeFrame>("b-tree", traceInputs["b-tree"]);
    steps.forEach((step) => {
      assertTreeWiring(step.frame);
      Object.values(step.frame.nodes).forEach((node) => {
        const keys = String(node.value).split(" | ").filter(Boolean).map(Number);
        expect(keys).toEqual(keys.slice().sort((a, b) => a - b));
      });
    });
    const descriptions = steps.map((step) => step.description);
    const detect = descriptions.findIndex((text) => text.includes("is full. Pause before splitting"));
    expect(detect).toBeGreaterThan(-1);
    expect(descriptions.slice(detect + 1).findIndex((text) => text.startsWith("Create an empty right sibling"))).toBeGreaterThan(-1);
    expect(descriptions.slice(detect + 1).findIndex((text) => text.startsWith("Move keys right"))).toBeGreaterThan(-1);
    expect(descriptions.slice(detect + 1).findIndex((text) => text.startsWith("Promote median"))).toBeGreaterThan(-1);
  });

  it("keeps heap, segment-tree, Fenwick-tree, and trie frames faithful to their represented partial state", async () => {
    const heap = await run<TreeFrame>("min-heap", traceInputs["min-heap"]);
    heap.forEach((step) => {
      assertTreeWiring(step.frame);
      const values = aux(step.frame, "heap array").map(Number);
      expect(values.every(Number.isFinite)).toBe(true);
      if (/heap property restored|done/i.test(step.description)) assertHeap(values);
    });
    assertHeap(aux(heap.at(-1)!.frame, "heap array").map(Number));
    expect(aux(heap.at(-1)!.frame, "heap array").map(Number).sort((a, b) => a - b)).toEqual([5, 7, 8, 9]);

    const segment = await run<TreeFrame>("segment-tree", traceInputs["segment-tree"]);
    segment.forEach((step) => assertTreeWiring(step.frame));
    const leafUpdate = segment.findIndex((step) => /^Leaf \[2\] updated to 9/.test(step.description));
    expect(leafUpdate).toBeGreaterThan(-1);
    const recomputes = segment.slice(leafUpdate + 1).filter((step) => /^Recompute node/.test(step.description));
    expect(recomputes.map((step) => step.description)).toEqual(expect.arrayContaining([
      expect.stringContaining("[0..2]"),
      expect.stringContaining("[0..4]"),
    ]));
    expect(segment.at(-1)!.frame.nodes[segment.at(-1)!.frame.rootId!].value).toBe(28);

    const fenwick = await run<ArrayFrame>("fenwick-tree", traceInputs["fenwick-tree"]);
    fenwick.forEach((step) => {
      expect(step.frame.values[0]).toBe(0);
      step.frame.values.slice(1).forEach((value) => expect(Number.isFinite(value)).toBe(true));
    });
    expect(fenwick.at(-1)!.frame.values).toEqual([0, 2, 9, 6, 23, 2]);

    const trie = await run<TreeFrame>("trie", traceInputs.trie);
    trie.forEach((step) => assertTreeWiring(step.frame));
    expect(trie.at(-1)!.description).toContain("present");
  });
});

describe("hash and linked structure traces show legal probe and pointer transitions", () => {
  it("keeps every hash key in its home bucket or legal probe path, including negative keys and tombstones", async () => {
    const fields = { size: "7", ops: "insert -1, insert 6, insert 13, delete 6, insert 20, search 20, search 6" };
    for (const slug of ["hash-chaining", "linear-probing", "quadratic-probing", "double-hashing"]) {
      const steps = await run<HashFrame>(slug, fields);
      steps.forEach((step) => {
        const keys = liveKeys(step.frame);
        expect(new Set(keys).size, `${slug} cannot show duplicate live keys`).toBe(keys.length);
        if (step.frame.chained) {
          step.frame.buckets.forEach((bucket) => bucket.items.forEach((item) => {
            if (item.key !== "×") expect(((Number(item.key) % 7) + 7) % 7).toBe(bucket.index);
          }));
        }
        const match = step.description.match(/(?:probe \d+ → .*? = |slot )(\d+)/i);
        if (match) expect(Number(match[1])).toBeGreaterThanOrEqual(0);
      });
      expect(liveKeys(steps.at(-1)!.frame).sort((a, b) => a - b)).toEqual([-1, 13, 20]);
      expect(steps.some((step) => /tombstone/i.test(step.description))).toBe(slug !== "hash-chaining");
    }
  });

  it("reverses links one at a time without losing nodes, and preserves valid doubly/merge/Floyd pointer states", async () => {
    const reverse = await run<ListFrame>("reverse-linked-list", traceInputs["reverse-linked-list"]);
    reverse.forEach((step) => {
      assertListWiring(step.frame);
      expect(step.frame.nodes.map((node) => node.id).sort()).toEqual(["n0", "n1", "n2", "n3"]);
    });
    const flips = reverse.filter((step) => /^Point curr/.test(step.description));
    expect(flips).toHaveLength(4);
    expect([...listLinks(reverse.at(-1)!.frame).entries()]).toEqual([["n1", "n0"], ["n2", "n1"], ["n3", "n2"]]);

    const doubly = await run<ListFrame>("doubly-linked-list", traceInputs["doubly-linked-list"]);
    doubly.forEach((step) => {
      assertListWiring(step.frame);
      step.frame.links.filter((link) => link.kind === "next").forEach((link) => {
        expect(step.frame.links).toContainEqual({ from: link.to, to: link.from, kind: "prev" });
      });
    });
    expect(doubly.at(-1)!.frame.nodes.map((node) => node.value)).toEqual([0, 1, 3]);

    const merge = await run<ListFrame>("merge-two-sorted-lists", traceInputs["merge-two-sorted-lists"]);
    merge.forEach((step) => assertListWiring(step.frame));
    expect(merge.at(-1)!.frame.nodes.map((node) => Number(node.value))).toEqual([1, 2, 3, 4, 7, 8]);

    const floyd = await run<ListFrame>("floyd-cycle-detection", traceInputs["floyd-cycle-detection"]);
    floyd.forEach((step) => assertListWiring(step.frame, true));
    expect(floyd.some((step) => /meet|cycle detected/i.test(step.description))).toBe(true);
    expect(floyd.at(-1)!.frame.pointers?.filter((pointer) => /slow|fast/i.test(pointer.label)).map((pointer) => pointer.nodeId)).toEqual(["n1", "n1"]);
  });
});

describe("stack, queue, backtracking, and recursion traces advance one legal operation at a time", () => {
  it("uses legal LIFO/FIFO/ring-buffer transitions, including underflow, full queue, and duplicate minima", async () => {
    const stack = await run<CallStackFrame>("stack-operations", traceInputs["stack-operations"]);
    stack.forEach((step) => expect(new Set(step.frame.stack.map((item) => item.id)).size).toBe(step.frame.stack.length));
    expect(stack.at(-1)!.frame.stack.map((item) => Number(item.label))).toEqual([1, 3]);
    expect(stack.some((step) => /underflow/i.test(step.description))).toBe(true);

    const queue = await run<ListFrame>("queue-operations", traceInputs["queue-operations"]);
    queue.forEach((step) => assertListWiring(step.frame));
    expect(queue.at(-1)!.frame.nodes.map((node) => node.value)).toEqual([2, 3]);

    const circular = await run<ArrayFrame>("circular-queue", traceInputs["circular-queue"]);
    circular.forEach((step) => {
      const contents = readQueue(step.frame);
      expect(contents).toHaveLength(Number(String(aux(step.frame, "size / capacity")[0]).split("/")[0].trim()));
    });
    expect(readQueue(circular.at(-1)!.frame)).toEqual([2, 3, 5]);
    expect(circular.some((step) => /FULL/.test(step.description))).toBe(true);

    const minStack = await run<CallStackFrame>("min-stack", traceInputs["min-stack"]);
    minStack.forEach((step) => {
      const values = step.frame.stack.map((item) => Number(item.label));
      const shown = aux(step.frame, "getMin()");
      if (values.length && shown.length) expect(Number(shown[0])).toBe(Math.min(...values));
    });
    expect(minStack.at(-1)!.frame.stack.map((item) => Number(item.label))).toEqual([5, 2, 2]);

    const balanced = await run<CallStackFrame>("balanced-parentheses", traceInputs["balanced-parentheses"]);
    expect(balanced.at(-1)!.description).toMatch(/Balanced/);
  });

  it("maintains a safe partial assignment/path at every backtracking frame and records real undo steps", async () => {
    const queens = await run<GridFrame>("n-queens", traceInputs["n-queens"]);
    queens.forEach((step) => {
      const queensAt = step.frame.cells.flatMap((row, r) => row.map((cell, c) => cell.value === "♛" ? [r, c] : null).filter((p): p is number[] => Boolean(p)));
      queensAt.forEach(([r, c], i) => queensAt.slice(i + 1).forEach(([rr, cc]) => {
        expect(c).not.toBe(cc);
        expect(Math.abs(r - rr)).not.toBe(Math.abs(c - cc));
      }));
    });
    expect(queens.some((step) => /backtrack/i.test(step.description))).toBe(true);

    const maze = await run<GridFrame>("rat-in-maze", traceInputs["rat-in-maze"]);
    maze.forEach((step) => step.frame.cells.forEach((row, r) => row.forEach((cell, c) => {
      if (cell.state === "sorted" || cell.state === "active") expect([r, c]).not.toEqual([0, 3]);
    })));
    expect(maze.at(-1)!.description).toMatch(/Solved/);

    const subset = await run<CallStackFrame>("subset-sum", traceInputs["subset-sum"]);
    expect(subset.some((step) => /choose|backtrack|skip/i.test(step.description))).toBe(true);
    expect((subset.at(-1)!.frame.output ?? []).map(Number).reduce((a, b) => a + b, 0)).toBe(9);

    for (const slug of ["permutations", "combinations", "power-set"] as const) {
      const steps = await run<CallStackFrame>(slug, traceInputs[slug]);
      steps.forEach((step) => expect(new Set(step.frame.stack.map((item) => item.id)).size).toBe(step.frame.stack.length));
      expect(steps.some((step) => /backtrack|remove|return|exclude|undo/i.test(step.description))).toBe(true);
    }

    const sudoku = await run<GridFrame>("sudoku-solver", traceInputs["sudoku-solver"]);
    sudoku.forEach((step) => {
      const rows = step.frame.cells.map((row) => row.map((cell) => String(cell.value ?? ".")));
      rows.forEach((row) => {
        const digits = row.filter((value) => /^[1-9]$/.test(value));
        expect(new Set(digits).size).toBe(digits.length);
      });
    });
    expect(sudoku.at(-1)!.description).toMatch(/solved/i);
  });

  it("keeps recursion stacks well-formed while calls descend and returns unwind", async () => {
    for (const slug of ["factorial", "fibonacci-recursive", "tower-of-hanoi"] as const) {
      const steps = await run<CallStackFrame>(slug, traceInputs[slug]);
      steps.forEach((step) => {
        const ids = step.frame.stack.map((item) => item.id);
        expect(new Set(ids).size).toBe(ids.length);
        if (slug !== "tower-of-hanoi") expect(step.counters?.depth ?? 0).toBe(step.frame.stack.length);
      });
      expect(steps.some((step) => /^Call /.test(step.description))).toBe(true);
      expect(steps.at(-1)!.frame.stack).toEqual([]);
    }
    const factorial = await run<CallStackFrame>("factorial", traceInputs.factorial);
    expect(factorial.at(-1)!.frame.output).toEqual(["720"]);
    const fibonacci = await run<CallStackFrame>("fibonacci-recursive", traceInputs["fibonacci-recursive"]);
    expect(fibonacci.at(-1)!.frame.output).toEqual([8]);
    const hanoi = await run<CallStackFrame>("tower-of-hanoi", traceInputs["tower-of-hanoi"]);
    hanoi.forEach((step) => aux(step.frame, "Peg A").concat(aux(step.frame, "Peg B"), aux(step.frame, "Peg C")).forEach((value) => expect(Number(value)).toBeGreaterThan(0)));
    expect(hanoi.at(-1)!.counters?.moves).toBe(15);
    expect(aux(hanoi.at(-1)!.frame, "Peg C")).toEqual([4, 3, 2, 1]);
  });
});
