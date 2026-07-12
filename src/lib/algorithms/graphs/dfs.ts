import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { randomGraph, circularLayout } from "@/lib/engine/random";
import { parseEdgeList } from "./bfs";

type Input = {
  nodes: string[];
  edges: { from: string; to: string }[];
  start: string;
};

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
  const nodeStates: Record<string, CellState> = {};
  const edgeStates: Record<string, CellState> = {};
  const stack: string[] = [];
  const order: string[] = [];
  const seen = new Set<string>();
  let visited = 0;

  const base = () => ({
    nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
    edges: edges.map((e) => ({ ...e })),
    directed: false,
  });
  const snap = (description: string, codeLine: number, descriptionAr?: string) => {
    steps.push({
      frame: {
        ...base(),
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        aux: [
          { label: "Stack", values: [...stack] },
          { label: "Visited", values: [...order] },
        ],
      },
      description,
      descriptionAr,
      codeLine,
      counters: { visited },
    });
  };

  snap(`Depth-first search from ${start}: go as deep as possible, then backtrack.`, 0, `بحث بالعمق أولًا انطلاقًا من ${start}: تعمّق قدر الإمكان، ثم تراجع.`);

  const dfs = (u: string, parent: string | null) => {
    seen.add(u);
    stack.push(u);
    nodeStates[u] = "active";
    if (parent) edgeStates[`${parent}->${u}`] = "sorted";
    snap(`Discover ${u} and push it on the stack.`, 1, `اكتشف ${u} وادفعها إلى المكدس.`);
    order.push(u);
    visited++;
    nodeStates[u] = "compare";
    snap(`Visit ${u}; explore its neighbors.`, 2, `زر ${u}؛ استكشف جيرانها.`);
    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v)) {
        snap(`Edge ${u}–${v}: ${v} is undiscovered, recurse.`, 3, `الحافة ${u}–${v}: ${v} غير مكتشَفة، انتقل إليها عوديًا.`);
        dfs(v, u);
        snap(`Backtrack to ${u}.`, 4, `تراجع إلى ${u}.`);
      }
    }
    nodeStates[u] = "visited";
    stack.pop();
    snap(`${u} fully explored — pop from stack.`, 5, `اكتمل استكشاف ${u} — أخرجها من المكدس.`);
  };

  dfs(start, null);
  const unreached = nodes.filter((n) => !seen.has(n));
  snap(
    unreached.length
      ? `DFS complete. Order: ${order.join(" → ")}. Unreachable: ${unreached.join(", ")}.`
      : `DFS complete. Visit order: ${order.join(" → ")}.`,
    6,
    unreached.length
      ? `اكتمل DFS. الترتيب: ${order.join(" → ")}. غير قابلة للوصول: ${unreached.join(", ")}.`
      : `اكتمل DFS. ترتيب الزيارة: ${order.join(" → ")}.`,
  );
  return steps;
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "dfs",
  title: "Depth-First Search (DFS)",
  titleAr: "البحث بالعمق أولًا (DFS)",
  category: "graphs",
  difficulty: "Beginner",
  tags: ["traversal", "stack", "recursion", "backtracking"],
  tagsAr: ["اجتياز", "مكدس", "العودية", "التراجع"],
  summary: "Explores each branch as deeply as possible before backtracking — the basis of many graph algorithms.",
  summaryAr: "يستكشف كل فرع بأقصى عمق ممكن قبل التراجع — أساس كثير من خوارزميات الرسوم البيانية.",
  renderer: "graph",
  pseudocode: [
    "procedure DFS(G, start)",
    "  mark start; push/enter start",
    "  visit start",
    "  for each neighbor v of current:",
    "    if v undiscovered: recurse into v",
    "    else: (skip) ... after returning, backtrack",
    "  mark current finished; pop",
    "  return visit order",
  ],
  code: {
    pseudocode: `procedure DFS(G, u, visited)
  mark u as visited; output u
  for each neighbor v of u:
    if v not visited:
      DFS(G, v, visited)`,
    c: `void dfs(int u, int n, bool adj[][100], bool seen[]) {
    seen[u] = true; printf("%d ", u);
    for (int v = 0; v < n; v++)
        if (adj[u][v] && !seen[v]) dfs(v, n, adj, seen);
}`,
    cpp: `void dfs(int u, const vector<vector<int>>& adj, vector<bool>& seen) {
    seen[u] = true; cout << u << ' ';
    for (int v : adj[u]) if (!seen[v]) dfs(v, adj, seen);
}`,
    java: `void dfs(int u, List<List<Integer>> adj, boolean[] seen) {
    seen[u] = true; System.out.print(u + " ");
    for (int v : adj.get(u)) if (!seen[v]) dfs(v, adj, seen);
}`,
    python: `def dfs(u, adj, seen):
    seen.add(u)
    print(u, end=' ')
    for v in adj.get(u, []):
        if v not in seen:
            dfs(v, adj, seen)`,
    javascript: `function dfs(u, adj, seen = new Set()) {
  seen.add(u);
  process(u);
  for (const v of adj.get(u) ?? []) if (!seen.has(v)) dfs(v, adj, seen);
}`,
    typescript: `function dfs(u: string, adj: Map<string, string[]>, seen = new Set<string>()): void {
  seen.add(u);
  process(u);
  for (const v of adj.get(u) ?? []) if (!seen.has(v)) dfs(v, adj, seen);
}`,
    csharp: `void Dfs(int u, List<List<int>> adj, HashSet<int> seen) {
    seen.Add(u); Console.Write(u + " ");
    foreach (int v in adj[u]) if (!seen.Contains(v)) Dfs(v, adj, seen);
}`,
    go: `func dfs(u int, adj map[int][]int, seen map[int]bool) {
	seen[u] = true
	fmt.Print(u, " ")
	for _, v := range adj[u] {
		if !seen[v] {
			dfs(v, adj, seen)
		}
	}
}`,
    rust: `fn dfs(u: usize, adj: &Vec<Vec<usize>>, seen: &mut Vec<bool>) {
    seen[u] = true;
    print!("{} ", u);
    for &v in &adj[u] {
        if !seen[v] { dfs(v, adj, seen); }
    }
}`,
    kotlin: `fun dfs(u: Int, adj: Map<Int, List<Int>>, seen: MutableSet<Int>) {
    seen.add(u); print("$u ")
    for (v in adj[u].orEmpty()) if (v !in seen) dfs(v, adj, seen)
}`,
    swift: `func dfs(_ u: Int, _ adj: [Int: [Int]], _ seen: inout Set<Int>) {
    seen.insert(u); print(u, terminator: " ")
    for v in adj[u, default: []] where !seen.contains(v) { dfs(v, adj, &seen) }
}`,
  },
  content: {
    overview: `Depth-first search explores a graph by going as deep as possible along each branch before backtracking. Starting from a source, it visits a neighbor, then that neighbor's neighbor, and so on until it hits a dead end (a node whose neighbors are all visited), at which point it retreats to the most recent node with unexplored options.

DFS is naturally expressed with recursion (using the call stack) or an explicit stack. Its ability to fully explore one path before another makes it the engine behind cycle detection, topological sorting, connected components, strongly connected components, and countless backtracking problems.`,
    howItWorks: [
      "Mark the start node as discovered and 'enter' it (push onto the stack).",
      "Visit the current node, then look at its neighbors in order.",
      "For each undiscovered neighbor, recurse into it — going deeper.",
      "When a node has no undiscovered neighbors, it is finished — backtrack (pop).",
      "Continue until every reachable node has been finished.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "Each vertex and edge is examined a constant number of times. Space is O(V) for the visited set plus the recursion/stack depth, which can reach O(V).",
    },
    applications: [
      "Cycle detection in directed and undirected graphs",
      "Topological sorting of a DAG (via finish times)",
      "Finding connected components and strongly connected components",
      "Maze/backtracking solvers and pathfinding when any path suffices",
      "Detecting bridges and articulation points",
    ],
    advantages: [
      "Linear O(V + E) time",
      "Low memory on wide graphs (only the current path is on the stack)",
      "Elegant recursive formulation",
      "Foundation for many advanced graph algorithms",
    ],
    disadvantages: [
      "Does not find shortest paths in unweighted graphs (BFS does)",
      "Recursion can overflow the stack on very deep graphs",
      "Traversal order depends on neighbor ordering",
    ],
    commonMistakes: [
      "Marking visited when leaving instead of entering a node, causing revisits/cycles.",
      "Using DFS expecting shortest paths — it doesn't guarantee them.",
      "Stack overflow on deep graphs; convert to an explicit stack.",
      "Forgetting to iterate over all components when the graph is disconnected.",
    ],
    interviewQuestions: [
      "How does DFS detect a cycle in a directed graph using colors/recursion stack?",
      "Explain how DFS finish times produce a topological order.",
      "Contrast DFS and BFS memory usage on wide vs deep graphs.",
      "Write an iterative DFS using an explicit stack.",
      "How does DFS find connected components?",
    ],
    summary:
      "DFS explores each branch to its end before backtracking, running in O(V + E) using a stack or recursion. It doesn't give shortest paths but is the backbone of cycle detection, topological sort, connectivity, and backtracking algorithms.",
    quiz: [
      { question: "DFS explores the graph using which structure (explicitly or via recursion)?", options: ["Queue", "Stack", "Priority queue", "Hash map"], answer: 1, explanation: "DFS uses a LIFO stack (or the call stack) to go deep before backtracking." },
      { question: "What is DFS's time complexity with an adjacency list?", options: ["O(V²)", "O(V + E)", "O(E log V)", "O(V·E)"], answer: 1, explanation: "Each vertex and edge is processed a constant number of times." },
      { question: "Does DFS find shortest paths in an unweighted graph?", options: ["Yes, always", "No — use BFS", "Only in trees", "Only if weighted"], answer: 1, explanation: "DFS may reach a node via a long path first; BFS guarantees fewest edges." },
      { question: "DFS finish times are used to compute…", options: ["Minimum spanning trees", "A topological ordering", "Shortest paths", "Maximum flow"], answer: 1, explanation: "Ordering vertices by decreasing finish time yields a topological sort of a DAG." },
      { question: "A risk of recursive DFS on very deep graphs is…", options: ["Infinite loops always", "Stack overflow", "Exponential time", "Incorrect results"], answer: 1, explanation: "Deep recursion can exceed the call-stack limit; an explicit stack avoids it." },
    ],
  },
  contentAr: {
    overview: `يستكشف البحث بالعمق أولًا رسمًا بيانيًا بالتعمق قدر الإمكان على طول كل فرع قبل التراجع. انطلاقًا من مصدر، يزور جارًا، ثم جار ذلك الجار، وهكذا حتى يصل إلى طريق مسدود (عقدة كل جيرانها مُزارون)، عندئذٍ يتراجع إلى أحدث عقدة لديها خيارات غير مستكشَفة.

يُعبَّر عن DFS طبيعيًا بالعودية (باستخدام مكدس الاستدعاءات) أو بمكدس صريح. قدرته على استكشاف مسار كامل قبل آخر تجعله المحرك وراء اكتشاف الدورات، والترتيب الطوبولوجي، والمكوّنات المتصلة، والمكوّنات المتصلة بقوة، ومسائل تراجع لا حصر لها.`,
    howItWorks: [
      "علّم عقدة البداية كمكتشَفة و'ادخلها' (ادفعها إلى المكدس).",
      "زر العقدة الحالية، ثم انظر إلى جيرانها بالترتيب.",
      "لكل جار غير مكتشَف، انتقل إليه عوديًا — تعمّق أكثر.",
      "عندما لا يبقى لعقدة جيران غير مكتشَفين، تكون قد انتهت — تراجع (أخرجها من المكدس).",
      "استمر حتى تنتهي كل عقدة قابلة للوصول.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "يُفحص كل رأس وكل حافة عددًا ثابتًا من المرات. المساحة O(V) لمجموعة العقد المزارة بالإضافة إلى عمق العودية/المكدس، الذي قد يصل إلى O(V).",
    },
    applications: [
      "اكتشاف الدورات في الرسوم البيانية الموجهة وغير الموجهة",
      "الترتيب الطوبولوجي لرسم بياني موجه غير دوري (عبر أوقات الانتهاء)",
      "إيجاد المكوّنات المتصلة والمكوّنات المتصلة بقوة",
      "حلّالات المتاهات/التراجع وإيجاد المسارات عندما يكفي أي مسار",
      "اكتشاف الجسور ونقاط التمفصل",
    ],
    advantages: [
      "زمن خطي O(V + E)",
      "ذاكرة منخفضة في الرسوم البيانية الواسعة (المسار الحالي فقط على المكدس)",
      "صياغة عودية أنيقة",
      "أساس لكثير من خوارزميات الرسوم البيانية المتقدمة",
    ],
    disadvantages: [
      "لا يجد أقصر المسارات في الرسوم البيانية غير الموزونة (BFS يفعل)",
      "قد تفيض العودية المكدس في الرسوم البيانية العميقة جدًا",
      "ترتيب الاجتياز يعتمد على ترتيب الجيران",
    ],
    commonMistakes: [
      "تعليم العقدة كمُزارة عند مغادرتها بدلًا من دخولها، مما يسبب إعادة زيارات/دورات.",
      "استخدام DFS متوقعًا أقصر المسارات — فهو لا يضمنها.",
      "فيضان المكدس في الرسوم البيانية العميقة؛ حوّل إلى مكدس صريح.",
      "نسيان التكرار عبر كل المكوّنات عندما يكون الرسم البياني غير متصل.",
    ],
    interviewQuestions: [
      "كيف يكتشف DFS دورة في رسم بياني موجه باستخدام الألوان/مكدس العودية؟",
      "اشرح كيف تنتج أوقات انتهاء DFS ترتيبًا طوبولوجيًا.",
      "قارن استهلاك الذاكرة لـ DFS و BFS في الرسوم البيانية الواسعة مقابل العميقة.",
      "اكتب DFS تكراريًا باستخدام مكدس صريح.",
      "كيف يجد DFS المكوّنات المتصلة؟",
    ],
    summary:
      "يستكشف DFS كل فرع حتى نهايته قبل التراجع، ويعمل بزمن O(V + E) باستخدام مكدس أو عودية. لا يعطي أقصر المسارات لكنه العمود الفقري لاكتشاف الدورات، والترتيب الطوبولوجي، والاتصال، وخوارزميات التراجع.",
    quiz: [
      { question: "يستكشف DFS الرسم البياني باستخدام أي هيكل (صراحةً أو عبر العودية)؟", options: ["طابور", "مكدس", "طابور أولوية", "خريطة تجزئة"], answer: 1, explanation: "يستخدم DFS مكدس LIFO (أو مكدس الاستدعاءات) للتعمق قبل التراجع." },
      { question: "ما التعقيد الزمني لـ DFS بقائمة تجاور؟", options: ["O(V²)", "O(V + E)", "O(E log V)", "O(V·E)"], answer: 1, explanation: "تتم معالجة كل رأس وكل حافة عددًا ثابتًا من المرات." },
      { question: "هل يجد DFS أقصر المسارات في رسم بياني غير موزون؟", options: ["نعم، دائمًا", "لا — استخدم BFS", "فقط في الأشجار", "فقط إذا كان موزونًا"], answer: 1, explanation: "قد يصل DFS إلى عقدة عبر مسار طويل أولًا؛ BFS يضمن أقل عدد حواف." },
      { question: "تُستخدم أوقات انتهاء DFS لحساب…", options: ["الأشجار الممتدة الصغرى", "ترتيب طوبولوجي", "أقصر المسارات", "التدفق الأقصى"], answer: 1, explanation: "ترتيب الرؤوس بترتيب تنازلي لوقت الانتهاء ينتج ترتيبًا طوبولوجيًا لرسم بياني موجه غير دوري." },
      { question: "من مخاطر DFS العودي في الرسوم البيانية العميقة جدًا…", options: ["حلقات لا نهائية دائمًا", "فيضان المكدس", "زمن أسي", "نتائج غير صحيحة"], answer: 1, explanation: "قد تتجاوز العودية العميقة حد مكدس الاستدعاءات؛ المكدس الصريح يتجنب ذلك." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Edges (undirected)", placeholder: "A-B, A-C, B-D, C-D, D-E", help: "Comma-separated pairs like A-B. Up to 26 nodes.", list: true },
    { key: "start", label: "Start node", placeholder: "A", search: true },
  ],
  defaultInput: (level, rng) => {
    const g = randomGraph(level, rng);
    return { nodes: g.nodes.map((n) => n.id), edges: g.edges.map((e) => ({ from: e.from, to: e.to })), start: g.nodes[0].id };
  },
  parseInput: (fields) => {
    const { nodes, edges } = parseEdgeList(fields.edges ?? "");
    const start = (fields.start ?? "").trim();
    if (!start) throw new Error("Enter a start node.");
    if (!nodes.includes(start)) throw new Error(`Start node "${start}" is not in the edge list.`);
    return { nodes, edges, start };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}-${e.to}`).join(", "), start: input.start }),
  generate,
};

export default mod;
