import type { GraphFrame, Step } from "@/lib/engine/types";
import {
  addStep,
  adjacency,
  createGraphModule,
  defaultNodes,
  edgeField,
  edgeKey,
  graphFrame,
  parseEdges,
  parseNodes,
  randomConnectedEdges,
  requireVertex,
  serializeEdges,
  startField,
  targetField,
  vertexField,
  type GraphInput,
} from "./common";

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const start = input.start!;
  const target = input.target!;
  const adj = adjacency(nodes, edges, false);
  const forward = new Map<string, string | null>([[start, null]]);
  const backward = new Map<string, string | null>([[target, null]]);
  const qForward = [start];
  const qBackward = [target];
  const steps: Step<GraphFrame>[] = [];
  let expanded = 0;
  let meeting: string | null = start === target ? start : null;

  const pathToMeeting = (parents: Map<string, string | null>, node: string): string[] => {
    const path: string[] = [];
    for (let current: string | null = node; current !== null; current = parents.get(current) ?? null) path.push(current);
    return path.reverse();
  };
  const snapshot = (description: string, descriptionAr: string, codeLine: number, phase: string, active?: string) => {
    const states = Object.fromEntries(nodes.map((node) => [
      node,
      node === active ? "compare" : forward.has(node) && backward.has(node) ? "found" : forward.has(node) ? "active" : backward.has(node) ? "special" : "default",
    ])) as GraphFrame["nodeStates"];
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: false,
        nodeStates: states,
        aux: [
          { label: "Forward queue", values: qForward },
          { label: "Backward queue", values: qBackward },
          { label: "Forward discovered", values: [...forward.keys()] },
          { label: "Backward discovered", values: [...backward.keys()] },
        ],
        note: meeting ? `Frontiers meet at ${meeting}` : "Two BFS frontiers",
      }),
      description,
      descriptionAr,
      codeLine,
      phase,
      { expanded },
    );
  };

  snapshot(`Initialize BFS frontiers at ${start} and ${target}.`, `هيّئ جبهتي BFS عند ${start} و${target}.`, 1, "initialize");

  const expandLayer = (
    queue: string[],
    own: Map<string, string | null>,
    other: Map<string, string | null>,
    direction: "forward" | "backward",
  ): string | null => {
    const layerSize = queue.length;
    for (let count = 0; count < layerSize; count++) {
      const node = queue.shift()!;
      expanded++;
      snapshot(`Expand ${node} from the ${direction} frontier.`, `وسّع ${node} من الجبهة ${direction === "forward" ? "الأمامية" : "الخلفية"}.`, 4, "dequeue", node);
      for (const neighbor of adj.get(node) ?? []) {
        if (own.has(neighbor)) continue;
        own.set(neighbor, node);
        queue.push(neighbor);
        snapshot(`Discover ${neighbor} through ${node}.`, `اكتشف ${neighbor} عبر ${node}.`, 6, "discover", neighbor);
        if (other.has(neighbor)) return neighbor;
      }
    }
    return null;
  };

  while (!meeting && qForward.length > 0 && qBackward.length > 0) {
    meeting = qForward.length <= qBackward.length
      ? expandLayer(qForward, forward, backward, "forward")
      : expandLayer(qBackward, backward, forward, "backward");
  }

  let result: string[] = [];
  const edgeStates: Record<string, "sorted"> = {};
  if (meeting) {
    const left = pathToMeeting(forward, meeting);
    const right = pathToMeeting(backward, meeting).reverse().slice(1);
    result = [...left, ...right];
    for (let index = 1; index < result.length; index++) {
      const edge = edges.find((candidate) =>
        (candidate.from === result[index - 1] && candidate.to === result[index]) ||
        (candidate.to === result[index - 1] && candidate.from === result[index]));
      if (edge) edgeStates[edgeKey(edge.from, edge.to)] = "sorted";
    }
  }
  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: false,
      edgeStates,
      nodeStates: Object.fromEntries(nodes.map((node) => [node, result.includes(node) ? "found" : "discarded"])),
      aux: [{ label: "Result path", values: result.length ? result : ["none"] }],
      note: result.length ? `Shortest path length ${result.length - 1}` : "No path connects the endpoints",
    }),
    result.length ? `The shortest path is ${result.join(" → ")}.` : `No path connects ${start} to ${target}.`,
    result.length ? `أقصر مسار هو ${result.join(" ← ")}.` : `لا يوجد مسار يصل ${start} بـ ${target}.`,
    8,
    "complete",
    { expanded },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "bidirectional-bfs",
  title: "Bidirectional Breadth-First Search",
  titleAr: "البحث ثنائي الاتجاه بالعرض أولاً",
  difficulty: "Intermediate",
  tags: ["graph", "BFS", "shortest path", "bidirectional search"],
  tagsAr: ["رسم بياني", "بحث بالعرض", "أقصر مسار", "بحث ثنائي الاتجاه"],
  summary: "Runs BFS from both endpoints and joins the first intersecting shortest-path frontiers.",
  summaryAr: "يشغّل البحث بالعرض من الطرفين ويصل أول جبهتين متقاطعتين للحصول على أقصر مسار.",
  pseudocode: [
    "procedure bidirectionalBFS(G, start, target)",
    "  initialize one BFS frontier at each endpoint",
    "  while both frontiers are nonempty",
    "    choose the smaller frontier",
    "    dequeue every vertex in its current layer",
    "    discover each previously unseen neighbor",
    "    if a neighbor belongs to the other search, record the meeting",
    "  rebuild the path through the meeting vertex",
    "  return the shortest path or no path",
  ],
  complexity: { best: "O(1)", average: "O(b^(d/2))", worst: "O(V + E)", space: "O(V)" },
  concept: "Two synchronized BFS searches reduce the effective search depth in unweighted graphs.",
  conceptAr: "يقلل بحثا BFS المتزامنان عمق البحث الفعلي في الرسوم غير الموزونة.",
  applications: ["Social-network connection paths", "Word-ladder solvers", "Route finding with known endpoints"],
  applicationsAr: ["مسارات الاتصال في الشبكات الاجتماعية", "حل سلالم الكلمات", "إيجاد المسار بين طرفين معلومين"],
  caveats: ["Requires explicit start and target vertices.", "The graph must be unweighted for the shortest-edge-count guarantee."],
  caveatsAr: ["يتطلب عقدتي بداية وهدف واضحتين.", "يجب أن يكون الرسم غير موزون لضمان أقل عدد من الحواف."],
  inputFields: [vertexField, edgeField(false), startField, targetField],
  defaultInput: (level, rng) => {
    const nodes = defaultNodes(level);
    return { nodes, edges: randomConnectedEdges(nodes, rng, false), start: nodes[0], target: nodes.at(-1)! };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "");
    return {
      nodes,
      edges: parseEdges(fields.edges ?? "", nodes, { directed: false }),
      start: requireVertex(nodes, fields.start, "Start"),
      target: requireVertex(nodes, fields.target, "Target"),
    };
  },
  serializeInput: (input) => ({
    nodes: input.nodes.join(", "),
    edges: serializeEdges(input.edges, false),
    start: input.start!,
    target: input.target!,
  }),
  generate,
  referencePython: `from collections import deque
def bidirectional_bfs(adj, start, target):
    if start == target: return [start]
    front, back = {start: None}, {target: None}
    qf, qb = deque([start]), deque([target])
    while qf and qb:
        q, own, other = (qf, front, back) if len(qf) <= len(qb) else (qb, back, front)
        for _ in range(len(q)):
            u = q.popleft()
            for v in sorted(adj[u]):
                if v in own: continue
                own[v] = u; q.append(v)
                if v in other: return v, front, back
    return None`,
  referenceTypeScript: `function bidirectionalBfs(adj: Map<string, string[]>, start: string, target: string): string[] {
  const front = new Map<string, string | null>([[start, null]]);
  const back = new Map<string, string | null>([[target, null]]);
  let qf = [start], qb = [target];
  while (qf.length && qb.length) {
    const [queue, own, other] = qf.length <= qb.length ? [qf, front, back] : [qb, back, front];
    for (let count = queue.length; count > 0; count--) {
      const u = queue.shift()!;
      for (const v of adj.get(u) ?? []) {
        if (own.has(v)) continue;
        own.set(v, u); queue.push(v);
        if (other.has(v)) return [v];
      }
    }
  }
  return [];
}`,
});

export default mod;
