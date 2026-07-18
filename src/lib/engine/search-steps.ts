import type {
  AlgorithmModule,
  ArrayFrame,
  HashFrame,
  ListFrame,
  RendererKind,
  Step,
  TreeFrame,
} from "./types";

const GENERIC_SEARCH_RENDERERS = new Set<RendererKind>(["array", "list", "tree", "hash"]);
const ORDERED_TREE_SLUGS = new Set(["binary-search-tree", "avl-tree", "red-black-tree"]);

export function supportsGenericSearch(module: Pick<AlgorithmModule, "renderer" | "slug">) {
  return GENERIC_SEARCH_RENDERERS.has(module.renderer);
}

function sameValue(value: string | number, target: string) {
  return String(value).trim().toLocaleLowerCase() === target.trim().toLocaleLowerCase();
}

function resultStep<F>(base: Step<F>, target: string, found: boolean, frame: F, checks: number): Step<F> {
  return {
    ...base,
    frame,
    description: found ? `Found ${target} after ${checks} check${checks === 1 ? "" : "s"}.` : `${target} is not present in the current set.`,
    descriptionAr: found ? `تم العثور على ${target} بعد ${checks} عملية فحص.` : `القيمة ${target} غير موجودة في المجموعة الحالية.`,
    why: found ? "The highlighted position contains the requested value." : "Every reachable value was checked without a match.",
    whyAr: found ? "الموضع المميز يحتوي على القيمة المطلوبة." : "تم فحص جميع القيم الممكنة دون العثور على تطابق.",
    phase: found ? "found" : "not-found",
    counters: { checks },
    transformation: undefined,
  };
}

function arraySearch(base: Step<ArrayFrame>, target: string): Step<ArrayFrame>[] {
  const values = base.frame.values;
  const steps: Step<ArrayFrame>[] = [];
  for (let index = 0; index < values.length; index++) {
    const found = sameValue(values[index], target);
    const frame = { ...base.frame, states: { [index]: found ? "found" as const : "active" as const }, pointers: [{ index, label: found ? "found" : "check" }] };
    steps.push({
      ...base,
      frame,
      description: found ? `Value ${target} found at index ${index}.` : `Check index ${index}: ${values[index]} does not match ${target}.`,
      descriptionAr: found ? `تم العثور على القيمة ${target} عند الفهرس ${index}.` : `فحص الفهرس ${index}: القيمة ${values[index]} لا تطابق ${target}.`,
      why: found ? "The current element matches the requested value." : "Move to the next position because this value does not match.",
      whyAr: found ? "العنصر الحالي يطابق القيمة المطلوبة." : "ننتقل إلى الموضع التالي لأن هذه القيمة لا تطابق المطلوب.",
      phase: found ? "found" : "compare",
      counters: { checks: index + 1 },
      transformation: undefined,
    });
    if (found) return steps;
  }
  return [...steps, resultStep(base, target, false, { ...base.frame, states: {}, pointers: [] }, values.length)];
}

function listSearch(base: Step<ListFrame>, target: string): Step<ListFrame>[] {
  const steps: Step<ListFrame>[] = [];
  for (let index = 0; index < base.frame.nodes.length; index++) {
    const node = base.frame.nodes[index];
    const found = sameValue(node.value, target);
    steps.push({
      ...base,
      frame: { ...base.frame, states: { [node.id]: found ? "found" : "active" }, pointers: [{ nodeId: node.id, label: found ? "found" : "current" }] },
      description: found ? `Value ${target} found in node ${node.id}.` : `Visit node ${node.id} (${node.value}); continue to the next link.`,
      descriptionAr: found ? `تم العثور على القيمة ${target} في العقدة ${node.id}.` : `زيارة العقدة ${node.id} (${node.value}) ثم متابعة الرابط التالي.`,
      why: found ? "This node contains the requested value." : "Following the next link is necessary because this node does not match.",
      whyAr: found ? "هذه العقدة تحتوي على القيمة المطلوبة." : "يجب اتباع الرابط التالي لأن هذه العقدة لا تطابق القيمة المطلوبة.",
      phase: found ? "found" : "visit",
      counters: { checks: index + 1 },
      transformation: undefined,
    });
    if (found) return steps;
  }
  return [...steps, resultStep(base, target, false, { ...base.frame, states: {}, pointers: [] }, base.frame.nodes.length)];
}

function treeSearch(base: Step<TreeFrame>, target: string, ordered: boolean): Step<TreeFrame>[] {
  const steps: Step<TreeFrame>[] = [];
  const queue = base.frame.rootId ? [base.frame.rootId] : [];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = base.frame.nodes[id];
    if (!node) continue;
    const found = sameValue(node.value, target);
    let direction = "";
    let directionAr = "";
    if (!found && ordered && typeof node.value === "number" && Number.isFinite(Number(target))) {
      const goLeft = Number(target) < node.value;
      const next = goLeft ? node.left : node.right;
      direction = next ? ` Go ${goLeft ? "left" : "right"}.` : ` There is no ${goLeft ? "left" : "right"} child.`;
      directionAr = next ? ` انتقل ${goLeft ? "يسارًا" : "يمينًا"}.` : ` لا يوجد ابن ${goLeft ? "أيسر" : "أيمن"}.`;
      if (next) queue.push(next);
    } else if (!found) {
      for (const child of node.children ?? [node.left, node.right]) if (child) queue.push(child);
      direction = " Continue through the next reachable child.";
      directionAr = " تابع عبر العقدة الفرعية التالية الممكنة.";
    }
    steps.push({
      ...base,
      frame: { ...base.frame, states: { [id]: found ? "found" : "active" } },
      description: found ? `Value ${target} found at node ${id}.` : `Compare ${target} with node ${node.value}.${direction}`,
      descriptionAr: found ? `تم العثور على القيمة ${target} في العقدة ${id}.` : `قارن ${target} مع قيمة العقدة ${node.value}.${directionAr}`,
      why: found ? "The current node contains the requested value." : ordered ? "The comparison determines which subtree can still contain the target." : "The current node does not match, so the traversal continues.",
      whyAr: found ? "العقدة الحالية تحتوي على القيمة المطلوبة." : ordered ? "تحدد المقارنة أي شجرة فرعية قد تحتوي على القيمة المطلوبة." : "العقدة الحالية لا تطابق القيمة، لذلك يستمر الاجتياز.",
      phase: found ? "found" : "compare",
      counters: { checks: visited.size },
      transformation: undefined,
    });
    if (found) return steps;
  }
  return [...steps, resultStep(base, target, false, { ...base.frame, states: {} }, visited.size)];
}

function hashSearch(base: Step<HashFrame>, target: string): Step<HashFrame>[] {
  const steps: Step<HashFrame>[] = [];
  let checks = 0;
  for (let bucketIndex = 0; bucketIndex < base.frame.buckets.length; bucketIndex++) {
    const bucket = base.frame.buckets[bucketIndex];
    for (let itemIndex = 0; itemIndex < bucket.items.length; itemIndex++) {
      checks++;
      const found = sameValue(bucket.items[itemIndex].key, target);
      const buckets = base.frame.buckets.map((candidate, index) => ({
        ...candidate,
        state: index === bucketIndex ? "active" as const : candidate.state,
        items: candidate.items.map((item, i) => ({ ...item, state: index === bucketIndex && i === itemIndex ? (found ? "found" as const : "active" as const) : undefined })),
      }));
      steps.push({
        ...base,
        frame: { ...base.frame, buckets },
        description: found ? `Key ${target} found in bucket ${bucket.index}.` : `Check key ${bucket.items[itemIndex].key} in bucket ${bucket.index}.`,
        descriptionAr: found ? `تم العثور على المفتاح ${target} في الحاوية ${bucket.index}.` : `فحص المفتاح ${bucket.items[itemIndex].key} في الحاوية ${bucket.index}.`,
        why: found ? "This entry matches the requested key." : "Continue because the current entry does not match.",
        whyAr: found ? "هذا الإدخال يطابق المفتاح المطلوب." : "استمر لأن الإدخال الحالي لا يطابق المطلوب.",
        phase: found ? "found" : "compare",
        counters: { checks },
        transformation: undefined,
      });
      if (found) return steps;
    }
  }
  return [...steps, resultStep(base, target, false, { ...base.frame, buckets: base.frame.buckets.map((bucket) => ({ ...bucket, state: undefined, items: bucket.items.map((item) => ({ ...item, state: undefined })) })) }, checks)];
}

/** Builds a reversible lookup animation over the structure the learner is currently viewing. */
export function buildGenericSearchSteps(
  module: Pick<AlgorithmModule, "renderer" | "slug">,
  current: Step | undefined,
  target: string,
): Step[] {
  if (!current || !supportsGenericSearch(module)) return [];
  if (module.renderer === "array") return arraySearch(current as Step<ArrayFrame>, target);
  if (module.renderer === "list") return listSearch(current as Step<ListFrame>, target);
  if (module.renderer === "tree") return treeSearch(current as Step<TreeFrame>, target, ORDERED_TREE_SLUGS.has(module.slug));
  if (module.renderer === "hash") return hashSearch(current as Step<HashFrame>, target);
  return [];
}
