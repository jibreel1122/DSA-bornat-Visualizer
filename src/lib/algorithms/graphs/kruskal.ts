import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { randomGraph, circularLayout } from "@/lib/engine/random";
import { parseWeightedEdges } from "./dijkstra";

type WEdge = { from: string; to: string; weight: number };
type Input = { nodes: string[]; edges: WEdge[] };

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes } = input;
  const layout = circularLayout(nodes);
  const sorted = [...input.edges].sort((a, b) => a.weight - b.weight);
  const parent: Record<string, string> = Object.fromEntries(nodes.map((n) => [n, n]));
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: string, b: string) => { parent[find(a)] = find(b); };

  const steps: Step<GraphFrame>[] = [];
  const mstEdges = new Set<string>();
  let totalWeight = 0;
  let unions = 0;

  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: input.edges.map((e) => ({ ...e })),
    weighted: true,
    directed: false,
  });
  const edgeStatesFor = (extra: Record<string, CellState> = {}): Record<string, CellState> => {
    const es: Record<string, CellState> = { ...extra };
    for (const key of mstEdges) {
      const [f, t] = key.split("->");
      es[`${f}->${t}`] = "sorted";
      es[`${t}->${f}`] = "sorted";
    }
    return es;
  };
  const sortedAux = (activeIdx: number) => ({
    label: "sorted edges",
    values: sorted.map((e, i) => `${e.from}${e.to}:${e.weight}${i === activeIdx ? "◄" : ""}`),
  });

  const snap = (nodeStates: Record<string, CellState>, es: Record<string, CellState>, activeIdx: number, description: string, codeLine: number, descriptionAr?: string) => {
    steps.push({
      frame: { ...base(), nodeStates, edgeStates: es, aux: [sortedAux(activeIdx), { label: "MST weight", values: [totalWeight] }] },
      description,
      descriptionAr,
      codeLine,
      counters: { unions, edges: mstEdges.size },
    });
  };

  snap({}, edgeStatesFor(), -1, `Kruskal's MST: sort edges by weight, then add each edge that doesn't form a cycle.`, 0, `شجرة كروسكال الممتدة الصغرى: رتّب الحواف حسب الوزن، ثم أضف كل حافة لا تُشكِّل دورة.`);
  snap({}, edgeStatesFor(), -1, `Edges sorted ascending by weight.`, 1, `رُتِّبت الحواف تصاعديًا حسب الوزن.`);

  for (let i = 0; i < sorted.length && mstEdges.size < nodes.length - 1; i++) {
    const e = sorted[i];
    const active = { [`${e.from}->${e.to}`]: "compare" as CellState, [`${e.to}->${e.from}`]: "compare" as CellState };
    snap({ [e.from]: "active", [e.to]: "active" }, edgeStatesFor(active), i, `Consider edge ${e.from}–${e.to} (weight ${e.weight}). Same set?`, 2, `انظر إلى الحافة ${e.from}–${e.to} (الوزن ${e.weight}). هل هما في المجموعة نفسها؟`);
    if (find(e.from) !== find(e.to)) {
      union(e.from, e.to);
      unions++;
      mstEdges.add(`${e.from}->${e.to}`);
      totalWeight += e.weight;
      snap({ [e.from]: "sorted", [e.to]: "sorted" }, edgeStatesFor(), i, `Different sets — add it. Union ${e.from} and ${e.to}. MST weight ${totalWeight}.`, 3, `مجموعتان مختلفتان — أضفها. وحّد ${e.from} و${e.to}. وزن الشجرة الممتدة الصغرى ${totalWeight}.`);
    } else {
      snap({ [e.from]: "discarded", [e.to]: "discarded" }, edgeStatesFor({ [`${e.from}->${e.to}`]: "discarded", [`${e.to}->${e.from}`]: "discarded" }), i, `Same set — adding it would form a cycle. Skip.`, 4, `نفس المجموعة — إضافتها ستُشكِّل دورة. تخطَّها.`);
    }
  }
  if (mstEdges.size === nodes.length - 1) {
    snap(Object.fromEntries(nodes.map((n) => [n, "sorted" as CellState])), edgeStatesFor(), -1, `MST complete with ${mstEdges.size} edges, total weight ${totalWeight}.`, 5, `اكتملت الشجرة الممتدة الصغرى بـ ${mstEdges.size} حافة، الوزن الإجمالي ${totalWeight}.`);
  } else {
    snap(
      Object.fromEntries(nodes.map((n) => [n, "active" as CellState])),
      edgeStatesFor(),
      -1,
      `Graph is disconnected: the ${mstEdges.size} chosen edges form a minimum spanning forest, not one MST. Forest weight ${totalWeight}.`,
      5,
      `الرسم البياني غير متصل: تشكل الحواف المختارة وعددها ${mstEdges.size} غابة ممتدة صغرى، وليست شجرة ممتدة صغرى واحدة. وزن الغابة ${totalWeight}.`,
    );
  }
  return steps;
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "kruskal",
  title: "Kruskal's MST",
  titleAr: "شجرة كروسكال الممتدة الصغرى (Kruskal)",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["minimum spanning tree", "greedy", "union-find", "weighted"],
  tagsAr: ["شجرة ممتدة صغرى", "جشِع", "اتحاد-بحث", "موزون"],
  summary: "Sorts all edges by weight and adds each one that doesn't create a cycle, using union-find to detect cycles.",
  summaryAr: "يرتّب كل الحواف حسب الوزن ويضيف كل حافة لا تُنشئ دورة، مستخدمًا هيكل اتحاد-بحث لاكتشاف الدورات.",
  renderer: "graph",
  pseudocode: [
    "procedure Kruskal(G)",
    "  sort edges by weight ascending",
    "  for each edge (u,v) in order:",
    "    if find(u) != find(v):   // no cycle",
    "      add edge; union(u, v)",
    "    else: skip (would form a cycle)",
    "  return the chosen edges (MST)",
  ],
  code: {
    pseudocode: `sort edges by weight
for (u, v, w) in edges:
  if find(u) != find(v):
    mst.add((u, v)); union(u, v); total += w
return mst, total`,
    c: `int parent[100];
int find(int x){ return parent[x]==x ? x : (parent[x]=find(parent[x])); }
int kruskal(int n, int (*edges)[3], int m) {
    for (int i = 0; i < n; i++) parent[i] = i;
    // assume edges sorted by weight (edges[i] = {u, v, w})
    int total = 0, count = 0;
    for (int i = 0; i < m && count < n-1; i++) {
        int u = edges[i][0], v = edges[i][1], w = edges[i][2];
        if (find(u) != find(v)) { parent[find(u)] = find(v); total += w; count++; }
    }
    return total;
}`,
    cpp: `struct DSU { vector<int> p; DSU(int n):p(n){iota(p.begin(),p.end(),0);}
    int find(int x){ return p[x]==x?x:p[x]=find(p[x]); }
    bool uni(int a,int b){ a=find(a);b=find(b); if(a==b)return false; p[a]=b; return true; } };
int kruskal(int n, vector<array<int,3>>& edges) {
    sort(edges.begin(), edges.end(), [](auto&a, auto&b){ return a[2]<b[2]; });
    DSU dsu(n); int total = 0;
    for (auto& [w, u, v] : edges) if (dsu.uni(u, v)) total += w;
    return total;
}`,
    java: `int[] parent;
int find(int x){ return parent[x]==x ? x : (parent[x]=find(parent[x])); }
int kruskal(int n, int[][] edges) { // edges[i] = {u, v, w}
    parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    Arrays.sort(edges, (a, b) -> a[2] - b[2]);
    int total = 0;
    for (int[] e : edges) {
        if (find(e[0]) != find(e[1])) { parent[find(e[0])] = find(e[1]); total += e[2]; }
    }
    return total;
}`,
    python: `def kruskal(n, edges):  # edges = list of (w, u, v)
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    total = 0
    for w, u, v in sorted(edges):
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            total += w
    return total`,
    javascript: `function kruskal(n, edges) { // edges: [u, v, w]
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  edges.sort((a, b) => a[2] - b[2]);
  let total = 0;
  for (const [u, v, w] of edges) {
    if (find(u) !== find(v)) { parent[find(u)] = find(v); total += w; }
  }
  return total;
}`,
    typescript: `function kruskal(n: number, edges: [number, number, number][]): number {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  edges.sort((a, b) => a[2] - b[2]);
  let total = 0;
  for (const [u, v, w] of edges) {
    if (find(u) !== find(v)) { parent[find(u)] = find(v); total += w; }
  }
  return total;
}`,
    csharp: `int[] parent;
int Find(int x) => parent[x] == x ? x : (parent[x] = Find(parent[x]));
int Kruskal(int n, int[][] edges) { // {u, v, w}
    parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    Array.Sort(edges, (a, b) => a[2] - b[2]);
    int total = 0;
    foreach (var e in edges)
        if (Find(e[0]) != Find(e[1])) { parent[Find(e[0])] = Find(e[1]); total += e[2]; }
    return total;
}`,
    go: `func kruskal(n int, edges [][3]int) int { // {u, v, w}
	parent := make([]int, n)
	for i := range parent { parent[i] = i }
	var find func(int) int
	find = func(x int) int { if parent[x] != x { parent[x] = find(parent[x]) }; return parent[x] }
	sort.Slice(edges, func(i, j int) bool { return edges[i][2] < edges[j][2] })
	total := 0
	for _, e := range edges {
		if find(e[0]) != find(e[1]) { parent[find(e[0])] = find(e[1]); total += e[2] }
	}
	return total
}`,
    rust: `fn kruskal(n: usize, mut edges: Vec<(usize, usize, i32)>) -> i32 {
    let mut parent: Vec<usize> = (0..n).collect();
    fn find(p: &mut Vec<usize>, x: usize) -> usize {
        if p[x] != x { let r = find(p, p[x]); p[x] = r; }
        p[x]
    }
    edges.sort_by_key(|e| e.2);
    let mut total = 0;
    for (u, v, w) in edges {
        let (ru, rv) = (find(&mut parent, u), find(&mut parent, v));
        if ru != rv { parent[ru] = rv; total += w; }
    }
    total
}`,
    kotlin: `fun kruskal(n: Int, edges: List<Triple<Int, Int, Int>>): Int {
    val parent = IntArray(n) { it }
    fun find(x: Int): Int { var r = x; while (parent[r] != r) r = parent[r]; return r }
    var total = 0
    for ((u, v, w) in edges.sortedBy { it.third }) {
        val ru = find(u); val rv = find(v)
        if (ru != rv) { parent[ru] = rv; total += w }
    }
    return total
}`,
    swift: `func kruskal(_ n: Int, _ edges: [(Int, Int, Int)]) -> Int {
    var parent = Array(0..<n)
    func find(_ x: Int) -> Int { var r = x; while parent[r] != r { r = parent[r] }; return r }
    var total = 0
    for (u, v, w) in edges.sorted(by: { $0.2 < $1.2 }) {
        let ru = find(u), rv = find(v)
        if ru != rv { parent[ru] = rv; total += w }
    }
    return total
}`,
  },
  content: {
    overview: `Kruskal's algorithm finds a minimum spanning tree by taking a global, edge-centric view. It sorts every edge by weight and then walks through them from cheapest to most expensive, adding an edge to the tree whenever its two endpoints are in different connected components. If both endpoints already sit in the same component, adding the edge would create a cycle, so it is skipped.

The key to doing this efficiently is the union-find (disjoint-set) data structure, which answers "are these two vertices already connected?" and merges components in nearly constant amortized time. Sorting dominates the cost, giving O(E log E) overall. Kruskal's is especially natural when the graph is given as an edge list and is sparse.`,
    howItWorks: [
      "Sort all edges in non-decreasing order of weight.",
      "Initialize each vertex as its own singleton set (union-find).",
      "Scan edges cheapest-first; for each, check whether its endpoints are in the same set.",
      "If they are in different sets, add the edge to the MST and union the two sets.",
      "If they are in the same set, skip it (it would form a cycle). Stop after V−1 edges.",
    ],
    complexity: {
      time: { best: "O(E log E)", average: "O(E log E)", worst: "O(E log E)" },
      space: "O(V + E)",
      notes: "Sorting edges is O(E log E) = O(E log V), dominating the near-constant union-find operations. Union-find with path compression and union by rank gives near-O(1) amortized set operations.",
    },
    applications: [
      "Least-cost network design from an edge list",
      "Clustering (single-linkage) by removing the heaviest MST edges",
      "Image segmentation and maze generation",
      "Approximation algorithms building on MSTs",
    ],
    advantages: [
      "Simple, global greedy strategy",
      "Excellent for sparse graphs given as edge lists",
      "Union-find makes cycle checks nearly O(1)",
      "Naturally handles graphs that start disconnected (builds a forest)",
    ],
    disadvantages: [
      "Sorting all edges can be costly on dense graphs (Prim's O(V²) may win)",
      "Requires the union-find structure",
      "Less natural when the graph is given as an adjacency matrix",
      "Needs all edges available up front",
    ],
    commonMistakes: [
      "Forgetting path compression / union by rank, hurting performance.",
      "Adding an edge whose endpoints are already connected (creating a cycle).",
      "Not stopping after V−1 edges have been chosen.",
      "Confusing the MST with shortest-path trees.",
    ],
    interviewQuestions: [
      "How does union-find detect that an edge would form a cycle?",
      "Why is Kruskal's dominated by the edge-sorting step?",
      "Compare Kruskal's and Prim's for sparse vs dense graphs.",
      "How do path compression and union by rank speed up union-find?",
    ],
    summary:
      "Kruskal's algorithm sorts edges by weight and greedily adds each edge whose endpoints lie in different components (checked via union-find), skipping cycle-forming edges. It runs in O(E log E) and is ideal for sparse, edge-list graphs.",
    quiz: [
      { question: "Kruskal's processes edges in what order?", options: ["Random", "Cheapest weight first", "By vertex label", "Most expensive first"], answer: 1, explanation: "It sorts edges ascending and adds them greedily." },
      { question: "Which data structure detects cycles in Kruskal's?", options: ["Stack", "Union-find (disjoint set)", "Priority queue", "Hash map"], answer: 1, explanation: "Union-find tells whether two vertices are already connected." },
      { question: "Kruskal's time complexity is dominated by…", options: ["Union-find", "Sorting the edges, O(E log E)", "BFS", "Matrix multiplication"], answer: 1, explanation: "The near-constant union-find is dwarfed by the O(E log E) sort." },
      { question: "An edge is skipped when its endpoints…", options: ["Have different weights", "Are in the same connected component", "Are leaves", "Are the start node"], answer: 1, explanation: "Same component means adding the edge would create a cycle." },
      { question: "Kruskal's is especially good for…", options: ["Dense adjacency matrices", "Sparse graphs given as edge lists", "Directed graphs", "Unweighted graphs"], answer: 1, explanation: "Sorting an edge list and using union-find fits sparse inputs naturally." },
    ],
  },
  contentAr: {
    overview: `تجد خوارزمية كروسكال شجرة ممتدة صغرى بأخذ نظرة عامة تتمحور حول الحواف. تُرتّب كل حافة حسب الوزن ثم تمر عليها من الأرخص إلى الأغلى، مضيفةً حافة إلى الشجرة كلما كان طرفاها في مكوّنين متصلين مختلفين. وإذا كان الطرفان في المكوّن نفسه بالفعل، فإضافة الحافة ستُنشئ دورة، فتُتخطى.

مفتاح القيام بذلك بكفاءة هو هيكل بيانات اتحاد-بحث (المجموعات المنفصلة)، الذي يجيب على سؤال "هل هذان الرأسان متصلان بالفعل؟" ويدمج المكوّنات في زمن مطفأ شبه ثابت. الترتيب يهيمن على التكلفة، معطيًا O(E log E) إجمالًا. خوارزمية كروسكال طبيعية بوجه خاص عندما يُعطى الرسم البياني كقائمة حواف ويكون متناثرًا.`,
    howItWorks: [
      "رتّب كل الحواف بترتيب غير تنازلي حسب الوزن.",
      "هيّئ كل رأس كمجموعة أحادية خاصة به (اتحاد-بحث).",
      "امسح الحواف من الأرخص أولًا؛ لكل حافة، افحص إن كان طرفاها في المجموعة نفسها.",
      "إن كانا في مجموعتين مختلفتين، أضف الحافة إلى الشجرة الممتدة الصغرى ووحّد المجموعتين.",
      "إن كانا في المجموعة نفسها، تخطَّها (ستُشكِّل دورة). توقف بعد V−1 حافة.",
    ],
    complexity: {
      time: { best: "O(E log E)", average: "O(E log E)", worst: "O(E log E)" },
      space: "O(V + E)",
      notes: "ترتيب الحواف يكلّف O(E log E) = O(E log V)، وهو ما يهيمن على عمليات اتحاد-بحث شبه الثابتة. اتحاد-بحث مع ضغط المسار والاتحاد حسب الرتبة يعطي عمليات مجموعة مطفأة قريبة من O(1).",
    },
    applications: [
      "تصميم شبكات أقل تكلفة من قائمة حواف",
      "التجميع (بالربط الفردي) بإزالة أثقل حواف الشجرة الممتدة الصغرى",
      "تجزئة الصور وتوليد المتاهات",
      "خوارزميات التقريب المبنية على الأشجار الممتدة الصغرى",
    ],
    advantages: [
      "استراتيجية جشِعة عامة وبسيطة",
      "ممتازة للرسوم البيانية المتناثرة المُعطاة كقوائم حواف",
      "اتحاد-بحث يجعل فحوصات الدورة شبه O(1)",
      "تتعامل طبيعيًا مع الرسوم البيانية غير المتصلة ابتداءً (تبني غابة)",
    ],
    disadvantages: [
      "ترتيب كل الحواف قد يكون مكلفًا في الرسوم البيانية الكثيفة (قد تفوز O(V²) لبرايم)",
      "تتطلب هيكل اتحاد-بحث",
      "أقل طبيعية عندما يُعطى الرسم البياني كمصفوفة تجاور",
      "تحتاج كل الحواف متاحة مسبقًا",
    ],
    commonMistakes: [
      "نسيان ضغط المسار / الاتحاد حسب الرتبة، مما يضر بالأداء.",
      "إضافة حافة طرفاها متصلان بالفعل (مما يُنشئ دورة).",
      "عدم التوقف بعد اختيار V−1 حافة.",
      "الخلط بين الشجرة الممتدة الصغرى وأشجار أقصر المسار.",
    ],
    interviewQuestions: [
      "كيف يكتشف اتحاد-بحث أن حافة ستُشكِّل دورة؟",
      "لماذا تهيمن خطوة ترتيب الحواف على تكلفة خوارزمية كروسكال؟",
      "قارن بين كروسكال وبرايم للرسوم البيانية المتناثرة مقابل الكثيفة.",
      "كيف يُسرِّع ضغط المسار والاتحاد حسب الرتبة هيكل اتحاد-بحث؟",
    ],
    summary:
      "ترتّب خوارزمية كروسكال الحواف حسب الوزن وتضيف جشعًا كل حافة يقع طرفاها في مكوّنين مختلفين (يُفحص عبر اتحاد-بحث)، متخطيةً الحواف المُشكِّلة للدورات. تعمل بزمن O(E log E) ومثالية للرسوم البيانية المتناثرة المُعطاة كقوائم حواف.",
    quiz: [
      { question: "بأي ترتيب تُعالج خوارزمية كروسكال الحواف؟", options: ["عشوائي", "الأرخص وزنًا أولًا", "حسب تسمية الرأس", "الأغلى أولًا"], answer: 1, explanation: "تُرتِّب الحواف تصاعديًا وتضيفها جشعًا." },
      { question: "أي هيكل بيانات يكتشف الدورات في خوارزمية كروسكال؟", options: ["مكدس", "اتحاد-بحث (مجموعة منفصلة)", "طابور أولوية", "خريطة تجزئة"], answer: 1, explanation: "يخبر اتحاد-بحث ما إذا كان رأسان متصلين بالفعل." },
      { question: "يهيمن على تعقيد خوارزمية كروسكال الزمني…", options: ["اتحاد-بحث", "ترتيب الحواف، O(E log E)", "BFS", "ضرب المصفوفات"], answer: 1, explanation: "تتضاءل عمليات اتحاد-بحث شبه الثابتة أمام ترتيب O(E log E)." },
      { question: "تُتخطى الحافة عندما يكون طرفاها…", options: ["بأوزان مختلفة", "في المكوّن المتصل نفسه", "أوراقًا", "عقدة البداية"], answer: 1, explanation: "المكوّن نفسه يعني أن إضافة الحافة ستُنشئ دورة." },
      { question: "خوارزمية كروسكال جيدة بوجه خاص من أجل…", options: ["مصفوفات تجاور كثيفة", "رسوم بيانية متناثرة مُعطاة كقوائم حواف", "رسوم بيانية موجهة", "رسوم بيانية غير موزونة"], answer: 1, explanation: "ترتيب قائمة حواف واستخدام اتحاد-بحث يناسب المدخلات المتناثرة طبيعيًا." },
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
