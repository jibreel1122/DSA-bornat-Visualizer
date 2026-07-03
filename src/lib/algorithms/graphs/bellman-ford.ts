import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";

type WEdge = { from: string; to: string; weight: number };
type Input = { nodes: string[]; edges: WEdge[]; start: string };

/** Parse directed weighted edges "A>B:4, B>C:-2" (negative weights allowed). */
export function parseDirectedWeighted(text: string): { nodes: string[]; edges: WEdge[] } {
  const nodes = new Set<string>();
  const edges: WEdge[] = [];
  const parts = text.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one edge, e.g. A>B:4.");
  for (const part of parts) {
    const m = part.match(/^([A-Za-z0-9]+)\s*>\s*([A-Za-z0-9]+)\s*:\s*(-?\d+)$/);
    if (!m) throw new Error(`"${part}" is invalid. Use A>B:4 or A>B:-2 (directed, weight required).`);
    const [, from, to, w] = m;
    if (from === to) throw new Error(`Self-loop "${part}" not allowed.`);
    nodes.add(from);
    nodes.add(to);
    edges.push({ from, to, weight: Number(w) });
  }
  if (nodes.size > 12) throw new Error("Maximum 12 nodes.");
  return { nodes: [...nodes].sort(), edges };
}

const INF = Infinity;

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges, start } = input;
  const layout = circularLayout(nodes);
  const dist: Record<string, number> = {};
  const pred: Record<string, string | null> = {};
  nodes.forEach((n) => {
    dist[n] = INF;
    pred[n] = null;
  });
  dist[start] = 0;

  const steps: Step<GraphFrame>[] = [];
  let relaxations = 0;
  let updates = 0;

  const fmt = (d: number) => (d === INF ? "∞" : String(d));
  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((e) => ({ ...e })),
    weighted: true,
    directed: true,
  });
  const snap = (
    nodeStates: Record<string, CellState>,
    edgeStates: Record<string, CellState>,
    description: string,
    codeLine: number,
    pass: string,
  ): void => {
    steps.push({
      frame: {
        ...base(),
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        nodeAnnotations: Object.fromEntries(nodes.map((n) => [n, fmt(dist[n])])),
        aux: [{ label: "phase", values: [pass] }],
        note: `Bellman-Ford from ${start} — relax every edge V−1 times`,
      },
      description,
      codeLine,
      counters: { relaxations, updates },
    });
  };

  snap({ [start]: "active" }, {}, `Initialize: dist[${start}] = 0, all others ∞. We will relax every edge ${nodes.length - 1} times.`, 1, "init");

  const V = nodes.length;
  for (let i = 1; i < V; i++) {
    let changedThisPass = false;
    for (const e of edges) {
      relaxations++;
      const ek = `${e.from}->${e.to}`;
      const canRelax = dist[e.from] !== INF && dist[e.from] + e.weight < dist[e.to];
      if (canRelax) {
        dist[e.to] = dist[e.from] + e.weight;
        pred[e.to] = e.from;
        updates++;
        changedThisPass = true;
        snap(
          { [e.from]: "visited", [e.to]: "active" },
          { [ek]: "swap" },
          `Pass ${i}: relax ${e.from}→${e.to} (w=${e.weight}). dist[${e.to}] improved to ${dist[e.to]}.`,
          4,
          `pass ${i} / ${V - 1}`,
        );
      }
    }
    if (!changedThisPass) {
      snap({}, {}, `Pass ${i}: no distance changed — distances have converged early, we can stop.`, 5, `pass ${i} / ${V - 1}`);
      break;
    }
  }

  // Negative-cycle detection pass.
  let negative = false;
  let negEdge = "";
  for (const e of edges) {
    if (dist[e.from] !== INF && dist[e.from] + e.weight < dist[e.to]) {
      negative = true;
      negEdge = `${e.from}->${e.to}`;
      break;
    }
  }

  if (negative) {
    snap({}, { [negEdge]: "swap" }, `Extra pass still relaxes ${negEdge.replace("->", "→")}: a negative-weight cycle exists — no shortest paths.`, 7, "check");
  } else {
    const finalStates: Record<string, CellState> = {};
    const finalEdges: Record<string, CellState> = {};
    nodes.forEach((n) => (finalStates[n] = dist[n] === INF ? "discarded" : "found"));
    for (const n of nodes) if (pred[n]) finalEdges[`${pred[n]}->${n}`] = "sorted";
    finalStates[start] = "special";
    snap(finalStates, finalEdges, `Done. Shortest distances from ${start}: ${nodes.map((n) => `${n}=${fmt(dist[n])}`).join(", ")}.`, 8, "done");
  }
  return steps;
}

const TEMPLATES: { edges: string; start: string }[] = [
  { edges: "A>B:4, A>C:5, B>C:-3, C>D:4, B>D:6", start: "A" },
  { edges: "S>A:6, S>B:7, A>B:8, A>C:5, A>D:-4, B>C:-3, B>D:9, C>A:-2, D>C:7, D>S:2", start: "S" },
  { edges: "A>B:3, A>C:8, B>D:1, C>B:4, C>E:2, D>E:-5, A>D:9", start: "A" },
  { edges: "0>1:5, 0>2:4, 1>3:3, 2>1:-6, 3>2:-2, 2>4:7, 4>5:1, 3>5:6", start: "0" },
  { edges: "A>B:2, A>C:4, B>C:-1, B>D:7, C>E:3, D>E:-4, E>F:2, C>F:9, A>D:5", start: "A" },
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  const { nodes, edges } = parseDirectedWeighted(t.edges);
  return { nodes, edges, start: t.start };
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "bellman-ford",
  title: "Bellman-Ford Shortest Path",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["graph", "shortest path", "negative weights", "dynamic programming"],
  summary: "Finds shortest paths from a source even with negative edges by relaxing all edges V−1 times, and detects negative cycles.",
  renderer: "graph",
  pseudocode: [
    "procedure bellmanFord(V, edges, source)",
    "  dist[source] = 0; others = ∞",
    "  repeat V-1 times:",
    "    for each edge (u,v,w):",
    "      if dist[u] + w < dist[v]: dist[v] = dist[u] + w",
    "  // one more pass:",
    "  for each edge (u,v,w):",
    "    if dist[u] + w < dist[v]: report negative cycle",
    "  return dist",
  ],
  code: {
    pseudocode: `dist[source] = 0; others = INF
repeat V-1 times:
  for (u,v,w) in edges:
    if dist[u] + w < dist[v]: dist[v] = dist[u] + w
for (u,v,w): if dist[u]+w < dist[v]: NEGATIVE CYCLE
return dist`,
    c: `void bellmanFord(int V, int E, int (*edges)[3], int src, int* dist) {
    for (int i = 0; i < V; i++) dist[i] = INT_MAX;
    dist[src] = 0;
    for (int i = 1; i < V; i++)
        for (int j = 0; j < E; j++) {
            int u=edges[j][0], v=edges[j][1], w=edges[j][2];
            if (dist[u] != INT_MAX && dist[u] + w < dist[v])
                dist[v] = dist[u] + w;
        }
    // check negative cycle: another pass that still relaxes => cycle
}`,
    cpp: `vector<int> bellmanFord(int V, vector<array<int,3>>& edges, int src) {
    vector<int> dist(V, INT_MAX);
    dist[src] = 0;
    for (int i = 1; i < V; i++)
        for (auto& [u, v, w] : edges)
            if (dist[u] != INT_MAX && dist[u] + w < dist[v])
                dist[v] = dist[u] + w;
    for (auto& [u, v, w] : edges)
        if (dist[u] != INT_MAX && dist[u] + w < dist[v])
            throw runtime_error("negative cycle");
    return dist;
}`,
    java: `int[] bellmanFord(int V, int[][] edges, int src) {
    int[] dist = new int[V];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    for (int i = 1; i < V; i++)
        for (int[] e : edges) {
            int u=e[0], v=e[1], w=e[2];
            if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v])
                dist[v] = dist[u] + w;
        }
    for (int[] e : edges)
        if (dist[e[0]] != Integer.MAX_VALUE && dist[e[0]] + e[2] < dist[e[1]])
            throw new RuntimeException("negative cycle");
    return dist;
}`,
    python: `def bellman_ford(V, edges, src):
    dist = [float('inf')] * V
    dist[src] = 0
    for _ in range(V - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] + w < dist[v]:
            raise ValueError("negative cycle")
    return dist`,
    javascript: `function bellmanFord(V, edges, src) {
  const dist = new Array(V).fill(Infinity);
  dist[src] = 0;
  for (let i = 1; i < V; i++)
    for (const [u, v, w] of edges)
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  for (const [u, v, w] of edges)
    if (dist[u] + w < dist[v]) throw new Error("negative cycle");
  return dist;
}`,
    typescript: `function bellmanFord(V: number, edges: [number, number, number][], src: number): number[] {
  const dist = new Array(V).fill(Infinity);
  dist[src] = 0;
  for (let i = 1; i < V; i++)
    for (const [u, v, w] of edges)
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  for (const [u, v, w] of edges)
    if (dist[u] + w < dist[v]) throw new Error("negative cycle");
  return dist;
}`,
    csharp: `int[] BellmanFord(int V, int[][] edges, int src) {
    var dist = new int[V];
    Array.Fill(dist, int.MaxValue);
    dist[src] = 0;
    for (int i = 1; i < V; i++)
        foreach (var e in edges)
            if (dist[e[0]] != int.MaxValue && dist[e[0]] + e[2] < dist[e[1]])
                dist[e[1]] = dist[e[0]] + e[2];
    return dist;
}`,
    go: `func bellmanFord(V int, edges [][3]int, src int) []int {
	dist := make([]int, V)
	for i := range dist { dist[i] = math.MaxInt32 }
	dist[src] = 0
	for i := 1; i < V; i++ {
		for _, e := range edges {
			u, v, w := e[0], e[1], e[2]
			if dist[u] != math.MaxInt32 && dist[u]+w < dist[v] {
				dist[v] = dist[u] + w
			}
		}
	}
	return dist
}`,
    rust: `fn bellman_ford(v: usize, edges: &[(usize, usize, i32)], src: usize) -> Option<Vec<i32>> {
    let inf = i32::MAX;
    let mut dist = vec![inf; v];
    dist[src] = 0;
    for _ in 1..v {
        for &(u, w_v, w) in edges {
            if dist[u] != inf && dist[u] + w < dist[w_v] {
                dist[w_v] = dist[u] + w;
            }
        }
    }
    for &(u, w_v, w) in edges {
        if dist[u] != inf && dist[u] + w < dist[w_v] { return None; } // neg cycle
    }
    Some(dist)
}`,
    kotlin: `fun bellmanFord(V: Int, edges: Array<IntArray>, src: Int): IntArray {
    val dist = IntArray(V) { Int.MAX_VALUE }
    dist[src] = 0
    for (i in 1 until V)
        for (e in edges) {
            val (u, v, w) = Triple(e[0], e[1], e[2])
            if (dist[u] != Int.MAX_VALUE && dist[u] + w < dist[v])
                dist[v] = dist[u] + w
        }
    return dist
}`,
    swift: `func bellmanFord(_ V: Int, _ edges: [(Int, Int, Int)], _ src: Int) -> [Int] {
    var dist = Array(repeating: Int.max, count: V)
    dist[src] = 0
    for _ in 1..<V {
        for (u, v, w) in edges where dist[u] != Int.max && dist[u] + w < dist[v] {
            dist[v] = dist[u] + w
        }
    }
    return dist
}`,
  },
  content: {
    overview: `The Bellman-Ford algorithm computes shortest paths from a single source to every other vertex in a weighted, directed graph — and unlike Dijkstra's algorithm, it works correctly even when some edges have negative weights. Its other superpower is detecting negative-weight cycles: if you can keep making paths cheaper forever, no shortest path is well-defined, and Bellman-Ford will tell you.

The idea is repeated edge relaxation. A relaxation asks: "is going through edge (u, v) cheaper than the best route to v found so far?" If dist[u] + weight < dist[v], we lower dist[v]. Bellman-Ford simply relaxes every edge in the graph, and repeats that whole sweep V−1 times (where V is the number of vertices). Since any shortest path has at most V−1 edges, V−1 passes are enough for the distances to settle. A final V-th pass that still improves some distance proves a negative cycle exists.`,
    howItWorks: [
      "Set dist[source] = 0 and every other distance to infinity.",
      "Relax all edges: for each edge (u, v, w), if dist[u] + w < dist[v], update dist[v].",
      "Repeat the full edge sweep V−1 times (a shortest path uses at most V−1 edges).",
      "If a pass makes no change, distances have converged and you can stop early.",
      "Run one more pass; if any edge still relaxes, a negative-weight cycle is reachable.",
    ],
    complexity: {
      time: { best: "O(V·E)", average: "O(V·E)", worst: "O(V·E)" },
      space: "O(V)",
      notes: "V−1 passes over all E edges give O(V·E). Slower than Dijkstra's O(E log V), but it handles negative weights and detects negative cycles. Early termination when a pass makes no change helps in practice.",
    },
    applications: [
      "shortest paths in graphs with negative edge weights",
      "currency arbitrage detection (negative cycle in log-rates)",
      "distance-vector routing protocols (RIP)",
      "as a subroutine in Johnson's all-pairs shortest-path algorithm",
    ],
    advantages: [
      "Handles negative edge weights correctly",
      "Detects negative-weight cycles",
      "Simple, edge-list based — no priority queue",
      "Works on directed graphs and is easy to distribute",
    ],
    disadvantages: [
      "O(V·E) is slower than Dijkstra for non-negative weights",
      "Cannot produce finite answers when a negative cycle is reachable",
      "Many redundant relaxations without optimizations (e.g. SPFA)",
    ],
    commonMistakes: [
      "Skipping the source initialization (dist[source] = 0).",
      "Relaxing from a vertex whose distance is still infinity (integer overflow).",
      "Running only V−2 passes, missing the longest shortest paths.",
      "Forgetting the extra pass needed to detect negative cycles.",
    ],
    interviewQuestions: [
      "Why exactly V−1 passes, and when can you stop earlier?",
      "How does Bellman-Ford detect a negative-weight cycle?",
      "Why can't Dijkstra's algorithm handle negative edges?",
      "How is Bellman-Ford used inside Johnson's algorithm?",
      "How would you recover the actual shortest path, not just the distances?",
    ],
    summary:
      "Bellman-Ford finds single-source shortest paths in O(V·E) by relaxing every edge V−1 times; it tolerates negative edges and, via one extra pass, detects negative cycles. It is slower than Dijkstra but strictly more general.",
    quiz: [
      { question: "Bellman-Ford's key advantage over Dijkstra is…", options: ["It is faster", "It handles negative edge weights", "It uses less memory", "It needs no source"], answer: 1, explanation: "It correctly processes negative weights, which Dijkstra cannot." },
      { question: "How many full edge-relaxation passes are needed?", options: ["V", "V − 1", "E", "log V"], answer: 1, explanation: "A shortest path has at most V−1 edges, so V−1 passes suffice." },
      { question: "The time complexity is…", options: ["O(E log V)", "O(V·E)", "O(V²)", "O(V + E)"], answer: 1, explanation: "V−1 passes over E edges give O(V·E)." },
      { question: "A negative cycle is detected when…", options: ["Any distance is negative", "An extra pass still relaxes an edge", "The graph is disconnected", "Two nodes share a distance"], answer: 1, explanation: "If improvement continues after V−1 passes, a negative cycle exists." },
      { question: "Relaxing edge (u,v,w) updates dist[v] when…", options: ["dist[u] + w < dist[v]", "dist[v] + w < dist[u]", "w < 0", "always"], answer: 0, explanation: "You keep the cheaper route to v through u." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Directed weighted edges", placeholder: "A>B:4, B>C:-3, C>D:4", help: "Format A>B:w; negative weights allowed. Up to 12 nodes." },
    { key: "start", label: "Source vertex", placeholder: "A", help: "Must be one of the vertices." },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const { nodes, edges } = parseDirectedWeighted(fields.edges ?? "");
    const start = (fields.start ?? "").trim();
    if (!start) throw new Error("Enter a source vertex.");
    if (!nodes.includes(start)) throw new Error(`Source "${start}" is not among the vertices (${nodes.join(", ")}).`);
    return { nodes, edges, start };
  },
  serializeInput: (input) => ({
    edges: input.edges.map((e) => `${e.from}>${e.to}:${e.weight}`).join(", "),
    start: input.start,
  }),
  generate,
};

export default mod;
