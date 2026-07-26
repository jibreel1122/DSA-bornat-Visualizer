import type { GraphFrame, Step } from "@/lib/engine/types";
import {
  addStep,
  createGraphModule,
  edgeField,
  edgeKey,
  graphFrame,
  parseEdges,
  parseNodes,
  requireVertex,
  serializeEdges,
  startField,
  targetField,
  vertexField,
  type Edge,
  type GraphInput,
} from "./common";

function flowDefault(level: number): GraphInput {
  const middleCount = Math.min(2 + level, 6);
  const middle = Array.from({ length: middleCount }, (_, index) => String.fromCharCode(65 + index));
  const nodes = ["S", ...middle, "T"].sort();
  const edges: Edge[] = [
    { from: "S", to: middle[0], weight: 8 + level },
    { from: "S", to: middle[1], weight: 5 + level },
    { from: middle[0], to: "T", weight: 4 + level },
    { from: middle[1], to: "T", weight: 7 + level },
    { from: middle[0], to: middle[1], weight: 3 },
  ];
  for (let index = 2; index < middle.length; index++) {
    edges.push({ from: middle[index - 2], to: middle[index], weight: 3 + index });
    edges.push({ from: middle[index], to: "T", weight: 2 + index });
  }
  return { nodes, edges, start: "S", target: "T" };
}

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const source = input.start!;
  const sink = input.target!;
  const capacity = new Map<string, number>();
  const flow = new Map<string, number>();
  const neighbors = new Map(nodes.map((node) => [node, new Set<string>()]));
  for (const edge of edges) {
    capacity.set(edgeKey(edge.from, edge.to), edge.weight!);
    neighbors.get(edge.from)!.add(edge.to);
    neighbors.get(edge.to)!.add(edge.from);
  }
  const residual = (from: string, to: string) =>
    (capacity.get(edgeKey(from, to)) ?? 0) - (flow.get(edgeKey(from, to)) ?? 0);
  const steps: Step<GraphFrame>[] = [];
  let maxFlow = 0;
  let bfsScans = 0;
  let augmentations = 0;
  const flowRows = () => edges.map((edge) =>
    `${edge.from}>${edge.to}:${Math.max(0, flow.get(edgeKey(edge.from, edge.to)) ?? 0)}/${edge.weight}`);
  const snapshot = (
    description: string,
    descriptionAr: string,
    codeLine: number,
    phase: string,
    queue: string[],
    activeNodes: string[] = [],
    activeEdges: [string, string][] = [],
  ) => {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: true,
        weighted: true,
        nodeStates: Object.fromEntries(nodes.map((node) => [
          node,
          node === source || node === sink ? "special" : activeNodes.includes(node) ? "compare" : "default",
        ])),
        edgeStates: Object.fromEntries(activeEdges.map(([from, to]) => [edgeKey(from, to), "active"])),
        annotations: { [source]: `flow=${maxFlow}`, [sink]: `flow=${maxFlow}` },
        aux: [
          { label: "BFS queue", values: queue },
          { label: "Edge flow/capacity", values: flowRows() },
        ],
        note: `Current flow = ${maxFlow}`,
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { bfsScans, augmentations, maxFlow },
    );
  };

  snapshot("Initialize zero flow and the residual network.", "هيّئ تدفقاً صفرياً والشبكة المتبقية.", 1, "initialize", []);
  while (true) {
    const parent = new Map<string, string | null>([[source, null]]);
    const queue = [source];
    snapshot(`Start residual BFS from ${source}.`, `ابدأ BFS متبقياً من ${source}.`, 3, "bfs-start", queue, [source]);
    while (queue.length && !parent.has(sink)) {
      const node = queue.shift()!;
      snapshot(`Dequeue ${node} and scan residual outgoing edges.`, `أخرج ${node} وافحص حواف الخروج المتبقية.`, 4, "dequeue", queue, [node]);
      for (const neighbor of [...neighbors.get(node)!].sort()) {
        bfsScans++;
        if (parent.has(neighbor) || residual(node, neighbor) <= 0) continue;
        parent.set(neighbor, node);
        queue.push(neighbor);
        snapshot(
          `Discover ${neighbor} through residual edge ${node}→${neighbor} (${residual(node, neighbor)}).`,
          `اكتشف ${neighbor} عبر الحافة المتبقية ${node}→${neighbor} (${residual(node, neighbor)}).`,
          6,
          "discover",
          queue,
          [node, neighbor],
          [[node, neighbor]],
        );
        if (neighbor === sink) break;
      }
    }
    if (!parent.has(sink)) {
      snapshot("Residual BFS cannot reach the sink, so the current flow is maximum.", "لا يستطيع BFS المتبقي بلوغ المصب، لذا التدفق الحالي أقصى.", 8, "no-path", []);
      break;
    }
    const path: string[] = [];
    for (let node: string | null = sink; node !== null; node = parent.get(node) ?? null) path.push(node);
    path.reverse();
    let bottleneck = Infinity;
    for (let index = 1; index < path.length; index++)
      bottleneck = Math.min(bottleneck, residual(path[index - 1], path[index]));
    snapshot(
      `Augmenting path ${path.join(" → ")} has bottleneck ${bottleneck}.`,
      `مسار التوسيع ${path.join(" ← ")} عنق زجاجته ${bottleneck}.`,
      9,
      "bottleneck",
      [],
      path,
      path.slice(1).map((node, index) => [path[index], node]),
    );
    for (let index = 1; index < path.length; index++) {
      const from = path[index - 1];
      const to = path[index];
      flow.set(edgeKey(from, to), (flow.get(edgeKey(from, to)) ?? 0) + bottleneck);
      flow.set(edgeKey(to, from), (flow.get(edgeKey(to, from)) ?? 0) - bottleneck);
    }
    maxFlow += bottleneck;
    augmentations++;
    snapshot(
      `Push ${bottleneck} units along the path; total flow becomes ${maxFlow}.`,
      `ادفع ${bottleneck} وحدات على المسار؛ يصبح التدفق الكلي ${maxFlow}.`,
      10,
      "augment",
      [],
      path,
      path.slice(1).map((node, index) => [path[index], node]),
    );
  }

  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: true,
      weighted: true,
      nodeStates: { [source]: "found", [sink]: "found" },
      aux: [
        { label: "Max flow", values: [maxFlow] },
        { label: "Edge flow/capacity", values: flowRows() },
      ],
      note: `Maximum flow = ${maxFlow}`,
    }),
    `Edmonds-Karp finishes with maximum flow ${maxFlow}.`,
    `تنتهي إدموندز-كارب بتدفق أقصى ${maxFlow}.`,
    11,
    "complete",
    { bfsScans, augmentations, maxFlow },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "edmonds-karp",
  title: "Edmonds-Karp Maximum Flow",
  titleAr: "التدفق الأقصى بخوارزمية إدموندز-كارب",
  difficulty: "Advanced",
  tags: ["graph", "maximum flow", "residual network", "BFS"],
  tagsAr: ["رسم بياني", "تدفق أقصى", "شبكة متبقية", "بحث بالعرض"],
  summary: "Finds shortest residual augmenting paths with BFS and pushes each path's bottleneck flow.",
  summaryAr: "يجد أقصر مسارات التوسيع المتبقية بـBFS ويدفع تدفق عنق الزجاجة في كل مسار.",
  pseudocode: [
    "procedure EdmondsKarp(G, source, sink)",
    "  initialize zero flow and residual capacities",
    "  repeat",
    "    run BFS from source in the residual network",
    "    dequeue a vertex and inspect residual edges",
    "    discover each reachable vertex through positive residual capacity",
    "    if sink was not discovered, stop",
    "    rebuild the shortest augmenting path",
    "    compute the minimum residual capacity on that path",
    "    add bottleneck flow forward and subtract it backward",
    "    accumulate the total flow",
    "  return maximum flow",
  ],
  complexity: { best: "O(E)", average: "O(VE²)", worst: "O(VE²)", space: "O(V + E)" },
  concept: "BFS selects a shortest-edge-count augmenting path, giving Ford-Fulkerson a polynomial bound.",
  conceptAr: "يختار BFS مسار توسيع بأقل عدد حواف، فيمنح فورد-فولكرسون حداً كثير الحدود.",
  applications: ["Bipartite matching", "Network throughput", "Image segmentation"],
  applicationsAr: ["المطابقة الثنائية", "سعة الشبكات", "تقسيم الصور"],
  caveats: ["Reverse residual edges are essential for undoing earlier choices.", "Source and sink must differ."],
  caveatsAr: ["الحواف المتبقية العكسية ضرورية لتعديل الخيارات السابقة.", "يجب اختلاف المصدر والمصب."],
  inputFields: [vertexField, edgeField(true, true, true), startField, targetField],
  defaultInput: (level) => flowDefault(level),
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "", 12);
    const start = requireVertex(nodes, fields.start, "Source");
    const target = requireVertex(nodes, fields.target, "Sink");
    if (start === target) throw new Error("Source and sink must differ.");
    return {
      nodes,
      edges: parseEdges(fields.edges ?? "", nodes, { directed: true, weighted: true, positive: true }),
      start,
      target,
    };
  },
  serializeInput: (input) => ({
    nodes: input.nodes.join(", "),
    edges: serializeEdges(input.edges, true, true),
    start: input.start!,
    target: input.target!,
  }),
  generate,
  referencePython: `from collections import deque
def edmonds_karp(cap, source, sink):
    flow, total = {}, 0
    while True:
        parent = {source: None}; queue = deque([source])
        while queue and sink not in parent:
            u = queue.popleft()
            for v in sorted(cap):
                if v not in parent and cap.get((u,v),0) - flow.get((u,v),0) > 0:
                    parent[v] = u; queue.append(v)
        if sink not in parent: return total
        path, v = [], sink
        while v != source: path.append((parent[v],v)); v = parent[v]
        b = min(cap.get(e,0) - flow.get(e,0) for e in path)
        for u,v in path: flow[u,v] = flow.get((u,v),0)+b; flow[v,u] = flow.get((v,u),0)-b
        total += b`,
  referenceTypeScript: `function edmondsKarp(capacity: Map<string, number>, source: string, sink: string): number {
  const flow = new Map<string, number>(); let total = 0;
  for (;;) {
    const parent = new Map<string, string | null>([[source, null]]), queue = [source];
    while (queue.length && !parent.has(sink)) {
      const u = queue.shift()!;
      for (const key of capacity.keys()) {
        const [from, v] = key.split("->");
        if (from === u && !parent.has(v) && capacity.get(key)! - (flow.get(key) ?? 0) > 0) { parent.set(v, u); queue.push(v); }
      }
    }
    if (!parent.has(sink)) return total;
    let bottleneck = Infinity;
    for (let v = sink; v !== source; v = parent.get(v)!) bottleneck = Math.min(bottleneck, capacity.get(parent.get(v)! + "->" + v)! - (flow.get(parent.get(v)! + "->" + v) ?? 0));
    total += bottleneck;
  }
}`,
});

export default mod;
