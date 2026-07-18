import type {
  ArrayFrame,
  CallStackFrame,
  GraphFrame,
  GridFrame,
  HashFrame,
  ListFrame,
  RendererKind,
  Step,
  StringFrame,
  TableFrame,
  TreeFrame,
} from "./types";

export type DraftMutationKind = "insert" | "delete" | "update" | "clear" | "shuffle";

export interface DraftMutation {
  before: string[];
  after: string[];
  kind: DraftMutationKind;
  detail: string;
}

function scalar(value: string): string | number {
  const numeric = Number(value);
  return value.trim() !== "" && Number.isFinite(numeric) ? numeric : value;
}

function highlightedIndex(mutation: DraftMutation) {
  if (mutation.kind === "insert") return Math.max(0, mutation.after.length - 1);
  if (mutation.kind === "update") {
    const changed = mutation.after.findIndex((value, index) => value !== mutation.before[index]);
    return changed >= 0 ? changed : 0;
  }
  return -1;
}

function frameFor(renderer: RendererKind, values: string[], activeIndex = -1) {
  if (renderer === "array") {
    return {
      values: values.map((value) => Number(value)),
      states: activeIndex >= 0 ? { [activeIndex]: "active" as const } : {},
      pointers: activeIndex >= 0 ? [{ index: activeIndex, label: "new" }] : [],
    } satisfies ArrayFrame;
  }

  if (renderer === "list") {
    const nodes = values.map((value, index) => ({ id: `draft-${index}`, value: scalar(value) }));
    return {
      nodes,
      links: nodes.slice(0, -1).map((node, index) => ({ from: node.id, to: nodes[index + 1].id, kind: "next" as const })),
      states: activeIndex >= 0 && nodes[activeIndex] ? { [nodes[activeIndex].id]: "active" as const } : {},
      pointers: activeIndex >= 0 && nodes[activeIndex] ? [{ nodeId: nodes[activeIndex].id, label: "new" }] : [],
    } satisfies ListFrame;
  }

  if (renderer === "tree") {
    const nodes: TreeFrame["nodes"] = {};
    values.forEach((value, index) => {
      const id = `draft-${index}`;
      const left = index * 2 + 1 < values.length ? `draft-${index * 2 + 1}` : null;
      const right = index * 2 + 2 < values.length ? `draft-${index * 2 + 2}` : null;
      nodes[id] = { id, value: scalar(value), left, right };
    });
    return {
      nodes,
      rootId: values.length ? "draft-0" : null,
      states: activeIndex >= 0 ? { [`draft-${activeIndex}`]: "active" as const } : {},
      note: "Building a new set",
    } satisfies TreeFrame;
  }

  if (renderer === "graph") {
    const nodeIds = new Set<string>();
    const edges: GraphFrame["edges"] = [];
    for (const token of values) {
      const match = token.match(/^\s*([^>:-]+?)\s*(?:>|-)\s*([^:]+?)(?::\s*(-?\d+(?:\.\d+)?))?\s*$/);
      if (match) {
        const from = match[1].trim();
        const to = match[2].trim();
        nodeIds.add(from);
        nodeIds.add(to);
        edges.push({ from, to, weight: match[3] === undefined ? undefined : Number(match[3]) });
      } else {
        nodeIds.add(token);
      }
    }
    return {
      nodes: [...nodeIds].map((id, index, all) => ({
        id,
        label: id,
        x: all.length <= 1 ? 0.5 : 0.15 + (0.7 * index) / (all.length - 1),
        y: 0.5,
      })),
      edges,
      directed: values.some((value) => value.includes(">")),
      weighted: edges.some((edge) => edge.weight !== undefined),
    } satisfies GraphFrame;
  }

  if (renderer === "grid") {
    return {
      rows: values.length ? 1 : 0,
      cols: values.length,
      cells: values.length ? [values.map((value, index) => ({ value: scalar(value), state: index === activeIndex ? "active" as const : undefined }))] : [],
    } satisfies GridFrame;
  }

  if (renderer === "table") {
    return {
      rowLabels: values.length ? ["set"] : [],
      colLabels: values.map((_, index) => String(index)),
      cells: values.length ? [values.map((value, index) => ({ value: scalar(value), state: index === activeIndex ? "active" as const : undefined }))] : [],
    } satisfies TableFrame;
  }

  if (renderer === "callstack") {
    return {
      stack: values.map((value, index) => ({ id: `draft-${index}`, label: value, state: index === activeIndex ? "active" as const : undefined })),
    } satisfies CallStackFrame;
  }

  if (renderer === "string") {
    const text = values.join(", ");
    return {
      text: [...text].map((ch, index) => ({ ch, state: activeIndex >= 0 && index >= text.lastIndexOf(values[activeIndex] ?? "") ? "active" as const : undefined })),
    } satisfies StringFrame;
  }

  return {
    buckets: values.map((value, index) => ({
      index,
      items: [{ key: value, state: index === activeIndex ? "active" as const : undefined }],
      state: index === activeIndex ? "active" as const : undefined,
    })),
    chained: true,
  } satisfies HashFrame;
}

/** A temporary, reversible visualization used while a learner builds a dataset that is still below an algorithm's minimum size. */
export function buildDraftMutationSteps(renderer: RendererKind, mutation: DraftMutation): Step[] {
  const active = highlightedIndex(mutation);
  const action = mutation.kind === "update" ? "edit" : mutation.kind;
  const actionAr = mutation.kind === "insert" ? "الإدراج" : mutation.kind === "delete" ? "الحذف" : mutation.kind === "update" ? "التعديل" : mutation.kind === "clear" ? "المسح" : "الخلط";
  return [
    {
      frame: frameFor(renderer, mutation.before),
      description: `Current set before ${mutation.detail}.`,
      descriptionAr: `المجموعة الحالية قبل ${actionAr}.`,
      phase: "prepare",
      why: "The requested change starts from the values currently visible on the canvas.",
      whyAr: "يبدأ التغيير المطلوب من القيم الظاهرة حاليًا في مساحة التصور.",
      counters: { items: mutation.before.length },
    },
    {
      frame: frameFor(renderer, mutation.after, active),
      description: `Apply ${action}: ${mutation.detail}. The new set is visible immediately.`,
      descriptionAr: `تنفيذ ${actionAr}: أصبحت المجموعة الجديدة ظاهرة مباشرة.`,
      phase: mutation.kind,
      why: "Each edit is shown immediately, even before the dataset is large enough to run the full algorithm.",
      whyAr: "يظهر كل تعديل مباشرة حتى قبل أن يصبح حجم البيانات كافيًا لتشغيل الخوارزمية كاملة.",
      counters: { items: mutation.after.length },
    },
  ];
}

/** Prevents malformed non-numeric array input from being mistaken for a valid in-progress dataset. */
export function canVisualizeDraft(renderer: RendererKind, values: string[]) {
  return renderer !== "array" || values.every((value) => value.trim() !== "" && Number.isFinite(Number(value)));
}
