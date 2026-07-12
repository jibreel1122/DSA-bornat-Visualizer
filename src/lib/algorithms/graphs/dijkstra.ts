import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { randomGraph, circularLayout } from "@/lib/engine/random";

type WEdge = { from: string; to: string; weight: number };
type Input = { nodes: string[]; edges: WEdge[]; start: string };

/** Parse weighted undirected edges "A-B:4, B-C:2". */
export function parseWeightedEdges(text: string): { nodes: string[]; edges: WEdge[] } {
  const nodes = new Set<string>();
  const edges: WEdge[] = [];
  const parts = text.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one edge, e.g. A-B:4.");
  for (const part of parts) {
    const m = part.match(/^([A-Za-z0-9]+)\s*-\s*([A-Za-z0-9]+)\s*:\s*(\d+)$/);
    if (!m) throw new Error(`"${part}" is invalid. Use A-B:4 (weight required).`);
    const [, from, to, w] = m;
    if (from === to) throw new Error(`Self-loop "${part}" not allowed.`);
    nodes.add(from);
    nodes.add(to);
    edges.push({ from, to, weight: Number(w) });
  }
  if (nodes.size > 30) throw new Error("Maximum 30 nodes.");
  return { nodes: [...nodes].sort(), edges };
}

const INF = Infinity;

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges, start } = input;
  const layout = circularLayout(nodes);
  const adj = new Map<string, { to: string; w: number }[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    adj.get(e.from)!.push({ to: e.to, w: e.weight });
    adj.get(e.to)!.push({ to: e.from, w: e.weight });
  }

  const dist: Record<string, number> = {};
  const done = new Set<string>();
  const treeEdge: Record<string, string> = {}; // node -> parent
  nodes.forEach((n) => (dist[n] = INF));
  dist[start] = 0;

  const steps: Step<GraphFrame>[] = [];
  let relaxations = 0;

  const fmt = (d: number) => (d === INF ? "∞" : String(d));
  const annotations = () => Object.fromEntries(nodes.map((n) => [n, fmt(dist[n])]));

  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((e) => ({ ...e })),
    weighted: true,
    directed: false,
  });
  const snap = (nodeStates: Record<string, CellState>, edgeStates: Record<string, CellState>, description: string, codeLine: number, descriptionAr?: string) => {
    const pq = nodes.filter((n) => !done.has(n) && dist[n] < INF).sort((a, b) => dist[a] - dist[b]);
    steps.push({
      frame: {
        ...base(),
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        nodeAnnotations: annotations(),
        aux: [{ label: "Frontier", values: pq.map((n) => `${n}:${fmt(dist[n])}`) }],
      },
      description,
      descriptionAr,
      codeLine,
      counters: { relaxations, settled: done.size },
    });
  };

  const doneEdges = (): Record<string, CellState> => {
    const es: Record<string, CellState> = {};
    for (const [child, parent] of Object.entries(treeEdge)) {
      es[`${parent}->${child}`] = "sorted";
      es[`${child}->${parent}`] = "sorted";
    }
    return es;
  };

  snap({ [start]: "active" }, {}, `Dijkstra from ${start}. All distances start at ∞ except ${start} = 0.`, 0, `دايكسترا من ${start}. تبدأ كل المسافات بـ ∞ ما عدا ${start} = 0.`);

  while (done.size < nodes.length) {
    let u: string | null = null;
    for (const n of nodes) if (!done.has(n) && dist[n] < INF && (u === null || dist[n] < dist[u])) u = n;
    if (u === null) break; // remaining unreachable

    done.add(u);
    snap({ ...Object.fromEntries([...done].map((n) => [n, "visited" as CellState])), [u]: "compare" }, doneEdges(), `Settle ${u} with final distance ${fmt(dist[u])} (smallest in frontier).`, 2, `استقرّ عند ${u} بمسافة نهائية ${fmt(dist[u])} (الأصغر في الجبهة).`);

    for (const { to: v, w } of adj.get(u)!) {
      if (done.has(v)) continue;
      relaxations++;
      const nd = dist[u] + w;
      const es = { ...doneEdges(), [`${u}->${v}`]: "compare" as CellState, [`${v}->${u}`]: "compare" as CellState };
      if (nd < dist[v]) {
        dist[v] = nd;
        treeEdge[v] = u;
        snap({ ...Object.fromEntries([...done].map((n) => [n, "visited" as CellState])), [u]: "compare", [v]: "active" }, es, `Relax ${u}→${v}: ${fmt(dist[u])} + ${w} = ${nd} improves ${v}.`, 4, `خفّف الحافة ${u}→${v}: ${fmt(dist[u])} + ${w} = ${nd} يحسّن ${v}.`);
      } else {
        snap({ ...Object.fromEntries([...done].map((n) => [n, "visited" as CellState])), [u]: "compare", [v]: "discarded" }, es, `Edge ${u}→${v}: ${fmt(dist[u])} + ${w} = ${nd} ≥ ${fmt(dist[v])}, no improvement.`, 5, `الحافة ${u}→${v}: ${fmt(dist[u])} + ${w} = ${nd} ≥ ${fmt(dist[v])}، لا تحسين.`);
      }
    }
  }

  const finalStates = Object.fromEntries(nodes.map((n) => [n, done.has(n) ? ("sorted" as CellState) : ("discarded" as CellState)]));
  snap(finalStates, doneEdges(), `Done. Shortest distances from ${start}: ${nodes.map((n) => `${n}=${fmt(dist[n])}`).join(", ")}.`, 6, `اكتمل. أقصر المسافات من ${start}: ${nodes.map((n) => `${n}=${fmt(dist[n])}`).join(", ")}.`);
  return steps;
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "dijkstra",
  title: "Dijkstra's Shortest Path",
  titleAr: "خوارزمية دايكسترا لأقصر مسار (Dijkstra)",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["shortest path", "greedy", "priority queue", "weighted"],
  tagsAr: ["أقصر مسار", "جشِع", "طابور أولوية", "موزون"],
  summary: "Finds shortest paths from a source in a non-negative weighted graph by always settling the closest frontier node.",
  summaryAr: "يجد أقصر المسارات من مصدر في رسم بياني موزون بأوزان غير سالبة، بالاستقرار دومًا عند أقرب عقدة في الجبهة.",
  renderer: "graph",
  pseudocode: [
    "procedure Dijkstra(G, start)",
    "  dist[*] = ∞; dist[start] = 0",
    "  while unsettled nodes remain:",
    "    u = unsettled node with smallest dist",
    "    for each edge (u, v, w):",
    "      if dist[u] + w < dist[v]: dist[v] = dist[u] + w   // relax",
    "  return dist",
  ],
  code: {
    pseudocode: `procedure Dijkstra(G, start)
  dist[*] = INF; dist[start] = 0
  PQ = {(0, start)}
  while PQ not empty:
    (d, u) = PQ.pop_min()
    if d > dist[u]: continue
    for (u, v, w) in edges(u):
      if dist[u] + w < dist[v]:
        dist[v] = dist[u] + w
        PQ.push((dist[v], v))
  return dist`,
    c: `// with a simple O(V^2) scan (no heap)
void dijkstra(int n, int g[][100], int src, int dist[]) {
    bool done[100] = {false};
    for (int i = 0; i < n; i++) dist[i] = INT_MAX;
    dist[src] = 0;
    for (int k = 0; k < n; k++) {
        int u = -1;
        for (int i = 0; i < n; i++)
            if (!done[i] && (u == -1 || dist[i] < dist[u])) u = i;
        if (u == -1 || dist[u] == INT_MAX) break;
        done[u] = true;
        for (int v = 0; v < n; v++)
            if (g[u][v] && dist[u] + g[u][v] < dist[v]) dist[v] = dist[u] + g[u][v];
    }
}`,
    cpp: `#include <queue>
#include <vector>
using namespace std;
vector<int> dijkstra(vector<vector<pair<int,int>>>& adj, int src) {
    vector<int> dist(adj.size(), INT_MAX);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    dist[src] = 0; pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u])
            if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.push({dist[v], v}); }
    }
    return dist;
}`,
    java: `int[] dijkstra(List<int[]>[] adj, int src) {
    int n = adj.length;
    int[] dist = new int[n]; Arrays.fill(dist, Integer.MAX_VALUE);
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    dist[src] = 0; pq.add(new int[]{0, src});
    while (!pq.isEmpty()) {
        int[] top = pq.poll(); int d = top[0], u = top[1];
        if (d > dist[u]) continue;
        for (int[] e : adj[u]) { int v = e[0], w = e[1];
            if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.add(new int[]{dist[v], v}); } }
    }
    return dist;
}`,
    python: `import heapq
def dijkstra(adj, src):
    dist = {u: float('inf') for u in adj}
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return dist`,
    javascript: `function dijkstra(adj, src) {
  const dist = new Map([...adj.keys()].map((u) => [u, Infinity]));
  dist.set(src, 0);
  const pq = [[0, src]]; // simple array as min-heap substitute
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (d > dist.get(u)) continue;
    for (const [v, w] of adj.get(u) ?? [])
      if (dist.get(u) + w < dist.get(v)) { dist.set(v, dist.get(u) + w); pq.push([dist.get(v), v]); }
  }
  return dist;
}`,
    typescript: `function dijkstra(adj: Map<string, [string, number][]>, src: string): Map<string, number> {
  const dist = new Map([...adj.keys()].map((u) => [u, Infinity]));
  dist.set(src, 0);
  const pq: [number, string][] = [[0, src]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (d > dist.get(u)!) continue;
    for (const [v, w] of adj.get(u) ?? [])
      if (dist.get(u)! + w < dist.get(v)!) { dist.set(v, dist.get(u)! + w); pq.push([dist.get(v)!, v]); }
  }
  return dist;
}`,
    csharp: `int[] Dijkstra(List<(int v, int w)>[] adj, int src) {
    int n = adj.Length;
    var dist = new int[n]; Array.Fill(dist, int.MaxValue);
    var pq = new PriorityQueue<int, int>();
    dist[src] = 0; pq.Enqueue(src, 0);
    while (pq.Count > 0) {
        int u = pq.Dequeue();
        foreach (var (v, w) in adj[u])
            if (dist[u] != int.MaxValue && dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.Enqueue(v, dist[v]); }
    }
    return dist;
}`,
    go: `import "container/heap"
func dijkstra(adj map[int][][2]int, src, n int) []int {
	dist := make([]int, n)
	for i := range dist { dist[i] = 1 << 30 }
	dist[src] = 0
	pq := &PQ{{0, src}}
	for pq.Len() > 0 {
		top := heap.Pop(pq).(Item); d, u := top.d, top.u
		if d > dist[u] { continue }
		for _, e := range adj[u] {
			v, w := e[0], e[1]
			if dist[u]+w < dist[v] { dist[v] = dist[u] + w; heap.Push(pq, Item{dist[v], v}) }
		}
	}
	return dist
}`,
    rust: `use std::collections::BinaryHeap;
use std::cmp::Reverse;
fn dijkstra(adj: &Vec<Vec<(usize, u32)>>, src: usize) -> Vec<u32> {
    let mut dist = vec![u32::MAX; adj.len()];
    dist[src] = 0;
    let mut pq = BinaryHeap::new();
    pq.push(Reverse((0u32, src)));
    while let Some(Reverse((d, u))) = pq.pop() {
        if d > dist[u] { continue; }
        for &(v, w) in &adj[u] {
            if dist[u] + w < dist[v] { dist[v] = dist[u] + w; pq.push(Reverse((dist[v], v))); }
        }
    }
    dist
}`,
    kotlin: `import java.util.PriorityQueue
fun dijkstra(adj: Map<Int, List<Pair<Int, Int>>>, src: Int, n: Int): IntArray {
    val dist = IntArray(n) { Int.MAX_VALUE }
    dist[src] = 0
    val pq = PriorityQueue<Pair<Int, Int>>(compareBy { it.first })
    pq.add(0 to src)
    while (pq.isNotEmpty()) {
        val (d, u) = pq.poll()
        if (d > dist[u]) continue
        for ((v, w) in adj[u].orEmpty())
            if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; pq.add(dist[v] to v) }
    }
    return dist
}`,
    swift: `func dijkstra(_ adj: [[(Int, Int)]], _ src: Int) -> [Int] {
    var dist = [Int](repeating: Int.max, count: adj.count)
    dist[src] = 0
    var pq: [(Int, Int)] = [(0, src)]  // (dist, node)
    while !pq.isEmpty {
        pq.sort { $0.0 < $1.0 }
        let (d, u) = pq.removeFirst()
        if d > dist[u] { continue }
        for (v, w) in adj[u] where dist[u] + w < dist[v] {
            dist[v] = dist[u] + w
            pq.append((dist[v], v))
        }
    }
    return dist
}`,
  },
  content: {
    overview: `Dijkstra's algorithm computes shortest paths from a single source to every other node in a graph with non-negative edge weights. It maintains a tentative distance for each node and repeatedly "settles" the unsettled node with the smallest tentative distance — greedily committing to it because, with non-negative weights, no later path can beat it.

Each time a node is settled, the algorithm relaxes its outgoing edges: if going through the settled node reaches a neighbor more cheaply, that neighbor's tentative distance is lowered. With a binary heap as the priority queue, the whole process runs in O((V + E) log V).`,
    howItWorks: [
      "Set the source distance to 0 and all others to ∞; nothing is settled yet.",
      "Pick the unsettled node u with the smallest tentative distance and settle it.",
      "Its tentative distance is now final — non-negative weights guarantee it can't improve.",
      "Relax each edge (u, v, w): if dist[u] + w < dist[v], lower dist[v].",
      "Repeat until every reachable node is settled.",
    ],
    complexity: {
      time: { best: "O((V + E) log V)", average: "O((V + E) log V)", worst: "O((V + E) log V)" },
      space: "O(V)",
      notes: "With a binary heap: O((V + E) log V). With a simple array scan: O(V²), which can be better for dense graphs. Requires non-negative weights.",
    },
    applications: [
      "GPS and network routing (shortest/least-cost paths)",
      "Least-cost pathfinding in games and maps",
      "Network protocols like OSPF (link-state routing)",
      "Any single-source shortest-path problem with non-negative costs",
    ],
    advantages: [
      "Optimal shortest paths with non-negative weights",
      "Efficient O((V + E) log V) with a heap",
      "Computes distances to all nodes in one run",
      "Greedy 'settle the nearest' logic is easy to reason about",
    ],
    disadvantages: [
      "Fails with negative edge weights (use Bellman-Ford)",
      "Recomputes everything if edges change",
      "Heap overhead; a naive O(V²) version may be simpler for dense graphs",
      "Single-source only (all-pairs needs a different approach)",
    ],
    commonMistakes: [
      "Running it on graphs with negative weights — the greedy settle becomes invalid.",
      "Not skipping stale heap entries (checking d > dist[u]).",
      "Updating a node after it's settled.",
      "Using it for longest paths, where the greedy choice doesn't hold.",
    ],
    interviewQuestions: [
      "Why does Dijkstra require non-negative edge weights?",
      "How does the lazy-deletion priority-queue variant work?",
      "Compare Dijkstra with A* — what does the heuristic add?",
      "What is the complexity with a Fibonacci heap and why?",
      "How would you also recover the actual shortest path, not just its length?",
    ],
    summary:
      "Dijkstra's algorithm greedily settles the nearest unsettled node and relaxes its edges, producing single-source shortest paths in O((V + E) log V) for non-negative weights. It's the workhorse of routing and least-cost pathfinding.",
    quiz: [
      { question: "Dijkstra's algorithm requires that edge weights be…", options: ["Integers", "Non-negative", "Distinct", "Symmetric"], answer: 1, explanation: "Negative weights break the greedy 'nearest is final' guarantee." },
      { question: "At each step, Dijkstra settles which node?", options: ["A random unsettled node", "The unsettled node with the smallest tentative distance", "The highest-degree node", "The most recently added node"], answer: 1, explanation: "The closest frontier node can be finalized because no later path is shorter." },
      { question: "With a binary heap, Dijkstra runs in…", options: ["O(V²)", "O((V + E) log V)", "O(VE)", "O(2ⁿ)"], answer: 1, explanation: "Each edge may trigger a heap push/pop costing O(log V)." },
      { question: "For graphs with negative edge weights, use…", options: ["BFS", "Bellman-Ford", "DFS", "Prim's"], answer: 1, explanation: "Bellman-Ford handles negative edges and detects negative cycles." },
      { question: "'Relaxing' an edge (u,v,w) means…", options: ["Deleting it", "Improving dist[v] if dist[u]+w is smaller", "Reversing it", "Doubling its weight"], answer: 1, explanation: "Relaxation lowers a neighbor's tentative distance when a shorter route is found." },
    ],
  },
  contentAr: {
    overview: `تحسب خوارزمية دايكسترا أقصر المسارات من مصدر واحد إلى كل عقدة أخرى في رسم بياني بأوزان حواف غير سالبة. تحتفظ بمسافة مؤقتة لكل عقدة وتُقرّر بشكل متكرر "استقرار" العقدة غير المستقرة ذات أصغر مسافة مؤقتة — تلتزم بها جشعًا لأنه، مع أوزان غير سالبة، لا يمكن لأي مسار لاحق أن يتفوق عليها.

في كل مرة تستقر فيها عقدة، تُخفِّف الخوارزمية حوافها الصادرة: إذا كان المرور عبر العقدة المستقرة يصل إلى جار بتكلفة أقل، تُخفَّض مسافة ذلك الجار المؤقتة. باستخدام كومة ثنائية كطابور أولوية، تعمل العملية كاملة بزمن O((V + E) log V).`,
    howItWorks: [
      "اجعل مسافة المصدر 0 وكل البقية ∞؛ لا شيء مستقر بعد.",
      "اختر العقدة غير المستقرة u ذات أصغر مسافة مؤقتة وأقرّها.",
      "أصبحت مسافتها المؤقتة نهائية الآن — الأوزان غير السالبة تضمن ألا تتحسن.",
      "خفّف كل حافة (u, v, w): إذا كان dist[u] + w < dist[v]، اخفض dist[v].",
      "كرّر حتى تستقر كل عقدة قابلة للوصول.",
    ],
    complexity: {
      time: { best: "O((V + E) log V)", average: "O((V + E) log V)", worst: "O((V + E) log V)" },
      space: "O(V)",
      notes: "بكومة ثنائية: O((V + E) log V). بمسح مصفوفة بسيط: O(V²)، وقد يكون أفضل للرسوم البيانية الكثيفة. تتطلب أوزانًا غير سالبة.",
    },
    applications: [
      "توجيه GPS والشبكات (أقصر/أرخص المسارات)",
      "إيجاد المسار الأقل تكلفة في الألعاب والخرائط",
      "بروتوكولات الشبكات مثل OSPF (توجيه حالة الوصلة)",
      "أي مسألة أقصر مسار من مصدر واحد بتكاليف غير سالبة",
    ],
    advantages: [
      "أقصر مسارات مثالية مع أوزان غير سالبة",
      "فعّالة بزمن O((V + E) log V) باستخدام كومة",
      "تحسب المسافات إلى كل العقد في تشغيلة واحدة",
      "منطق 'استقر عند الأقرب' الجشِع سهل الفهم",
    ],
    disadvantages: [
      "تفشل مع أوزان حواف سالبة (استخدم بيلمان-فورد)",
      "تُعيد حساب كل شيء إذا تغيّرت الحواف",
      "عبء الكومة؛ نسخة O(V²) البسيطة قد تكون أبسط للرسوم البيانية الكثيفة",
      "مصدر واحد فقط (كل الأزواج يحتاج نهجًا مختلفًا)",
    ],
    commonMistakes: [
      "تشغيلها على رسوم بيانية بأوزان سالبة — يصبح الاستقرار الجشِع غير صالح.",
      "عدم تخطي مدخلات الكومة القديمة (فحص d > dist[u]).",
      "تحديث عقدة بعد استقرارها.",
      "استخدامها لأطول المسارات، حيث لا يصح الاختيار الجشِع.",
    ],
    interviewQuestions: [
      "لماذا تتطلب دايكسترا أوزان حواف غير سالبة؟",
      "كيف تعمل نسخة طابور الأولوية بالحذف المتأخر (lazy deletion)؟",
      "قارن دايكسترا بـ A* — ماذا يضيف المُسنِد الاستدلالي (heuristic)؟",
      "ما التعقيد باستخدام كومة فيبوناتشي ولماذا؟",
      "كيف تستعيد المسار الأقصر الفعلي أيضًا، لا طوله فقط؟",
    ],
    summary:
      "تُقرّ خوارزمية دايكسترا جشعًا العقدة غير المستقرة الأقرب وتُخفِّف حوافها، منتجةً أقصر مسارات من مصدر واحد بزمن O((V + E) log V) لأوزان غير سالبة. إنها الأداة الأساسية للتوجيه وإيجاد المسار الأقل تكلفة.",
    quiz: [
      { question: "تتطلب خوارزمية دايكسترا أن تكون أوزان الحواف…", options: ["أعدادًا صحيحة", "غير سالبة", "متمايزة", "متناظرة"], answer: 1, explanation: "الأوزان السالبة تكسر ضمان 'الأقرب نهائي' الجشِع." },
      { question: "في كل خطوة، أي عقدة تستقر عندها دايكسترا؟", options: ["عقدة غير مستقرة عشوائية", "العقدة غير المستقرة ذات أصغر مسافة مؤقتة", "العقدة الأعلى درجة", "العقدة المُضافة الأحدث"], answer: 1, explanation: "يمكن تثبيت أقرب عقدة في الجبهة لأنه لا يوجد مسار لاحق أقصر." },
      { question: "باستخدام كومة ثنائية، تعمل دايكسترا بزمن…", options: ["O(V²)", "O((V + E) log V)", "O(VE)", "O(2ⁿ)"], answer: 1, explanation: "قد تستدعي كل حافة إدخال/إخراج كومة بتكلفة O(log V)." },
      { question: "للرسوم البيانية بأوزان حواف سالبة، استخدم…", options: ["BFS", "بيلمان-فورد", "DFS", "بريم"], answer: 1, explanation: "يتعامل بيلمان-فورد مع الحواف السالبة ويكتشف الدورات السالبة." },
      { question: "'تخفيف' حافة (u,v,w) يعني…", options: ["حذفها", "تحسين dist[v] إذا كان dist[u]+w أصغر", "عكسها", "مضاعفة وزنها"], answer: 1, explanation: "يخفض التخفيف المسافة المؤقتة لجار عندما يُعثَر على مسار أقصر." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Weighted edges", placeholder: "A-B:4, A-C:1, C-B:2, B-D:5", help: "Format A-B:weight (non-negative). Up to 30 nodes.", list: true },
    { key: "start", label: "Start node", placeholder: "A", search: true },
  ],
  defaultInput: (level, rng) => {
    const g = randomGraph(level, rng, { weighted: true });
    return { nodes: g.nodes.map((n) => n.id), edges: g.edges.map((e) => ({ from: e.from, to: e.to, weight: e.weight ?? 1 })), start: g.nodes[0].id };
  },
  parseInput: (fields) => {
    const { nodes, edges } = parseWeightedEdges(fields.edges ?? "");
    const start = (fields.start ?? "").trim();
    if (!start) throw new Error("Enter a start node.");
    if (!nodes.includes(start)) throw new Error(`Start node "${start}" is not in the edge list.`);
    return { nodes, edges, start };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}-${e.to}:${e.weight}`).join(", "), start: input.start }),
  generate,
};

export default mod;
