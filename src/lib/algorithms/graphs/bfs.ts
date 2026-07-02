import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { randomGraph, circularLayout } from "@/lib/engine/random";

type Input = {
  nodes: string[];
  edges: { from: string; to: string }[];
  start: string;
};

/** Parse an undirected edge list like "A-B, B-C, A-C". */
export function parseEdgeList(text: string): { nodes: string[]; edges: { from: string; to: string }[] } {
  const nodes = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  const parts = text
    .split(/[,\n;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one edge, e.g. A-B, B-C.");
  for (const part of parts) {
    const m = part.match(/^([A-Za-z0-9]+)\s*[->–]\s*([A-Za-z0-9]+)$/);
    if (!m) throw new Error(`"${part}" is not a valid edge. Use the form A-B.`);
    const [, from, to] = m;
    if (from === to) throw new Error(`Self-loop "${part}" is not allowed here.`);
    nodes.add(from);
    nodes.add(to);
    edges.push({ from, to });
  }
  if (nodes.size > 26) throw new Error("Maximum 26 nodes.");
  return { nodes: [...nodes].sort(), edges };
}

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges, start } = input;
  const layout = circularLayout(nodes);
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    adj.get(e.from)!.push(e.to);
    adj.get(e.to)!.push(e.from);
  }
  for (const list of adj.values()) list.sort();

  const steps: Step<GraphFrame>[] = [];
  let visitedCount = 0;
  let enqueues = 0;

  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((e) => ({ ...e })),
    directed: false,
  });

  const snap = (
    nodeStates: Record<string, CellState>,
    edgeStates: Record<string, CellState>,
    queue: string[],
    order: string[],
    description: string,
    codeLine: number,
  ) => {
    steps.push({
      frame: {
        ...base(),
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        aux: [
          { label: "Queue", values: [...queue] },
          { label: "Visited", values: [...order] },
        ],
      },
      description,
      codeLine,
      counters: { visited: visitedCount, enqueued: enqueues },
    });
  };

  const nodeStates: Record<string, CellState> = {};
  const edgeStates: Record<string, CellState> = {};
  const queue: string[] = [];
  const order: string[] = [];
  const seen = new Set<string>();

  snap(nodeStates, edgeStates, queue, order, `Breadth-first search from node ${start}.`, 0);

  seen.add(start);
  queue.push(start);
  enqueues++;
  nodeStates[start] = "active";
  snap(nodeStates, edgeStates, queue, order, `Mark ${start} as discovered and enqueue it.`, 1);

  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    visitedCount++;
    nodeStates[u] = "compare";
    snap(nodeStates, edgeStates, queue, order, `Dequeue ${u} and visit it.`, 3);

    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
        enqueues++;
        nodeStates[v] = "active";
        edgeStates[`${u}->${v}`] = "sorted";
        snap(
          nodeStates,
          edgeStates,
          queue,
          order,
          `${v} is undiscovered — mark it, record tree edge ${u}–${v}, enqueue it.`,
          5,
        );
      }
    }
    nodeStates[u] = "visited";
    snap(nodeStates, edgeStates, queue, order, `All neighbors of ${u} processed.`, 6);
  }

  const unreached = nodes.filter((n) => !seen.has(n));
  snap(
    nodeStates,
    edgeStates,
    queue,
    order,
    unreached.length > 0
      ? `BFS complete. Order: ${order.join(" → ")}. Unreachable: ${unreached.join(", ")}.`
      : `BFS complete. Visit order: ${order.join(" → ")}.`,
    7,
  );
  return steps;
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "bfs",
  title: "Breadth-First Search (BFS)",
  category: "graphs",
  difficulty: "Beginner",
  tags: ["traversal", "queue", "shortest path (unweighted)", "level order"],
  summary: "Explores a graph level by level from a source using a queue — the basis of unweighted shortest paths.",
  renderer: "graph",

  pseudocode: [
    "procedure BFS(G, start)",
    "  mark start discovered; enqueue(start)",
    "  while queue not empty",
    "    u = dequeue()  // visit u",
    "    for each neighbor v of u",
    "      if v undiscovered: mark v; record edge u–v; enqueue(v)",
    "    // u fully processed",
    "  return visit order",
  ],

  code: {
    pseudocode: `procedure BFS(G, start)
  mark start discovered
  enqueue(start)
  while queue not empty
    u = dequeue()          // visit u
    for each neighbor v of u
      if v undiscovered
        mark v discovered
        enqueue(v)
  return visit order`,
    c: `#include <stdbool.h>
#include <string.h>

#define MAXN 100

/* adjacency matrix BFS */
void bfs(int n, bool adj[MAXN][MAXN], int start, int order[], int *count) {
    bool seen[MAXN] = { false };
    int queue[MAXN], head = 0, tail = 0;
    seen[start] = true;
    queue[tail++] = start;
    *count = 0;
    while (head < tail) {
        int u = queue[head++];
        order[(*count)++] = u;
        for (int v = 0; v < n; v++) {
            if (adj[u][v] && !seen[v]) {
                seen[v] = true;
                queue[tail++] = v;
            }
        }
    }
}`,
    cpp: `#include <vector>
#include <queue>

std::vector<int> bfs(const std::vector<std::vector<int>>& adj, int start) {
    std::vector<bool> seen(adj.size(), false);
    std::vector<int> order;
    std::queue<int> q;
    seen[start] = true;
    q.push(start);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : adj[u]) {
            if (!seen[v]) {
                seen[v] = true;
                q.push(v);
            }
        }
    }
    return order;
}`,
    java: `import java.util.*;

public class Graph {
    public static List<Integer> bfs(List<List<Integer>> adj, int start) {
        boolean[] seen = new boolean[adj.size()];
        List<Integer> order = new ArrayList<>();
        Deque<Integer> queue = new ArrayDeque<>();
        seen[start] = true;
        queue.add(start);
        while (!queue.isEmpty()) {
            int u = queue.poll();
            order.add(u);
            for (int v : adj.get(u)) {
                if (!seen[v]) {
                    seen[v] = true;
                    queue.add(v);
                }
            }
        }
        return order;
    }
}`,
    python: `from collections import deque

def bfs(adj: dict[str, list[str]], start: str) -> list[str]:
    seen = {start}
    order = []
    queue = deque([start])
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj.get(u, []):
            if v not in seen:
                seen.add(v)
                queue.append(v)
    return order`,
    javascript: `function bfs(adj, start) {
  const seen = new Set([start]);
  const order = [];
  const queue = [start];
  while (queue.length > 0) {
    const u = queue.shift();
    order.push(u);
    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  }
  return order;
}`,
    typescript: `function bfs(adj: Map<string, string[]>, start: string): string[] {
  const seen = new Set<string>([start]);
  const order: string[] = [];
  const queue: string[] = [start];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  }
  return order;
}`,
    csharp: `using System.Collections.Generic;

public static class Graph {
    public static List<int> Bfs(List<List<int>> adj, int start) {
        var seen = new bool[adj.Count];
        var order = new List<int>();
        var queue = new Queue<int>();
        seen[start] = true;
        queue.Enqueue(start);
        while (queue.Count > 0) {
            int u = queue.Dequeue();
            order.Add(u);
            foreach (int v in adj[u]) {
                if (!seen[v]) {
                    seen[v] = true;
                    queue.Enqueue(v);
                }
            }
        }
        return order;
    }
}`,
    go: `func bfs(adj map[string][]string, start string) []string {
	seen := map[string]bool{start: true}
	order := []string{}
	queue := []string{start}
	for len(queue) > 0 {
		u := queue[0]
		queue = queue[1:]
		order = append(order, u)
		for _, v := range adj[u] {
			if !seen[v] {
				seen[v] = true
				queue = append(queue, v)
			}
		}
	}
	return order
}`,
    rust: `use std::collections::{HashMap, HashSet, VecDeque};

fn bfs(adj: &HashMap<char, Vec<char>>, start: char) -> Vec<char> {
    let mut seen: HashSet<char> = HashSet::from([start]);
    let mut order = Vec::new();
    let mut queue = VecDeque::from([start]);
    while let Some(u) = queue.pop_front() {
        order.push(u);
        if let Some(neighbors) = adj.get(&u) {
            for &v in neighbors {
                if seen.insert(v) {
                    queue.push_back(v);
                }
            }
        }
    }
    order
}`,
    kotlin: `fun bfs(adj: Map<String, List<String>>, start: String): List<String> {
    val seen = mutableSetOf(start)
    val order = mutableListOf<String>()
    val queue = ArrayDeque(listOf(start))
    while (queue.isNotEmpty()) {
        val u = queue.removeFirst()
        order.add(u)
        for (v in adj[u].orEmpty()) {
            if (seen.add(v)) queue.addLast(v)
        }
    }
    return order
}`,
    swift: `func bfs(_ adj: [String: [String]], start: String) -> [String] {
    var seen: Set<String> = [start]
    var order: [String] = []
    var queue: [String] = [start]
    var head = 0
    while head < queue.count {
        let u = queue[head]; head += 1
        order.append(u)
        for v in adj[u, default: []] where !seen.contains(v) {
            seen.insert(v)
            queue.append(v)
        }
    }
    return order
}`,
  },

  content: {
    overview: `Breadth-first search explores a graph outward from a source in concentric "rings": first the source, then everything one edge away, then two edges away, and so on. A FIFO queue enforces this order — nodes discovered earlier are visited earlier.

Because it visits nodes in increasing distance order, BFS computes shortest paths in unweighted graphs for free: the first time a node is discovered, the path taken to it uses the fewest possible edges. The set of discovery edges forms the BFS tree.`,
    howItWorks: [
      "Mark the source as discovered and put it in a FIFO queue.",
      "Repeatedly dequeue the front node u — this is the next node to visit.",
      "Scan every neighbor v of u: any undiscovered neighbor is marked, its discovery edge recorded, and it joins the back of the queue.",
      "Because the queue is first-in-first-out, all nodes at distance d are visited before any node at distance d+1.",
      "Stop when the queue is empty; nodes never discovered are unreachable from the source.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "Every vertex enters the queue at most once and every edge is scanned at most twice (once per endpoint) in an undirected graph.",
    },
    applications: [
      "Shortest paths in unweighted graphs (fewest hops)",
      "Level-order traversal of trees",
      "Connected components and bipartiteness testing",
      "Web crawlers and social-network friend-of-friend queries",
      "Flood fill in image editing; maze solving with uniform step cost",
      "Building block of Edmonds-Karp max-flow and Hopcroft-Karp matching",
    ],
    advantages: [
      "Guarantees minimum-edge paths in unweighted graphs",
      "Linear time O(V + E) — optimal for full traversal",
      "Never gets trapped in deep branches (unlike DFS on infinite/huge graphs)",
      "Naturally produces distance layers useful in many derived algorithms",
    ],
    disadvantages: [
      "Queue can hold an entire level — O(V) memory, much more than DFS needs on shallow-branching graphs",
      "Does not handle weighted shortest paths (use Dijkstra instead)",
      "Less natural for problems needing exhaustive path exploration (backtracking favors DFS)",
    ],
    commonMistakes: [
      "Marking nodes as discovered when dequeued instead of when enqueued — the same node can then be enqueued many times.",
      "Using a stack (or recursion) by habit, which silently turns BFS into DFS.",
      "Forgetting to handle disconnected graphs when full coverage is required (loop BFS over all unvisited nodes).",
      "Assuming BFS gives shortest paths on weighted graphs — it only counts edges, not weights.",
    ],
    interviewQuestions: [
      "Why does BFS find shortest paths in unweighted graphs? Sketch the proof by induction on distance.",
      "How would you reconstruct the actual shortest path, not just its length?",
      "Compare the memory profiles of BFS and DFS — when is each preferable?",
      "How do you detect whether an undirected graph is bipartite using BFS?",
      "What changes to BFS produce 0-1 BFS for graphs with edge weights 0 and 1?",
    ],
    summary:
      "BFS visits nodes level by level using a FIFO queue, running in O(V + E) with O(V) space. Discovery order equals distance order, which makes it the canonical unweighted shortest-path algorithm and a building block for flows, matchings, and connectivity checks.",
    quiz: [
      {
        question: "Which data structure gives BFS its level-by-level visiting order?",
        options: ["Stack (LIFO)", "Queue (FIFO)", "Priority queue", "Hash set"],
        answer: 1,
        explanation: "FIFO order means earlier-discovered (closer) nodes are visited before later-discovered (farther) ones.",
      },
      {
        question: "When must a node be marked as discovered to keep BFS correct and efficient?",
        options: ["When it is dequeued", "When it is enqueued", "After all its neighbors are scanned", "It doesn't matter"],
        answer: 1,
        explanation: "Marking on enqueue prevents the same node from being added to the queue multiple times via different neighbors.",
      },
      {
        question: "What is the time complexity of BFS with an adjacency list?",
        options: ["O(V²)", "O(E log V)", "O(V + E)", "O(V·E)"],
        answer: 2,
        explanation: "Each vertex is enqueued once and each adjacency list is scanned once.",
      },
      {
        question: "BFS from node S reaches node T after dequeuing it at depth 4. What does 4 represent?",
        options: [
          "The number of nodes visited before T",
          "The minimum number of edges on any S→T path",
          "The weighted distance from S to T",
          "The degree of T",
        ],
        answer: 1,
        explanation: "BFS discovers nodes in increasing edge-distance order, so depth equals the fewest edges needed.",
      },
      {
        question: "Which algorithm generalizes BFS to non-negative weighted graphs?",
        options: ["DFS", "Kruskal", "Dijkstra", "Topological sort"],
        answer: 2,
        explanation: "Dijkstra replaces the FIFO queue with a priority queue keyed by tentative distance.",
      },
    ],
  },

  inputFields: [
    {
      key: "edges",
      label: "Edges (undirected)",
      placeholder: "A-B, A-C, B-D, C-D, D-E",
      help: "Comma-separated pairs like A-B. Up to 26 nodes.",
    },
    { key: "start", label: "Start node", placeholder: "A" },
  ],
  defaultInput: (level, rng) => {
    const g = randomGraph(level, rng);
    return {
      nodes: g.nodes.map((n) => n.id),
      edges: g.edges.map((e) => ({ from: e.from, to: e.to })),
      start: g.nodes[0].id,
    };
  },
  parseInput: (fields) => {
    const { nodes, edges } = parseEdgeList(fields.edges ?? "");
    const start = (fields.start ?? "").trim();
    if (!start) throw new Error("Enter a start node.");
    if (!nodes.includes(start)) throw new Error(`Start node "${start}" does not appear in the edge list.`);
    return { nodes, edges, start };
  },
  serializeInput: (input) => ({
    edges: input.edges.map((e) => `${e.from}-${e.to}`).join(", "),
    start: input.start,
  }),
  generate,
};

export default mod;
