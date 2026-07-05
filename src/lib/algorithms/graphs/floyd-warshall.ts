import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";
import { parseDirectedWeighted } from "./bellman-ford";

type WEdge = { from: string; to: string; weight: number };
type Input = { nodes: string[]; edges: WEdge[] };

const INF = Infinity;

function generate(input: Input): Step<TableFrame>[] {
  const nodes = input.nodes;
  const n = nodes.length;
  const idx = Object.fromEntries(nodes.map((v, i) => [v, i]));
  const steps: Step<TableFrame>[] = [];
  let relaxations = 0;
  let updates = 0;

  const d: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : INF)),
  );
  for (const e of input.edges) {
    const a = idx[e.from];
    const b = idx[e.to];
    d[a][b] = Math.min(d[a][b], e.weight);
  }

  const show = (v: number) => (v === INF ? "∞" : v);

  const frame = (
    active: [number, number] | null,
    refs: [number, number][],
    pivotK: number | null,
    description: string,
    codeLine: number,
    done = false,
  ): void => {
    const cells = d.map((row, i) =>
      row.map((val, j) => {
        let state: CellState | undefined;
        if (active && active[0] === i && active[1] === j) state = "active";
        else if (refs.some(([ri, rj]) => ri === i && rj === j)) state = "compare";
        else if (pivotK !== null && (i === pivotK || j === pivotK)) state = "pivot";
        else if (done && val !== INF && i !== j) state = "sorted";
        return { value: show(val), state };
      }),
    );
    steps.push({
      frame: {
        rowLabels: nodes,
        colLabels: nodes,
        cells,
        aux: pivotK !== null ? [{ label: "pivot vertex k", values: [nodes[pivotK]] }] : undefined,
        note: `dist[i][j] = shortest path from i to j using intermediates ≤ k`,
      },
      description,
      codeLine,
      counters: { relaxations, updates },
    });
  };

  frame(null, [], null, `Initialize the distance matrix: 0 on the diagonal, edge weights where an edge exists, ∞ otherwise.`, 1);

  for (let k = 0; k < n; k++) {
    frame(null, [], k, `Allow vertex ${nodes[k]} as an intermediate. Can any path i→…→j get shorter by routing through ${nodes[k]}?`, 3);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === k || j === k || i === j) continue;
        relaxations++;
        if (d[i][k] !== INF && d[k][j] !== INF && d[i][k] + d[k][j] < d[i][j]) {
          const oldV = d[i][j];
          d[i][j] = d[i][k] + d[k][j];
          updates++;
          frame(
            [i, j],
            [[i, k], [k, j]],
            k,
            `${nodes[i]}→${nodes[j]}: via ${nodes[k]} costs ${d[i][k]}+${d[k][j]}=${d[i][j]} < ${show(oldV)}. Update.`,
            4,
          );
        }
      }
    }
  }

  // negative cycle check: any negative diagonal
  const neg = d.some((row, i) => row[i] < 0);
  if (neg) {
    frame(null, [], null, `A diagonal entry is negative — the graph contains a negative-weight cycle, so shortest paths are undefined.`, 6);
  } else {
    frame(null, [], null, `Done. Every cell now holds the shortest distance between its row and column vertices.`, 6, true);
  }
  return steps;
}

const TEMPLATES = [
  "A>B:3, B>C:2, A>C:8, C>D:1, B>D:5",
  "A>B:4, A>C:11, B>C:2, C>A:3, B>D:5, D>C:1",
  "0>1:5, 0>3:10, 1>2:3, 2>3:1",
  "A>B:2, B>C:-1, C>D:2, A>D:9, D>B:4",
  "P>Q:7, Q>R:1, R>S:3, P>S:20, S>Q:2, R>P:5",
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  return parseDirectedWeighted(t);
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "floyd-warshall",
  title: "Floyd-Warshall (All-Pairs)",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["graph", "all-pairs shortest path", "dynamic programming", "matrix"],
  summary: "Computes shortest paths between every pair of vertices by progressively allowing more intermediate vertices.",
  renderer: "table",
  pseudocode: [
    "procedure floydWarshall(dist)",
    "  dist[i][j] = weight(i,j) or ∞;  dist[i][i] = 0",
    "  for k = 0..n-1:",
    "    for i, j:",
    "      if dist[i][k] + dist[k][j] < dist[i][j]:",
    "        dist[i][j] = dist[i][k] + dist[k][j]",
    "  // negative dist[i][i] ⇒ negative cycle",
    "  return dist",
  ],
  code: {
    pseudocode: `dist[i][j] = w(i,j) or INF; dist[i][i] = 0
for k in 0..n-1:
  for i in 0..n-1:
    for j in 0..n-1:
      dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`,
    c: `void floyd(int n, int dist[][N]) {
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j])
                    dist[i][j] = dist[i][k] + dist[k][j];
}`,
    cpp: `void floyd(vector<vector<int>>& d) {
    int n = d.size();
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i][k] != INF && d[k][j] != INF)
                    d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
}`,
    java: `void floyd(int[][] d) {
    int n = d.length;
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i][k] != INF && d[k][j] != INF && d[i][k] + d[k][j] < d[i][j])
                    d[i][j] = d[i][k] + d[k][j];
}`,
    python: `def floyd_warshall(dist):
    n = len(dist)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist`,
    javascript: `function floydWarshall(d) {
  const n = d.length;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (d[i][k] + d[k][j] < d[i][j])
          d[i][j] = d[i][k] + d[k][j];
  return d;
}`,
    typescript: `function floydWarshall(d: number[][]): number[][] {
  const n = d.length;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (d[i][k] + d[k][j] < d[i][j])
          d[i][j] = d[i][k] + d[k][j];
  return d;
}`,
    csharp: `void Floyd(int[,] d) {
    int n = d.GetLength(0);
    for (int k = 0; k < n; k++)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (d[i,k] + d[k,j] < d[i,j])
                    d[i,j] = d[i,k] + d[k,j];
}`,
    go: `func floyd(d [][]int) {
	n := len(d)
	for k := 0; k < n; k++ {
		for i := 0; i < n; i++ {
			for j := 0; j < n; j++ {
				if d[i][k]+d[k][j] < d[i][j] {
					d[i][j] = d[i][k] + d[k][j]
				}
			}
		}
	}
}`,
    rust: `fn floyd(d: &mut Vec<Vec<i64>>) {
    let n = d.len();
    for k in 0..n {
        for i in 0..n {
            for j in 0..n {
                if d[i][k] + d[k][j] < d[i][j] {
                    d[i][j] = d[i][k] + d[k][j];
                }
            }
        }
    }
}`,
    kotlin: `fun floyd(d: Array<IntArray>) {
    val n = d.size
    for (k in 0 until n)
        for (i in 0 until n)
            for (j in 0 until n)
                if (d[i][k] + d[k][j] < d[i][j])
                    d[i][j] = d[i][k] + d[k][j]
}`,
    swift: `func floyd(_ d: inout [[Int]]) {
    let n = d.count
    for k in 0..<n {
        for i in 0..<n {
            for j in 0..<n where d[i][k] + d[k][j] < d[i][j] {
                d[i][j] = d[i][k] + d[k][j]
            }
        }
    }
}`,
  },
  content: {
    overview: `Floyd-Warshall solves the all-pairs shortest-path problem: it finds the shortest distance between every pair of vertices in a weighted, directed graph, all at once, in a single triple-nested loop. It elegantly handles negative edge weights and can detect negative cycles (a vertex ending up with a negative distance to itself).

The algorithm is a beautiful dynamic program over one question: "which vertices are you allowed to pass through?" Start with direct edges only. Then, one vertex k at a time, ask whether routing a path i → j through k is shorter than the best path found so far — that is, whether dist[i][k] + dist[k][j] beats dist[i][j]. After every vertex has had its turn as a permitted intermediate, dist[i][j] holds the true shortest distance. The matrix view makes this vivid: on step k, the k-th row and column are the "pivot," and every other cell may improve by combining its pivot row and column entries.`,
    howItWorks: [
      "Build an n×n matrix: 0 on the diagonal, edge weights where edges exist, ∞ elsewhere.",
      "For each intermediate vertex k (the pivot), consider every pair (i, j).",
      "If dist[i][k] + dist[k][j] < dist[i][j], the path through k is shorter — update dist[i][j].",
      "After all n pivots are processed, every cell holds the shortest i-to-j distance.",
      "If any diagonal entry becomes negative, the graph has a negative-weight cycle.",
    ],
    complexity: {
      time: { best: "O(V³)", average: "O(V³)", worst: "O(V³)" },
      space: "O(V²)",
      notes: "Three nested loops over V vertices give O(V³) time and O(V²) space for the matrix. Competitive for dense graphs; for sparse graphs, running Dijkstra from each source (or Johnson's algorithm) can be faster.",
    },
    applications: [
      "all-pairs shortest paths in dense graphs",
      "computing a graph's transitive closure (reachability)",
      "network routing tables and latency matrices",
      "finding the graph diameter and detecting negative cycles",
    ],
    advantages: [
      "Computes every pair's shortest path in one run",
      "Handles negative edge weights",
      "Extremely simple triple loop — easy to implement",
      "Detects negative cycles via negative diagonal entries",
    ],
    disadvantages: [
      "O(V³) is expensive for large graphs",
      "O(V²) memory for the full matrix",
      "Overkill when only a single source is needed",
      "Slower than repeated Dijkstra on sparse graphs",
    ],
    commonMistakes: [
      "Ordering the loops wrong — k must be the OUTERMOST loop.",
      "Adding to ∞ and overflowing (guard against unreachable intermediates).",
      "Forgetting to set the diagonal to 0 initially.",
      "Assuming it works with negative cycles (it detects, but can't give finite paths through them).",
    ],
    interviewQuestions: [
      "Why must the intermediate-vertex loop (k) be the outermost?",
      "How does Floyd-Warshall detect a negative-weight cycle?",
      "How do you reconstruct the actual shortest path, not just the distance?",
      "When is running Dijkstra from every vertex better than Floyd-Warshall?",
      "How is the transitive closure a special case of this algorithm?",
    ],
    summary:
      "Floyd-Warshall finds all-pairs shortest paths in O(V³) time and O(V²) space by letting each vertex, in turn, serve as an intermediate and relaxing every pair through it. It handles negative edges and detects negative cycles, and is ideal for dense graphs.",
    quiz: [
      { question: "Floyd-Warshall solves which problem?", options: ["Single-source shortest path", "All-pairs shortest path", "Minimum spanning tree", "Topological sort"], answer: 1, explanation: "It computes shortest distances between every pair of vertices." },
      { question: "Its time complexity is…", options: ["O(V²)", "O(V·E)", "O(V³)", "O(E log V)"], answer: 2, explanation: "Three nested loops over V vertices give O(V³)." },
      { question: "In the triple loop, which variable must be outermost?", options: ["i (source)", "j (target)", "k (intermediate)", "It doesn't matter"], answer: 2, explanation: "The intermediate vertex k must be outermost for correctness." },
      { question: "The update rule improves dist[i][j] when…", options: ["dist[i][k] + dist[k][j] < dist[i][j]", "dist[i][j] < dist[i][k]", "k == j", "dist[i][j] is 0"], answer: 0, explanation: "Routing i→k→j may beat the current best i→j path." },
      { question: "A negative-weight cycle is revealed by…", options: ["A zero row", "A negative diagonal entry dist[i][i]", "An infinite cell", "A full matrix"], answer: 1, explanation: "If a vertex can reach itself with negative total cost, a negative cycle exists." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Directed weighted edges", placeholder: "A>B:3, B>C:2, A>C:8", help: "Format A>B:w; negative weights allowed (no negative cycles). Up to 12 nodes.", list: true },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const { nodes, edges } = parseDirectedWeighted(fields.edges ?? "");
    if (nodes.length > 12) throw new Error("Floyd-Warshall visualization is limited to 12 vertices.");
    return { nodes, edges };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}>${e.to}:${e.weight}`).join(", ") }),
  generate,
};

export default mod;
