import { describe, expect, it } from "vitest";
import { byCategory, loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, ArrayFrame, GraphFrame, GridFrame, TableFrame, TreeFrame } from "@/lib/engine/types";

type Edge = { from: string; to: string; weight: number };

function aux(frame: { aux?: { label: string; values: (string | number)[] }[] }, label: string) {
  return frame.aux?.find((row) => row.label === label)?.values ?? [];
}

function tableValue(frame: TableFrame, row: string, column: string) {
  return frame.cells[frame.rowLabels.indexOf(row)][frame.colLabels.indexOf(column)].value;
}

function finalFrame<F, I>(module: AlgorithmModule<F, I>, input: I): F {
  const steps = module.generate(input);
  expect(steps.length).toBeGreaterThan(0);
  return steps.at(-1)!.frame;
}

function shortestPaths(nodes: string[], edges: Edge[], start: string, directed: boolean): Record<string, number> {
  const distance = Object.fromEntries(nodes.map((node) => [node, Infinity])) as Record<string, number>;
  distance[start] = 0;
  const allEdges = directed ? edges : edges.flatMap((edge) => [edge, { from: edge.to, to: edge.from, weight: edge.weight }]);
  for (let pass = 1; pass < nodes.length; pass++) {
    let changed = false;
    for (const edge of allEdges) {
      if (distance[edge.from] !== Infinity && distance[edge.from] + edge.weight < distance[edge.to]) {
        distance[edge.to] = distance[edge.from] + edge.weight;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return distance;
}

function mstWeight(nodes: string[], edges: Edge[]): number {
  let best = Infinity;
  for (let mask = 0; mask < 1 << edges.length; mask++) {
    if (mask.toString(2).split("1").length - 1 !== nodes.length - 1) continue;
    const parent = Object.fromEntries(nodes.map((node) => [node, node])) as Record<string, string>;
    const find = (node: string): string => parent[node] === node ? node : (parent[node] = find(parent[node]));
    let cycle = false;
    let weight = 0;
    for (let i = 0; i < edges.length; i++) if (mask & (1 << i)) {
      const edge = edges[i];
      const a = find(edge.from);
      const b = find(edge.to);
      if (a === b) { cycle = true; break; }
      parent[a] = b;
      weight += edge.weight;
    }
    if (!cycle && new Set(nodes.map(find)).size === 1) best = Math.min(best, weight);
  }
  return best;
}

function allPairs(nodes: string[], edges: Edge[]): Record<string, Record<string, number>> {
  const result = Object.fromEntries(nodes.map((from) => [from, shortestPaths(nodes, edges, from, true)])) as Record<string, Record<string, number>>;
  return result;
}

function stronglyConnected(nodes: string[], edges: { from: string; to: string }[]): Set<string>[] {
  const reach = (start: string) => {
    const seen = new Set([start]);
    const pending = [start];
    while (pending.length) {
      const current = pending.pop()!;
      for (const edge of edges) if (edge.from === current && !seen.has(edge.to)) {
        seen.add(edge.to);
        pending.push(edge.to);
      }
    }
    return seen;
  };
  const remaining = new Set(nodes);
  const groups: Set<string>[] = [];
  while (remaining.size) {
    const first = remaining.values().next().value!;
    const group = new Set(nodes.filter((node) => reach(first).has(node) && reach(node).has(first)));
    group.forEach((node) => remaining.delete(node));
    groups.push(group);
  }
  return groups;
}

function gridDistance(grid: number[][]): number | null {
  const rows = grid.length;
  const cols = grid[0].length;
  const target = `${rows - 1},${cols - 1}`;
  const queue: [number, number, number][] = [[0, 0, 0]];
  const seen = new Set(["0,0"]);
  while (queue.length) {
    const [r, c, distance] = queue.shift()!;
    if (`${r},${c}` === target) return distance;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1 && !seen.has(key)) {
        seen.add(key);
        queue.push([nr, nc, distance + 1]);
      }
    }
  }
  return null;
}

function minCut(nodes: string[], edges: { from: string; to: string; cap: number }[], source: string, sink: string): number {
  const middle = nodes.filter((node) => node !== source && node !== sink);
  let best = Infinity;
  for (let mask = 0; mask < 1 << middle.length; mask++) {
    const sourceSide = new Set([source, ...middle.filter((_, i) => mask & (1 << i))]);
    best = Math.min(best, edges.filter((edge) => sourceSide.has(edge.from) && !sourceSide.has(edge.to)).reduce((sum, edge) => sum + edge.cap, 0));
  }
  return best;
}

function bottomRight(frame: TableFrame) {
  return frame.cells.at(-1)?.at(-1)?.value;
}

function editDistance(a: string, b: string): number {
  const aa = [...a]; const bb = [...b];
  const dp = Array.from({ length: aa.length + 1 }, (_, i) => Array.from({ length: bb.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= aa.length; i++) for (let j = 1; j <= bb.length; j++) dp[i][j] = aa[i - 1] === bb[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[aa.length][bb.length];
}

function lcsLength(a: string, b: string): number {
  const aa = [...a]; const bb = [...b];
  const dp = Array.from({ length: aa.length + 1 }, () => new Array(bb.length + 1).fill(0));
  for (let i = 1; i <= aa.length; i++) for (let j = 1; j <= bb.length; j++) dp[i][j] = aa[i - 1] === bb[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[aa.length][bb.length];
}

function lisLength(values: number[]): number {
  let best = 0;
  for (let mask = 0; mask < 1 << values.length; mask++) {
    const sequence = values.filter((_, index) => mask & (1 << index));
    if (sequence.every((value, index) => index === 0 || sequence[index - 1] < value)) best = Math.max(best, sequence.length);
  }
  return best;
}

function maximumSubarray(values: number[]): number {
  let best = -Infinity;
  for (let left = 0; left < values.length; left++) for (let right = left, sum = 0; right < values.length; right++) {
    sum += values[right];
    best = Math.max(best, sum);
  }
  return best;
}

function knapsack(items: { w: number; v: number }[], capacity: number): number {
  let best = 0;
  for (let mask = 0; mask < 1 << items.length; mask++) {
    const selected = items.filter((_, index) => mask & (1 << index));
    const weight = selected.reduce((sum, item) => sum + item.w, 0);
    if (weight <= capacity) best = Math.max(best, selected.reduce((sum, item) => sum + item.v, 0));
  }
  return best;
}

function coinCount(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let value = 1; value <= amount; value++) for (const coin of coins) if (coin <= value) dp[value] = Math.min(dp[value], dp[value - coin] + 1);
  return dp[amount];
}

function activityMaximum(activities: { start: number; finish: number }[]): number {
  let best = 0;
  for (let mask = 0; mask < 1 << activities.length; mask++) {
    const selected = activities.filter((_, index) => mask & (1 << index)).sort((a, b) => a.start - b.start);
    if (selected.every((activity, index) => index === 0 || selected[index - 1].finish <= activity.start)) best = Math.max(best, selected.length);
  }
  return best;
}

function fractionalValue(items: { w: number; v: number }[], capacity: number): number {
  let remaining = capacity;
  return [...items].sort((a, b) => b.v / b.w - a.v / a.w).reduce((total, item) => {
    const weight = Math.min(remaining, item.w);
    remaining -= weight;
    return total + weight * item.v / item.w;
  }, 0);
}

function jobProfit(jobs: { id: string; deadline: number; profit: number }[]): number {
  let best = 0;
  for (let mask = 0; mask < 1 << jobs.length; mask++) {
    const selected = jobs.filter((_, index) => mask & (1 << index)).sort((a, b) => a.deadline - b.deadline);
    if (selected.every((job, index) => job.deadline >= index + 1)) best = Math.max(best, selected.reduce((sum, job) => sum + job.profit, 0));
  }
  return best;
}

function huffmanCost(frequencies: number[]): number {
  const queue = [...frequencies];
  let total = 0;
  while (queue.length > 1) {
    queue.sort((a, b) => a - b);
    const merged = queue.shift()! + queue.shift()!;
    total += merged;
    queue.push(merged);
  }
  return total;
}

describe("registered graph modules against independent graph oracles", () => {
  it("contains the complete registered graph category", () => {
    expect(byCategory("graphs").map(({ slug }) => slug)).toEqual(expect.arrayContaining([
      "a-star", "bellman-ford", "bfs", "dfs", "dijkstra", "floyd-warshall", "kosaraju-scc", "kruskal", "max-flow", "prim", "tarjan-scc", "topological-sort", "union-find",
    ]));
  });

  it("BFS and DFS visit exactly the independently reachable component", async () => {
    const nodes = ["A", "B", "C", "D", "X", "Y"];
    const edges = [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "X", to: "Y" }];
    for (const slug of ["bfs", "dfs"]) {
      const algorithm = await loadAlgorithm(slug) as AlgorithmModule<GraphFrame, { nodes: string[]; edges: typeof edges; start: string }>;
      const final = finalFrame(algorithm, { nodes, edges, start: "B" });
      expect(Object.entries(final.nodeStates ?? {}).filter(([, state]) => state === "visited" || state === "sorted").map(([node]) => node).sort()).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("Dijkstra, Bellman-Ford, and Floyd-Warshall agree with independently relaxed distances", async () => {
    const undirected: Edge[] = [{ from: "A", to: "B", weight: 7 }, { from: "A", to: "C", weight: 2 }, { from: "C", to: "B", weight: 1 }, { from: "B", to: "D", weight: 3 }, { from: "C", to: "D", weight: 9 }];
    const dijkstra = await loadAlgorithm("dijkstra") as AlgorithmModule<GraphFrame, { nodes: string[]; edges: Edge[]; start: string }>;
    const dijkstraFinal = finalFrame(dijkstra, { nodes: ["A", "B", "C", "D", "Z"], edges: undirected, start: "A" });
    const expectedDijkstra = shortestPaths(["A", "B", "C", "D", "Z"], undirected, "A", false);
    for (const [node, distance] of Object.entries(expectedDijkstra)) expect(dijkstraFinal.nodeAnnotations?.[node]).toBe(distance === Infinity ? "∞" : String(distance));

    const directed: Edge[] = [{ from: "A", to: "B", weight: 4 }, { from: "A", to: "C", weight: 8 }, { from: "B", to: "C", weight: -3 }, { from: "C", to: "D", weight: 2 }, { from: "B", to: "D", weight: 7 }];
    const bellman = await loadAlgorithm("bellman-ford") as AlgorithmModule<GraphFrame, { nodes: string[]; edges: Edge[]; start: string }>;
    const bellmanFinal = finalFrame(bellman, { nodes: ["A", "B", "C", "D"], edges: directed, start: "A" });
    for (const [node, distance] of Object.entries(shortestPaths(["A", "B", "C", "D"], directed, "A", true))) expect(bellmanFinal.nodeAnnotations?.[node]).toBe(String(distance));
    expect(bellman.generate({ nodes: ["A", "B", "C"], edges: [{ from: "A", to: "B", weight: 1 }, { from: "B", to: "C", weight: -3 }, { from: "C", to: "A", weight: 1 }], start: "A" }).at(-1)!.description.toLowerCase()).toContain("negative-weight cycle");

    const floyd = await loadAlgorithm("floyd-warshall") as AlgorithmModule<TableFrame, { nodes: string[]; edges: Edge[] }>;
    const duplicateEdgeInput = [...directed, { from: "A", to: "B", weight: 10 }];
    const floydFinal = finalFrame(floyd, { nodes: ["A", "B", "C", "D"], edges: duplicateEdgeInput });
    const pairs = allPairs(["A", "B", "C", "D"], duplicateEdgeInput);
    for (const from of Object.keys(pairs)) for (const to of Object.keys(pairs[from])) expect(tableValue(floydFinal, from, to)).toBe(pairs[from][to] === Infinity ? "∞" : pairs[from][to]);
  });

  it("Prim and Kruskal return the exhaustive minimum spanning-tree weight", async () => {
    const edges: Edge[] = [{ from: "A", to: "B", weight: 4 }, { from: "A", to: "C", weight: 1 }, { from: "B", to: "C", weight: 2 }, { from: "B", to: "D", weight: 5 }, { from: "C", to: "D", weight: 3 }, { from: "A", to: "D", weight: 8 }];
    const expected = mstWeight(["A", "B", "C", "D"], edges);
    for (const slug of ["prim", "kruskal"]) {
      const algorithm = await loadAlgorithm(slug) as AlgorithmModule<GraphFrame, { nodes: string[]; edges: Edge[] }>;
      expect(aux(finalFrame(algorithm, { nodes: ["A", "B", "C", "D"], edges }), "MST weight")).toEqual([expected]);
    }
  });

  it("topological sort satisfies every precedence edge and identifies a cycle", async () => {
    const algorithm = await loadAlgorithm("topological-sort") as AlgorithmModule<GraphFrame, { nodes: string[]; edges: { from: string; to: string }[] }>;
    const edges = [{ from: "A", to: "C" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "B", to: "E" }];
    const final = finalFrame(algorithm, { nodes: ["A", "B", "C", "D", "E"], edges });
    const position = new Map(aux(final, "Order").map((node, index) => [String(node), index]));
    edges.forEach((edge) => expect(position.get(edge.from)!).toBeLessThan(position.get(edge.to)!));
    const cyclic = algorithm.generate({ nodes: ["A", "B", "C"], edges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "A" }] }).at(-1)!;
    expect(cyclic.description.toLowerCase()).toContain("cycle");
  });

  it("union-find components and both SCC algorithms agree with independent connectivity partitions", async () => {
    const unionFind = await loadAlgorithm("union-find") as AlgorithmModule<GraphFrame, { n: number; ops: [number, number][] }>;
    const operations: [number, number][] = [[0, 1], [2, 3], [1, 2], [4, 5], [0, 3]];
    expect(aux(finalFrame(unionFind, { n: 7, ops: operations }), "components")).toEqual([3]);

    const nodes = ["A", "B", "C", "D", "E", "F"];
    const edges = [{ from: "A", to: "B" }, { from: "B", to: "A" }, { from: "B", to: "C" }, { from: "C", to: "D" }, { from: "D", to: "C" }, { from: "D", to: "E" }, { from: "E", to: "F" }, { from: "F", to: "E" }];
    const expected = stronglyConnected(nodes, edges);
    for (const slug of ["tarjan-scc", "kosaraju-scc"]) {
      const algorithm = await loadAlgorithm(slug) as AlgorithmModule<GraphFrame, { nodes: string[]; edges: typeof edges }>;
      const final = finalFrame(algorithm, { nodes, edges });
      expect(aux(final, "SCCs found")).toEqual([expected.length]);
      for (const group of expected) for (const a of group) for (const b of group) expect(final.nodeStates?.[a]).toBe(final.nodeStates?.[b]);
      for (let i = 0; i < expected.length; i++) for (let j = i + 1; j < expected.length; j++) expect(final.nodeStates?.[[...expected[i]][0]]).not.toBe(final.nodeStates?.[[...expected[j]][0]]);
    }
  });

  it("A* returns a shortest grid path, and max flow equals the independent min-cut", async () => {
    const aStar = await loadAlgorithm("a-star") as AlgorithmModule<GridFrame, { grid: number[][] }>;
    for (const grid of [
      [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
      [[1, 1, 0, 1], [0, 1, 1, 1], [1, 1, 0, 1], [1, 1, 1, 1]],
    ]) {
      const expected = gridDistance(grid)!;
      const final = finalFrame(aStar, { grid });
      expect(final.cells.flat().filter((cell) => cell.state === "sorted")).toHaveLength(expected + 1);
    }
    expect(aStar.generate({ grid: [[1, 0], [0, 1]] }).at(-1)!.description.toLowerCase()).toContain("no path");

    const maxFlow = await loadAlgorithm("max-flow") as AlgorithmModule<GraphFrame, { nodes: string[]; edges: { from: string; to: string; cap: number }[]; source: string; sink: string }>;
    for (const edges of [
      [{ from: "S", to: "A", cap: 4 }, { from: "S", to: "B", cap: 5 }, { from: "A", to: "B", cap: 2 }, { from: "A", to: "T", cap: 3 }, { from: "B", to: "T", cap: 4 }],
      [{ from: "S", to: "A", cap: 5 }, { from: "A", to: "S", cap: 2 }, { from: "S", to: "B", cap: 3 }, { from: "A", to: "B", cap: 4 }, { from: "A", to: "T", cap: 2 }, { from: "B", to: "T", cap: 6 }],
    ]) expect(aux(finalFrame(maxFlow, { nodes: ["S", "A", "B", "T"], edges, source: "S", sink: "T" }), "max flow so far")).toEqual([minCut(["S", "A", "B", "T"], edges, "S", "T")]);
  });
});

describe("registered dynamic-programming modules against exhaustive/reference solvers", () => {
  it("contains the complete registered dynamic-programming category", () => {
    expect(byCategory("dynamic-programming").map(({ slug }) => slug)).toEqual(expect.arrayContaining(["coin-change", "edit-distance", "fibonacci-dp", "knapsack-01", "longest-common-subsequence", "longest-increasing-subsequence", "maximum-subarray"]));
  });

  it("memoized Fibonacci reaches independently calculated sequence values", async () => {
    const algorithm = await loadAlgorithm("fibonacci-dp") as AlgorithmModule<unknown, { n: number }>;
    const values = [0, 1, 2, 10, 25];
    for (const n of values) {
      let a = 0; let b = 1;
      for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      expect(algorithm.generate({ n }).at(-1)!.description).toContain(`fib(${n}) = ${a}`);
    }
  });

  it("table DP modules match independent optimum tables", async () => {
    const edit = await loadAlgorithm("edit-distance") as AlgorithmModule<TableFrame, { a: string; b: string }>;
    const lcs = await loadAlgorithm("longest-common-subsequence") as AlgorithmModule<TableFrame, { a: string; b: string }>;
    for (const [a, b] of [["kitten", "sitting"], ["ABCD", "ACBAD"], ["", "abc"], ["😀a", "a😀"]]) {
      expect(bottomRight(finalFrame(edit, { a, b }))).toBe(editDistance(a, b));
      expect(bottomRight(finalFrame(lcs, { a, b }))).toBe(lcsLength(a, b));
    }

    const knapsackModule = await loadAlgorithm("knapsack-01") as AlgorithmModule<TableFrame, { items: { w: number; v: number }[]; capacity: number }>;
    const knapsackItems = [{ w: 2, v: 6 }, { w: 2, v: 10 }, { w: 3, v: 12 }, { w: 1, v: 7 }];
    expect(bottomRight(finalFrame(knapsackModule, { items: knapsackItems, capacity: 5 }))).toBe(knapsack(knapsackItems, 5));

    const coinModule = await loadAlgorithm("coin-change") as AlgorithmModule<TableFrame, { coins: number[]; amount: number }>;
    for (const [coins, amount] of [[[1, 3, 4], 6], [[2, 5, 7], 27], [[2, 4], 0], [[4, 6], 5]] as const) {
      const actual = bottomRight(finalFrame(coinModule, { coins: [...coins], amount }));
      const expected = coinCount([...coins], amount);
      expect(expected === Infinity ? String(actual).toLowerCase() : actual).toBe(expected === Infinity ? "∞" : expected);
    }
  });

  it("LIS and Kadane outputs match exhaustive subsequence/subarray optima", async () => {
    const lis = await loadAlgorithm("longest-increasing-subsequence") as AlgorithmModule<ArrayFrame, { values: number[] }>;
    const maximum = await loadAlgorithm("maximum-subarray") as AlgorithmModule<ArrayFrame, { values: number[] }>;
    for (const values of [[3, 1, 2, 2, 5, -1, 6], [5, 4, 3, 2], [-2, -1, -3, 4, -1, 2, 1, -5, 4]]) {
      const lisDescription = lis.generate({ values }).at(-1)!.description;
      expect(Number(lisDescription.match(/length (\d+)/)?.[1])).toBe(lisLength(values));
      const final = finalFrame(maximum, { values });
      expect(aux(final, "best sum")).toEqual([maximumSubarray(values)]);
    }
  });
});

describe("registered greedy modules against exhaustive/reference optima", () => {
  it("contains the complete registered greedy category", () => {
    expect(byCategory("greedy").map(({ slug }) => slug)).toEqual(expect.arrayContaining(["activity-selection", "fractional-knapsack", "huffman-coding", "job-sequencing"]));
  });

  it("activity selection, fractional knapsack, and job sequencing reach their independent optima", async () => {
    const activity = await loadAlgorithm("activity-selection") as AlgorithmModule<TableFrame, { activities: { start: number; finish: number }[] }>;
    const activities = [{ start: 0, finish: 6 }, { start: 1, finish: 4 }, { start: 3, finish: 5 }, { start: 5, finish: 7 }, { start: 5, finish: 9 }, { start: 8, finish: 9 }, { start: 9, finish: 10 }];
    expect(activity.generate({ activities }).at(-1)!.counters?.selected).toBe(activityMaximum(activities));

    const fractional = await loadAlgorithm("fractional-knapsack") as AlgorithmModule<TableFrame, { items: { w: number; v: number }[]; capacity: number }>;
    const items = [{ w: 4, v: 20 }, { w: 3, v: 18 }, { w: 5, v: 25 }, { w: 2, v: 8 }];
    expect(fractional.generate({ items, capacity: 8 }).at(-1)!.counters?.total).toBeCloseTo(fractionalValue(items, 8), 8);

    const jobs = [{ id: "A", deadline: 2, profit: 100 }, { id: "B", deadline: 1, profit: 19 }, { id: "C", deadline: 2, profit: 27 }, { id: "D", deadline: 1, profit: 25 }, { id: "E", deadline: 3, profit: 15 }];
    const job = await loadAlgorithm("job-sequencing") as AlgorithmModule<TableFrame, { jobs: typeof jobs }>;
    expect(job.generate({ jobs }).at(-1)!.counters?.profit).toBe(jobProfit(jobs));
  });

  it("Huffman codes are prefix-free and have the independent optimal weighted cost", async () => {
    const algorithm = await loadAlgorithm("huffman-coding") as AlgorithmModule<TreeFrame, { text: string }>;
    for (const text of ["aaaabbc", "abbcccdddd", "mississippi"]) {
      const final = finalFrame(algorithm, { text });
      const characters = aux(final, "character").map(String);
      const codes = aux(final, "Huffman code").map(String);
      for (let i = 0; i < codes.length; i++) for (let j = 0; j < codes.length; j++) if (i !== j) expect(codes[j].startsWith(codes[i])).toBe(false);
      const frequencies = characters.map((character) => [...text].filter((value) => value === character).length);
      expect(characters.reduce((sum, character, index) => sum + frequencies[index] * codes[index].length, 0)).toBe(huffmanCost(frequencies));
    }
  });
});
