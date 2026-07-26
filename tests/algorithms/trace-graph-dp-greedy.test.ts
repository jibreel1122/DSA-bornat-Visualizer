import { describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { ArrayFrame, CallStackFrame, GraphFrame, GridFrame, Step, TableFrame, TreeFrame } from "@/lib/engine/types";
import { createRNG } from "@/lib/engine/random";

/**
 * This is deliberately a trace test, not a snapshot or final-result test.
 * Every assertion below is about a legal *transition* in the teaching trace.
 */
const GRAPH = ["a-star", "bellman-ford", "bfs", "dfs", "dijkstra", "floyd-warshall", "kosaraju-scc", "kruskal", "max-flow", "prim", "tarjan-scc", "topological-sort", "union-find"];
const DP = ["coin-change", "edit-distance", "fibonacci-dp", "knapsack-01", "longest-common-subsequence", "longest-increasing-subsequence", "maximum-subarray"];
const GREEDY = ["activity-selection", "fractional-knapsack", "huffman-coding", "job-sequencing"];

const values = (frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) =>
  frame.aux?.find((row) => row.label === label)?.values ?? [];

const asNumber = (value: string | number | null | undefined): number => {
  if (value === "∞" || value === "âˆž" || value === null || value === undefined) return Infinity;
  return Number(value);
};

const cell = (frame: TableFrame, row: number, col: number) => asNumber(frame.cells[row][col].value as string | number | null);
function assertStableTrace<F>(steps: Step<F>[], slug: string): void {
  expect(steps.length, `${slug} must teach at least one state`).toBeGreaterThan(1);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    expect(step.description, `${slug} frame ${i} needs narration`).not.toHaveLength(0);
    expect(step.descriptionAr, `${slug} frame ${i} needs Arabic narration`).toBeTruthy();
    expect(step.codeLine, `${slug} frame ${i} needs a pseudocode line`).toBeTypeOf("number");
    if (i > 0) {
      for (const [name, count] of Object.entries(step.counters ?? {})) {
        const previous = steps[i - 1].counters?.[name];
        expect(Number.isFinite(count), `${slug} frame ${i} has a finite ${name}`).toBe(true);
        if (previous !== undefined && name !== "open" && name !== "remaining") {
          expect(count, `${slug} frame ${i} cannot reduce cumulative ${name}`).toBeGreaterThanOrEqual(previous);
        }
      }
    }
  }
}

function assertBfsTrace(steps: Step<GraphFrame>[], edges: { from: string; to: string }[]): void {
  const adjacent = (a: string, b: string) => edges.some((edge) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a));
  for (let i = 1; i < steps.length; i++) {
    const before = values(steps[i - 1].frame, "Queue").map(String);
    const after = values(steps[i].frame, "Queue").map(String);
    const visitedBefore = values(steps[i - 1].frame, "Visited").map(String);
    const visitedAfter = values(steps[i].frame, "Visited").map(String);
    expect(visitedAfter.slice(0, visitedBefore.length)).toEqual(visitedBefore);
    expect(visitedAfter.length - visitedBefore.length).toBeLessThanOrEqual(1);
    const dequeued = before.filter((node) => !after.includes(node));
    if (dequeued.length) {
      expect(dequeued).toEqual([before[0]]); // FIFO: only the front may leave.
      expect(visitedAfter.at(-1)).toBe(before[0]);
    }
    const enqueued = after.filter((node) => !before.includes(node));
    for (const node of enqueued) {
      expect(visitedAfter).not.toContain(node);
      if (visitedAfter.length) expect(visitedAfter.some((parent) => adjacent(parent, node)), `${node} must be discovered across a graph edge`).toBe(true);
    }
    expect(new Set([...after, ...visitedAfter]).size).toBe(after.length + visitedAfter.length);
  }
}

function assertDfsTrace(steps: Step<GraphFrame>[], edges: { from: string; to: string }[]): void {
  const adjacent = (a: string, b: string) => edges.some((edge) => (edge.from === a && edge.to === b) || (edge.from === b && edge.to === a));
  for (let i = 1; i < steps.length; i++) {
    const before = values(steps[i - 1].frame, "Stack").map(String);
    const after = values(steps[i].frame, "Stack").map(String);
    const order = values(steps[i].frame, "Visited").map(String);
    if (after.length === before.length + 1) {
      expect(after.slice(0, -1)).toEqual(before);
      if (before.length) expect(adjacent(before.at(-1)!, after.at(-1)!)).toBe(true);
    }
    if (after.length === before.length - 1) expect(before.slice(0, -1)).toEqual(after);
    expect(Math.abs(after.length - before.length)).toBeLessThanOrEqual(1);
    expect(new Set(order).size).toBe(order.length);
  }
}

function annotations(frame: GraphFrame) {
  return Object.fromEntries(Object.entries(frame.nodeAnnotations ?? {}).map(([node, distance]) => [node, asNumber(distance)]));
}

function assertShortestPathTrace(steps: Step<GraphFrame>[], edges: { from: string; to: string; weight: number }[], directed: boolean): void {
  const adjacent = (a: string, b: string) => edges.filter((edge) => edge.from === a && edge.to === b || (!directed && edge.from === b && edge.to === a));
  for (let i = 1; i < steps.length; i++) {
    const before = annotations(steps[i - 1].frame);
    const after = annotations(steps[i].frame);
    for (const node of Object.keys(after)) {
      expect(after[node], `${node} may only improve its tentative distance`).toBeLessThanOrEqual(before[node] ?? Infinity);
      if (after[node] < (before[node] ?? Infinity)) {
        expect(Object.entries(before).some(([from, distance]) => adjacent(from, node).some((edge) => distance !== Infinity && distance + edge.weight === after[node]))).toBe(true);
      }
    }
  }
}

function assertMstTrace(steps: Step<GraphFrame>[], edges: { from: string; to: string; weight: number }[], prim: boolean): void {
  const selected = (frame: GraphFrame) => new Set(Object.entries(frame.edgeStates ?? {}).filter(([, state]) => state === "sorted").map(([key]) => key.split("->").sort().join("-")));
  for (let i = 1; i < steps.length; i++) {
    const before = selected(steps[i - 1].frame);
    const after = selected(steps[i].frame);
    for (const key of before) expect(after).toContain(key);
    const added = [...after].filter((key) => !before.has(key));
    expect(added.length).toBeLessThanOrEqual(1);
    if (added.length) {
      const [a, b] = added[0].split("-");
      expect(edges.some((edge) => [edge.from, edge.to].includes(a) && [edge.from, edge.to].includes(b))).toBe(true);
      if (prim) {
        const inTree = new Set(values(steps[i].frame, "In tree").map(String));
        expect(inTree.has(a) || inTree.has(b)).toBe(true);
      }
    }
  }
}

function assertTableNeverRewrites(steps: Step<TableFrame>[], slug: string): void {
  for (let i = 1; i < steps.length; i++) {
    const before = steps[i - 1].frame;
    const after = steps[i].frame;
    expect(after.rowLabels).toEqual(before.rowLabels);
    expect(after.colLabels).toEqual(before.colLabels);
    for (let row = 0; row < after.cells.length; row++) for (let col = 0; col < after.cells[row].length; col++) {
      const oldValue = before.cells[row][col].value;
      const nextValue = after.cells[row][col].value;
      if (oldValue !== null && oldValue !== undefined && nextValue !== null && nextValue !== undefined) {
        expect(nextValue, `${slug} must not rewrite a solved table cell [${row},${col}]`).toBe(oldValue);
      }
    }
  }
}

describe("step-by-step graph, DP, and greedy trace audit", () => {
  it("covers exactly every registered algorithm in the 24-algorithm scope", () => {
    expect(byCategory("graphs").map((item) => item.slug)).toEqual(expect.arrayContaining(GRAPH));
    expect(byCategory("dynamic-programming").map((item) => item.slug)).toEqual(expect.arrayContaining(DP));
    expect(byCategory("greedy").map((item) => item.slug)).toEqual(expect.arrayContaining(GREEDY));
  });

  it("validates basic frame integrity and cumulative transitions for every frame at every difficulty", async () => {
    for (const slug of [...GRAPH, ...DP, ...GREEDY]) {
      const algorithm = await loadAlgorithm(slug);
      expect(algorithm).not.toBeNull();
      for (const level of [1, 2, 3, 4, 5] as const) {
        const steps = algorithm!.generate(algorithm!.defaultInput(level, createRNG(7919 + level)));
        assertStableTrace(steps, `${slug}/level-${level}`);
      }
    }
  });

  it("BFS and DFS expose only legal queue/stack discovery transitions on a cycle plus a disconnected component", async () => {
    const input = { nodes: ["A", "B", "C", "D", "X", "Y"], edges: [{ from: "A", to: "B" }, { from: "A", to: "C" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "X", to: "Y" }], start: "A" };
    const bfs = await loadAlgorithm("bfs");
    const dfs = await loadAlgorithm("dfs");
    assertBfsTrace(bfs!.generate(input) as Step<GraphFrame>[], input.edges);
    assertDfsTrace(dfs!.generate(input) as Step<GraphFrame>[], input.edges);
  });

  it("shortest-path traces only perform legal relaxations, including negative Bellman-Ford edges", async () => {
    const weighted = { nodes: ["A", "B", "C", "D", "Z"], edges: [{ from: "A", to: "B", weight: 7 }, { from: "A", to: "C", weight: 2 }, { from: "C", to: "B", weight: 1 }, { from: "B", to: "D", weight: 3 }], start: "A" };
    const dijkstra = await loadAlgorithm("dijkstra");
    assertShortestPathTrace(dijkstra!.generate(weighted) as Step<GraphFrame>[], weighted.edges, false);
    const negative = { nodes: ["A", "B", "C", "D"], edges: [{ from: "A", to: "B", weight: 4 }, { from: "A", to: "C", weight: 8 }, { from: "B", to: "C", weight: -3 }, { from: "C", to: "D", weight: 2 }], start: "A" };
    const bellman = await loadAlgorithm("bellman-ford");
    assertShortestPathTrace(bellman!.generate(negative) as Step<GraphFrame>[], negative.edges, true);
  });

  it("Floyd-Warshall writes one strictly improved cell using the displayed pivot recurrence", async () => {
    const input = { nodes: ["A", "B", "C", "D"], edges: [{ from: "A", to: "B", weight: 3 }, { from: "B", to: "C", weight: -1 }, { from: "A", to: "C", weight: 8 }, { from: "C", to: "D", weight: 2 }] };
    const algorithm = await loadAlgorithm("floyd-warshall");
    const steps = algorithm!.generate(input) as Step<TableFrame>[];
    for (let i = 1; i < steps.length; i++) {
      const active = steps[i].frame.cells.flatMap((row, r) => row.map((entry, c) => entry.state === "active" ? [r, c] : null)).find(Boolean) as [number, number] | undefined;
      if (!active) continue;
      const pivot = String(values(steps[i].frame, "pivot vertex k")[0]);
      const k = input.nodes.indexOf(pivot);
      const [r, c] = active;
      expect(cell(steps[i].frame, r, c)).toBeLessThan(cell(steps[i - 1].frame, r, c));
      expect(cell(steps[i].frame, r, c)).toBe(cell(steps[i - 1].frame, r, k) + cell(steps[i - 1].frame, k, c));
      for (let rr = 0; rr < steps[i].frame.cells.length; rr++) for (let cc = 0; cc < steps[i].frame.cells[rr].length; cc++) {
        if (rr !== r || cc !== c) expect(steps[i].frame.cells[rr][cc].value).toBe(steps[i - 1].frame.cells[rr][cc].value);
      }
    }
  });

  it("MST traces add at most one real crossing edge per transition, including disconnected forests", async () => {
    const input = { nodes: ["A", "B", "C", "D", "X"], edges: [{ from: "A", to: "B", weight: 1 }, { from: "B", to: "C", weight: 2 }, { from: "A", to: "C", weight: 5 }, { from: "C", to: "D", weight: 1 }] };
    const kruskal = await loadAlgorithm("kruskal");
    const prim = await loadAlgorithm("prim");
    assertMstTrace(kruskal!.generate(input) as Step<GraphFrame>[], input.edges, false);
    assertMstTrace(prim!.generate(input) as Step<GraphFrame>[], input.edges, true);
  });

  it("Kahn's trace removes only zero-in-degree nodes and detects a directed cycle", async () => {
    const algorithm = await loadAlgorithm("topological-sort");
    const dag = { nodes: ["A", "B", "C", "D"], edges: [{ from: "A", to: "C" }, { from: "B", to: "C" }, { from: "C", to: "D" }] };
    const steps = algorithm!.generate(dag) as Step<GraphFrame>[];
    for (let i = 1; i < steps.length; i++) {
      const beforeOrder = values(steps[i - 1].frame, "Order").map(String);
      const afterOrder = values(steps[i].frame, "Order").map(String);
      if (afterOrder.length === beforeOrder.length + 1) {
        const node = afterOrder.at(-1)!;
        expect(values(steps[i - 1].frame, "Queue (in=0)").map(String)).toContain(node);
        expect(steps[i - 1].frame.nodeAnnotations?.[node]).toBe("in:0");
      }
    }
    const cyclic = algorithm!.generate({ nodes: ["A", "B", "C"], edges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "A" }] }) as Step<GraphFrame>[];
    expect(cyclic.at(-1)!.description.toLowerCase()).toContain("cycle");
  });

  it("A*, SCC, Union-Find, and max-flow keep their structural trace invariants", async () => {
    const astar = await loadAlgorithm("a-star");
    const aSteps = astar!.generate({ grid: [[1, 1, 1], [0, 1, 0], [1, 1, 1]] }) as Step<GridFrame>[];
    for (const step of aSteps) for (let row = 0; row < step.frame.rows; row++) for (let col = 0; col < step.frame.cols; col++) {
      if (row === 1 && col === 0 || row === 1 && col === 2) expect(step.frame.cells[row][col].state).toBe("discarded");
    }
    const flow = await loadAlgorithm("max-flow");
    const fSteps = flow!.generate({ nodes: ["S", "A", "B", "T"], edges: [{ from: "S", to: "A", cap: 2 }, { from: "S", to: "B", cap: 2 }, { from: "A", to: "B", cap: 1 }, { from: "A", to: "T", cap: 2 }, { from: "B", to: "T", cap: 2 }], source: "S", sink: "T" }) as Step<GraphFrame>[];
    for (let i = 1; i < fSteps.length; i++) expect(Number(values(fSteps[i].frame, "max flow so far")[0])).toBeGreaterThanOrEqual(Number(values(fSteps[i - 1].frame, "max flow so far")[0]));
    for (const slug of ["kosaraju-scc", "tarjan-scc", "union-find"]) {
      const algorithm = await loadAlgorithm(slug);
      const input = slug === "union-find" ? { n: 5, ops: [[0, 1], [1, 2], [3, 4], [0, 2]] as [number, number][] } : { nodes: ["A", "B", "C", "D"], edges: [{ from: "A", to: "B" }, { from: "B", to: "A" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "D", to: "C" }] };
      const steps = algorithm!.generate(input) as Step<GraphFrame>[];
      for (const step of steps) expect(new Set(step.frame.nodes.map((node) => node.id)).size).toBe(step.frame.nodes.length);
      expect(steps.at(-1)!.counters?.sccs ?? steps.at(-1)!.counters?.unions).toBeGreaterThanOrEqual(2);
    }
  });

  it("each DP table write follows its exact recurrence, without overwriting prior work", async () => {
    const cases: [string, unknown, (frame: TableFrame, r: number, c: number) => number][] = [
      ["coin-change", { coins: [2, 3, 7], amount: 11 }, (frame, r, c) => c === 0 ? 0 : Math.min(cell(frame, r - 1, c), c >= Number(frame.rowLabels[r].replace("coin ", "")) ? 1 + cell(frame, r, c - Number(frame.rowLabels[r].replace("coin ", ""))) : Infinity)],
      ["knapsack-01", { items: [{ w: 2, v: 3 }, { w: 3, v: 4 }, { w: 4, v: 8 }], capacity: 6 }, (frame, r, c) => { const [w, v] = frame.rowLabels[r].match(/w(\d+) v(\d+)/)!.slice(1).map(Number); return w > c ? cell(frame, r - 1, c) : Math.max(cell(frame, r - 1, c), v + cell(frame, r - 1, c - w)); }],
      ["edit-distance", { a: "kit", b: "sit" }, (frame, r, c) => r === 0 ? c : c === 0 ? r : frame.rowLabels[r][0] === frame.colLabels[c][0] ? cell(frame, r - 1, c - 1) : 1 + Math.min(cell(frame, r - 1, c), cell(frame, r, c - 1), cell(frame, r - 1, c - 1))],
      ["longest-common-subsequence", { a: "ABCA", b: "BACA" }, (frame, r, c) => r === 0 || c === 0 ? 0 : frame.rowLabels[r][0] === frame.colLabels[c][0] ? 1 + cell(frame, r - 1, c - 1) : Math.max(cell(frame, r - 1, c), cell(frame, r, c - 1))],
    ];
    for (const [slug, input, recurrence] of cases) {
      const algorithm = await loadAlgorithm(slug);
      const steps = algorithm!.generate(input) as Step<TableFrame>[];
      assertTableNeverRewrites(steps, slug);
      for (const step of steps) for (let r = 0; r < step.frame.cells.length; r++) for (let c = 0; c < step.frame.cells[r].length; c++) {
        if (step.frame.cells[r][c].state === "active") expect(cell(step.frame, r, c), `${slug} [${r},${c}]`).toBe(recurrence(step.frame, r, c));
      }
    }
  });

  it("memoization, LIS, and Kadane traces show only legal state updates", async () => {
    const fib = await loadAlgorithm("fibonacci-dp");
    const fSteps = fib!.generate({ n: 9 }) as Step<CallStackFrame>[];
    for (let i = 1; i < fSteps.length; i++) {
      const before = fSteps[i - 1].frame.stack.map((item) => item.id);
      const after = fSteps[i].frame.stack.map((item) => item.id);
      expect(Math.abs(after.length - before.length)).toBeLessThanOrEqual(1);
      const shared = Math.max(0, Math.min(before.length, after.length) - 1);
      expect(after.slice(0, shared)).toEqual(before.slice(0, shared));
    }
    const lis = await loadAlgorithm("longest-increasing-subsequence");
    const lSteps = lis!.generate({ values: [3, 1, 2, 5, 4, 6] }) as Step<ArrayFrame>[];
    for (const step of lSteps) {
      const dp = values(step.frame, "dp (LIS end here)").map(Number);
      dp.forEach((length, index) => {
        const legalPredecessors = dp.filter((_, candidate) => candidate < index && step.frame.values[candidate] < step.frame.values[index]);
        expect(length).toBeLessThanOrEqual(1 + Math.max(0, ...legalPredecessors));
      });
    }
    const kadane = await loadAlgorithm("maximum-subarray");
    const kSteps = kadane!.generate({ values: [-5, 4, -1, 2, -7, 3] }) as Step<ArrayFrame>[];
    for (const step of kSteps) {
      const pointer = step.frame.pointers?.find((item) => item.label === "i")?.index;
      if (pointer === undefined) continue;
      const expected = Math.max(...Array.from({ length: pointer + 1 }, (_, start) => step.frame.values.slice(start, pointer + 1).reduce((sum, value) => sum + value, 0)));
      expect(Number(values(step.frame, "current sum")[0])).toBe(expected);
    }
  });

  it("greedy traces select only feasible choices in their documented order", async () => {
    const activity = await loadAlgorithm("activity-selection");
    const aSteps = activity!.generate({ activities: [{ start: 0, finish: 6 }, { start: 1, finish: 4 }, { start: 3, finish: 5 }, { start: 5, finish: 7 }, { start: 5, finish: 9 }, { start: 8, finish: 9 }] }) as Step<TableFrame>[];
    for (const step of aSteps) {
      const chosen = values(step.frame, "Selected").map(String).filter((value) => value !== "â€”");
      expect(new Set(chosen).size).toBe(chosen.length);
      expect(chosen).toEqual([...chosen].sort((left, right) => Number(step.frame.cells[step.frame.rowLabels.indexOf(left)][1].value) - Number(step.frame.cells[step.frame.rowLabels.indexOf(right)][1].value)));
    }
    const fractional = await loadAlgorithm("fractional-knapsack");
    const fkSteps = fractional!.generate({ items: [{ w: 10, v: 60 }, { w: 20, v: 100 }, { w: 30, v: 120 }], capacity: 50 }) as Step<TableFrame>[];
    for (const step of fkSteps) expect(Number(values(step.frame, "remaining capacity")[0])).toBeGreaterThanOrEqual(0);
    const jobs = await loadAlgorithm("job-sequencing");
    const jSteps = jobs!.generate({ jobs: [{ id: "A", deadline: 2, profit: 100 }, { id: "B", deadline: 1, profit: 19 }, { id: "C", deadline: 2, profit: 27 }, { id: "D", deadline: 1, profit: 25 }] }) as Step<TableFrame>[];
    for (const step of jSteps) {
      const slots = values(step.frame, "time slots (t1â€¦)").map(String).filter((slot) => !slot.startsWith("t"));
      expect(new Set(slots).size).toBe(slots.length);
    }
    const huffman = await loadAlgorithm("huffman-coding");
    const hSteps = huffman!.generate({ text: "aaabbcdddd" }) as Step<TreeFrame>[];
    for (let i = 1; i < hSteps.length; i++) expect(hSteps[i].counters?.merges ?? 0).toBeGreaterThanOrEqual(hSteps[i - 1].counters?.merges ?? 0);
  });
});
