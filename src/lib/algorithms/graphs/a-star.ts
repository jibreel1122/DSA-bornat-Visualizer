import type { AlgorithmModule, CellState, GridFrame, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { grid: number[][] };

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function generate(input: Input): Step<GridFrame>[] {
  const g = input.grid;
  const n = g.length;
  const m = g[0].length;
  const goal: [number, number] = [n - 1, m - 1];
  const steps: Step<GridFrame>[] = [];
  let expansions = 0;
  let truncated = false;

  const key = (r: number, c: number) => r * m + c;
  const h = (r: number, c: number) => Math.abs(r - goal[0]) + Math.abs(c - goal[1]); // Manhattan

  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();
  const open = new Set<number>();
  const closed = new Set<number>();

  const frame = (cur: [number, number] | null, path: Set<number>, description: string, codeLine: number): void => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    const cells: GridFrame["cells"] = [];
    for (let r = 0; r < n; r++) {
      const row: GridFrame["cells"][0] = [];
      for (let c = 0; c < m; c++) {
        const k = key(r, c);
        let state: CellState | undefined;
        let value = "";
        if (g[r][c] === 0) {
          state = "discarded";
          value = "█";
        } else if (path.has(k)) {
          state = "sorted";
          value = "●";
        } else if (closed.has(k)) {
          state = "visited";
          value = String(fScore.get(k) ?? "");
        } else if (open.has(k)) {
          state = "active";
          value = String(fScore.get(k) ?? "");
        }
        if (cur && cur[0] === r && cur[1] === c) {
          state = "swap";
          value = String(fScore.get(k) ?? "") || value;
        }
        if (r === 0 && c === 0) value = "S";
        if (r === goal[0] && c === goal[1] && !path.has(k)) value = value && value !== "█" ? value : "G";
        row.push({ value, state });
      }
      cells.push(row);
    }
    steps.push({
      frame: { rows: n, cols: m, cells, note: `A* — cell shows f = g + h (Manhattan). Open = frontier, closed = settled.` },
      description,
      codeLine,
      counters: { expansions, open: open.size },
    });
  };

  const start = key(0, 0);
  gScore.set(start, 0);
  fScore.set(start, h(0, 0));
  open.add(start);
  frame([0, 0], new Set(), `A* search from S (top-left) to G (bottom-right). f(n) = g(n) [steps so far] + h(n) [Manhattan estimate to goal].`, 0);

  while (open.size > 0) {
    // pick node in open with lowest f (tie: lowest h)
    let cur = -1;
    let best = Infinity;
    for (const k of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < best) {
        best = f;
        cur = k;
      }
    }
    const cr = Math.floor(cur / m);
    const cc = cur % m;

    if (cur === key(goal[0], goal[1])) {
      // reconstruct path
      const path = new Set<number>();
      let k: number | undefined = cur;
      while (k !== undefined) {
        path.add(k);
        k = cameFrom.get(k);
      }
      frame([cr, cc], path, `Reached the goal! Path length ${path.size - 1}. A* found the optimal route (highlighted).`, 6);
      return steps;
    }

    open.delete(cur);
    closed.add(cur);
    expansions++;
    frame([cr, cc], new Set(), `Expand the lowest-f open cell (${cr}, ${cc}), f=${fScore.get(cur)}. Move it to the closed set.`, 3);

    for (const [dr, dc] of DIRS) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= n || nc < 0 || nc >= m || g[nr][nc] === 0) continue;
      const nk = key(nr, nc);
      if (closed.has(nk)) continue;
      const tentative = (gScore.get(cur) ?? Infinity) + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, cur);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + h(nr, nc));
        if (!open.has(nk)) open.add(nk);
      }
    }
    frame([cr, cc], new Set(), `Relax neighbors: update g/f and add improved cells to the open set.`, 4);
    if (truncated) break;
  }

  if (!truncated) frame(null, new Set(), `Open set exhausted — no path from S to G exists in this grid.`, 6);
  return steps;
}

const TEMPLATES: string[][] = [
  ["1111", "1011", "1101", "1111"],
  ["11111", "10101", "10101", "10101", "11111"],
  ["111111", "110011", "010110", "011010", "110011", "111111"],
  ["1111111", "1010001", "1011101", "1000101", "1110101", "1010001", "1111111"],
  ["1101111", "1001001", "1111011", "0010010", "1110111", "1000001", "1111101"],
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  return { grid: t.map((row) => row.split("").map(Number)) };
}

const mod: AlgorithmModule<GridFrame, Input> = {
  slug: "a-star",
  title: "A* Pathfinding",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["graph", "shortest path", "heuristic", "informed search"],
  summary: "Finds the shortest path on a grid by expanding the cell that minimizes f = g + h, guided by an admissible heuristic.",
  renderer: "grid",
  pseudocode: [
    "procedure aStar(start, goal)",
    "  open = {start};  g[start] = 0;  f[start] = h(start)",
    "  while open not empty:",
    "    current = node in open with lowest f",
    "    if current == goal: reconstruct path",
    "    move current from open to closed",
    "    for each neighbor: relax g; f = g + h; add to open",
    "  return failure",
  ],
  code: {
    pseudocode: `open = {start}; g[start]=0; f[start]=h(start)
while open not empty:
  current = argmin f in open
  if current == goal: return reconstruct()
  close(current)
  for nb: tentative = g[current]+1
    if tentative < g[nb]: g[nb]=tentative; f[nb]=tentative+h(nb); open.add(nb)`,
    c: `// Grid A*; open set as a priority queue keyed by f = g + h
int heuristic(int r,int c,int gr,int gc){ return abs(r-gr)+abs(c-gc); }
// pop lowest-f, expand 4 neighbors, relax g, push improved; stop at goal`,
    cpp: `int aStar(Grid& grid, Cell s, Cell goal) {
    priority_queue<pair<int,Cell>, vector<pair<int,Cell>>, greater<>> open;
    map<Cell,int> g; g[s] = 0;
    open.push({h(s, goal), s});
    while (!open.empty()) {
        auto [f, cur] = open.top(); open.pop();
        if (cur == goal) return g[cur];
        for (Cell nb : neighbors(grid, cur)) {
            int t = g[cur] + 1;
            if (!g.count(nb) || t < g[nb]) {
                g[nb] = t;
                open.push({t + h(nb, goal), nb});
            }
        }
    }
    return -1;
}`,
    java: `int aStar(int[][] grid, int[] s, int[] goal) {
    PriorityQueue<int[]> open = new PriorityQueue<>((a, b) -> a[0] - b[0]); // {f, r, c}
    int[][] g = new int[grid.length][grid[0].length];
    for (int[] row : g) Arrays.fill(row, Integer.MAX_VALUE);
    g[s[0]][s[1]] = 0;
    open.add(new int[]{h(s, goal), s[0], s[1]});
    while (!open.isEmpty()) {
        int[] cur = open.poll();
        if (cur[1] == goal[0] && cur[2] == goal[1]) return g[goal[0]][goal[1]];
        for (int[] nb : neighbors(grid, cur[1], cur[2])) {
            int t = g[cur[1]][cur[2]] + 1;
            if (t < g[nb[0]][nb[1]]) {
                g[nb[0]][nb[1]] = t;
                open.add(new int[]{t + h(nb, goal), nb[0], nb[1]});
            }
        }
    }
    return -1;
}`,
    python: `import heapq
def a_star(grid, start, goal):
    def h(a, b): return abs(a[0]-b[0]) + abs(a[1]-b[1])
    open_pq = [(h(start, goal), start)]
    g = {start: 0}
    while open_pq:
        _, cur = heapq.heappop(open_pq)
        if cur == goal:
            return g[cur]
        for nb in neighbors(grid, cur):
            t = g[cur] + 1
            if t < g.get(nb, float('inf')):
                g[nb] = t
                heapq.heappush(open_pq, (t + h(nb, goal), nb))
    return -1`,
    javascript: `function aStar(grid, start, goal) {
  const h = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);
  const open = new MinHeap((x) => x.f);
  const g = new Map([[key(start), 0]]);
  open.push({ f: h(start, goal), cell: start });
  while (!open.empty()) {
    const { cell: cur } = open.pop();
    if (eq(cur, goal)) return g.get(key(cur));
    for (const nb of neighbors(grid, cur)) {
      const t = g.get(key(cur)) + 1;
      if (t < (g.get(key(nb)) ?? Infinity)) {
        g.set(key(nb), t);
        open.push({ f: t + h(nb, goal), cell: nb });
      }
    }
  }
  return -1;
}`,
    typescript: `function aStar(grid: number[][], start: Cell, goal: Cell): number {
  const h = (a: Cell, b: Cell) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);
  const open = new MinHeap<{ f: number; cell: Cell }>((x) => x.f);
  const g = new Map<number, number>([[key(start), 0]]);
  open.push({ f: h(start, goal), cell: start });
  while (!open.empty()) {
    const { cell: cur } = open.pop()!;
    if (eq(cur, goal)) return g.get(key(cur))!;
    for (const nb of neighbors(grid, cur)) {
      const t = g.get(key(cur))! + 1;
      if (t < (g.get(key(nb)) ?? Infinity)) {
        g.set(key(nb), t);
        open.push({ f: t + h(nb, goal), cell: nb });
      }
    }
  }
  return -1;
}`,
    csharp: `int AStar(int[,] grid, (int,int) s, (int,int) goal) {
    var open = new PriorityQueue<(int,int), int>();
    var g = new Dictionary<(int,int), int> { [s] = 0 };
    open.Enqueue(s, H(s, goal));
    while (open.Count > 0) {
        var cur = open.Dequeue();
        if (cur == goal) return g[cur];
        foreach (var nb in Neighbors(grid, cur)) {
            int t = g[cur] + 1;
            if (!g.ContainsKey(nb) || t < g[nb]) {
                g[nb] = t;
                open.Enqueue(nb, t + H(nb, goal));
            }
        }
    }
    return -1;
}`,
    go: `func aStar(grid [][]int, start, goal Cell) int {
	open := &PQ{}
	heap.Push(open, Item{f: h(start, goal), cell: start})
	g := map[Cell]int{start: 0}
	for open.Len() > 0 {
		cur := heap.Pop(open).(Item).cell
		if cur == goal { return g[cur] }
		for _, nb := range neighbors(grid, cur) {
			t := g[cur] + 1
			if old, ok := g[nb]; !ok || t < old {
				g[nb] = t
				heap.Push(open, Item{f: t + h(nb, goal), cell: nb})
			}
		}
	}
	return -1
}`,
    rust: `use std::collections::BinaryHeap;
use std::cmp::Reverse;
fn a_star(grid: &Vec<Vec<i32>>, start: Cell, goal: Cell) -> i32 {
    let mut open = BinaryHeap::new();
    let mut g = std::collections::HashMap::new();
    g.insert(start, 0);
    open.push(Reverse((h(start, goal), start)));
    while let Some(Reverse((_, cur))) = open.pop() {
        if cur == goal { return g[&cur]; }
        for nb in neighbors(grid, cur) {
            let t = g[&cur] + 1;
            if t < *g.get(&nb).unwrap_or(&i32::MAX) {
                g.insert(nb, t);
                open.push(Reverse((t + h(nb, goal), nb)));
            }
        }
    }
    -1
}`,
    kotlin: `fun aStar(grid: Array<IntArray>, start: Cell, goal: Cell): Int {
    val open = PriorityQueue<Pair<Int, Cell>>(compareBy { it.first })
    val g = hashMapOf(start to 0)
    open.add(h(start, goal) to start)
    while (open.isNotEmpty()) {
        val cur = open.poll().second
        if (cur == goal) return g[cur]!!
        for (nb in neighbors(grid, cur)) {
            val t = g[cur]!! + 1
            if (t < (g[nb] ?: Int.MAX_VALUE)) {
                g[nb] = t
                open.add((t + h(nb, goal)) to nb)
            }
        }
    }
    return -1
}`,
    swift: `func aStar(_ grid: [[Int]], _ start: Cell, _ goal: Cell) -> Int {
    var open = Heap<(f: Int, cell: Cell)> { $0.f < $1.f }
    var g = [start: 0]
    open.insert((h(start, goal), start))
    while let cur = open.removeMin()?.cell {
        if cur == goal { return g[cur]! }
        for nb in neighbors(grid, cur) {
            let t = g[cur]! + 1
            if t < (g[nb] ?? Int.max) {
                g[nb] = t
                open.insert((t + h(nb, goal), nb))
            }
        }
    }
    return -1
}`,
  },
  content: {
    overview: `A* ("A-star") is the most widely used pathfinding algorithm in games, robotics, and mapping. It finds the shortest path from a start to a goal by combining the strengths of Dijkstra's algorithm (which guarantees optimality) and greedy best-first search (which is fast because it heads straight for the goal). The trick is a single evaluation function: f(n) = g(n) + h(n), where g(n) is the actual cost from the start to node n, and h(n) is a heuristic estimate of the remaining cost from n to the goal.

At each step A* expands the open-set node with the smallest f-value — the one that looks most promising overall. If the heuristic is admissible (it never overestimates the true remaining distance), A* is guaranteed to return an optimal shortest path; if it is also consistent, no node is ever expanded twice. On a grid, the Manhattan distance is a classic admissible heuristic. A good heuristic lets A* explore far fewer cells than Dijkstra by focusing the search toward the goal, while a heuristic of zero degrades A* back into Dijkstra's algorithm.`,
    howItWorks: [
      "Put the start in the open set with g = 0 and f = h(start).",
      "Repeatedly pick the open node with the lowest f = g + h.",
      "If it is the goal, reconstruct the path via stored parent links.",
      "Otherwise move it to the closed set and relax each neighbor: tentative g = g(current) + edge cost.",
      "If that improves a neighbor's g, update g and f and (re)insert it into the open set.",
    ],
    complexity: {
      time: { best: "O(E) with a perfect heuristic", average: "depends on heuristic", worst: "O(E log V)" },
      space: "O(V)",
      notes: "With a priority queue, each expansion is O(log V). The number of expansions depends heavily on the heuristic: a perfect h explores only the path; h = 0 makes A* equal to Dijkstra. Memory is the main practical limit (all frontier nodes are stored).",
    },
    applications: [
      "game and robot navigation / pathfinding",
      "GPS route planning on road networks",
      "puzzle solving (15-puzzle, sliding tiles) with good heuristics",
      "motion planning and network routing",
    ],
    advantages: [
      "Optimal path when the heuristic is admissible",
      "Much faster than Dijkstra with a good heuristic",
      "Flexible — the heuristic tunes the speed/quality trade-off",
      "Widely supported and well understood",
    ],
    disadvantages: [
      "Stores all frontier nodes → high memory use",
      "Only as good as its heuristic (bad h can be slow or suboptimal)",
      "An inadmissible heuristic breaks the optimality guarantee",
      "Not ideal for very large or dynamic maps without variants (D*, IDA*)",
    ],
    commonMistakes: [
      "Using an inadmissible heuristic (overestimating), losing optimality.",
      "Forgetting to update a node's priority when a better g is found.",
      "Re-expanding closed nodes when the heuristic isn't consistent.",
      "Comparing only h (greedy best-first) or only g (Dijkstra) instead of f = g + h.",
    ],
    interviewQuestions: [
      "What makes a heuristic admissible, and why does it guarantee optimality?",
      "How does A* reduce to Dijkstra's algorithm, and when?",
      "What is the difference between an admissible and a consistent heuristic?",
      "Why can A* run out of memory, and what variants address it?",
      "Which heuristics are appropriate for grid vs. road-network pathfinding?",
    ],
    summary:
      "A* finds an optimal shortest path by always expanding the node with the smallest f = g + h, where g is the cost so far and h an admissible estimate to the goal. A good heuristic makes it far faster than Dijkstra while preserving optimality, which is why it dominates game and map pathfinding.",
    quiz: [
      { question: "A* selects the next node to expand by minimizing…", options: ["g only", "h only", "f = g + h", "the number of neighbors"], answer: 2, explanation: "It balances actual cost so far (g) and estimated remaining cost (h)." },
      { question: "A heuristic is admissible if it…", options: ["Always overestimates", "Never overestimates the true remaining cost", "Equals zero", "Is random"], answer: 1, explanation: "Never overestimating guarantees A* returns an optimal path." },
      { question: "If h(n) = 0 for all nodes, A* behaves like…", options: ["Greedy best-first", "Dijkstra's algorithm", "DFS", "BFS on weighted graphs"], answer: 1, explanation: "With no heuristic guidance, f = g, which is Dijkstra." },
      { question: "A common admissible heuristic on a 4-directional grid is…", options: ["Euclidean squared", "Manhattan distance", "Random distance", "Zero always"], answer: 1, explanation: "Manhattan distance never overestimates grid moves without diagonals." },
      { question: "A* main practical limitation is…", options: ["It is not optimal", "High memory from storing the frontier", "It cannot use heuristics", "It only works on trees"], answer: 1, explanation: "All open nodes must be kept, which can exhaust memory on large maps." },
    ],
  },
  inputFields: [
    { key: "grid", label: "Grid (rows of 0/1)", placeholder: "1111 / 1011 / 1101 / 1111", help: "Rows separated by / or newline; 1 = open, 0 = wall. Start = top-left, goal = bottom-right. Up to 7×7." },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const rows = (fields.grid ?? "")
      .split(/[\/\n]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (rows.length < 2) throw new Error("Enter at least 2 rows.");
    if (rows.length > 7) throw new Error("Maximum 7 rows.");
    const cols = rows[0].length;
    const grid = rows.map((r) => {
      if (r.length !== cols) throw new Error("All rows must have the same length.");
      if (r.length > 7) throw new Error("Maximum 7 columns.");
      return r.split("").map((ch) => {
        if (ch !== "0" && ch !== "1") throw new Error("Use only 0 (wall) and 1 (open).");
        return Number(ch);
      });
    });
    return { grid };
  },
  serializeInput: (input) => ({ grid: input.grid.map((r) => r.join("")).join(" / ") }),
  generate,
};

export default mod;
