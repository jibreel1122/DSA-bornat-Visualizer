import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";

type CEdge = { from: string; to: string; cap: number };
type Input = { nodes: string[]; edges: CEdge[]; source: string; sink: string };

/** Parse directed capacity edges "S>A:10". */
export function parseCapacityEdges(text: string): { nodes: string[]; edges: CEdge[] } {
  const nodes = new Set<string>();
  const byDirection = new Map<string, CEdge>();
  const parts = text.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one edge, e.g. S>A:10.");
  for (const part of parts) {
    const m = part.match(/^([A-Za-z0-9]+)\s*>\s*([A-Za-z0-9]+)\s*:\s*(\d+)$/);
    if (!m) throw new Error(`"${part}" is invalid. Use S>A:10 (directed, positive capacity).`);
    const [, from, to, c] = m;
    if (from === to) throw new Error(`Self-loop "${part}" not allowed.`);
    if (Number(c) < 1) throw new Error(`Capacity in "${part}" must be at least 1.`);
    nodes.add(from);
    nodes.add(to);
    const key = `${from}->${to}`;
    const existing = byDirection.get(key);
    if (existing) existing.cap += Number(c);
    else byDirection.set(key, { from, to, cap: Number(c) });
  }
  if (nodes.size > 20) throw new Error("Maximum 20 nodes.");
  return { nodes: [...nodes].sort(), edges: [...byDirection.values()] };
}

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges, source, sink } = input;
  const layout = circularLayout(nodes);
  const idx = Object.fromEntries(nodes.map((v, i) => [v, i]));
  const n = nodes.length;
  const orig: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const e of edges) {
    orig[idx[e.from]][idx[e.to]] += e.cap;
  }
  const flow: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  const steps: Step<GraphFrame>[] = [];
  let maxFlow = 0;
  let augmentations = 0;

  const edgeLabel = (from: string, to: string) => {
    const f = flow[idx[from]][idx[to]];
    const c = orig[idx[from]][idx[to]];
    return c > 0 ? f : 0;
  };

  const snap = (
    nodeStates: Record<string, CellState>,
    edgeStates: Record<string, CellState>,
    description: string,
    codeLine: number,
    bottleneck?: number,
    descriptionAr?: string,
  ): void => {
    // display edges with weight = current flow, annotate cap in note-ish via nodeAnnotations skip
    const drawEdges = edges.map((e) => ({ from: e.from, to: e.to, weight: edgeLabel(e.from, e.to) }));
    const aux = [
      { label: "max flow so far", values: [maxFlow] },
      { label: "augmenting paths", values: [augmentations] },
    ];
    if (bottleneck !== undefined) aux.push({ label: "path bottleneck", values: [bottleneck] });
    steps.push({
      frame: {
        nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
        edges: drawEdges,
        directed: true,
        weighted: true,
        nodeStates: { ...nodeStates, [source]: nodeStates[source] ?? "special", [sink]: nodeStates[sink] ?? "special" },
        edgeStates: { ...edgeStates },
        aux,
        note: `Edmonds-Karp — edge label = current flow (of its capacity). Find BFS augmenting paths in the residual graph.`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { maxFlow, augmentations },
    });
  };

  // BFS in residual graph; returns parent map or null
  const bfs = (): number[] | null => {
    const parent = new Array(n).fill(-1);
    parent[idx[source]] = idx[source];
    const q = [idx[source]];
    while (q.length) {
      const u = q.shift()!;
      for (let v = 0; v < n; v++) {
        const residual = orig[u][v] - flow[u][v] + flow[v][u];
        if (parent[v] === -1 && residual > 0) {
          parent[v] = u;
          if (v === idx[sink]) return parent;
          q.push(v);
        }
      }
    }
    return null;
  };

  snap({}, {}, `Maximum flow from source ${source} to sink ${sink}. Repeatedly find a shortest augmenting path (BFS) and push flow along it.`, 0, undefined, `التدفق الأقصى من المصدر ${source} إلى المصرف ${sink}. جِد مرارًا أقصر مسار توسيع (BFS) وادفع تدفقًا عبره.`);

  for (;;) {
    const parent = bfs();
    if (!parent) break;
    // find bottleneck
    let bottleneck = Infinity;
    let v = idx[sink];
    const pathNodes: string[] = [];
    const pathEdges: string[] = [];
    while (v !== idx[source]) {
      const u = parent[v];
      bottleneck = Math.min(bottleneck, orig[u][v] - flow[u][v] + flow[v][u]);
      pathNodes.push(nodes[v]);
      pathEdges.push(`${nodes[u]}->${nodes[v]}`);
      v = u;
    }
    pathNodes.push(source);
    pathNodes.reverse();
    const nodeStates: Record<string, CellState> = {};
    for (const nd of pathNodes) nodeStates[nd] = "active";
    const edgeStates: Record<string, CellState> = {};
    for (const e of pathEdges) edgeStates[e] = "swap";
    snap(nodeStates, edgeStates, `BFS found augmenting path ${pathNodes.join(" → ")} with bottleneck (min residual) = ${bottleneck}.`, 3, bottleneck, `وجد BFS مسار توسيع ${pathNodes.join(" → ")} بعنق زجاجة (أقل سعة متبقية) = ${bottleneck}.`);

    // augment
    v = idx[sink];
    while (v !== idx[source]) {
      const u = parent[v];
      const cancelled = Math.min(bottleneck, flow[v][u]);
      flow[v][u] -= cancelled;
      flow[u][v] += bottleneck - cancelled;
      v = u;
    }
    maxFlow += bottleneck;
    augmentations++;
    const doneStates: Record<string, CellState> = {};
    for (const e of pathEdges) doneStates[e] = "sorted";
    snap({}, doneStates, `Push ${bottleneck} units along the path → total flow now ${maxFlow}. Update residual capacities.`, 4, bottleneck, `ادفع ${bottleneck} وحدة عبر المسار ← التدفق الإجمالي الآن ${maxFlow}. حدّث السعات المتبقية.`);
  }

  snap({}, {}, `No augmenting path remains. Maximum flow from ${source} to ${sink} = ${maxFlow} (equals the min-cut capacity).`, 6, undefined, `لم يتبقَّ مسار توسيع. التدفق الأقصى من ${source} إلى ${sink} = ${maxFlow} (يساوي سعة القطع الأدنى).`);
  return steps;
}

const TEMPLATES: { edges: string; source: string; sink: string }[] = [
  { edges: "S>A:3, S>B:2, A>B:1, A>T:2, B>T:3", source: "S", sink: "T" },
  { edges: "S>A:10, S>C:10, A>B:4, A>C:2, A>D:8, B>T:10, C>D:9, D>B:6, D>T:10", source: "S", sink: "T" },
  { edges: "S>A:8, S>B:3, A>C:2, A>B:5, B>C:7, C>T:6, B>T:2", source: "S", sink: "T" },
  { edges: "S>1:16, S>2:13, 1>3:12, 2>1:4, 2>4:14, 3>2:9, 3>T:20, 4>3:7, 4>T:4", source: "S", sink: "T" },
  { edges: "S>A:5, S>B:4, A>C:6, B>C:3, B>D:5, C>T:5, D>C:2, D>T:6", source: "S", sink: "T" },
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  const { nodes, edges } = parseCapacityEdges(t.edges);
  return { nodes, edges, source: t.source, sink: t.sink };
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "max-flow",
  title: "Maximum Flow (Edmonds-Karp)",
  titleAr: "التدفق الأقصى (خوارزمية إدموندز-كارب)",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["graph", "max-flow", "residual graph", "BFS augmenting paths"],
  tagsAr: ["رسم بياني", "التدفق الأقصى", "رسم بياني متبقٍّ", "مسارات توسيع BFS"],
  summary: "Computes the maximum flow from source to sink by repeatedly pushing flow along shortest augmenting paths found with BFS.",
  summaryAr: "يحسب التدفق الأقصى من المصدر إلى المصرف بدفع تدفق مرارًا عبر أقصر مسارات توسيع يجدها BFS.",
  renderer: "graph",
  pseudocode: [
    "procedure edmondsKarp(source, sink)",
    "  maxflow = 0",
    "  while BFS finds an augmenting path in the residual graph:",
    "    bottleneck = min residual capacity on the path",
    "    for each edge (u,v) on the path:",
    "      flow[u][v] += bottleneck;  flow[v][u] -= bottleneck",
    "    maxflow += bottleneck",
    "  return maxflow",
  ],
  code: {
    pseudocode: `maxflow = 0
while path = BFS(residual, s, t):
  b = min residual capacity along path
  for (u,v) in path: flow[u][v]+=b; flow[v][u]-=b
  maxflow += b
return maxflow`,
    c: `int bfs(int s,int t,int* parent);
int edmondsKarp(int s,int t){
    int maxflow=0, parent[N];
    while(bfs(s,t,parent)){
        int b=INT_MAX;
        for(int v=t; v!=s; v=parent[v]) b=min(b, cap[parent[v]][v]-flow[parent[v]][v]);
        for(int v=t; v!=s; v=parent[v]){ flow[parent[v]][v]+=b; flow[v][parent[v]]-=b; }
        maxflow+=b;
    }
    return maxflow;
}`,
    cpp: `int edmondsKarp(int s, int t) {
    int maxflow = 0;
    vector<int> parent(n);
    while (bfs(s, t, parent)) {
        int b = INT_MAX;
        for (int v = t; v != s; v = parent[v])
            b = min(b, cap[parent[v]][v] - flow[parent[v]][v]);
        for (int v = t; v != s; v = parent[v]) {
            flow[parent[v]][v] += b;
            flow[v][parent[v]] -= b;
        }
        maxflow += b;
    }
    return maxflow;
}`,
    java: `int edmondsKarp(int s, int t) {
    int maxflow = 0;
    int[] parent = new int[n];
    while (bfs(s, t, parent)) {
        int b = Integer.MAX_VALUE;
        for (int v = t; v != s; v = parent[v])
            b = Math.min(b, cap[parent[v]][v] - flow[parent[v]][v]);
        for (int v = t; v != s; v = parent[v]) {
            flow[parent[v]][v] += b;
            flow[v][parent[v]] -= b;
        }
        maxflow += b;
    }
    return maxflow;
}`,
    python: `from collections import deque
def edmonds_karp(cap, s, t):
    n = len(cap)
    flow = [[0]*n for _ in range(n)]
    maxflow = 0
    while True:
        parent = [-1]*n; parent[s] = s
        q = deque([s])
        while q:
            u = q.popleft()
            for v in range(n):
                if parent[v] == -1 and cap[u][v] - flow[u][v] > 0:
                    parent[v] = u; q.append(v)
        if parent[t] == -1: break
        b = float('inf'); v = t
        while v != s:
            b = min(b, cap[parent[v]][v] - flow[parent[v]][v]); v = parent[v]
        v = t
        while v != s:
            flow[parent[v]][v] += b; flow[v][parent[v]] -= b; v = parent[v]
        maxflow += b
    return maxflow`,
    javascript: `function edmondsKarp(cap, s, t) {
  const n = cap.length;
  const flow = Array.from({ length: n }, () => new Array(n).fill(0));
  let maxflow = 0;
  for (;;) {
    const parent = new Array(n).fill(-1); parent[s] = s;
    const q = [s];
    while (q.length) {
      const u = q.shift();
      for (let v = 0; v < n; v++)
        if (parent[v] === -1 && cap[u][v] - flow[u][v] > 0) { parent[v] = u; q.push(v); }
    }
    if (parent[t] === -1) break;
    let b = Infinity;
    for (let v = t; v !== s; v = parent[v]) b = Math.min(b, cap[parent[v]][v] - flow[parent[v]][v]);
    for (let v = t; v !== s; v = parent[v]) { flow[parent[v]][v] += b; flow[v][parent[v]] -= b; }
    maxflow += b;
  }
  return maxflow;
}`,
    typescript: `function edmondsKarp(cap: number[][], s: number, t: number): number {
  const n = cap.length;
  const flow = Array.from({ length: n }, () => new Array(n).fill(0));
  let maxflow = 0;
  for (;;) {
    const parent = new Array(n).fill(-1); parent[s] = s;
    const q: number[] = [s];
    while (q.length) {
      const u = q.shift()!;
      for (let v = 0; v < n; v++)
        if (parent[v] === -1 && cap[u][v] - flow[u][v] > 0) { parent[v] = u; q.push(v); }
    }
    if (parent[t] === -1) break;
    let b = Infinity;
    for (let v = t; v !== s; v = parent[v]) b = Math.min(b, cap[parent[v]][v] - flow[parent[v]][v]);
    for (let v = t; v !== s; v = parent[v]) { flow[parent[v]][v] += b; flow[v][parent[v]] -= b; }
    maxflow += b;
  }
  return maxflow;
}`,
    csharp: `int EdmondsKarp(int[,] cap, int s, int t) {
    int n = cap.GetLength(0);
    var flow = new int[n, n];
    int maxflow = 0;
    while (true) {
        var parent = new int[n]; Array.Fill(parent, -1); parent[s] = s;
        var q = new Queue<int>(); q.Enqueue(s);
        while (q.Count > 0) {
            int u = q.Dequeue();
            for (int v = 0; v < n; v++)
                if (parent[v] == -1 && cap[u, v] - flow[u, v] > 0) { parent[v] = u; q.Enqueue(v); }
        }
        if (parent[t] == -1) break;
        int b = int.MaxValue;
        for (int v = t; v != s; v = parent[v]) b = Math.Min(b, cap[parent[v], v] - flow[parent[v], v]);
        for (int v = t; v != s; v = parent[v]) { flow[parent[v], v] += b; flow[v, parent[v]] -= b; }
        maxflow += b;
    }
    return maxflow;
}`,
    go: `func edmondsKarp(cap [][]int, s, t int) int {
	n := len(cap)
	flow := make([][]int, n)
	for i := range flow { flow[i] = make([]int, n) }
	maxflow := 0
	for {
		parent := make([]int, n)
		for i := range parent { parent[i] = -1 }
		parent[s] = s
		q := []int{s}
		for len(q) > 0 {
			u := q[0]; q = q[1:]
			for v := 0; v < n; v++ {
				if parent[v] == -1 && cap[u][v]-flow[u][v] > 0 { parent[v] = u; q = append(q, v) }
			}
		}
		if parent[t] == -1 { break }
		b := 1 << 30
		for v := t; v != s; v = parent[v] {
			if d := cap[parent[v]][v] - flow[parent[v]][v]; d < b { b = d }
		}
		for v := t; v != s; v = parent[v] { flow[parent[v]][v] += b; flow[v][parent[v]] -= b }
		maxflow += b
	}
	return maxflow
}`,
    rust: `fn edmonds_karp(cap: &Vec<Vec<i32>>, s: usize, t: usize) -> i32 {
    let n = cap.len();
    let mut flow = vec![vec![0; n]; n];
    let mut maxflow = 0;
    loop {
        let mut parent = vec![-1i32; n];
        parent[s] = s as i32;
        let mut q = std::collections::VecDeque::from(vec![s]);
        while let Some(u) = q.pop_front() {
            for v in 0..n {
                if parent[v] == -1 && cap[u][v] - flow[u][v] > 0 {
                    parent[v] = u as i32; q.push_back(v);
                }
            }
        }
        if parent[t] == -1 { break; }
        let mut b = i32::MAX;
        let mut v = t;
        while v != s { let u = parent[v] as usize; b = b.min(cap[u][v] - flow[u][v]); v = u; }
        v = t;
        while v != s { let u = parent[v] as usize; flow[u][v] += b; flow[v][u] -= b; v = u; }
        maxflow += b;
    }
    maxflow
}`,
    kotlin: `fun edmondsKarp(cap: Array<IntArray>, s: Int, t: Int): Int {
    val n = cap.size
    val flow = Array(n) { IntArray(n) }
    var maxflow = 0
    while (true) {
        val parent = IntArray(n) { -1 }; parent[s] = s
        val q = ArrayDeque<Int>(); q.add(s)
        while (q.isNotEmpty()) {
            val u = q.removeFirst()
            for (v in 0 until n) if (parent[v] == -1 && cap[u][v] - flow[u][v] > 0) { parent[v] = u; q.add(v) }
        }
        if (parent[t] == -1) break
        var b = Int.MAX_VALUE; var v = t
        while (v != s) { b = minOf(b, cap[parent[v]][v] - flow[parent[v]][v]); v = parent[v] }
        v = t
        while (v != s) { flow[parent[v]][v] += b; flow[v][parent[v]] -= b; v = parent[v] }
        maxflow += b
    }
    return maxflow
}`,
    swift: `func edmondsKarp(_ cap: [[Int]], _ s: Int, _ t: Int) -> Int {
    let n = cap.count
    var flow = Array(repeating: Array(repeating: 0, count: n), count: n)
    var maxflow = 0
    while true {
        var parent = Array(repeating: -1, count: n); parent[s] = s
        var q = [s]; var head = 0
        while head < q.count {
            let u = q[head]; head += 1
            for v in 0..<n where parent[v] == -1 && cap[u][v] - flow[u][v] > 0 { parent[v] = u; q.append(v) }
        }
        if parent[t] == -1 { break }
        var b = Int.max, v = t
        while v != s { b = min(b, cap[parent[v]][v] - flow[parent[v]][v]); v = parent[v] }
        v = t
        while v != s { flow[parent[v]][v] += b; flow[v][parent[v]] -= b; v = parent[v] }
        maxflow += b
    }
    return maxflow
}`,
  },
  content: {
    overview: `The maximum-flow problem asks: given a network of directed pipes, each with a capacity, how much can flow from a source vertex to a sink vertex per unit time without exceeding any pipe's capacity? It models everything from traffic and logistics to bipartite matching and image segmentation. The celebrated max-flow min-cut theorem states that the maximum flow equals the capacity of the smallest "cut" separating source from sink.

The Ford-Fulkerson method computes max flow by repeatedly finding an augmenting path — a route from source to sink with spare capacity in the residual graph — and pushing as much flow as its tightest edge (the bottleneck) allows. The residual graph tracks remaining capacity, including reverse edges that let flow be "cancelled" and rerouted. Edmonds-Karp is the concrete version that always chooses the shortest augmenting path using breadth-first search. This choice bounds the number of augmentations to O(V·E), giving a total running time of O(V·E²) — polynomial and independent of the capacity values, unlike naive Ford-Fulkerson which can be slow with large capacities.`,
    howItWorks: [
      "Build a residual graph where each edge's residual capacity is its capacity minus current flow.",
      "Run BFS from source to sink over edges with positive residual capacity to find a shortest augmenting path.",
      "Compute the bottleneck: the minimum residual capacity along that path.",
      "Add the bottleneck to the flow on each forward edge and subtract it on the reverse (residual) edge.",
      "Repeat until BFS finds no augmenting path; the accumulated flow is the maximum.",
    ],
    complexity: {
      time: { best: "O(V·E²)", average: "O(V·E²)", worst: "O(V·E²)" },
      space: "O(V²) or O(V+E)",
      notes: "Edmonds-Karp uses BFS, bounding augmentations to O(V·E) and total time to O(V·E²), independent of capacity magnitudes. Dinic's algorithm improves this to O(V²·E). The max flow equals the min-cut capacity.",
    },
    applications: [
      "bipartite matching (jobs↔workers, students↔schools)",
      "network reliability, traffic, and logistics routing",
      "image segmentation via graph cuts",
      "project selection, scheduling, and baseball elimination",
    ],
    advantages: [
      "Guaranteed polynomial time, independent of capacity values",
      "Reverse (residual) edges allow flow to be rerouted optimally",
      "Directly yields the minimum cut",
      "Conceptually clear augmenting-path framework",
    ],
    disadvantages: [
      "O(V·E²) is slower than Dinic's or push-relabel on dense graphs",
      "Adjacency-matrix residual uses O(V²) memory",
      "Basic Ford-Fulkerson (non-BFS) can be slow or non-terminating with irrational capacities",
      "Recomputing BFS each augmentation adds overhead",
    ],
    commonMistakes: [
      "Forgetting to add/subtract flow on the reverse residual edge.",
      "Using DFS with arbitrary paths (plain Ford-Fulkerson), losing the polynomial bound.",
      "Not summing capacities of parallel edges between the same pair.",
      "Confusing residual capacity (cap − flow) with the original capacity.",
    ],
    interviewQuestions: [
      "State the max-flow min-cut theorem and why it holds.",
      "Why does choosing the shortest augmenting path (BFS) give a polynomial bound?",
      "What role do reverse/residual edges play?",
      "How does maximum bipartite matching reduce to max flow?",
      "How do Edmonds-Karp, Dinic's, and push-relabel compare?",
    ],
    summary:
      "Edmonds-Karp computes maximum flow by repeatedly pushing flow along the shortest BFS augmenting path in the residual graph until none remains, in O(V·E²) time. By the max-flow min-cut theorem the result equals the minimum cut, and the method underpins matching, segmentation, and routing.",
    quiz: [
      { question: "Edmonds-Karp finds augmenting paths using…", options: ["DFS", "BFS (shortest paths)", "Dijkstra", "Random walks"], answer: 1, explanation: "BFS picks the shortest augmenting path, bounding the number of iterations." },
      { question: "The bottleneck of an augmenting path is…", options: ["The longest edge", "The minimum residual capacity along it", "The source capacity", "The average capacity"], answer: 1, explanation: "You can push only as much as the tightest edge allows." },
      { question: "Reverse (residual) edges exist to…", options: ["Add capacity", "Allow previously sent flow to be cancelled/rerouted", "Speed up BFS", "Store the path"], answer: 1, explanation: "They let the algorithm undo flow and find a better arrangement." },
      { question: "The maximum flow equals…", options: ["The number of edges", "The minimum cut capacity", "The sum of all capacities", "The shortest path"], answer: 1, explanation: "This is the max-flow min-cut theorem." },
      { question: "Edmonds-Karp runs in…", options: ["O(V + E)", "O(V·E²)", "O(2^V)", "O(E log V)"], answer: 1, explanation: "BFS augmenting paths give an O(V·E²) bound independent of capacities." },
    ],
  },
  contentAr: {
    overview: `تطرح مسألة التدفق الأقصى السؤال التالي: بالنظر إلى شبكة من الأنابيب الموجهة، لكل منها سعة، كم يمكن أن يتدفق من رأس مصدر إلى رأس مصرف لكل وحدة زمن دون تجاوز سعة أي أنبوب؟ تُنمذج هذه المسألة كل شيء من حركة المرور والخدمات اللوجستية إلى المطابقة الثنائية وتجزئة الصور. تنص مبرهنة التدفق الأقصى-القطع الأدنى الشهيرة على أن التدفق الأقصى يساوي سعة أصغر "قطع" يفصل المصدر عن المصرف.

تحسب طريقة فورد-فولكرسون التدفق الأقصى بإيجاد مسار توسيع مرارًا — طريق من المصدر إلى المصرف بسعة فائضة في الرسم البياني المتبقي — ودفع أكبر قدر من التدفق تسمح به أضيق حافة فيه (عنق الزجاجة). يتتبع الرسم البياني المتبقي السعة المتبقية، بما في ذلك الحواف العكسية التي تسمح "بإلغاء" التدفق وإعادة توجيهه. خوارزمية إدموندز-كارب هي النسخة الملموسة التي تختار دومًا أقصر مسار توسيع باستخدام البحث بالعرض أولًا. هذا الاختيار يحدّ عدد التوسيعات بـ O(V·E)، معطيًا زمن تشغيل إجمالي O(V·E²) — كثير حدود ومستقل عن قيم السعة، بخلاف فورد-فولكرسون الساذجة التي قد تكون بطيئة مع سعات كبيرة.`,
    howItWorks: [
      "ابنِ رسمًا بيانيًا متبقيًا حيث السعة المتبقية لكل حافة هي سعتها ناقص التدفق الحالي.",
      "شغّل BFS من المصدر إلى المصرف عبر الحواف ذات السعة المتبقية الموجبة لإيجاد أقصر مسار توسيع.",
      "احسب عنق الزجاجة: أقل سعة متبقية على طول ذلك المسار.",
      "أضف عنق الزجاجة إلى التدفق على كل حافة أمامية واطرحه على الحافة العكسية (المتبقية).",
      "كرّر حتى لا يجد BFS مسار توسيع؛ التدفق المتراكم هو الأقصى.",
    ],
    complexity: {
      time: { best: "O(V·E²)", average: "O(V·E²)", worst: "O(V·E²)" },
      space: "O(V²) or O(V+E)",
      notes: "تستخدم إدموندز-كارب BFS، فتحدّ التوسيعات بـ O(V·E) والزمن الإجمالي بـ O(V·E²)، مستقلًا عن مقادير السعة. خوارزمية دينيتش تُحسِّن هذا إلى O(V²·E). التدفق الأقصى يساوي سعة القطع الأدنى.",
    },
    applications: [
      "المطابقة الثنائية (وظائف↔عمال، طلاب↔مدارس)",
      "موثوقية الشبكة وتوجيه حركة المرور والخدمات اللوجستية",
      "تجزئة الصور عبر قطوع الرسم البياني",
      "اختيار المشاريع، والجدولة، وإقصاء البيسبول",
    ],
    advantages: [
      "زمن كثير حدود مضمون، مستقل عن قيم السعة",
      "الحواف العكسية (المتبقية) تسمح بإعادة توجيه التدفق أمثليًا",
      "تُنتج مباشرة القطع الأدنى",
      "إطار عمل مسار التوسيع واضح مفاهيميًا",
    ],
    disadvantages: [
      "O(V·E²) أبطأ من دينيتش أو دفع-إعادة تسمية على الرسوم البيانية الكثيفة",
      "الرسم البياني المتبقي بمصفوفة تجاور يستخدم ذاكرة O(V²)",
      "فورد-فولكرسون الأساسية (بدون BFS) قد تكون بطيئة أو لا تنتهي مع سعات غير نسبية",
      "إعادة حساب BFS في كل توسيع تضيف عبئًا",
    ],
    commonMistakes: [
      "نسيان إضافة/طرح التدفق على الحافة العكسية المتبقية.",
      "استخدام DFS بمسارات اعتباطية (فورد-فولكرسون الأساسية)، مما يفقد الحد كثير الحدود.",
      "عدم جمع سعات الحواف المتوازية بين الزوج نفسه.",
      "الخلط بين السعة المتبقية (السعة − التدفق) والسعة الأصلية.",
    ],
    interviewQuestions: [
      "اذكر مبرهنة التدفق الأقصى-القطع الأدنى ولماذا تصح.",
      "لماذا يعطي اختيار أقصر مسار توسيع (BFS) حدًا كثير الحدود؟",
      "ما دور الحواف العكسية/المتبقية؟",
      "كيف تختزل المطابقة الثنائية القصوى إلى التدفق الأقصى؟",
      "كيف تقارن إدموندز-كارب ودينيتش ودفع-إعادة التسمية؟",
    ],
    summary:
      "تحسب إدموندز-كارب التدفق الأقصى بدفع تدفق مرارًا عبر أقصر مسار توسيع بـ BFS في الرسم البياني المتبقي حتى لا يتبقى شيء، بزمن O(V·E²). وفق مبرهنة التدفق الأقصى-القطع الأدنى، تساوي النتيجة القطع الأدنى، وتدعم هذه الطريقة المطابقة والتجزئة والتوجيه.",
    quiz: [
      { question: "تجد إدموندز-كارب مسارات التوسيع باستخدام…", options: ["DFS", "BFS (أقصر المسارات)", "دايكسترا", "مسيرات عشوائية"], answer: 1, explanation: "يختار BFS أقصر مسار توسيع، مما يحدّ عدد التكرارات." },
      { question: "عنق زجاجة مسار التوسيع هو…", options: ["أطول حافة", "أقل سعة متبقية على طوله", "سعة المصدر", "متوسط السعة"], answer: 1, explanation: "لا يمكنك الدفع إلا بقدر ما تسمح به أضيق حافة." },
      { question: "الحواف العكسية (المتبقية) موجودة من أجل…", options: ["إضافة سعة", "السماح بإلغاء/إعادة توجيه تدفق سابق", "تسريع BFS", "تخزين المسار"], answer: 1, explanation: "تسمح للخوارزمية بالتراجع عن التدفق وإيجاد ترتيب أفضل." },
      { question: "التدفق الأقصى يساوي…", options: ["عدد الحواف", "سعة القطع الأدنى", "مجموع كل السعات", "أقصر مسار"], answer: 1, explanation: "هذه مبرهنة التدفق الأقصى-القطع الأدنى." },
      { question: "تعمل إدموندز-كارب بزمن…", options: ["O(V + E)", "O(V·E²)", "O(2^V)", "O(E log V)"], answer: 1, explanation: "مسارات توسيع BFS تعطي حدًا O(V·E²) مستقلًا عن السعات." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Directed capacity edges", placeholder: "S>A:10, S>C:10, A>T:8", help: "Format S>A:cap (positive). Up to 20 nodes.", list: true },
    { key: "source", label: "Source", placeholder: "S", help: "Flow origin vertex." },
    { key: "sink", label: "Sink", placeholder: "T", help: "Flow destination vertex." },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const { nodes, edges } = parseCapacityEdges(fields.edges ?? "");
    const source = (fields.source ?? "").trim();
    const sink = (fields.sink ?? "").trim();
    if (!nodes.includes(source)) throw new Error(`Source "${source}" is not a vertex (${nodes.join(", ")}).`);
    if (!nodes.includes(sink)) throw new Error(`Sink "${sink}" is not a vertex (${nodes.join(", ")}).`);
    if (source === sink) throw new Error("Source and sink must be different.");
    return { nodes, edges, source, sink };
  },
  serializeInput: (input) => ({
    edges: input.edges.map((e) => `${e.from}>${e.to}:${e.cap}`).join(", "),
    source: input.source,
    sink: input.sink,
  }),
  generate,
};

export default mod;
