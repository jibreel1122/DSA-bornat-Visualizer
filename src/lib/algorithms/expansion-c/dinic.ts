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

function defaultFlow(level: number): GraphInput {
  const nodes = ["A", "B", "C", "S", "T"];
  const edges: Edge[] = [
    { from: "S", to: "A", weight: 7 + level },
    { from: "S", to: "B", weight: 5 + level },
    { from: "A", to: "B", weight: 3 },
    { from: "A", to: "C", weight: 4 + level },
    { from: "B", to: "C", weight: 5 },
    { from: "B", to: "T", weight: 3 + level },
    { from: "C", to: "T", weight: 8 + level },
  ];
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
  let phases = 0;
  let pushes = 0;
  let level: Record<string, number> = {};

  const flowRows = () => edges.map((edge) =>
    `${edge.from}>${edge.to}:${Math.max(0, flow.get(edgeKey(edge.from, edge.to)) ?? 0)}/${edge.weight}`);
  const snapshot = (
    description: string,
    descriptionAr: string,
    codeLine: number,
    phase: string,
    activeEdges: [string, string][] = [],
    path: string[] = [],
  ) => {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: true,
        weighted: true,
        nodeStates: Object.fromEntries(nodes.map((node) => [
          node,
          node === source || node === sink ? "special" : path.includes(node) ? "active" : level[node] !== undefined ? "visited" : "default",
        ])),
        edgeStates: Object.fromEntries(activeEdges.map(([from, to]) => [edgeKey(from, to), "active"])),
        annotations: Object.fromEntries(nodes.map((node) => [node, level[node] === undefined ? "level=∞" : `level=${level[node]}`])),
        aux: [
          { label: "Current path", values: path },
          { label: "Edge flow/capacity", values: flowRows() },
        ],
        note: `flow=${maxFlow}, phase=${phases}`,
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { phases, pushes, maxFlow },
    );
  };

  snapshot("Initialize zero flow.", "هيّئ تدفقاً صفرياً.", 1, "initialize");
  while (true) {
    phases++;
    level = { [source]: 0 };
    const queue = [source];
    snapshot(`Build level graph ${phases}: put ${source} at level 0.`, `ابنِ رسم المستوى ${phases}: ضع ${source} في المستوى 0.`, 3, "level-start");
    while (queue.length) {
      const node = queue.shift()!;
      for (const neighbor of [...neighbors.get(node)!].sort()) {
        if (level[neighbor] !== undefined || residual(node, neighbor) <= 0) continue;
        level[neighbor] = level[node] + 1;
        queue.push(neighbor);
        snapshot(
          `Residual edge ${node}→${neighbor} assigns level[${neighbor}]=${level[neighbor]}.`,
          `الحافة المتبقية ${node}→${neighbor} تجعل level[${neighbor}]=${level[neighbor]}.`,
          5,
          "level-edge",
          [[node, neighbor]],
          [node, neighbor],
        );
      }
    }
    if (level[sink] === undefined) {
      snapshot("The sink is absent from the level graph; no augmenting path remains.", "المصب غير موجود في رسم المستوى؛ لا يبقى مسار توسيع.", 7, "no-level-path");
      break;
    }

    const next = Object.fromEntries(nodes.map((node) => [node, 0])) as Record<string, number>;
    const lists = new Map([...neighbors].map(([node, values]) => [node, [...values].sort()]));
    const send = (node: string, available: number, path: string[]): number => {
      if (node === sink) return available;
      const list = lists.get(node)!;
      while (next[node] < list.length) {
        const neighbor = list[next[node]];
        if (level[neighbor] === level[node] + 1 && residual(node, neighbor) > 0) {
          snapshot(
            `Follow admissible level edge ${node}→${neighbor}.`,
            `اتبع حافة المستوى المقبولة ${node}→${neighbor}.`,
            6,
            "dfs-edge",
            [[node, neighbor]],
            [...path, neighbor],
          );
          const sent = send(neighbor, Math.min(available, residual(node, neighbor)), [...path, neighbor]);
          if (sent > 0) {
            flow.set(edgeKey(node, neighbor), (flow.get(edgeKey(node, neighbor)) ?? 0) + sent);
            flow.set(edgeKey(neighbor, node), (flow.get(edgeKey(neighbor, node)) ?? 0) - sent);
            return sent;
          }
        }
        next[node]++;
      }
      return 0;
    };

    while (true) {
      const sent = send(source, Infinity, [source]);
      if (sent === 0) {
        snapshot("No more flow can cross this level graph; its blocking flow is complete.", "لا يمكن دفع مزيد من التدفق عبر رسم المستوى؛ اكتمل التدفق الحاجب.", 8, "blocking-complete");
        break;
      }
      maxFlow += sent;
      pushes++;
      snapshot(`Push ${sent} units; total flow becomes ${maxFlow}.`, `ادفع ${sent} وحدات؛ يصبح التدفق الكلي ${maxFlow}.`, 7, "push");
    }
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
    `Dinic finishes with maximum flow ${maxFlow}.`,
    `تنتهي دينيتش بتدفق أقصى ${maxFlow}.`,
    9,
    "complete",
    { phases, pushes, maxFlow },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "dinic",
  title: "Dinic's Maximum Flow",
  titleAr: "التدفق الأقصى بخوارزمية دينيتش",
  difficulty: "Advanced",
  tags: ["graph", "maximum flow", "level graph", "blocking flow"],
  tagsAr: ["رسم بياني", "تدفق أقصى", "رسم المستويات", "تدفق حاجب"],
  summary: "Alternates residual BFS level graphs with DFS blocking flows until the sink becomes unreachable.",
  summaryAr: "يتناوب بين رسوم مستويات BFS المتبقية وتدفقات DFS الحاجبة حتى يتعذر بلوغ المصب.",
  pseudocode: [
    "procedure Dinic(G, source, sink)",
    "  initialize zero flow",
    "  while residual BFS can build a level graph",
    "    assign source level 0",
    "    assign each reachable residual neighbor the next level",
    "    if sink has no level, stop",
    "    repeatedly run DFS on edges that advance one level",
    "      push the largest available residual flow",
    "    when DFS sends zero, the blocking flow is complete",
    "  return maximum flow",
  ],
  complexity: { best: "O(E)", average: "O(V²E)", worst: "O(V²E)", space: "O(V + E)" },
  concept: "Level graphs discard non-progressing residual edges, and each blocking flow saturates every source-sink route in that level graph.",
  conceptAr: "تستبعد رسوم المستويات الحواف غير المتقدمة، ويشبع كل تدفق حاجب مسارات المصدر إلى المصب فيها.",
  applications: ["Large matching instances", "Network throughput", "Minimum-cut computation"],
  applicationsAr: ["مسائل المطابقة الكبيرة", "سعة الشبكات", "حساب القطع الأدنى"],
  caveats: ["DFS must follow only edges advancing exactly one level.", "Current-edge pointers prevent rescanning dead residual edges."],
  caveatsAr: ["يجب أن يتبع DFS الحواف التي تتقدم مستوى واحداً فقط.", "تمنع مؤشرات الحافة الحالية إعادة فحص الحواف الميتة."],
  inputFields: [vertexField, edgeField(true, true, true), startField, targetField],
  defaultInput: (level) => defaultFlow(level),
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
def dinic(cap, adj, source, sink):
    flow, total = {}, 0
    while True:
        level = {source: 0}; queue = deque([source])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v not in level and cap.get((u,v),0)-flow.get((u,v),0)>0:
                    level[v]=level[u]+1; queue.append(v)
        if sink not in level: return total
        current = {u:0 for u in adj}
        def send(u, amount):
            if u == sink: return amount
            while current[u] < len(adj[u]):
                v = adj[u][current[u]]
                residual = cap.get((u,v),0)-flow.get((u,v),0)
                if level.get(v) == level[u]+1 and residual>0:
                    pushed=send(v,min(amount,residual))
                    if pushed: flow[u,v]=flow.get((u,v),0)+pushed; flow[v,u]=flow.get((v,u),0)-pushed; return pushed
                current[u]+=1
            return 0
        while pushed := send(source,float("inf")): total += pushed`,
  referenceTypeScript: `function dinic(source: string, sink: string): number {
  let total = 0;
  while (buildLevelGraph(source, sink)) {
    resetCurrentEdges();
    let pushed: number;
    while ((pushed = sendBlockingFlow(source, sink, Infinity)) > 0) total += pushed;
  }
  return total;
}`,
});

export default mod;
