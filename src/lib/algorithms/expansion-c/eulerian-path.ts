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
  serializeEdges,
  vertexField,
  type GraphInput,
} from "./common";

function generate(input: GraphInput): Step<GraphFrame>[] {
  const { nodes, edges } = input;
  const steps: Step<GraphFrame>[] = [];
  const indegree = Object.fromEntries(nodes.map((node) => [node, 0])) as Record<string, number>;
  const outdegree = Object.fromEntries(nodes.map((node) => [node, 0])) as Record<string, number>;
  edges.forEach((edge) => {
    outdegree[edge.from]++;
    indegree[edge.to]++;
  });
  const starts = nodes.filter((node) => outdegree[node] - indegree[node] === 1);
  const ends = nodes.filter((node) => indegree[node] - outdegree[node] === 1);
  const invalidDegree = nodes.some((node) => Math.abs(outdegree[node] - indegree[node]) > 1) ||
    !((starts.length === 1 && ends.length === 1) || (starts.length === 0 && ends.length === 0));
  const nonzero = nodes.filter((node) => indegree[node] + outdegree[node] > 0);
  const weakAdj = adjacency(nodes, edges, false);
  const seen = new Set<string>();
  const queue = nonzero.length ? [nonzero[0]] : [];
  while (queue.length) {
    const node = queue.shift()!;
    if (seen.has(node)) continue;
    seen.add(node);
    queue.push(...(weakAdj.get(node) ?? []).filter((neighbor) => !seen.has(neighbor)));
  }
  const disconnected = nonzero.some((node) => !seen.has(node));

  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: true,
      weighted: false,
      annotations: Object.fromEntries(nodes.map((node) => [node, `out=${outdegree[node]}, in=${indegree[node]}`])),
      aux: [
        { label: "Start candidates", values: starts.length ? starts : ["circuit"] },
        { label: "End candidates", values: ends.length ? ends : ["circuit"] },
      ],
      note: "Check Euler degree and weak-connectivity conditions",
    }),
    "Compute every in-degree and out-degree, then verify weak connectivity.",
    "احسب درجة الدخول والخروج لكل عقدة ثم تحقق من الاتصال الضعيف.",
    1,
    "validate",
  );

  if (invalidDegree || disconnected) {
    addStep(
      steps,
      graphFrame(nodes, edges, {
        directed: true,
        nodeStates: Object.fromEntries(nodes.map((node) => [node, !seen.has(node) && nonzero.includes(node) ? "swap" : "discarded"])),
        annotations: Object.fromEntries(nodes.map((node) => [node, `out=${outdegree[node]}, in=${indegree[node]}`])),
        aux: [{ label: "Result", values: ["none"] }],
        note: invalidDegree ? "Degree condition fails" : "Nonzero-degree vertices are disconnected",
      }),
      invalidDegree ? "No directed Eulerian path: the in/out-degree differences are invalid." : "No directed Eulerian path: nonzero-degree vertices are disconnected.",
      invalidDegree ? "لا يوجد مسار أويلري موجه: فروق درجات الدخول والخروج غير صالحة." : "لا يوجد مسار أويلري موجه: العقد ذات الدرجة غير الصفرية منفصلة.",
      9,
      "complete",
    );
    return steps;
  }

  const start = starts[0] ?? edges[0]?.from ?? nodes[0];
  const outgoing = new Map(nodes.map((node) => [node, [] as number[]]));
  edges.forEach((edge, index) => outgoing.get(edge.from)!.push(index));
  for (const list of outgoing.values()) list.sort((a, b) => {
    const byTarget = edges[a].to.localeCompare(edges[b].to);
    return byTarget || a - b;
  });
  const cursor = Object.fromEntries(nodes.map((node) => [node, 0])) as Record<string, number>;
  const used = new Set<number>();
  const stack = [start];
  const circuit: string[] = [];

  while (stack.length) {
    const node = stack.at(-1)!;
    const list = outgoing.get(node)!;
    while (cursor[node] < list.length && used.has(list[cursor[node]])) cursor[node]++;
    if (cursor[node] < list.length) {
      const edgeIndex = list[cursor[node]++];
      used.add(edgeIndex);
      stack.push(edges[edgeIndex].to);
      addStep(
        steps,
        graphFrame(nodes, edges, {
          directed: true,
          edgeStates: Object.fromEntries([...used].map((index) => [edgeKey(edges[index].from, edges[index].to), "active"])),
          nodeStates: { [edges[edgeIndex].from]: "visited", [edges[edgeIndex].to]: "compare" },
          aux: [
            { label: "Traversal stack", values: stack },
            { label: "Reverse circuit", values: circuit },
          ],
          note: `Use edge ${edges[edgeIndex].from}→${edges[edgeIndex].to}`,
        }),
        `Consume edge ${edges[edgeIndex].from}→${edges[edgeIndex].to} and push ${edges[edgeIndex].to}.`,
        `استهلك الحافة ${edges[edgeIndex].from}→${edges[edgeIndex].to} وادفع ${edges[edgeIndex].to}.`,
        5,
        "consume-edge",
        { usedEdges: used.size },
      );
    } else {
      circuit.push(stack.pop()!);
      addStep(
        steps,
        graphFrame(nodes, edges, {
          directed: true,
          nodeStates: { [node]: "found" },
          aux: [
            { label: "Traversal stack", values: stack },
            { label: "Reverse circuit", values: circuit },
          ],
          note: `${node} has no unused outgoing edge`,
        }),
        `${node} has no unused outgoing edge; prepend it to the final trail.`,
        `لا تملك ${node} حافة خروج غير مستخدمة؛ أضفها إلى بداية المسار النهائي.`,
        7,
        "backtrack",
        { usedEdges: used.size },
      );
    }
  }
  const result = circuit.reverse();
  addStep(
    steps,
    graphFrame(nodes, edges, {
      directed: true,
      edgeStates: Object.fromEntries(edges.map((edge) => [edgeKey(edge.from, edge.to), "sorted"])),
      nodeStates: Object.fromEntries(nodes.map((node) => [node, result.includes(node) ? "found" : "discarded"])),
      aux: [{ label: "Result path", values: result }],
      note: `${edges.length} edges used exactly once`,
    }),
    `Directed Eulerian ${starts.length ? "path" : "circuit"}: ${result.join(" → ")}.`,
    `المسار الأويلري الموجه: ${result.join(" ← ")}.`,
    9,
    "complete",
    { usedEdges: used.size },
  );
  return steps;
}

const mod = createGraphModule<GraphInput>({
  slug: "eulerian-path",
  title: "Directed Eulerian Path (Hierholzer)",
  titleAr: "المسار الأويلري الموجه بخوارزمية هيرهولتسر",
  difficulty: "Advanced",
  tags: ["graph", "Eulerian path", "Hierholzer", "edge traversal"],
  tagsAr: ["رسم بياني", "مسار أويلري", "هيرهولتسر", "اجتياز الحواف"],
  summary: "Uses every directed edge exactly once after validating degree and weak-connectivity conditions.",
  summaryAr: "يستخدم كل حافة موجهة مرة واحدة بعد التحقق من شروط الدرجات والاتصال الضعيف.",
  pseudocode: [
    "procedure directedEulerianPath(G)",
    "  verify in/out-degree differences and weak connectivity",
    "  choose the unique +1 out-degree vertex, or any edge source",
    "  push the start on a traversal stack",
    "  while the stack is nonempty",
    "    if its top has an unused outgoing edge, consume it and push its target",
    "    otherwise pop the top",
    "      append the popped vertex to the reverse circuit",
    "  reverse the circuit",
    "  return the trail or report that no trail exists",
  ],
  complexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)", space: "O(V + E)" },
  concept: "Hierholzer splices closed edge trails by backtracking only when a vertex has no unused outgoing edge.",
  conceptAr: "تدمج هيرهولتسر مسارات الحواف المغلقة بالتراجع فقط عند نفاد حواف الخروج غير المستخدمة.",
  applications: ["Route inspection", "DNA fragment assembly", "Drawing paths without lifting a pen"],
  applicationsAr: ["فحص المسارات", "تجميع مقاطع DNA", "الرسم دون رفع القلم"],
  caveats: ["This module uses directed degree conditions.", "Every nonzero-degree vertex must lie in one weak component."],
  caveatsAr: ["تستخدم هذه الوحدة شروط الدرجات الموجهة.", "يجب أن تقع كل عقدة ذات درجة في مكوّن ضعيف واحد."],
  inputFields: [vertexField, edgeField(true)],
  defaultInput: (level) => {
    const nodes = defaultNodes(level);
    const cycle = nodes.map((node, index) => ({ from: node, to: nodes[(index + 1) % nodes.length] }));
    return { nodes, edges: cycle };
  },
  parseInput: (fields) => {
    const nodes = parseNodes(fields.nodes ?? "");
    return { nodes, edges: parseEdges(fields.edges ?? "", nodes, { directed: true }) };
  },
  serializeInput: (input) => ({ nodes: input.nodes.join(", "), edges: serializeEdges(input.edges, true) }),
  generate,
  referencePython: `def eulerian_path(adj, start):
    next_edge = {u: list(reversed(sorted(vs))) for u, vs in adj.items()}
    stack, circuit = [start], []
    while stack:
        u = stack[-1]
        if next_edge[u]: stack.append(next_edge[u].pop())
        else: circuit.append(stack.pop())
    return list(reversed(circuit))`,
  referenceTypeScript: `function eulerianPath(adj: Map<string, string[]>, start: string): string[] {
  const next = new Map([...adj].map(([u, values]) => [u, [...values].reverse()]));
  const stack = [start], circuit: string[] = [];
  while (stack.length) {
    const u = stack.at(-1)!;
    const v = next.get(u)!.pop();
    if (v !== undefined) stack.push(v); else circuit.push(stack.pop()!);
  }
  return circuit.reverse();
}`,
});

export default mod;
