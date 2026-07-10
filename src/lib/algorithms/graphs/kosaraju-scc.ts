import type { AlgorithmModule, CellState, GraphFrame, Step } from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";
import { parseDirectedEdges } from "./topological-sort";

type Input = { nodes: string[]; edges: { from: string; to: string }[] };

function generate(input: Input): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const layout = circularLayout(nodes);
  const adj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  const radj = new Map<string, string[]>(nodes.map((n) => [n, []]));
  for (const e of edges) {
    adj.get(e.from)!.push(e.to);
    radj.get(e.to)!.push(e.from);
  }
  for (const n of nodes) {
    adj.get(n)!.sort();
    radj.get(n)!.sort();
  }

  const steps: Step<GraphFrame>[] = [];
  let visits = 0;
  let sccCount = 0;
  const PALETTE: CellState[] = ["active", "found", "visited", "compare", "special", "sorted", "pivot"];

  const snap = (
    reversed: boolean,
    nodeStates: Record<string, CellState>,
    order: string[],
    description: string,
    codeLine: number,
    extraAux?: { label: string; values: (string | number)[] },
  ): void => {
    const drawEdges = reversed ? edges.map((e) => ({ from: e.to, to: e.from })) : edges.map((e) => ({ ...e }));
    const aux: { label: string; values: (string | number)[] }[] = [
      { label: "finish order (stack)", values: order.length ? order.map((s) => s) : ["∅"] },
    ];
    if (extraAux) aux.push(extraAux);
    steps.push({
      frame: {
        nodes: nodes.map((id) => ({ id, label: id, ...layout[id] })),
        edges: drawEdges,
        directed: true,
        nodeStates: { ...nodeStates },
        aux,
        note: reversed ? `Pass 2 on the TRANSPOSED graph (all edges reversed)` : `Pass 1 on the original graph — record finish order`,
      },
      description,
      codeLine,
      counters: { visits, sccs: sccCount },
    });
  };

  // Pass 1: DFS, push on finish.
  const visited1 = new Set<string>();
  const order: string[] = [];
  snap(false, {}, order, `Kosaraju's algorithm: Pass 1 — DFS the original graph and push each vertex onto a stack when it finishes.`, 0);
  const dfs1 = (v: string) => {
    visited1.add(v);
    visits++;
    snap(false, { [v]: "active", ...Object.fromEntries([...visited1].map((n) => [n, "visited" as CellState])) }, order, `Visit ${v} (Pass 1).`, 2);
    for (const w of adj.get(v)!) if (!visited1.has(w)) dfs1(w);
    order.push(v);
    snap(false, { [v]: "found", ...Object.fromEntries([...visited1].map((n) => [n, "visited" as CellState])) }, order, `Finished ${v} → push onto the stack.`, 3);
  };
  for (const v of nodes) if (!visited1.has(v)) dfs1(v);

  // Transpose.
  snap(true, {}, order, `Pass 2: reverse every edge (transpose the graph). Now process vertices in reverse finish order (top of stack first).`, 4);

  // Pass 2: DFS on transpose in reverse finish order.
  const visited2 = new Set<string>();
  const sccColors: Record<string, CellState> = {};
  const dfs2 = (v: string, members: string[], color: CellState) => {
    visited2.add(v);
    sccColors[v] = color;
    members.push(v);
    visits++;
    snap(true, { ...sccColors, [v]: "active" }, order, `Pass 2: ${v} joins SCC #${sccCount + 1}.`, 6);
    for (const w of radj.get(v)!) if (!visited2.has(w)) dfs2(w, members, color);
  };
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (!visited2.has(v)) {
      const members: string[] = [];
      const color = PALETTE[sccCount % PALETTE.length];
      dfs2(v, members, color);
      sccCount++;
      snap(true, { ...sccColors }, order, `SCC #${sccCount} complete: {${members.join(", ")}}.`, 7, { label: "SCCs found", values: [sccCount] });
    }
  }

  snap(true, { ...sccColors }, order, `Done. ${sccCount} strongly connected component(s) — each Pass-2 DFS tree is one SCC.`, 8, { label: "SCCs found", values: [sccCount] });
  return steps;
}

const TEMPLATES = [
  "A>B, B>C, C>A, B>D, D>E, E>F, F>D",
  "A>B, B>C, C>A, C>D, D>E, E>D",
  "0>1, 1>2, 2>0, 2>3, 3>4, 4>5, 5>3",
  "A>B, B>C, C>D, D>A, E>A, E>F, F>E",
  "A>B, B>A, B>C, C>D, D>C, D>E",
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  return parseDirectedEdges(t);
}

const mod: AlgorithmModule<GraphFrame, Input> = {
  slug: "kosaraju-scc",
  title: "Kosaraju's Strongly Connected Components",
  category: "graphs",
  difficulty: "Advanced",
  tags: ["graph", "SCC", "DFS", "transpose"],
  summary: "Finds strongly connected components with two DFS passes: order by finish time, then DFS the transposed graph.",
  renderer: "graph",
  pseudocode: [
    "procedure kosaraju(G)",
    "  // Pass 1",
    "  DFS G; push each vertex on a stack when it finishes",
    "  // Transpose",
    "  reverse every edge to get Gᵀ",
    "  // Pass 2",
    "  while stack not empty:",
    "    v = pop(); if unvisited: DFS Gᵀ from v → one SCC",
    "  return the collected SCCs",
  ],
  code: {
    pseudocode: `Pass 1: DFS(G); push vertex on finish -> order[]
Transpose: reverse all edges -> GT
Pass 2: for v in reversed(order):
  if unvisited: DFS(GT, v) collects one SCC`,
    c: `void dfs1(int v){ vis[v]=1; for(int w: adj[v]) if(!vis[w]) dfs1(w); order[top++]=v; }
void dfs2(int v,int c){ comp[v]=c; for(int w: radj[v]) if(comp[w]==-1) dfs2(w,c); }
void kosaraju(int n){
    for(int v=0;v<n;v++) if(!vis[v]) dfs1(v);
    int c=0;
    for(int i=top-1;i>=0;i--){ int v=order[i]; if(comp[v]==-1) dfs2(v,c++); }
}`,
    cpp: `void dfs1(int v){ vis[v]=1; for(int w: adj[v]) if(!vis[w]) dfs1(w); order.push_back(v); }
void dfs2(int v,int c){ comp[v]=c; for(int w: radj[v]) if(comp[w]==-1) dfs2(w,c); }
int kosaraju(int n){
    for(int v=0;v<n;v++) if(!vis[v]) dfs1(v);
    int c=0;
    for(int i=order.size()-1;i>=0;i--) if(comp[order[i]]==-1) dfs2(order[i],c++);
    return c;
}`,
    java: `void dfs1(int v){ vis[v]=true; for(int w: adj[v]) if(!vis[w]) dfs1(w); order.push(v); }
void dfs2(int v,int c){ comp[v]=c; for(int w: radj[v]) if(comp[w]==-1) dfs2(w,c); }
int kosaraju(int n){
    for(int v=0;v<n;v++) if(!vis[v]) dfs1(v);
    int c=0;
    while(!order.isEmpty()){ int v=order.pop(); if(comp[v]==-1) dfs2(v,c++); }
    return c;
}`,
    python: `def kosaraju(n, adj, radj):
    vis, order, comp = [False]*n, [], [-1]*n
    def dfs1(v):
        vis[v] = True
        for w in adj[v]:
            if not vis[w]: dfs1(w)
        order.append(v)
    def dfs2(v, c):
        comp[v] = c
        for w in radj[v]:
            if comp[w] == -1: dfs2(w, c)
    for v in range(n):
        if not vis[v]: dfs1(v)
    c = 0
    for v in reversed(order):
        if comp[v] == -1:
            dfs2(v, c); c += 1
    return c`,
    javascript: `function kosaraju(n, adj, radj) {
  const vis = Array(n).fill(false), order = [], comp = Array(n).fill(-1);
  const dfs1 = v => { vis[v] = true; for (const w of adj[v]) if (!vis[w]) dfs1(w); order.push(v); };
  const dfs2 = (v, c) => { comp[v] = c; for (const w of radj[v]) if (comp[w] === -1) dfs2(w, c); };
  for (let v = 0; v < n; v++) if (!vis[v]) dfs1(v);
  let c = 0;
  for (let i = order.length - 1; i >= 0; i--) if (comp[order[i]] === -1) dfs2(order[i], c++);
  return c;
}`,
    typescript: `function kosaraju(n: number, adj: number[][], radj: number[][]): number {
  const vis = Array(n).fill(false), order: number[] = [], comp = Array(n).fill(-1);
  const dfs1 = (v: number) => { vis[v] = true; for (const w of adj[v]) if (!vis[w]) dfs1(w); order.push(v); };
  const dfs2 = (v: number, c: number) => { comp[v] = c; for (const w of radj[v]) if (comp[w] === -1) dfs2(w, c); };
  for (let v = 0; v < n; v++) if (!vis[v]) dfs1(v);
  let c = 0;
  for (let i = order.length - 1; i >= 0; i--) if (comp[order[i]] === -1) dfs2(order[i], c++);
  return c;
}`,
    csharp: `void Dfs1(int v){ vis[v]=true; foreach(int w in adj[v]) if(!vis[w]) Dfs1(w); order.Push(v); }
void Dfs2(int v,int c){ comp[v]=c; foreach(int w in radj[v]) if(comp[w]==-1) Dfs2(w,c); }
int Kosaraju(int n){
    for(int v=0;v<n;v++) if(!vis[v]) Dfs1(v);
    int c=0;
    while(order.Count>0){ int v=order.Pop(); if(comp[v]==-1) Dfs2(v,c++); }
    return c;
}`,
    go: `func dfs1(v int) { vis[v]=true; for _,w := range adj[v] { if !vis[w] { dfs1(w) } }; order=append(order,v) }
func dfs2(v,c int) { comp[v]=c; for _,w := range radj[v] { if comp[w]==-1 { dfs2(w,c) } } }
func kosaraju(n int) int {
	for v:=0;v<n;v++ { if !vis[v] { dfs1(v) } }
	c := 0
	for i:=len(order)-1;i>=0;i-- { if comp[order[i]]==-1 { dfs2(order[i],c); c++ } }
	return c
}`,
    rust: `fn dfs1(v: usize, adj: &Vec<Vec<usize>>, vis: &mut Vec<bool>, order: &mut Vec<usize>) {
    vis[v] = true;
    for &w in &adj[v] { if !vis[w] { dfs1(w, adj, vis, order); } }
    order.push(v);
}
fn dfs2(v: usize, radj: &Vec<Vec<usize>>, comp: &mut Vec<i32>, c: i32) {
    comp[v] = c;
    for &w in &radj[v] { if comp[w] == -1 { dfs2(w, radj, comp, c); } }
}`,
    kotlin: `fun dfs1(v: Int) { vis[v]=true; for (w in adj[v]) if (!vis[w]) dfs1(w); order.addLast(v) }
fun dfs2(v: Int, c: Int) { comp[v]=c; for (w in radj[v]) if (comp[w]==-1) dfs2(w,c) }
fun kosaraju(n: Int): Int {
    for (v in 0 until n) if (!vis[v]) dfs1(v)
    var c = 0
    for (i in order.indices.reversed()) if (comp[order[i]]==-1) { dfs2(order[i], c); c++ }
    return c
}`,
    swift: `func dfs1(_ v: Int) { vis[v]=true; for w in adj[v] where !vis[w] { dfs1(w) }; order.append(v) }
func dfs2(_ v: Int, _ c: Int) { comp[v]=c; for w in radj[v] where comp[w] == -1 { dfs2(w, c) } }
func kosaraju(_ n: Int) -> Int {
    for v in 0..<n where !vis[v] { dfs1(v) }
    var c = 0
    for v in order.reversed() where comp[v] == -1 { dfs2(v, c); c += 1 }
    return c
}`,
  },
  content: {
    overview: `Kosaraju's algorithm finds the strongly connected components (SCCs) of a directed graph — maximal groups where every vertex can reach every other — using two straightforward depth-first searches. It is often the easiest SCC algorithm to understand and prove correct, trading Tarjan's single clever pass for two simple ones.

The first DFS explores the original graph and records vertices in order of completion, pushing each onto a stack as it finishes. The second DFS runs on the transposed graph (every edge reversed) and processes vertices in reverse finish order — popping the stack. The key insight is that reversing the edges preserves the SCCs but flips the direction of connections between them, so starting from the last-finished vertex and following reversed edges can only ever reach vertices in the same SCC. Each tree grown in the second DFS is exactly one strongly connected component. Both passes are linear, so the whole algorithm is O(V + E).`,
    howItWorks: [
      "Pass 1: run DFS on the original graph; when a vertex finishes (all its descendants explored), push it on a stack.",
      "Build the transpose graph by reversing the direction of every edge.",
      "Pass 2: pop vertices from the stack (reverse finish order); skip already-assigned ones.",
      "From each unassigned popped vertex, DFS the transposed graph, labeling every reachable vertex as one SCC.",
      "Each such DFS tree is a complete strongly connected component.",
    ],
    complexity: {
      time: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
      space: "O(V + E)",
      notes: "Two linear DFS passes plus building the transpose give O(V + E) time; storing the transpose costs O(V + E) space. Asymptotically equal to Tarjan's, but with a larger constant (two passes and a reversed graph).",
    },
    applications: [
      "decomposing a directed graph into its condensation DAG",
      "2-SAT satisfiability via the implication graph",
      "detecting cyclic module/package dependencies",
      "community and reachability analysis in directed networks",
    ],
    advantages: [
      "Conceptually simple and easy to prove correct",
      "Linear O(V + E) time",
      "Produces SCCs in topological order of the condensation",
      "Uses only standard DFS — no lowlink bookkeeping",
    ],
    disadvantages: [
      "Requires building and storing the transposed graph",
      "Two passes → larger constant factor than Tarjan",
      "Recursive DFS risks stack overflow on deep graphs",
      "Uses more memory than the single-pass approach",
    ],
    commonMistakes: [
      "Processing vertices in the wrong order in the second pass (must be reverse finish order).",
      "Forgetting to transpose the graph before the second DFS.",
      "Reusing the visited array between passes without resetting.",
      "Pushing on discovery instead of on finish in the first pass.",
    ],
    interviewQuestions: [
      "Why does reversing the edges and using finish order correctly isolate each SCC?",
      "How does Kosaraju's compare to Tarjan's in passes, memory, and clarity?",
      "Why must the second pass follow reverse finish order?",
      "What is the condensation graph and what order do SCCs emerge in?",
      "How would you use SCCs to solve 2-SAT?",
    ],
    summary:
      "Kosaraju's algorithm finds all SCCs with two DFS passes: the first records finish order, then on the transposed graph a second DFS in reverse finish order grows one SCC per tree. It runs in O(V + E) and is the most intuitive SCC method, at the cost of a transpose and two passes.",
    quiz: [
      { question: "Kosaraju's algorithm uses how many DFS passes?", options: ["One", "Two", "Three", "V"], answer: 1, explanation: "One to order by finish time, one on the transposed graph." },
      { question: "Between the two passes you must…", options: ["Sort the vertices", "Transpose (reverse all edges)", "Delete edges", "Add a source"], answer: 1, explanation: "The second DFS runs on the edge-reversed graph." },
      { question: "The second pass processes vertices in…", options: ["Discovery order", "Reverse finish order (stack top first)", "Alphabetical order", "Random order"], answer: 1, explanation: "Popping the finish-order stack gives reverse finish order." },
      { question: "Each DFS tree in the second pass is…", options: ["A shortest path", "One strongly connected component", "A spanning tree", "A single edge"], answer: 1, explanation: "Reversed edges confine each traversal to a single SCC." },
      { question: "Kosaraju's time complexity is…", options: ["O(V²)", "O(V + E)", "O(V·E)", "O(E log V)"], answer: 1, explanation: "Two linear DFS passes plus the transpose are all O(V + E)." },
    ],
  },
  inputFields: [
    { key: "edges", label: "Directed edges", placeholder: "A>B, B>C, C>A, C>D", help: "Format A>B. Up to 20 nodes.", list: true },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const { nodes, edges } = parseDirectedEdges(fields.edges ?? "");
    if (nodes.length > 20) throw new Error("Kosaraju visualization is limited to 20 nodes.");
    return { nodes, edges };
  },
  serializeInput: (input) => ({ edges: input.edges.map((e) => `${e.from}>${e.to}`).join(", ") }),
  generate,
};

export default mod;
