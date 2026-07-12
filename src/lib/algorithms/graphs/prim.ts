import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { randomGraph, circularLayout } from "@/lib/engine/random";
import { parseWeightedEdges } from "./dijkstra";

type WEdge = { from: string; to: string; weight: number };
type Input = { nodes: string[]; edges: WEdge[] };

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const layout = circularLayout(nodes);
  const adj = new Map<string, { to: string; w: number }[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    adj.get(e.from)!.push({ to: e.to, w: e.weight });
    adj.get(e.to)!.push({ to: e.from, w: e.weight });
  }

  const steps: Step<GraphFrame>[] = [];
  const inMST = new Set<string>();
  const mstEdges = new Set<string>();
  let totalWeight = 0;
  let comparisons = 0;

  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((e) => ({ ...e })),
    weighted: true,
    directed: false,
  });

  const edgeStates = (extra: Record<string, CellState> = {}): Record<string, CellState> => {
    const es: Record<string, CellState> = { ...extra };
    for (const key of mstEdges) {
      es[key] = "sorted";
      const [f, t] = key.split("->");
      es[`${t}->${f}`] = "sorted";
    }
    return es;
  };

  const snap = (nodeStates: Record<string, CellState>, es: Record<string, CellState>, description: string, codeLine: number, descriptionAr?: string) => {
    steps.push({
      frame: {
        ...base(),
        nodeStates: { ...nodeStates },
        edgeStates: es,
        aux: [{ label: "MST weight", values: [totalWeight] }, { label: "In tree", values: [...inMST] }],
      },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons, treeSize: inMST.size },
    });
  };

  const start = nodes[0];
  inMST.add(start);
  snap({ [start]: "active" }, edgeStates(), `Prim's MST from ${start}: grow a tree by always adding the cheapest edge to a new node.`, 0, `شجرة برايم الممتدة الصغرى من ${start}: نمِّ شجرة بإضافة أرخص حافة إلى عقدة جديدة دومًا.`);

  while (inMST.size < nodes.length) {
    // find cheapest edge from tree to a non-tree node
    let best: { from: string; to: string; w: number } | null = null;
    for (const u of inMST) {
      for (const { to, w } of adj.get(u)!) {
        if (inMST.has(to)) continue;
        comparisons++;
        if (best === null || w < best.w) best = { from: u, to, w };
      }
    }
    if (!best) {
      snap(Object.fromEntries([...inMST].map((n) => [n, "sorted" as CellState])), edgeStates(), `Graph is disconnected — no MST spans all nodes.`, 5, `الرسم البياني غير متصل — لا توجد شجرة ممتدة صغرى تغطي كل العقد.`);
      return steps;
    }
    snap(
      { ...Object.fromEntries([...inMST].map((n) => [n, "compare" as CellState])), [best.to]: "active" },
      edgeStates({ [`${best.from}->${best.to}`]: "compare", [`${best.to}->${best.from}`]: "compare" }),
      `Cheapest crossing edge: ${best.from}–${best.to} (weight ${best.w}). Add ${best.to} to the tree.`,
      2,
      `أرخص حافة عابرة: ${best.from}–${best.to} (الوزن ${best.w}). أضف ${best.to} إلى الشجرة.`,
    );
    inMST.add(best.to);
    mstEdges.add(`${best.from}->${best.to}`);
    totalWeight += best.w;
    snap(Object.fromEntries([...inMST].map((n) => [n, "sorted" as CellState])), edgeStates(), `Tree now has ${inMST.size} nodes, total weight ${totalWeight}.`, 3, `تحوي الشجرة الآن ${inMST.size} عقدة، الوزن الإجمالي ${totalWeight}.`);
  }
  snap(Object.fromEntries(nodes.map((n) => [n, "sorted" as CellState])), edgeStates(), `Minimum spanning tree complete — total weight ${totalWeight}.`, 4, `اكتملت الشجرة الممتدة الصغرى — الوزن الإجمالي ${totalWeight}.`);
  return steps;
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "prim",
  title: "Prim's MST",
  titleAr: "شجرة برايم الممتدة الصغرى (Prim)",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["minimum spanning tree", "greedy", "priority queue", "weighted"],
  tagsAr: ["شجرة ممتدة صغرى", "جشِع", "طابور أولوية", "موزون"],
  summary: "Grows a minimum spanning tree from a start node by repeatedly adding the cheapest edge to a new vertex.",
  summaryAr: "ينمّي شجرة ممتدة صغرى من عقدة بداية بإضافة أرخص حافة إلى رأس جديد مرارًا.",
  renderer: "graph",
  pseudocode: [
    "procedure Prim(G, start)",
    "  tree = {start}",
    "  while tree doesn't cover all nodes:",
    "    pick cheapest edge (u,v): u in tree, v not in tree",
    "    add v to tree; record edge (u,v)",
    "  // edges chosen form the MST",
    "  return MST",
  ],
  code: {
    pseudocode: `procedure Prim(G, start)
  inMST = {start}; total = 0
  while |inMST| < |V|:
    (u, v, w) = min weight edge with u in inMST, v not in inMST
    inMST.add(v); total += w; record (u, v)
  return MST, total`,
    c: `// O(V^2) adjacency-matrix Prim
int prim(int n, int g[][100]) {
    int key[100], inMST[100] = {0}, total = 0;
    for (int i = 0; i < n; i++) key[i] = INT_MAX;
    key[0] = 0;
    for (int c = 0; c < n; c++) {
        int u = -1;
        for (int v = 0; v < n; v++)
            if (!inMST[v] && (u == -1 || key[v] < key[u])) u = v;
        inMST[u] = 1; total += key[u];
        for (int v = 0; v < n; v++)
            if (g[u][v] && !inMST[v] && g[u][v] < key[v]) key[v] = g[u][v];
    }
    return total;
}`,
    cpp: `int prim(vector<vector<pair<int,int>>>& adj, int n) {
    vector<int> key(n, INT_MAX); vector<bool> inMST(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    key[0] = 0; pq.push({0, 0}); int total = 0;
    while (!pq.empty()) {
        auto [w, u] = pq.top(); pq.pop();
        if (inMST[u]) continue;
        inMST[u] = true; total += w;
        for (auto [v, wt] : adj[u])
            if (!inMST[v] && wt < key[v]) { key[v] = wt; pq.push({wt, v}); }
    }
    return total;
}`,
    java: `int prim(List<int[]>[] adj, int n) {
    int[] key = new int[n]; Arrays.fill(key, Integer.MAX_VALUE);
    boolean[] inMST = new boolean[n];
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    key[0] = 0; pq.add(new int[]{0, 0}); int total = 0;
    while (!pq.isEmpty()) {
        int[] t = pq.poll(); int w = t[0], u = t[1];
        if (inMST[u]) continue;
        inMST[u] = true; total += w;
        for (int[] e : adj[u]) if (!inMST[e[0]] && e[1] < key[e[0]]) { key[e[0]] = e[1]; pq.add(new int[]{e[1], e[0]}); }
    }
    return total;
}`,
    python: `import heapq
def prim(adj, n):
    key = [float('inf')] * n
    in_mst = [False] * n
    key[0] = 0
    pq = [(0, 0)]
    total = 0
    while pq:
        w, u = heapq.heappop(pq)
        if in_mst[u]:
            continue
        in_mst[u] = True
        total += w
        for v, wt in adj[u]:
            if not in_mst[v] and wt < key[v]:
                key[v] = wt
                heapq.heappush(pq, (wt, v))
    return total`,
    javascript: `function prim(adj, n) {
  const key = new Array(n).fill(Infinity), inMST = new Array(n).fill(false);
  key[0] = 0;
  const pq = [[0, 0]]; let total = 0;
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [w, u] = pq.shift();
    if (inMST[u]) continue;
    inMST[u] = true; total += w;
    for (const [v, wt] of adj[u])
      if (!inMST[v] && wt < key[v]) { key[v] = wt; pq.push([wt, v]); }
  }
  return total;
}`,
    typescript: `function prim(adj: [number, number][][], n: number): number {
  const key = new Array(n).fill(Infinity), inMST = new Array(n).fill(false);
  key[0] = 0;
  const pq: [number, number][] = [[0, 0]]; let total = 0;
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [w, u] = pq.shift()!;
    if (inMST[u]) continue;
    inMST[u] = true; total += w;
    for (const [v, wt] of adj[u])
      if (!inMST[v] && wt < key[v]) { key[v] = wt; pq.push([wt, v]); }
  }
  return total;
}`,
    csharp: `int Prim(List<(int v, int w)>[] adj, int n) {
    var key = new int[n]; Array.Fill(key, int.MaxValue);
    var inMST = new bool[n];
    var pq = new PriorityQueue<int, int>();
    key[0] = 0; pq.Enqueue(0, 0); int total = 0;
    while (pq.Count > 0) {
        int u = pq.Dequeue();
        if (inMST[u]) continue;
        inMST[u] = true; total += key[u];
        foreach (var (v, w) in adj[u])
            if (!inMST[v] && w < key[v]) { key[v] = w; pq.Enqueue(v, w); }
    }
    return total;
}`,
    go: `func prim(adj map[int][][2]int, n int) int {
	key := make([]int, n)
	inMST := make([]bool, n)
	for i := range key { key[i] = 1 << 30 }
	key[0] = 0
	total := 0
	for c := 0; c < n; c++ {
		u := -1
		for v := 0; v < n; v++ {
			if !inMST[v] && (u == -1 || key[v] < key[u]) { u = v }
		}
		inMST[u] = true
		total += key[u]
		for _, e := range adj[u] {
			v, w := e[0], e[1]
			if !inMST[v] && w < key[v] { key[v] = w }
		}
	}
	return total
}`,
    rust: `use std::collections::BinaryHeap;
use std::cmp::Reverse;
fn prim(adj: &Vec<Vec<(usize, i32)>>, n: usize) -> i32 {
    let mut key = vec![i32::MAX; n];
    let mut in_mst = vec![false; n];
    key[0] = 0;
    let mut pq = BinaryHeap::new();
    pq.push(Reverse((0, 0usize)));
    let mut total = 0;
    while let Some(Reverse((w, u))) = pq.pop() {
        if in_mst[u] { continue; }
        in_mst[u] = true; total += w;
        for &(v, wt) in &adj[u] {
            if !in_mst[v] && wt < key[v] { key[v] = wt; pq.push(Reverse((wt, v))); }
        }
    }
    total
}`,
    kotlin: `import java.util.PriorityQueue
fun prim(adj: Map<Int, List<Pair<Int, Int>>>, n: Int): Int {
    val key = IntArray(n) { Int.MAX_VALUE }
    val inMST = BooleanArray(n)
    key[0] = 0
    val pq = PriorityQueue<Pair<Int, Int>>(compareBy { it.first })
    pq.add(0 to 0)
    var total = 0
    while (pq.isNotEmpty()) {
        val (w, u) = pq.poll()
        if (inMST[u]) continue
        inMST[u] = true; total += w
        for ((v, wt) in adj[u].orEmpty())
            if (!inMST[v] && wt < key[v]) { key[v] = wt; pq.add(wt to v) }
    }
    return total
}`,
    swift: `func prim(_ adj: [[(Int, Int)]], _ n: Int) -> Int {
    var key = [Int](repeating: Int.max, count: n)
    var inMST = [Bool](repeating: false, count: n)
    key[0] = 0
    var pq: [(Int, Int)] = [(0, 0)]
    var total = 0
    while !pq.isEmpty {
        pq.sort { $0.0 < $1.0 }
        let (w, u) = pq.removeFirst()
        if inMST[u] { continue }
        inMST[u] = true; total += w
        for (v, wt) in adj[u] where !inMST[v] && wt < key[v] {
            key[v] = wt; pq.append((wt, v))
        }
    }
    return total
}`,
  },
  content: {
    overview: `Prim's algorithm builds a minimum spanning tree (MST) — a subset of edges that connects all vertices of a weighted, undirected graph with the least possible total edge weight. It starts from an arbitrary node and grows the tree one vertex at a time, always choosing the cheapest edge that connects a vertex already in the tree to one outside it.

This greedy strategy is provably optimal thanks to the cut property: for any partition of the vertices, the minimum-weight edge crossing the partition is safe to include in some MST. With a binary-heap priority queue keyed by the cheapest connecting edge, Prim's runs in O(E log V).`,
    howItWorks: [
      "Start the tree with any single vertex.",
      "Consider all edges that cross from the tree to a vertex not yet in it.",
      "Add the cheapest such crossing edge, bringing its outside endpoint into the tree.",
      "Update the cheapest connections for the newly reachable vertices.",
      "Repeat until every vertex is in the tree — the chosen edges form the MST.",
    ],
    complexity: {
      time: { best: "O(E log V)", average: "O(E log V)", worst: "O(E log V)" },
      space: "O(V + E)",
      notes: "With a binary heap: O(E log V). With an adjacency matrix and array scan: O(V²), which is better for dense graphs. A Fibonacci heap gives O(E + V log V).",
    },
    applications: [
      "Designing least-cost networks (roads, cables, pipelines)",
      "Approximation algorithms (e.g. metric TSP)",
      "Cluster analysis and image segmentation",
      "Broadcast/routing tree construction",
    ],
    advantages: [
      "Optimal MST via the greedy cut property",
      "Efficient O(E log V) with a heap",
      "Great for dense graphs (O(V²) matrix version)",
      "Grows a single connected tree throughout",
    ],
    disadvantages: [
      "Requires a connected graph for a spanning tree",
      "Priority-queue bookkeeping adds overhead",
      "Kruskal's may be simpler for sparse/edge-list graphs",
      "Not directly applicable to directed graphs",
    ],
    commonMistakes: [
      "Adding an edge to a vertex already in the tree (creating a cycle).",
      "Not updating the cheapest connection when a shorter edge appears.",
      "Using it on a disconnected graph and expecting a spanning tree.",
      "Confusing MST edges with shortest-path edges (they differ).",
    ],
    interviewQuestions: [
      "State and use the cut property to justify Prim's correctness.",
      "Compare Prim's and Kruskal's — when is each preferable?",
      "Why is an MST edge not necessarily on any shortest path?",
      "How does the choice of data structure change Prim's complexity?",
    ],
    summary:
      "Prim's algorithm grows a minimum spanning tree from a start vertex by repeatedly adding the cheapest edge to a new vertex, justified by the cut property. With a heap it runs in O(E log V), producing a least-total-weight tree connecting all vertices.",
    quiz: [
      { question: "Prim's algorithm builds a minimum spanning tree by…", options: ["Sorting all edges first", "Growing a tree, adding the cheapest crossing edge each step", "Doing a BFS", "Removing heavy edges"], answer: 1, explanation: "It greedily extends one connected tree via the cheapest edge to a new vertex." },
      { question: "Prim's correctness follows from the…", options: ["Pigeonhole principle", "Cut property", "Master theorem", "Handshake lemma"], answer: 1, explanation: "The minimum edge crossing any cut is safe to add to an MST." },
      { question: "With a binary heap, Prim's runs in…", options: ["O(V²)", "O(E log V)", "O(VE)", "O(2ⁿ)"], answer: 1, explanation: "Each edge may trigger a heap operation costing O(log V)." },
      { question: "Prim's requires the graph to be…", options: ["Directed", "Connected and undirected", "A tree already", "Unweighted"], answer: 1, explanation: "A spanning tree exists only for connected, undirected weighted graphs." },
      { question: "An MST edge is…", options: ["Always on a shortest path", "Not necessarily on any shortest path", "The heaviest edge", "A back edge"], answer: 1, explanation: "MSTs minimize total weight, not pairwise path distances." },
    ],
  },
  contentAr: {
    overview: `تبني خوارزمية برايم شجرة ممتدة صغرى (MST) — مجموعة فرعية من الحواف تصل كل رؤوس رسم بياني موزون غير موجه بأقل وزن إجمالي ممكن. تبدأ من عقدة عشوائية وتنمّي الشجرة رأسًا واحدًا في كل مرة، مختارة دومًا أرخص حافة تصل رأسًا موجودًا في الشجرة برأس خارجها.

هذه الاستراتيجية الجشِعة مثالية بشكل مثبت بفضل خاصية القطع: لأي تقسيم لمجموعة الرؤوس، تكون الحافة الأقل وزنًا العابرة للتقسيم آمنة للإدراج في شجرة ممتدة صغرى ما. باستخدام طابور أولوية بكومة ثنائية مرتب حسب أرخص حافة وصل، تعمل خوارزمية برايم بزمن O(E log V).`,
    howItWorks: [
      "ابدأ الشجرة برأس واحد اعتباطي.",
      "اعتبر كل الحواف العابرة من الشجرة إلى رأس ليس فيها بعد.",
      "أضف أرخص حافة عابرة كهذه، مُدخِلًا طرفها الخارجي إلى الشجرة.",
      "حدّث أرخص الوصلات للرؤوس القابلة للوصول حديثًا.",
      "كرّر حتى يصبح كل رأس في الشجرة — الحواف المختارة تشكّل الشجرة الممتدة الصغرى.",
    ],
    complexity: {
      time: { best: "O(E log V)", average: "O(E log V)", worst: "O(E log V)" },
      space: "O(V + E)",
      notes: "بكومة ثنائية: O(E log V). بمصفوفة تجاور ومسح مصفوفة: O(V²)، وهو أفضل للرسوم البيانية الكثيفة. كومة فيبوناتشي تعطي O(E + V log V).",
    },
    applications: [
      "تصميم شبكات أقل تكلفة (طرق، كابلات، أنابيب)",
      "خوارزميات التقريب (مثل مسألة البائع المتجول المتري)",
      "تحليل العناقيد وتجزئة الصور",
      "بناء أشجار البث/التوجيه",
    ],
    advantages: [
      "شجرة ممتدة صغرى مثالية عبر خاصية القطع الجشِعة",
      "فعّالة بزمن O(E log V) باستخدام كومة",
      "ممتازة للرسوم البيانية الكثيفة (نسخة المصفوفة O(V²))",
      "تنمّي شجرة متصلة واحدة طوال العملية",
    ],
    disadvantages: [
      "تتطلب رسمًا بيانيًا متصلًا لوجود شجرة ممتدة",
      "محاسبة طابور الأولوية تضيف عبئًا",
      "قد تكون كروسكال أبسط للرسوم البيانية المتناثرة/قوائم الحواف",
      "لا تنطبق مباشرة على الرسوم البيانية الموجهة",
    ],
    commonMistakes: [
      "إضافة حافة إلى رأس موجود بالفعل في الشجرة (مما يُنشئ دورة).",
      "عدم تحديث أرخص وصلة عند ظهور حافة أقصر.",
      "استخدامها على رسم بياني غير متصل وتوقع شجرة ممتدة.",
      "الخلط بين حواف الشجرة الممتدة الصغرى وحواف أقصر المسار (فهما مختلفتان).",
    ],
    interviewQuestions: [
      "اذكر خاصية القطع واستخدمها لتبرير صحة خوارزمية برايم.",
      "قارن بين برايم وكروسكال — متى يُفضَّل كل منهما؟",
      "لماذا لا تكون حافة الشجرة الممتدة الصغرى بالضرورة على أي أقصر مسار؟",
      "كيف يغيّر اختيار هيكل البيانات تعقيد خوارزمية برايم؟",
    ],
    summary:
      "تنمّي خوارزمية برايم شجرة ممتدة صغرى من رأس بداية بإضافة أرخص حافة إلى رأس جديد مرارًا، مبرَّرة بخاصية القطع. باستخدام كومة تعمل بزمن O(E log V)، منتجةً شجرة أقل وزن إجمالي تصل كل الرؤوس.",
    quiz: [
      { question: "تبني خوارزمية برايم شجرة ممتدة صغرى عبر…", options: ["ترتيب كل الحواف أولًا", "تنمية شجرة، بإضافة أرخص حافة عابرة في كل خطوة", "إجراء BFS", "إزالة الحواف الثقيلة"], answer: 1, explanation: "توسّع جشعًا شجرة متصلة واحدة عبر أرخص حافة إلى رأس جديد." },
      { question: "تنبع صحة خوارزمية برايم من…", options: ["مبدأ برج الحمام", "خاصية القطع", "مبرهنة الأستاذ", "مصافحة اليد"], answer: 1, explanation: "الحافة الأصغر وزنًا العابرة لأي قطع آمنة للإضافة إلى شجرة ممتدة صغرى." },
      { question: "باستخدام كومة ثنائية، تعمل خوارزمية برايم بزمن…", options: ["O(V²)", "O(E log V)", "O(VE)", "O(2ⁿ)"], answer: 1, explanation: "قد تستدعي كل حافة عملية كومة بتكلفة O(log V)." },
      { question: "تتطلب خوارزمية برايم أن يكون الرسم البياني…", options: ["موجهًا", "متصلًا وغير موجه", "شجرة بالفعل", "غير موزون"], answer: 1, explanation: "توجد شجرة ممتدة فقط للرسوم البيانية الموزونة المتصلة غير الموجهة." },
      { question: "حافة الشجرة الممتدة الصغرى…", options: ["دومًا على أقصر مسار", "ليست بالضرورة على أي أقصر مسار", "أثقل حافة", "حافة خلفية"], answer: 1, explanation: "تُصغِّر الأشجار الممتدة الصغرى الوزن الإجمالي، لا مسافات المسار الزوجية." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Weighted edges", placeholder: "A-B:4, A-C:1, C-B:2, B-D:5, C-D:8", help: "Undirected, format A-B:weight. Up to 20 nodes.", list: true },
  ],
  defaultInput: (level, rng) => {
    const g = randomGraph(level, rng, { weighted: true });
    return { nodes: g.nodes.map((n) => n.id), edges: g.edges.map((e) => ({ from: e.from, to: e.to, weight: e.weight ?? 1 })) };
  },
  parseInput: (fields) => {
    const { nodes, edges } = parseWeightedEdges(fields.edges ?? "");
    return { nodes, edges };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}-${e.to}:${e.weight}`).join(", ") }),
  generate,
};

export default mod;
