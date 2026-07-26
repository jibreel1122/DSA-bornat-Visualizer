import type { CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import {
  cloneFrame,
  integerField,
  linearComplexity,
  logarithmicComplexity,
  makeTreeModule,
  parseIntegers,
  randomUnique,
  step,
} from "./shared";

interface Node {
  id: string;
  key: number;
  left: Node | null;
  right: Node | null;
  parent: Node | null;
  level: number;
  size: number;
}

function nodeFrame(root: Node | null, states: Record<string, CellState> = {}, note?: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const updateSizes = (node: Node | null): number => {
    if (!node) return 0;
    node.size = 1 + updateSizes(node.left) + updateSizes(node.right);
    return node.size;
  };
  updateSizes(root);
  const visit = (node: Node | null) => {
    if (!node) return;
    nodes[node.id] = {
      id: node.id,
      value: node.key,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: `L${node.level} · size ${node.size}`,
    };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return cloneFrame(nodes, root?.id ?? null, states, [], note);
}

type ValuesInput = { values: number[] };

function valuesInput(fields: Record<string, string>): ValuesInput {
  return { values: parseIntegers(fields.values ?? "", 18, true) };
}

function replaceAtParent(root: Node | null, oldRoot: Node, newRoot: Node): Node {
  const parent = oldRoot.parent;
  newRoot.parent = parent;
  if (!parent) root = newRoot;
  else if (parent.left === oldRoot) parent.left = newRoot;
  else parent.right = newRoot;
  return root!;
}

function generateAA(input: ValuesInput): Step<TreeFrame>[] {
  let root: Node | null = null;
  let nextId = 0;
  let rotations = 0;
  let comparisons = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (
    states: Record<string, CellState>,
    description: string,
    descriptionAr: string,
    line: number,
    phase: string,
    transformation?: Step<TreeFrame>["transformation"],
  ) => steps.push(step(nodeFrame(root, states, "AA levels encode horizontal right links."), description, descriptionAr, line, phase, { comparisons, rotations }, transformation));

  emit({}, "Start with an empty AA tree.", "ابدأ بشجرة AA فارغة.", 0, "start");
  for (const key of input.values) {
    if (!root) {
      root = { id: `aa${nextId++}`, key, left: null, right: null, parent: null, level: 1, size: 1 };
      emit({ [root.id]: "found" }, `Insert ${key} as a root at level 1.`, `أدرج ${key} جذراً في المستوى 1.`, 0, "insert");
      continue;
    }
    let current: Node | null = root;
    let parent: Node | null = null;
    const path: Node[] = [];
    while (current) {
      parent = current;
      path.push(current);
      comparisons++;
      emit({ [current.id]: "compare" }, `Compare ${key} with ${current.key}.`, `قارن ${key} مع ${current.key}.`, 0, "compare");
      current = key < current.key ? current.left : current.right;
    }
    const inserted: Node = { id: `aa${nextId++}`, key, left: null, right: null, parent, level: 1, size: 1 };
    if (key < parent!.key) parent!.left = inserted;
    else parent!.right = inserted;
    emit({ [inserted.id]: "found" }, `Attach ${key} as a normal BST leaf before balancing.`, `اربط ${key} كورقة BST عادية قبل الموازنة.`, 0, "insert");

    for (let index = path.length - 1; index >= 0; index--) {
      let node = path[index];
      if (node.left?.level === node.level) {
        const child = node.left;
        emit({ [node.id]: "swap", [child.id]: "active" }, `Skew is required because ${child.key} has the same level as its parent ${node.key}.`, `يلزم انحراف Skew لأن مستوى ${child.key} يساوي مستوى الأب ${node.key}.`, 1, "skew");
        root = replaceAtParent(root, node, child);
        node.left = child.right;
        if (node.left) node.left.parent = node;
        child.right = node;
        node.parent = child;
        rotations++;
        emit({ [child.id]: "found", [node.id]: "active" }, `Complete the right rotation around ${node.key}.`, `أكمل الدوران اليميني حول ${node.key}.`, 1, "skew", { kind: "balance", label: "AA skew rotation" });
        node = child;
      }
      if (node.right?.right?.level === node.level) {
        const child = node.right;
        emit({ [node.id]: "swap", [child.id]: "active", [child.right!.id]: "compare" }, `Split is required across three consecutive nodes at level ${node.level}.`, `يلزم Split لوجود ثلاث عقد متتالية في المستوى ${node.level}.`, 2, "split");
        root = replaceAtParent(root, node, child);
        node.right = child.left;
        if (node.right) node.right.parent = node;
        child.left = node;
        node.parent = child;
        child.level++;
        rotations++;
        emit({ [child.id]: "found", [node.id]: "active" }, `Complete the left rotation and promote ${child.key} to level ${child.level}.`, `أكمل الدوران اليساري وارفع ${child.key} إلى المستوى ${child.level}.`, 2, "split", { kind: "balance", label: "AA split rotation" });
      }
    }
  }
  emit(root ? { [root.id]: "sorted" } : {}, "AA tree construction is complete.", "اكتمل بناء شجرة AA.", 3, "done");
  return steps;
}

export const aaTree = makeTreeModule<ValuesInput>({
  slug: "aa-tree",
  title: "AA Tree",
  titleAr: "شجرة AA",
  difficulty: "Advanced",
  tags: ["balanced BST", "skew", "split"],
  tagsAr: ["شجرة بحث متوازنة", "انحراف", "تقسيم"],
  summary: "Maintain a level-based balanced search tree using only right and left rotations.",
  summaryAr: "حافظ على شجرة بحث متوازنة بالمستويات باستخدام عمليتي Skew وSplit.",
  overview: "An AA tree represents a restricted red-black tree. Skew removes a left horizontal link; split removes two consecutive right horizontal links.",
  overviewAr: "تمثل شجرة AA شكلاً مقيداً من الشجرة الحمراء السوداء؛ تزيل Skew الرابط الأفقي الأيسر وتزيل Split رابطين أفقيين يمينيين متتاليين.",
  pseudocode: ["BST-insert key at level 1", "skew node when left.level = node.level", "split node when right.right.level = node.level", "return balanced root"],
  complexity: logarithmicComplexity,
  applications: ["Ordered maps", "Database indexes", "Balanced dictionaries"],
  applicationsAr: ["الخرائط المرتبة", "فهارس قواعد البيانات", "القواميس المتوازنة"],
  inputFields: [integerField()],
  defaultInput: (level, rng) => ({ values: randomUnique(level, rng, 9) }),
  parseInput: valuesInput,
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: generateAA,
});

interface CartesianNode {
  id: string;
  value: number;
  index: number;
  left: CartesianNode | null;
  right: CartesianNode | null;
}

function cartesianFrame(root: CartesianNode | null, all: CartesianNode[], states: Record<string, CellState>, stack: CartesianNode[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  for (const node of all) {
    nodes[node.id] = {
      id: node.id,
      value: node.value,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: `index ${node.index}`,
    };
  }
  return cloneFrame(nodes, root?.id ?? null, states, [{ label: "monotonic stack", values: stack.map((node) => node.value) }], "Inorder positions equal the original array; parents are no larger than children.");
}

function generateCartesian(input: ValuesInput): Step<TreeFrame>[] {
  const all: CartesianNode[] = [];
  const stackNodes: CartesianNode[] = [];
  const steps: Step<TreeFrame>[] = [];
  let root: CartesianNode | null = null;
  let comparisons = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string, transformation?: Step<TreeFrame>["transformation"]) =>
    steps.push(step(cartesianFrame(root, all, states, stackNodes), description, descriptionAr, line, phase, { comparisons }, transformation));
  emit({}, "Start with an empty monotonic stack.", "ابدأ بمكدس رتيب فارغ.", 0, "start");
  input.values.forEach((value, index) => {
    const node: CartesianNode = { id: `ct${index}`, value, index, left: null, right: null };
    all.push(node);
    let last: CartesianNode | null = null;
    emit({ [node.id]: "active" }, `Create node ${value} for array index ${index}.`, `أنشئ العقدة ${value} للفهرس ${index}.`, 0, "create");
    while (stackNodes.length > 0) {
      comparisons++;
      const top = stackNodes.at(-1)!;
      emit({ [top.id]: "compare", [node.id]: "compare" }, `Compare stack top ${top.value} with ${value}.`, `قارن قمة المكدس ${top.value} مع ${value}.`, 1, "compare");
      if (top.value <= value) break;
      last = stackNodes.pop()!;
      emit({ [last.id]: "swap", [node.id]: "active" }, `Pop ${last.value}; it becomes the candidate left subtree of ${value}.`, `أزل ${last.value}؛ سيصبح مرشح الفرع الأيسر لـ ${value}.`, 1, "pop");
    }
    node.left = last;
    if (last) emit({ [node.id]: "active", [last.id]: "found" }, `Link ${last.value} as the left child of ${value}.`, `اربط ${last.value} ابناً أيسر لـ ${value}.`, 2, "link", { kind: "reorder", label: "Cartesian left-subtree link" });
    if (stackNodes.length > 0) {
      const parent = stackNodes.at(-1)!;
      parent.right = node;
      emit({ [parent.id]: "active", [node.id]: "found" }, `Link ${value} as the right child of ${parent.value}.`, `اربط ${value} ابناً أيمن لـ ${parent.value}.`, 2, "link", { kind: "reorder", label: "Cartesian right link" });
    } else {
      root = node;
      emit({ [node.id]: "found" }, `${value} is the smallest active value and becomes the root.`, `${value} هو أصغر قيمة نشطة ويصبح الجذر.`, 2, "root");
    }
    stackNodes.push(node);
    emit({ [node.id]: "visited" }, `Push ${value}; the stack is monotonic again.`, `ادفع ${value}؛ عاد المكدس رتيباً.`, 3, "push");
  });
  root = stackNodes[0] ?? null;
  emit(root === null ? {} : { [root.id]: "sorted" }, "Cartesian tree construction is complete.", "اكتمل بناء الشجرة الديكارتية.", 3, "done");
  return steps;
}

export const cartesianTree = makeTreeModule<ValuesInput>({
  slug: "cartesian-tree",
  title: "Cartesian Tree",
  titleAr: "الشجرة الديكارتية",
  difficulty: "Intermediate",
  tags: ["monotonic stack", "range minimum", "heap"],
  tagsAr: ["مكدس رتيب", "أصغر قيمة في نطاق", "كومة"],
  summary: "Build a min-Cartesian tree whose inorder traversal is the original sequence.",
  summaryAr: "ابنِ شجرة ديكارتية صغرى يحافظ عبورها الوسطي على ترتيب المتتالية.",
  overview: "A Cartesian tree combines sequence order with min-heap order and can be built in linear time with a monotonic stack.",
  overviewAr: "تجمع الشجرة الديكارتية بين ترتيب المتتالية وخاصية الكومة الصغرى، ويمكن بناؤها خطياً بمكدس رتيب.",
  pseudocode: ["create one node per array value", "pop larger stack nodes", "attach last popped node left and current node right", "push current node"],
  complexity: linearComplexity,
  applications: ["Range-minimum queries", "Treap analysis", "Nearest-smaller problems"],
  applicationsAr: ["استعلام أصغر قيمة", "تحليل Treap", "مسائل العنصر الأصغر الأقرب"],
  inputFields: [integerField()],
  defaultInput: (level, rng) => ({ values: randomUnique(level, rng, 10) }),
  parseInput: valuesInput,
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: generateCartesian,
});

type OrderInput = { values: number[]; select: number; rank: number };

function parseOrder(fields: Record<string, string>): OrderInput {
  const values = parseIntegers(fields.values ?? "", 18, true);
  const select = Number(fields.select);
  const rank = Number(fields.rank);
  if (!Number.isSafeInteger(select) || select < 1 || select > values.length) throw new Error("Select must be a one-based rank inside the data set.");
  if (!Number.isSafeInteger(rank)) throw new Error("Rank query must be an integer.");
  return { values, select, rank };
}

function recomputeSize(node: Node | null): number {
  if (!node) return 0;
  node.size = 1 + recomputeSize(node.left) + recomputeSize(node.right);
  return node.size;
}

function generateOrderStatistic(input: OrderInput): Step<TreeFrame>[] {
  let root: Node | null = null;
  let nextId = 0;
  let comparisons = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, line: number, phase: string) =>
    steps.push(step(nodeFrame(root, states, "Each node stores its exact subtree size."), description, descriptionAr, line, phase, { comparisons }));
  emit({}, "Start with an empty augmented BST.", "ابدأ بشجرة بحث معززة فارغة.", 0, "start");
  for (const key of input.values) {
    let parent: Node | null = null;
    let current = root;
    while (current) {
      parent = current;
      comparisons++;
      emit({ [current.id]: "compare" }, `Compare insertion key ${key} with ${current.key}.`, `قارن مفتاح الإدراج ${key} مع ${current.key}.`, 0, "compare");
      current = key < current.key ? current.left : current.right;
    }
    const inserted: Node = { id: `os${nextId++}`, key, left: null, right: null, parent, level: 1, size: 1 };
    if (!parent) root = inserted;
    else if (key < parent.key) parent.left = inserted;
    else parent.right = inserted;
    emit({ [inserted.id]: "found" }, `Attach ${key} as a BST leaf.`, `اربط ${key} كورقة BST.`, 0, "insert");
    let ancestor = parent;
    while (ancestor) {
      const previous = ancestor.size;
      ancestor.size = 1 + (ancestor.left?.size ?? 0) + (ancestor.right?.size ?? 0);
      emit({ [ancestor.id]: "active" }, `Update ${ancestor.key}'s subtree size from ${previous} to ${ancestor.size}.`, `حدّث حجم فرع ${ancestor.key} من ${previous} إلى ${ancestor.size}.`, 1, "augment");
      ancestor = ancestor.parent;
    }
  }
  recomputeSize(root);
  let selected = root;
  let wanted = input.select;
  while (selected) {
    const leftSize = selected.left?.size ?? 0;
    comparisons++;
    emit({ [selected.id]: "compare" }, `At ${selected.key}, left size is ${leftSize}; seek rank ${wanted}.`, `عند ${selected.key} حجم اليسار ${leftSize}؛ نبحث عن الرتبة ${wanted}.`, 2, "select");
    if (wanted === leftSize + 1) break;
    if (wanted <= leftSize) selected = selected.left;
    else {
      wanted -= leftSize + 1;
      selected = selected.right;
    }
  }
  if (selected) emit({ [selected.id]: "found" }, `The ${input.select}-th smallest key is ${selected.key}.`, `المفتاح رقم ${input.select} تصاعدياً هو ${selected.key}.`, 2, "select-result");
  let rank = 0;
  let current = root;
  while (current) {
    comparisons++;
    emit({ [current.id]: "compare" }, `Compare rank key ${input.rank} with ${current.key}.`, `قارن مفتاح الرتبة ${input.rank} مع ${current.key}.`, 3, "rank");
    if (input.rank <= current.key) current = current.left;
    else {
      rank += 1 + (current.left?.size ?? 0);
      current = current.right;
    }
  }
  emit({}, `${rank} stored keys are smaller than ${input.rank}.`, `يوجد ${rank} مفتاحاً أصغر من ${input.rank}.`, 3, "done");
  return steps;
}

export const orderStatisticTree = makeTreeModule<OrderInput>({
  slug: "order-statistic-tree",
  title: "Order-Statistic Tree",
  titleAr: "شجرة إحصاءات الرتب",
  difficulty: "Advanced",
  tags: ["augmented BST", "rank", "select"],
  tagsAr: ["شجرة بحث معززة", "رتبة", "اختيار"],
  summary: "Augment a search tree with subtree sizes to answer rank and selection queries.",
  summaryAr: "عزّز شجرة البحث بأحجام الفروع للإجابة عن استعلامات الرتبة والاختيار.",
  overview: "Subtree sizes let the search discard whole ordered regions while selecting the k-th key or counting keys below a value.",
  overviewAr: "تسمح أحجام الفروع بتجاوز مناطق مرتبة كاملة عند اختيار المفتاح رقم k أو عد المفاتيح الأصغر من قيمة.",
  pseudocode: ["BST-insert the key", "update subtree sizes toward the root", "select using left-subtree size", "accumulate rank while searching"],
  complexity: logarithmicComplexity,
  applications: ["Percentiles", "Leaderboards", "Dynamic medians"],
  applicationsAr: ["النسب المئوية", "لوحات الترتيب", "الوسيط الديناميكي"],
  inputFields: [
    integerField(),
    { key: "select", label: "Select rank", labelAr: "رتبة الاختيار", placeholder: "3", help: "One-based rank.", helpAr: "رتبة تبدأ من واحد." },
    { key: "rank", label: "Rank key", labelAr: "مفتاح الرتبة", placeholder: "45", help: "Count stored keys below this value.", helpAr: "احسب المفاتيح المخزنة الأصغر من هذه القيمة.", search: true },
  ],
  defaultInput: (level, rng) => {
    const values = randomUnique(level, rng, 9);
    return { values, select: Math.ceil(values.length / 2), rank: values[Math.floor(values.length / 2)] };
  },
  parseInput: parseOrder,
  serializeInput: (input) => ({ values: input.values.join(", "), select: String(input.select), rank: String(input.rank) }),
  generate: generateOrderStatistic,
});
