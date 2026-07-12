import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { randomGraph, circularLayout } from "@/lib/engine/random";

type Input = { nodes: string[]; edges: { from: string; to: string }[] };

/** Parse a directed edge list like "A>B, B>C, A>C". */
export function parseDirectedEdges(text: string): { nodes: string[]; edges: { from: string; to: string }[] } {
  const nodes = new Set<string>();
  const edges: { from: string; to: string }[] = [];
  const parts = text.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one edge, e.g. A>B.");
  for (const part of parts) {
    const m = part.match(/^([A-Za-z0-9]+)\s*(?:->|>|→)\s*([A-Za-z0-9]+)$/);
    if (!m) throw new Error(`"${part}" is invalid. Use directed form A>B.`);
    const [, from, to] = m;
    if (from === to) throw new Error(`Self-loop "${part}" is not allowed.`);
    nodes.add(from);
    nodes.add(to);
    edges.push({ from, to });
  }
  if (nodes.size > 30) throw new Error("Maximum 30 nodes.");
  return { nodes: [...nodes].sort(), edges };
}

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const layout = circularLayout(nodes);
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  const indeg: Record<string, number> = Object.fromEntries(nodes.map((n) => [n, 0]));
  for (const e of edges) {
    adj.get(e.from)!.push(e.to);
    indeg[e.to]++;
  }
  for (const list of adj.values()) list.sort();

  const steps: Step<GraphFrame>[] = [];
  const order: string[] = [];
  const removed = new Set<string>();
  const dynIndeg = { ...indeg };
  let processed = 0;

  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((e) => ({ ...e })),
    directed: true,
  });
  const annotations = () => Object.fromEntries(nodes.map((n) => [n, `in:${dynIndeg[n]}`]));
  const snap = (nodeStates: Record<string, CellState>, queue: string[], description: string, codeLine: number, descriptionAr?: string) => {
    steps.push({
      frame: { ...base(), nodeStates, nodeAnnotations: annotations(), aux: [{ label: "Queue (in=0)", values: [...queue] }, { label: "Order", values: [...order] }] },
      description,
      descriptionAr,
      codeLine,
      counters: { processed, remaining: nodes.length - processed },
    });
  };

  snap({}, [], `Kahn's topological sort: repeatedly output a node with in-degree 0 and remove its edges.`, 0, `ترتيب كاهن الطوبولوجي: أخرِج مرارًا عقدة درجة دخولها 0 وأزل حوافها.`);

  const queue = nodes.filter((n) => indeg[n] === 0).sort();
  snap(Object.fromEntries(queue.map((n) => [n, "active" as CellState])), queue, `Nodes with in-degree 0 start the queue: ${queue.join(", ") || "(none)"}.`, 1, `العقد ذات درجة الدخول 0 تبدأ الطابور: ${queue.join(", ") || "(لا شيء)"}.`);

  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);
    removed.add(u);
    processed++;
    snap({ ...Object.fromEntries([...removed].map((n) => [n, "visited" as CellState])), [u]: "compare" }, queue, `Output ${u}; remove its outgoing edges.`, 2, `أخرِج ${u}؛ أزل حوافها الصادرة.`);
    for (const v of adj.get(u)!) {
      if (removed.has(v)) continue;
      dynIndeg[v]--;
      snap({ ...Object.fromEntries([...removed].map((n) => [n, "visited" as CellState])), [u]: "compare", [v]: "active" }, queue, `Decrement in-degree of ${v} → ${dynIndeg[v]}.`, 3, `أنقص درجة دخول ${v} → ${dynIndeg[v]}.`);
      if (dynIndeg[v] === 0) {
        queue.push(v);
        queue.sort();
        snap({ ...Object.fromEntries([...removed].map((n) => [n, "visited" as CellState])), [v]: "active" }, queue, `${v} now has in-degree 0 — enqueue it.`, 4, `أصبحت درجة دخول ${v} الآن 0 — أدخلها في الطابور.`);
      }
    }
  }

  if (processed < nodes.length) {
    const cyclic = nodes.filter((n) => !removed.has(n));
    snap(Object.fromEntries(cyclic.map((n) => [n, "swap" as CellState])), [], `Only ${processed}/${nodes.length} nodes ordered — the graph has a cycle among {${cyclic.join(", ")}}. No topological order exists.`, 6, `رُتِّبت ${processed}/${nodes.length} عقدة فقط — يحتوي الرسم البياني على دورة بين {${cyclic.join(", ")}}. لا يوجد ترتيب طوبولوجي.`);
    return steps;
  }
  snap(Object.fromEntries(nodes.map((n) => [n, "sorted" as CellState])), [], `Topological order: ${order.join(" → ")}.`, 5, `الترتيب الطوبولوجي: ${order.join(" → ")}.`);
  return steps;
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "topological-sort",
  title: "Topological Sort (Kahn's)",
  titleAr: "الترتيب الطوبولوجي (خوارزمية كاهن)",
  category: "graphs",
  difficulty: "Intermediate",
  tags: ["DAG", "ordering", "in-degree", "dependencies"],
  tagsAr: ["رسم بياني موجه غير دوري", "ترتيب", "درجة الدخول", "تبعيات"],
  summary: "Orders the vertices of a DAG so every edge points forward, by repeatedly removing in-degree-zero nodes.",
  summaryAr: "يرتّب رؤوس رسم بياني موجه غير دوري بحيث تشير كل حافة إلى الأمام، بإزالة العقد ذات درجة الدخول صفر مرارًا.",
  renderer: "graph",
  pseudocode: [
    "procedure topoSort(G)   // G is a DAG",
    "  compute in-degree of every node",
    "  queue = all nodes with in-degree 0",
    "  while queue not empty:",
    "    u = dequeue; append u to order",
    "    for each edge u→v: in-degree[v]--; if 0 enqueue v",
    "  if order covers all nodes: return order else: cycle!",
  ],
  code: {
    pseudocode: `compute indeg[v] for all v
queue = { v : indeg[v] == 0 }
order = []
while queue not empty:
  u = queue.pop(); order.append(u)
  for v in adj[u]:
    indeg[v] -= 1
    if indeg[v] == 0: queue.push(v)
if len(order) < |V|: cycle detected`,
    c: `void topo_sort(int n, int adj[][100], int indeg[]) {
    int queue[100], head=0, tail=0, order[100], oi=0;
    for (int v = 0; v < n; v++) if (indeg[v]==0) queue[tail++]=v;
    while (head < tail) {
        int u = queue[head++]; order[oi++] = u;
        for (int v = 0; v < n; v++)
            if (adj[u][v] && --indeg[v]==0) queue[tail++]=v;
    }
    // oi < n => cycle
}`,
    cpp: `vector<int> topoSort(int n, vector<vector<int>>& adj) {
    vector<int> indeg(n, 0), order;
    for (auto& us : adj) for (int v : us) indeg[v]++;
    queue<int> q;
    for (int v = 0; v < n; v++) if (!indeg[v]) q.push(v);
    while (!q.empty()) {
        int u = q.front(); q.pop(); order.push_back(u);
        for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
    }
    return order; // size < n => cycle
}`,
    java: `List<Integer> topoSort(int n, List<List<Integer>> adj) {
    int[] indeg = new int[n];
    for (List<Integer> us : adj) for (int v : us) indeg[v]++;
    Queue<Integer> q = new LinkedList<>();
    for (int v = 0; v < n; v++) if (indeg[v] == 0) q.add(v);
    List<Integer> order = new ArrayList<>();
    while (!q.isEmpty()) {
        int u = q.poll(); order.add(u);
        for (int v : adj.get(u)) if (--indeg[v] == 0) q.add(v);
    }
    return order; // size < n => cycle
}`,
    python: `from collections import deque
def topo_sort(n, adj):
    indeg = [0] * n
    for us in adj:
        for v in us:
            indeg[v] += 1
    q = deque(v for v in range(n) if indeg[v] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order  # len < n => cycle`,
    javascript: `function topoSort(n, adj) {
  const indeg = new Array(n).fill(0);
  for (const us of adj) for (const v of us) indeg[v]++;
  const q = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) q.push(v);
  const order = [];
  while (q.length) {
    const u = q.shift();
    order.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);
  }
  return order; // length < n => cycle
}`,
    typescript: `function topoSort(n: number, adj: number[][]): number[] {
  const indeg = new Array(n).fill(0);
  for (const us of adj) for (const v of us) indeg[v]++;
  const q: number[] = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) q.push(v);
  const order: number[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) q.push(v);
  }
  return order; // length < n => cycle
}`,
    csharp: `List<int> TopoSort(int n, List<int>[] adj) {
    var indeg = new int[n];
    foreach (var us in adj) foreach (int v in us) indeg[v]++;
    var q = new Queue<int>();
    for (int v = 0; v < n; v++) if (indeg[v] == 0) q.Enqueue(v);
    var order = new List<int>();
    while (q.Count > 0) {
        int u = q.Dequeue(); order.Add(u);
        foreach (int v in adj[u]) if (--indeg[v] == 0) q.Enqueue(v);
    }
    return order; // Count < n => cycle
}`,
    go: `func topoSort(n int, adj [][]int) []int {
	indeg := make([]int, n)
	for _, us := range adj {
		for _, v := range us { indeg[v]++ }
	}
	queue := []int{}
	for v := 0; v < n; v++ { if indeg[v] == 0 { queue = append(queue, v) } }
	order := []int{}
	for len(queue) > 0 {
		u := queue[0]; queue = queue[1:]
		order = append(order, u)
		for _, v := range adj[u] {
			indeg[v]--
			if indeg[v] == 0 { queue = append(queue, v) }
		}
	}
	return order // len < n => cycle
}`,
    rust: `use std::collections::VecDeque;
fn topo_sort(n: usize, adj: &Vec<Vec<usize>>) -> Vec<usize> {
    let mut indeg = vec![0; n];
    for us in adj { for &v in us { indeg[v] += 1; } }
    let mut q: VecDeque<usize> = (0..n).filter(|&v| indeg[v] == 0).collect();
    let mut order = Vec::new();
    while let Some(u) = q.pop_front() {
        order.push(u);
        for &v in &adj[u] {
            indeg[v] -= 1;
            if indeg[v] == 0 { q.push_back(v); }
        }
    }
    order // len < n => cycle
}`,
    kotlin: `fun topoSort(n: Int, adj: List<List<Int>>): List<Int> {
    val indeg = IntArray(n)
    for (us in adj) for (v in us) indeg[v]++
    val q = ArrayDeque((0 until n).filter { indeg[it] == 0 })
    val order = mutableListOf<Int>()
    while (q.isNotEmpty()) {
        val u = q.removeFirst()
        order.add(u)
        for (v in adj[u]) { indeg[v]--; if (indeg[v] == 0) q.addLast(v) }
    }
    return order // size < n => cycle
}`,
    swift: `func topoSort(_ n: Int, _ adj: [[Int]]) -> [Int] {
    var indeg = [Int](repeating: 0, count: n)
    for us in adj { for v in us { indeg[v] += 1 } }
    var q = (0..<n).filter { indeg[$0] == 0 }
    var head = 0, order: [Int] = []
    while head < q.count {
        let u = q[head]; head += 1
        order.append(u)
        for v in adj[u] { indeg[v] -= 1; if indeg[v] == 0 { q.append(v) } }
    }
    return order // count < n => cycle
}`,
  },
  content: {
    overview: `A topological sort of a directed acyclic graph (DAG) is a linear ordering of its vertices such that for every directed edge u → v, u appears before v. It answers questions like "in what order can I perform tasks so every prerequisite comes first?" Any DAG has at least one topological order, and it has more than one whenever some tasks are independent.

Kahn's algorithm computes it using in-degrees — the number of incoming edges each node has. Nodes with in-degree zero have no unmet prerequisites, so they can be output immediately. Removing an output node decrements its successors' in-degrees, potentially freeing them next. If the process stalls before ordering all nodes, the graph must contain a cycle and no topological order exists.`,
    howItWorks: [
      "Compute the in-degree (incoming edge count) of every vertex.",
      "Enqueue all vertices with in-degree zero — they have no prerequisites.",
      "Dequeue a vertex, append it to the output order.",
      "For each of its outgoing edges, decrement the target's in-degree; enqueue the target if it hits zero.",
      "If every vertex is output, the order is valid; if some remain, the graph has a cycle.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "Each vertex is enqueued once and each edge relaxed once. The queue and in-degree array use O(V) space. Also detects cycles as a byproduct.",
    },
    applications: [
      "Task/build scheduling with dependencies (make, package managers)",
      "Course prerequisite ordering",
      "Spreadsheet cell recomputation order",
      "Instruction scheduling and dependency resolution",
    ],
    advantages: [
      "Linear O(V + E) time",
      "Detects cycles for free (if not all nodes are output)",
      "Iterative and simple with a queue",
      "Naturally exposes independent tasks (multiple valid orders)",
    ],
    disadvantages: [
      "Only defined for DAGs — cycles have no topological order",
      "The order is not unique (may need tie-breaking rules)",
      "Requires computing and maintaining in-degrees",
      "Different from DFS-based topo sort in output order",
    ],
    commonMistakes: [
      "Running it on a graph with a cycle and expecting a full ordering.",
      "Forgetting to check that all vertices were output (cycle detection).",
      "Incorrectly computing in-degrees (counting outgoing instead of incoming).",
      "Assuming the topological order is unique.",
    ],
    interviewQuestions: [
      "How does Kahn's algorithm detect a cycle?",
      "Contrast Kahn's (BFS-based) with the DFS-based topological sort.",
      "Why can a DAG have multiple valid topological orders?",
      "How would you find any one valid task schedule from dependencies?",
    ],
    summary:
      "Topological sort (Kahn's) orders a DAG's vertices so every edge points forward, by repeatedly emitting in-degree-zero nodes and decrementing their successors. It runs in O(V + E) and detects cycles when not all nodes can be ordered.",
    quiz: [
      { question: "A topological sort is defined only for…", options: ["Undirected graphs", "Directed acyclic graphs (DAGs)", "Complete graphs", "Weighted graphs"], answer: 1, explanation: "Cycles make a consistent 'prerequisites first' ordering impossible." },
      { question: "Kahn's algorithm starts by enqueuing nodes with…", options: ["Maximum degree", "In-degree zero", "Out-degree zero", "The smallest label"], answer: 1, explanation: "In-degree-zero nodes have no unmet prerequisites." },
      { question: "How does Kahn's detect a cycle?", options: ["The queue overflows", "Fewer than V nodes get output", "A node repeats", "It never terminates"], answer: 1, explanation: "A cycle leaves some nodes with permanently positive in-degree, so they're never output." },
      { question: "Topological sort runs in…", options: ["O(V²)", "O(V + E)", "O(E log V)", "O(2ⁿ)"], answer: 1, explanation: "Each vertex and edge is processed once." },
      { question: "A DAG can have…", options: ["Exactly one topological order", "Possibly many topological orders", "No topological order", "Only two orders"], answer: 1, explanation: "Independent nodes can be ordered in multiple valid ways." },
    ],
  },
  contentAr: {
    overview: `الترتيب الطوبولوجي لرسم بياني موجه غير دوري (DAG) هو ترتيب خطي لرؤوسه بحيث تظهر u قبل v لكل حافة موجهة u → v. إنه يجيب على أسئلة مثل "بأي ترتيب أنفّذ المهام كي تسبق كل متطلبات مسبقة؟" لأي رسم بياني موجه غير دوري ترتيب طوبولوجي واحد على الأقل، وله أكثر من ترتيب كلما كانت بعض المهام مستقلة.

تحسبه خوارزمية كاهن باستخدام درجات الدخول — عدد الحواف الداخلة لكل عقدة. العقد ذات درجة الدخول صفر ليس لها متطلبات مسبقة غير مستوفاة، لذا يمكن إخراجها فورًا. إزالة عقدة مُخرَجة تُنقص درجات دخول خلفائها، مما قد يحرّرهم لاحقًا. إذا توقفت العملية قبل ترتيب كل العقد، فلا بد أن يحتوي الرسم البياني على دورة ولا يوجد ترتيب طوبولوجي.`,
    howItWorks: [
      "احسب درجة الدخول (عدد الحواف الداخلة) لكل رأس.",
      "أدخل في الطابور كل الرؤوس ذات درجة الدخول صفر — ليس لها متطلبات مسبقة.",
      "أخرِج رأسًا من الطابور، وألحقه بترتيب الإخراج.",
      "لكل حافة صادرة منه، أنقص درجة دخول الهدف؛ أدخل الهدف في الطابور إن وصلت إلى صفر.",
      "إذا أُخرِج كل رأس، فالترتيب صحيح؛ وإن بقي بعضها، فالرسم البياني يحتوي على دورة.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "يُدخَل كل رأس في الطابور مرة واحدة وتُخفَّف كل حافة مرة واحدة. يستخدم الطابور ومصفوفة درجات الدخول مساحة O(V). يكتشف الدورات أيضًا كأثر جانبي.",
    },
    applications: [
      "جدولة المهام/البناء مع التبعيات (make، مديرو الحزم)",
      "ترتيب المتطلبات المسبقة للمقررات الدراسية",
      "ترتيب إعادة حساب خلايا جداول البيانات",
      "جدولة التعليمات وحل التبعيات",
    ],
    advantages: [
      "زمن خطي O(V + E)",
      "يكتشف الدورات مجانًا (إذا لم تُخرَج كل العقد)",
      "تكراري وبسيط باستخدام طابور",
      "يكشف طبيعيًا عن المهام المستقلة (ترتيبات صحيحة متعددة)",
    ],
    disadvantages: [
      "معرَّف فقط للرسوم البيانية الموجهة غير الدورية — الدورات لا ترتيب طوبولوجي لها",
      "الترتيب ليس فريدًا (قد يحتاج قواعد فض تعادل)",
      "يتطلب حساب درجات الدخول والحفاظ عليها",
      "مختلف عن الترتيب الطوبولوجي القائم على DFS في ترتيب الإخراج",
    ],
    commonMistakes: [
      "تشغيله على رسم بياني به دورة وتوقع ترتيب كامل.",
      "نسيان التحقق من أن كل الرؤوس أُخرِجت (اكتشاف الدورة).",
      "حساب درجات الدخول بشكل خاطئ (عدّ الصادرة بدل الداخلة).",
      "افتراض أن الترتيب الطوبولوجي فريد.",
    ],
    interviewQuestions: [
      "كيف تكتشف خوارزمية كاهن دورة؟",
      "قارن بين خوارزمية كاهن (القائمة على BFS) والترتيب الطوبولوجي القائم على DFS.",
      "لماذا يمكن أن يكون لرسم بياني موجه غير دوري عدة ترتيبات طوبولوجية صحيحة؟",
      "كيف تجد أي جدول مهام صحيح واحد من التبعيات؟",
    ],
    summary:
      "يرتّب الترتيب الطوبولوجي (خوارزمية كاهن) رؤوس رسم بياني موجه غير دوري بحيث تشير كل حافة إلى الأمام، بإخراج العقد ذات درجة الدخول صفر مرارًا وإنقاص درجات دخول خلفائها. يعمل بزمن O(V + E) ويكتشف الدورات عندما يتعذر ترتيب كل العقد.",
    quiz: [
      { question: "الترتيب الطوبولوجي مُعرَّف فقط من أجل…", options: ["الرسوم البيانية غير الموجهة", "الرسوم البيانية الموجهة غير الدورية (DAGs)", "الرسوم البيانية الكاملة", "الرسوم البيانية الموزونة"], answer: 1, explanation: "الدورات تجعل ترتيب 'المتطلبات المسبقة أولًا' المتّسق مستحيلًا." },
      { question: "تبدأ خوارزمية كاهن بإدخال العقد ذات…", options: ["الدرجة القصوى", "درجة الدخول صفر", "درجة الخروج صفر", "أصغر تسمية"], answer: 1, explanation: "العقد ذات درجة الدخول صفر ليس لها متطلبات مسبقة غير مستوفاة." },
      { question: "كيف تكتشف خوارزمية كاهن دورة؟", options: ["يفيض الطابور", "تُخرَج عقد أقل من V", "تتكرر عقدة", "لا تنتهي أبدًا"], answer: 1, explanation: "الدورة تترك بعض العقد بدرجة دخول موجبة دائمًا، فلا تُخرَج أبدًا." },
      { question: "يعمل الترتيب الطوبولوجي بزمن…", options: ["O(V²)", "O(V + E)", "O(E log V)", "O(2ⁿ)"], answer: 1, explanation: "تتم معالجة كل رأس وكل حافة مرة واحدة." },
      { question: "يمكن أن يكون لرسم بياني موجه غير دوري…", options: ["ترتيب طوبولوجي واحد بالضبط", "عدة ترتيبات طوبولوجية محتملة", "لا ترتيب طوبولوجي", "ترتيبان فقط"], answer: 1, explanation: "يمكن ترتيب العقد المستقلة بطرق صحيحة متعددة." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Directed edges", placeholder: "A>B, A>C, B>D, C>D, D>E", help: "Format A>B (edge points A to B). Must be acyclic. Up to 20 nodes.", list: true },
  ],
  defaultInput: (level, rng) => {
    const g = randomGraph(level, rng, { directed: true, acyclic: true });
    return { nodes: g.nodes.map((n) => n.id), edges: g.edges.map((e) => ({ from: e.from, to: e.to })) };
  },
  parseInput: (fields) => {
    const { nodes, edges } = parseDirectedEdges(fields.edges ?? "");
    return { nodes, edges };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}>${e.to}`).join(", ") }),
  generate,
};

export default mod;
