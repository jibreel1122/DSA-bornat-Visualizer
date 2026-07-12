import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";
import { parseDirectedEdges } from "./topological-sort";

type Input = { nodes: string[]; edges: { from: string; to: string }[] };

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const layout = circularLayout(nodes);
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) adj.get(e.from)!.push(e.to);
  for (const n of nodes) adj.get(n)!.sort();

  const index: Record<string, number> = {};
  const low: Record<string, number> = {};
  const onStack: Record<string, boolean> = {};
  const stack: string[] = [];
  const sccOf: Record<string, number> = {};
  let idx = 0;
  let sccCount = 0;
  const steps: Step<GraphFrame>[] = [];
  let visits = 0;

  const PALETTE: CellState[] = ["active", "found", "visited", "compare", "special", "sorted", "pivot"];

  const annotations = () =>
    Object.fromEntries(nodes.map((n) => [n, index[n] === undefined ? "–" : `${index[n]}/${low[n]}`]));

  const snap = (nodeStates: Record<string, CellState>, edgeStates: Record<string, CellState>, description: string, codeLine: number, descriptionAr?: string): void => {
    steps.push({
      frame: {
        nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
        edges: edges.map((e) => ({ ...e })),
        directed: true,
        nodeStates: { ...nodeStates },
        edgeStates: { ...edgeStates },
        nodeAnnotations: annotations(),
        aux: [
          { label: "stack (bottom→top)", values: stack.length ? stack.map((s) => s) : ["∅"] },
          { label: "SCCs found", values: [sccCount] },
        ],
        note: `Tarjan: node label = index/lowlink; an SCC root has index == lowlink`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { visits, sccs: sccCount },
    });
  };

  const sccColors: Record<string, CellState> = {};

  const strongconnect = (v: string): void => {
    index[v] = idx;
    low[v] = idx;
    idx++;
    stack.push(v);
    onStack[v] = true;
    visits++;
    snap({ [v]: "active" }, {}, `Visit ${v}: assign index=${index[v]}, lowlink=${low[v]}, push onto the stack.`, 2, `زر ${v}: عيّن index=${index[v]}، lowlink=${low[v]}، وادفعها إلى المكدس.`);

    for (const w of adj.get(v)!) {
      const ek = `${v}->${w}`;
      if (index[w] === undefined) {
        snap({ [v]: "active", [w]: "compare" }, { [ek]: "active" }, `${v}→${w}: ${w} unvisited, recurse into it.`, 4, `${v}→${w}: ${w} غير مُزارة، انتقل إليها عوديًا.`);
        strongconnect(w);
        low[v] = Math.min(low[v], low[w]);
        snap({ [v]: "active", [w]: "visited" }, { [ek]: "compare" }, `Back at ${v}: lowlink[${v}] = min(itself, lowlink[${w}]) = ${low[v]}.`, 5, `عودة إلى ${v}: lowlink[${v}] = min(نفسه، lowlink[${w}]) = ${low[v]}.`);
      } else if (onStack[w]) {
        low[v] = Math.min(low[v], index[w]);
        snap({ [v]: "active", [w]: "special" }, { [ek]: "swap" }, `${v}→${w}: ${w} is on the stack (back/cross edge) → lowlink[${v}] = min(itself, index[${w}]) = ${low[v]}.`, 6, `${v}→${w}: ${w} على المكدس (حافة خلفية/عابرة) → lowlink[${v}] = min(نفسه، index[${w}]) = ${low[v]}.`);
      }
    }

    if (low[v] === index[v]) {
      const members: string[] = [];
      const color = PALETTE[sccCount % PALETTE.length];
      let w: string;
      do {
        w = stack.pop()!;
        onStack[w] = false;
        sccOf[w] = sccCount;
        sccColors[w] = color;
        members.push(w);
      } while (w !== v);
      sccCount++;
      const st: Record<string, CellState> = { ...sccColors };
      snap(st, {}, `${v} is an SCC root (index == lowlink == ${index[v]}). Pop the stack to form SCC #${sccCount}: {${members.join(", ")}}.`, 6, `${v} هي جذر مكوّن متصل بقوة (index == lowlink == ${index[v]}). أخرج من المكدس لتشكيل المكوّن رقم ${sccCount}: {${members.join(", ")}}.`);
    }
  };

  snap({}, {}, `Tarjan's algorithm finds strongly connected components in one DFS using discovery indices and "lowlink" values.`, 0, `تجد خوارزمية تارجان المكوّنات المتصلة بقوة في اجتياز DFS واحد باستخدام فهارس الاكتشاف وقيم "lowlink".`);
  for (const v of nodes) if (index[v] === undefined) strongconnect(v);

  snap({ ...sccColors }, {}, `Done. ${sccCount} strongly connected component(s) found — nodes sharing a color can all reach each other.`, 8, `اكتمل. عُثر على ${sccCount} مكوّن متصل بقوة — العقد المتشاركة في اللون يمكن أن يصل بعضها إلى بعض.`);
  return steps;
}

const TEMPLATES = [
  "A>B, B>C, C>A, B>D, D>E, E>F, F>D",
  "A>B, B>C, C>A, C>D, D>E, E>D",
  "1>2, 2>3, 3>1, 3>4, 4>5, 5>6, 6>4",
  "A>B, B>C, C>D, D>A, E>A, E>F, F>E",
  "A>B, B>A, B>C, C>D, D>C, D>E",
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  return parseDirectedEdges(t);
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "tarjan-scc",
  title: "Tarjan's Strongly Connected Components",
  titleAr: "مكوّنات تارجان المتصلة بقوة (Tarjan)",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["graph", "SCC", "DFS", "lowlink"],
  tagsAr: ["رسم بياني", "مكوّن متصل بقوة", "بحث بالعمق أولًا", "lowlink"],
  summary: "Finds all strongly connected components of a directed graph in a single DFS using discovery indices and lowlink values.",
  summaryAr: "يجد كل المكوّنات المتصلة بقوة في رسم بياني موجه ضمن اجتياز DFS واحد باستخدام فهارس الاكتشاف وقيم lowlink.",
  renderer: "graph",
  pseudocode: [
    "procedure strongconnect(v)",
    "  index[v] = low[v] = idx++; push v; onStack[v] = true",
    "  for w in adj[v]:",
    "    if w unvisited: strongconnect(w); low[v] = min(low[v], low[w])",
    "    elif onStack[w]: low[v] = min(low[v], index[w])",
    "  if low[v] == index[v]:",
    "    pop stack until v → one SCC",
    "  // run strongconnect on every unvisited vertex",
    "  return the SCCs found",
  ],
  code: {
    pseudocode: `strongconnect(v):
  index[v] = low[v] = idx++; push(v); onStack[v] = true
  for w in adj[v]:
    if w unvisited: strongconnect(w); low[v] = min(low[v], low[w])
    elif onStack[w]: low[v] = min(low[v], index[w])
  if low[v] == index[v]: pop until v -> SCC`,
    c: `void strongconnect(int v){
    index[v]=low[v]=idx++; stack[top++]=v; onStack[v]=1;
    for(int i=0;i<deg[v];i++){ int w=adj[v][i];
        if(index[w]==-1){ strongconnect(w); low[v]=min(low[v],low[w]); }
        else if(onStack[w]) low[v]=min(low[v],index[w]);
    }
    if(low[v]==index[v]){ int w; do{ w=stack[--top]; onStack[w]=0; /*SCC*/ }while(w!=v); }
}`,
    cpp: `void strongconnect(int v) {
    index[v] = low[v] = idx++; stk.push(v); onStack[v] = true;
    for (int w : adj[v]) {
        if (index[w] == -1) { strongconnect(w); low[v] = min(low[v], low[w]); }
        else if (onStack[w]) low[v] = min(low[v], index[w]);
    }
    if (low[v] == index[v]) {
        vector<int> scc; int w;
        do { w = stk.top(); stk.pop(); onStack[w] = false; scc.push_back(w); } while (w != v);
        sccs.push_back(scc);
    }
}`,
    java: `void strongconnect(int v) {
    index[v] = low[v] = idx++; stack.push(v); onStack[v] = true;
    for (int w : adj[v]) {
        if (index[w] == -1) { strongconnect(w); low[v] = Math.min(low[v], low[w]); }
        else if (onStack[w]) low[v] = Math.min(low[v], index[w]);
    }
    if (low[v] == index[v]) {
        List<Integer> scc = new ArrayList<>(); int w;
        do { w = stack.pop(); onStack[w] = false; scc.add(w); } while (w != v);
        sccs.add(scc);
    }
}`,
    python: `def strongconnect(v):
    global idx
    index[v] = low[v] = idx; idx += 1
    stack.append(v); on_stack[v] = True
    for w in adj[v]:
        if index[w] == -1:
            strongconnect(w); low[v] = min(low[v], low[w])
        elif on_stack[w]:
            low[v] = min(low[v], index[w])
    if low[v] == index[v]:
        scc = []
        while True:
            w = stack.pop(); on_stack[w] = False; scc.append(w)
            if w == v: break
        sccs.append(scc)`,
    javascript: `function strongconnect(v) {
  index[v] = low[v] = idx++; stack.push(v); onStack[v] = true;
  for (const w of adj[v]) {
    if (index[w] === undefined) { strongconnect(w); low[v] = Math.min(low[v], low[w]); }
    else if (onStack[w]) low[v] = Math.min(low[v], index[w]);
  }
  if (low[v] === index[v]) {
    const scc = []; let w;
    do { w = stack.pop(); onStack[w] = false; scc.push(w); } while (w !== v);
    sccs.push(scc);
  }
}`,
    typescript: `function strongconnect(v: number): void {
  index[v] = low[v] = idx++; stack.push(v); onStack[v] = true;
  for (const w of adj[v]) {
    if (index[w] === undefined) { strongconnect(w); low[v] = Math.min(low[v], low[w]); }
    else if (onStack[w]) low[v] = Math.min(low[v], index[w]);
  }
  if (low[v] === index[v]) {
    const scc: number[] = []; let w: number;
    do { w = stack.pop()!; onStack[w] = false; scc.push(w); } while (w !== v);
    sccs.push(scc);
  }
}`,
    csharp: `void StrongConnect(int v) {
    index[v] = low[v] = idx++; stack.Push(v); onStack[v] = true;
    foreach (int w in adj[v]) {
        if (index[w] == -1) { StrongConnect(w); low[v] = Math.Min(low[v], low[w]); }
        else if (onStack[w]) low[v] = Math.Min(low[v], index[w]);
    }
    if (low[v] == index[v]) {
        var scc = new List<int>(); int w;
        do { w = stack.Pop(); onStack[w] = false; scc.Add(w); } while (w != v);
        sccs.Add(scc);
    }
}`,
    go: `func strongconnect(v int) {
	index[v], low[v] = idx, idx; idx++
	stack = append(stack, v); onStack[v] = true
	for _, w := range adj[v] {
		if index[w] == -1 {
			strongconnect(w); low[v] = min(low[v], low[w])
		} else if onStack[w] {
			low[v] = min(low[v], index[w])
		}
	}
	if low[v] == index[v] {
		var scc []int
		for {
			w := stack[len(stack)-1]; stack = stack[:len(stack)-1]
			onStack[w] = false; scc = append(scc, w)
			if w == v { break }
		}
		sccs = append(sccs, scc)
	}
}`,
    rust: `fn strongconnect(v: usize, g: &Graph, st: &mut State) {
    st.index[v] = st.idx; st.low[v] = st.idx; st.idx += 1;
    st.stack.push(v); st.on_stack[v] = true;
    for &w in &g.adj[v] {
        if st.index[w] == usize::MAX {
            strongconnect(w, g, st);
            st.low[v] = st.low[v].min(st.low[w]);
        } else if st.on_stack[w] {
            st.low[v] = st.low[v].min(st.index[w]);
        }
    }
    if st.low[v] == st.index[v] {
        loop {
            let w = st.stack.pop().unwrap();
            st.on_stack[w] = false;
            if w == v { break; }
        }
    }
}`,
    kotlin: `fun strongconnect(v: Int) {
    index[v] = idx; low[v] = idx; idx++
    stack.addLast(v); onStack[v] = true
    for (w in adj[v]) {
        if (index[w] == -1) { strongconnect(w); low[v] = minOf(low[v], low[w]) }
        else if (onStack[w]) low[v] = minOf(low[v], index[w])
    }
    if (low[v] == index[v]) {
        val scc = mutableListOf<Int>()
        do { val w = stack.removeLast(); onStack[w] = false; scc.add(w); if (w == v) break } while (true)
        sccs.add(scc)
    }
}`,
    swift: `func strongconnect(_ v: Int) {
    index[v] = idx; low[v] = idx; idx += 1
    stack.append(v); onStack[v] = true
    for w in adj[v] {
        if index[w] == -1 { strongconnect(w); low[v] = min(low[v], low[w]) }
        else if onStack[w] { low[v] = min(low[v], index[w]) }
    }
    if low[v] == index[v] {
        var scc: [Int] = []
        while true { let w = stack.removeLast(); onStack[w] = false; scc.append(w); if w == v { break } }
        sccs.append(scc)
    }
}`,
  },
  content: {
    overview: `A strongly connected component (SCC) of a directed graph is a maximal set of vertices in which every vertex can reach every other vertex. Collapsing each SCC to a single node turns any directed graph into a directed acyclic graph (its "condensation"), which is why SCCs matter for dependency analysis, deadlock detection, and 2-SAT.

Tarjan's algorithm (1972) finds all SCCs in a single depth-first search — an elegant improvement over the two-pass Kosaraju method. As DFS visits each vertex it assigns two numbers: an index (the order of discovery) and a lowlink (the smallest index reachable from that vertex's DFS subtree, including via one back- or cross-edge to a vertex still on the stack). Vertices are pushed onto an auxiliary stack as they're discovered. When a vertex's lowlink equals its own index, it is the "root" of an SCC, and everything above it on the stack — down to and including it — forms one component. Because each vertex and edge is processed once, the whole thing runs in O(V + E).`,
    howItWorks: [
      "Run DFS; when first visiting v, set index[v] = lowlink[v] to the next counter value and push v on a stack.",
      "For each edge v→w: if w is unvisited, recurse and then lowlink[v] = min(lowlink[v], lowlink[w]).",
      "If w is already visited and still on the stack, lowlink[v] = min(lowlink[v], index[w]).",
      "After exploring v's edges, if lowlink[v] == index[v], v is an SCC root.",
      "Pop the stack down to v; those vertices form one strongly connected component.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "A single DFS touches each vertex and edge once. The auxiliary stack, index, and lowlink arrays use O(V) space. Faster in practice than Kosaraju's two DFS passes.",
    },
    applications: [
      "condensing a graph into a DAG of components",
      "2-SAT solving (implication graph SCCs)",
      "deadlock and cyclic-dependency detection",
      "analyzing web link structure and social reachability",
    ],
    advantages: [
      "Single DFS pass — no graph transpose needed",
      "Optimal O(V + E) time",
      "Produces SCCs in reverse topological order of the condensation",
      "Elegant, self-contained lowlink formulation",
    ],
    disadvantages: [
      "Recursive DFS can overflow the stack on deep graphs",
      "The lowlink invariant is subtle and error-prone",
      "Only for directed graphs (SCCs are undefined otherwise)",
      "Slightly trickier to reason about than Kosaraju",
    ],
    commonMistakes: [
      "Updating lowlink with lowlink[w] for cross/back edges instead of index[w].",
      "Only updating via index[w] for tree edges (should use lowlink[w]).",
      "Forgetting the onStack check, wrongly using edges to already-finished SCCs.",
      "Not treating each unvisited vertex as a fresh DFS root.",
    ],
    interviewQuestions: [
      "What is the difference between using index[w] and lowlink[w] when updating lowlink[v]?",
      "Why does lowlink[v] == index[v] identify an SCC root?",
      "How does Tarjan's compare with Kosaraju's algorithm?",
      "What is the condensation of a graph and how do SCCs form it?",
      "How are SCCs used to solve 2-SAT?",
    ],
    summary:
      "Tarjan's algorithm finds all strongly connected components of a directed graph in a single O(V + E) DFS by tracking each vertex's discovery index and lowlink; when lowlink equals index, the stack is popped to emit one SCC. It is the standard one-pass SCC method underpinning 2-SAT and dependency analysis.",
    quiz: [
      { question: "A strongly connected component is…", options: ["A tree", "A maximal set where every vertex reaches every other", "The shortest path", "A single edge"], answer: 1, explanation: "Within an SCC, all vertices are mutually reachable." },
      { question: "Tarjan's algorithm uses how many DFS passes?", options: ["One", "Two", "Three", "V passes"], answer: 0, explanation: "It identifies all SCCs in a single DFS." },
      { question: "A vertex v is an SCC root when…", options: ["index[v] == 0", "lowlink[v] == index[v]", "it has no edges", "it is on the stack"], answer: 1, explanation: "Equal lowlink and index means nothing in its subtree reaches an earlier stacked vertex." },
      { question: "For an edge to an on-stack, already-visited w, you update lowlink[v] with…", options: ["lowlink[w]", "index[w]", "0", "index[v]"], answer: 1, explanation: "Cross/back edges use the discovery index of w, not its lowlink." },
      { question: "The time complexity is…", options: ["O(V·E)", "O(V + E)", "O(V²)", "O(E log V)"], answer: 1, explanation: "Each vertex and edge is processed exactly once." },
    ],
  },
  contentAr: {
    overview: `المكوّن المتصل بقوة (SCC) في رسم بياني موجه هو مجموعة عظمى من الرؤوس يستطيع فيها كل رأس الوصول إلى كل رأس آخر. طيّ كل مكوّن متصل بقوة إلى عقدة واحدة يحوّل أي رسم بياني موجه إلى رسم بياني موجه غير دوري (هو "تكثيفه")، ولهذا تهم المكوّنات المتصلة بقوة في تحليل التبعيات، واكتشاف التعثر، ومسألة 2-SAT.

تجد خوارزمية تارجان (1972) كل المكوّنات المتصلة بقوة في اجتياز بحث بالعمق أولًا واحد — تحسين أنيق على طريقة كوساراجو ذات المرحلتين. أثناء زيارة DFS لكل رأس، تُسند إليه رقمين: index (ترتيب الاكتشاف) وlowlink (أصغر فهرس يمكن الوصول إليه من شجرة DFS الفرعية لذلك الرأس، بما في ذلك عبر حافة خلفية أو عابرة واحدة إلى رأس ما زال على المكدس). تُدفع الرؤوس إلى مكدس مساعد عند اكتشافها. عندما يساوي lowlink لرأس ما فهرسه الخاص، يكون "جذر" مكوّن متصل بقوة، وكل ما فوقه على المكدس — نزولًا إليه وشاملًا له — يشكّل مكوّنًا واحدًا. ولأن كل رأس وحافة يُعالَجان مرة واحدة، تعمل الخوارزمية بأكملها بزمن O(V + E).`,
    howItWorks: [
      "شغّل DFS؛ عند زيارة v لأول مرة، اجعل index[v] = lowlink[v] بقيمة العدّاد التالية وادفع v إلى مكدس.",
      "لكل حافة v→w: إن كانت w غير مُزارة، انتقل إليها عوديًا ثم lowlink[v] = min(lowlink[v], lowlink[w]).",
      "إن كانت w مُزارة بالفعل وما زالت على المكدس، lowlink[v] = min(lowlink[v], index[w]).",
      "بعد استكشاف حواف v، إن كان lowlink[v] == index[v]، فـv جذر مكوّن متصل بقوة.",
      "أخرج من المكدس نزولًا إلى v؛ تلك الرؤوس تشكّل مكوّنًا متصلًا بقوة واحدًا.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V)",
      notes: "اجتياز DFS واحد يلمس كل رأس وحافة مرة واحدة. يستخدم المكدس المساعد ومصفوفتا index وlowlink مساحة O(V). أسرع عمليًا من اجتيازي DFS في خوارزمية كوساراجو.",
    },
    applications: [
      "تكثيف رسم بياني إلى رسم بياني موجه غير دوري من المكوّنات",
      "حل مسألة 2-SAT (مكوّنات متصلة بقوة في رسم بياني الاستلزام)",
      "اكتشاف التعثر والتبعيات الدورية",
      "تحليل بنية روابط الويب وقابلية الوصول الاجتماعية",
    ],
    advantages: [
      "اجتياز DFS واحد — لا حاجة لعكس الرسم البياني",
      "زمن أمثل O(V + E)",
      "تُنتج المكوّنات المتصلة بقوة بترتيب طوبولوجي عكسي للتكثيف",
      "صياغة lowlink أنيقة ومكتفية بذاتها",
    ],
    disadvantages: [
      "قد يفيض DFS العودي المكدس في الرسوم البيانية العميقة",
      "ثابت lowlink دقيق وعرضة للخطأ",
      "فقط للرسوم البيانية الموجهة (المكوّنات المتصلة بقوة غير معرَّفة لغيرها)",
      "أصعب قليلًا في التفكير مقارنة بكوساراجو",
    ],
    commonMistakes: [
      "تحديث lowlink بـ lowlink[w] للحواف العابرة/الخلفية بدلًا من index[w].",
      "التحديث عبر index[w] فقط لحواف الشجرة (يجب استخدام lowlink[w]).",
      "نسيان فحص onStack، مستخدمًا خطأً حوافًا إلى مكوّنات متصلة بقوة انتهت بالفعل.",
      "عدم معاملة كل رأس غير مُزار كجذر DFS جديد.",
    ],
    interviewQuestions: [
      "ما الفرق بين استخدام index[w] وlowlink[w] عند تحديث lowlink[v]؟",
      "لماذا يحدد lowlink[v] == index[v] جذر مكوّن متصل بقوة؟",
      "كيف تقارن خوارزمية تارجان بخوارزمية كوساراجو؟",
      "ما تكثيف الرسم البياني وكيف تشكّله المكوّنات المتصلة بقوة؟",
      "كيف تُستخدم المكوّنات المتصلة بقوة لحل 2-SAT؟",
    ],
    summary:
      "تجد خوارزمية تارجان كل المكوّنات المتصلة بقوة في رسم بياني موجه باجتياز DFS واحد بزمن O(V + E)، بتتبع فهرس اكتشاف كل رأس وlowlink له؛ وعندما يساوي lowlink الفهرس، يُخرَج من المكدس لإصدار مكوّن متصل بقوة واحد. إنها الطريقة القياسية أحادية المرور للمكوّنات المتصلة بقوة، وأساس 2-SAT وتحليل التبعيات.",
    quiz: [
      { question: "المكوّن المتصل بقوة هو…", options: ["شجرة", "مجموعة عظمى يصل فيها كل رأس إلى كل رأس آخر", "أقصر مسار", "حافة واحدة"], answer: 1, explanation: "ضمن مكوّن متصل بقوة، كل الرؤوس يمكن الوصول بينها بشكل متبادل." },
      { question: "كم اجتياز DFS تستخدم خوارزمية تارجان؟", options: ["واحد", "اثنان", "ثلاثة", "V اجتيازات"], answer: 0, explanation: "تحدد كل المكوّنات المتصلة بقوة في اجتياز DFS واحد." },
      { question: "يكون الرأس v جذر مكوّن متصل بقوة عندما…", options: ["index[v] == 0", "lowlink[v] == index[v]", "ليس له حواف", "يكون على المكدس"], answer: 1, explanation: "تساوي lowlink مع index يعني أن لا شيء في شجرته الفرعية يصل إلى رأس سابق على المكدس." },
      { question: "لحافة إلى w مُزارة بالفعل وعلى المكدس، تُحدِّث lowlink[v] بـ…", options: ["lowlink[w]", "index[w]", "0", "index[v]"], answer: 1, explanation: "الحواف الخلفية/العابرة تستخدم فهرس اكتشاف w، لا lowlink الخاص بها." },
      { question: "التعقيد الزمني هو…", options: ["O(V·E)", "O(V + E)", "O(V²)", "O(E log V)"], answer: 1, explanation: "تتم معالجة كل رأس وحافة مرة واحدة بالضبط." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Directed edges", placeholder: "A>B, B>C, C>A, C>D", help: "Format A>B. Up to 20 nodes.", list: true },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const { nodes, edges } = parseDirectedEdges(fields.edges ?? "");
    if (nodes.length > 20) throw new Error("Tarjan visualization is limited to 20 nodes.");
    return { nodes, edges };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}>${e.to}`).join(", ") }),
  generate,
};

export default mod;
