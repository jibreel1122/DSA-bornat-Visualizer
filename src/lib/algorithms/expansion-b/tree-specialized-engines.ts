import type { CellState, Step, TreeFrame, TreeNodeF } from "@/lib/engine/types";
import { complexities, makeModule, numberField, parseIntegerList, parsePairList, unique } from "./shared";

interface KDNode {
  id: string;
  point: [number, number];
  axis: 0 | 1;
  left: KDNode | null;
  right: KDNode | null;
}
type KDInput = { points: [number, number][]; query: [number, number] };

function parsePoint(raw: string, label: string): [number, number] {
  const pair = raw.split(":").map((part) => Number(part.trim()));
  if (pair.length !== 2 || !pair.every(Number.isFinite)) throw new Error(`${label} must be x:y.`);
  return [pair[0], pair[1]];
}

function kdFrame(root: KDNode | null, states: Record<string, CellState> = {}, note?: string): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: KDNode | null) => {
    if (!node) return;
    nodes[node.id] = {
      id: node.id,
      value: `(${node.point[0]},${node.point[1]})`,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: node.axis === 0 ? "split x" : "split y",
    };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return { nodes, rootId: root?.id ?? null, states, note };
}

function generateKD(input: KDInput): Step<TreeFrame>[] {
  let root: KDNode | null = null;
  let nextId = 0;
  const steps: Step<TreeFrame>[] = [];
  let comparisons = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: kdFrame(root, states, "Left is smaller on the node's split axis; right is greater or equal."),
      description,
      descriptionAr,
      codeLine: phase === "nearest" ? 4 : 1,
      counters: { comparisons },
      phase,
    });
  };
  emit({}, "Start with an empty 2-dimensional KD tree.", "ابدأ بشجرة KD ذات بُعدين (2) فارغة.", "start");
  for (const point of input.points) {
    if (!root) {
      root = { id: `k${nextId++}`, point, axis: 0, left: null, right: null };
      emit({ [root.id]: "found" }, `Insert (${point}) at depth 0; it splits the x-axis.`, `أدرج (${point}) عند العمق 0؛ تقسم محور x.`, "insert");
      continue;
    }
    let current = root;
    let depth = 0;
    while (true) {
      comparisons++;
      const axis = current.axis;
      const direction = point[axis] < current.point[axis] ? "left" : "right";
      emit({ [current.id]: "compare" }, `Compare ${axis === 0 ? "x" : "y"}: ${point[axis]} with ${current.point[axis]}, go ${direction}.`, `قارن ${axis === 0 ? "x" : "y"}: ${point[axis]} مع ${current.point[axis]} واتجه ${direction === "left" ? "يساراً" : "يميناً"}.`, "insert");
      const child = direction === "left" ? current.left : current.right;
      if (child) {
        current = child;
        depth++;
        continue;
      }
      const node: KDNode = { id: `k${nextId++}`, point, axis: ((depth + 1) % 2) as 0 | 1, left: null, right: null };
      if (direction === "left") current.left = node;
      else current.right = node;
      emit({ [node.id]: "found" }, `Attach (${point}) at depth ${depth + 1}; its next split axis is ${node.axis === 0 ? "x" : "y"}.`, `اربط (${point}) عند العمق ${depth + 1}؛ محور التقسيم التالي ${node.axis === 0 ? "x" : "y"}.`, "insert");
      break;
    }
  }
  let best: KDNode | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const distance = (point: [number, number]) => (point[0] - input.query[0]) ** 2 + (point[1] - input.query[1]) ** 2;
  const nearest = (node: KDNode | null) => {
    if (!node) return;
    comparisons++;
    const currentDistance = distance(node.point);
    emit({ [node.id]: "compare", ...(best ? { [best.id]: "active" as const } : {}) }, `Visit (${node.point}); squared distance is ${currentDistance}.`, `زر (${node.point})؛ مربع المسافة ${currentDistance}.`, "nearest");
    if (currentDistance < bestDistance) {
      best = node;
      bestDistance = currentDistance;
      emit({ [node.id]: "found" }, `(${node.point}) becomes the nearest candidate.`, `أصبحت (${node.point}) أقرب مرشح.`, "nearest");
    }
    const difference = input.query[node.axis] - node.point[node.axis];
    const near = difference < 0 ? node.left : node.right;
    const far = difference < 0 ? node.right : node.left;
    nearest(near);
    emit({ [node.id]: "active" }, `Split-plane distance is ${difference ** 2}; ${difference ** 2 <= bestDistance ? "the far branch may improve the answer" : "prune the far branch"}.`, `مربع مسافة مستوى التقسيم ${difference ** 2}؛ ${difference ** 2 <= bestDistance ? "قد يحسن الفرع البعيد الإجابة" : "استبعد الفرع البعيد"}.`, "nearest");
    if (difference ** 2 <= bestDistance) nearest(far);
  };
  nearest(root);
  if (best) emit({ [(best as KDNode).id]: "sorted" }, `Nearest point to (${input.query}) is (${(best as KDNode).point}).`, `أقرب نقطة إلى (${input.query}) هي (${(best as KDNode).point}).`, "done");
  return steps;
}

interface IntervalNode {
  id: string;
  low: number;
  high: number;
  max: number;
  left: IntervalNode | null;
  right: IntervalNode | null;
}
type IntervalInput = { intervals: [number, number][]; query: [number, number] };

function intervalFrame(root: IntervalNode | null, states: Record<string, CellState> = {}): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: IntervalNode | null) => {
    if (!node) return;
    nodes[node.id] = {
      id: node.id,
      value: `[${node.low},${node.high}]`,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: `max=${node.max}`,
    };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return { nodes, rootId: root?.id ?? null, states, note: "BST by low endpoint; max is the greatest high endpoint in the subtree." };
}

function generateInterval(input: IntervalInput): Step<TreeFrame>[] {
  let root: IntervalNode | null = null;
  let nextId = 0;
  let updates = 0;
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: intervalFrame(root, states),
      description,
      descriptionAr,
      codeLine: phase === "search" ? 4 : phase === "update" ? 3 : 1,
      counters: { maxUpdates: updates },
      phase,
    });
  };
  emit({}, "Start with an empty interval tree.", "ابدأ بشجرة فترات فارغة.", "start");
  for (const [low, high] of input.intervals) {
    const node: IntervalNode = { id: `i${nextId++}`, low, high, max: high, left: null, right: null };
    if (!root) {
      root = node;
      emit({ [node.id]: "found" }, `Insert [${low},${high}] as root with max=${high}.`, `أدرج [${low}،${high}] جذراً بقيمة max=${high}.`, "insert");
      continue;
    }
    let current = root;
    const path: IntervalNode[] = [];
    while (true) {
      path.push(current);
      emit({ [current.id]: "compare" }, `Compare low endpoint ${low} with ${current.low}.`, `قارن بداية الفترة ${low} مع ${current.low}.`, "insert");
      if (low < current.low) {
        if (current.left) current = current.left;
        else {
          current.left = node;
          break;
        }
      } else if (current.right) current = current.right;
      else {
        current.right = node;
        break;
      }
    }
    emit({ [node.id]: "found" }, `Attach [${low},${high}] as a BST leaf.`, `اربط [${low}،${high}] كورقة BST.`, "insert");
    for (const ancestor of path.reverse()) {
      const nextMax = Math.max(ancestor.high, ancestor.left?.max ?? Number.NEGATIVE_INFINITY, ancestor.right?.max ?? Number.NEGATIVE_INFINITY);
      if (nextMax !== ancestor.max) {
        emit({ [ancestor.id]: "active" }, `Before update, ${ancestor.id} stores max=${ancestor.max}; child information requires ${nextMax}.`, `قبل التحديث تخزن ${ancestor.id} قيمة max=${ancestor.max}؛ تتطلب معلومات الأبناء ${nextMax}.`, "update");
        ancestor.max = nextMax;
        updates++;
        emit({ [ancestor.id]: "found" }, `Update subtree maximum to ${nextMax}.`, `حدّث أكبر نهاية في الفرع إلى ${nextMax}.`, "update");
      }
    }
  }
  const [queryLow, queryHigh] = input.query;
  let current = root;
  let found: IntervalNode | null = null;
  while (current) {
    emit({ [current.id]: "compare" }, `Test whether [${current.low},${current.high}] overlaps [${queryLow},${queryHigh}].`, `اختبر تداخل [${current.low}،${current.high}] مع [${queryLow}،${queryHigh}].`, "search");
    if (current.low <= queryHigh && queryLow <= current.high) {
      found = current;
      break;
    }
    if (current.left && current.left.max >= queryLow) {
      emit({ [current.left.id]: "active" }, `Left subtree max ${current.left.max} can still reach query start ${queryLow}; go left.`, `أقصى نهاية في اليسار ${current.left.max} قد تصل إلى بداية البحث ${queryLow}؛ اتجه يساراً.`, "search");
      current = current.left;
    } else {
      emit(current.right ? { [current.right.id]: "active" } : {}, "The left subtree cannot overlap; go right.", "لا يمكن للفرع الأيسر أن يتداخل؛ اتجه يميناً.", "search");
      current = current.right;
    }
  }
  emit(found ? { [found.id]: "found" } : {}, found ? `Found overlapping interval [${found.low},${found.high}].` : "No stored interval overlaps the query.", found ? `عُثر على الفترة المتداخلة [${found.low}،${found.high}].` : "لا تتداخل أي فترة مخزنة مع فترة البحث.", "done");
  return steps;
}

interface ExpressionNode {
  id: string;
  token: string;
  left: ExpressionNode | null;
  right: ExpressionNode | null;
  value?: number;
}
type ExpressionInput = { expression: string };

function tokenize(expression: string): string[] {
  const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/^]/g) ?? [];
  if (tokens.join("") !== expression.replace(/\s+/g, "")) throw new Error("Expression contains an unsupported token.");
  if (tokens.length === 0 || tokens.length > 31) throw new Error("Enter an expression with 1 to 31 tokens.");
  return tokens;
}

function expressionFrame(root: ExpressionNode | null, states: Record<string, CellState>, postfix: string[], stack: string[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: ExpressionNode | null) => {
    if (!node) return;
    nodes[node.id] = { id: node.id, value: node.value === undefined ? node.token : `${node.token}=${node.value}`, left: node.left?.id ?? null, right: node.right?.id ?? null };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return {
    nodes,
    rootId: root?.id ?? null,
    states,
    aux: [
      { label: "postfix", values: postfix },
      { label: "operator stack", values: stack },
    ],
  };
}

function generateExpression(input: ExpressionInput): Step<TreeFrame>[] {
  const tokens = tokenize(input.expression);
  const output: string[] = [];
  const operators: string[] = [];
  const steps: Step<TreeFrame>[] = [];
  let root: ExpressionNode | null = null;
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string, transformation?: Step<TreeFrame>["transformation"]) => {
    steps.push({
      frame: expressionFrame(root, states, [...output], [...operators]),
      description,
      descriptionAr,
      codeLine: phase === "parse" ? 1 : 4,
      phase,
      transformation,
    });
  };
  emit({}, "Tokenize the infix expression.", "قسّم التعبير الوسطي إلى رموز.", "parse");
  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      output.push(token);
      emit({}, `Append operand ${token} to postfix output.`, `ألحق المعامل ${token} بالمخرجات اللاحقة.`, "parse");
    } else if (token === "(") {
      operators.push(token);
      emit({}, "Push left parenthesis.", "ادفع القوس الأيسر.", "parse");
    } else if (token === ")") {
      while (operators.length && operators.at(-1) !== "(") {
        output.push(operators.pop()!);
        emit({}, "Pop an operator to postfix until the matching parenthesis.", "اسحب مؤثراً إلى الصيغة اللاحقة حتى القوس المطابق.", "parse");
      }
      if (operators.pop() !== "(") throw new Error("Unbalanced parentheses.");
      emit({}, "Discard the matching parenthesis pair.", "تخلص من زوج الأقواس المتطابق.", "parse");
    } else {
      while (
        operators.length &&
        operators.at(-1) !== "(" &&
        (precedence[operators.at(-1)!] > precedence[token] ||
          (precedence[operators.at(-1)!] === precedence[token] && token !== "^"))
      ) {
        output.push(operators.pop()!);
        emit({}, `Pop the higher/equal-precedence operator before pushing ${token}.`, `اسحب المؤثر الأعلى أو المساوي أولوية قبل دفع ${token}.`, "parse");
      }
      operators.push(token);
      emit({}, `Push operator ${token}.`, `ادفع المؤثر ${token}.`, "parse");
    }
  }
  while (operators.length) {
    const operator = operators.pop()!;
    if (operator === "(") throw new Error("Unbalanced parentheses.");
    output.push(operator);
    emit({}, `Drain operator ${operator} to postfix.`, `انقل المؤثر ${operator} إلى الصيغة اللاحقة.`, "parse");
  }
  const stack: ExpressionNode[] = [];
  let nextId = 0;
  for (const token of output) {
    if (!Number.isNaN(Number(token))) {
      const node: ExpressionNode = { id: `e${nextId++}`, token, left: null, right: null, value: Number(token) };
      stack.push(node);
      root = stack.at(-1)!;
      emit({ [node.id]: "found" }, `Create operand leaf ${token}.`, `أنشئ ورقة المعامل ${token}.`, "build");
    } else {
      const right = stack.pop();
      const left = stack.pop();
      if (!left || !right) throw new Error("Malformed expression.");
      const node: ExpressionNode = { id: `e${nextId++}`, token, left, right };
      stack.push(node);
      root = node;
      emit({ [left.id]: "active", [right.id]: "active", [node.id]: "found" }, `Create ${token} with ${left.token} as left child and ${right.token} as right child.`, `أنشئ ${token} واجعل ${left.token} ابناً أيسر و${right.token} ابناً أيمن.`, "build", { kind: "rebuild", label: "Expression subtree construction" });
    }
  }
  if (stack.length !== 1) throw new Error("Malformed expression.");
  root = stack[0];
  const evaluate = (node: ExpressionNode): number => {
    if (!node.left || !node.right) return node.value!;
    const left = evaluate(node.left);
    const right = evaluate(node.right);
    emit({ [node.left.id]: "compare", [node.right.id]: "compare" }, `Evaluate children of ${node.token}: ${left} and ${right}.`, `قيّم ابني ${node.token}: ${left} و${right}.`, "evaluate");
    if (node.token === "/" && right === 0) throw new Error("Division by zero.");
    node.value = node.token === "+" ? left + right : node.token === "-" ? left - right : node.token === "*" ? left * right : node.token === "/" ? left / right : left ** right;
    emit({ [node.id]: "found" }, `${left} ${node.token} ${right} = ${node.value}.`, `${left} ${node.token} ${right} = ${node.value}.`, "evaluate");
    return node.value;
  };
  const result = evaluate(root);
  emit({ [root.id]: "sorted" }, `Expression value is ${result}.`, `قيمة التعبير هي ${result}.`, "done");
  return steps;
}

interface ThreadNode {
  id: string;
  key: number;
  left: ThreadNode | null;
  right: ThreadNode | null;
  leftThread: ThreadNode | null;
  rightThread: ThreadNode | null;
}
type ThreadInput = { values: number[] };

function threadFrame(root: ThreadNode | null, states: Record<string, CellState>, order: ThreadNode[], threads: string[]): TreeFrame {
  const nodes: Record<string, TreeNodeF> = {};
  const visit = (node: ThreadNode | null) => {
    if (!node) return;
    nodes[node.id] = {
      id: node.id,
      value: node.key,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      extra: `${node.leftThread ? "←" + node.leftThread.key : "←∅"} ${node.rightThread ? "→" + node.rightThread.key : "→∅"}`,
    };
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return {
    nodes,
    rootId: root?.id ?? null,
    states,
    aux: [
      { label: "inorder", values: order.map((node) => node.key) },
      { label: "threads", values: threads },
    ],
    note: "Solid tree links remain left/right; annotations show predecessor/successor threads replacing null links.",
  };
}

function generateThreaded(input: ThreadInput): Step<TreeFrame>[] {
  let root: ThreadNode | null = null;
  let nextId = 0;
  const order: ThreadNode[] = [];
  const threads: string[] = [];
  const steps: Step<TreeFrame>[] = [];
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: threadFrame(root, states, [...order], [...threads]),
      description,
      descriptionAr,
      codeLine: phase === "thread" ? 3 : phase === "traverse" ? 5 : 1,
      phase,
    });
  };
  emit({}, "Start with an empty binary search tree.", "ابدأ بشجرة بحث ثنائية فارغة.", "start");
  for (const key of unique(input.values)) {
    const node: ThreadNode = { id: `r${nextId++}`, key, left: null, right: null, leftThread: null, rightThread: null };
    if (!root) {
      root = node;
      emit({ [node.id]: "found" }, `Insert ${key} as root.`, `أدرج ${key} جذراً.`, "insert");
      continue;
    }
    let current = root;
    while (true) {
      emit({ [current.id]: "compare" }, `Compare ${key} with ${current.key}.`, `قارن ${key} مع ${current.key}.`, "insert");
      if (key < current.key) {
        if (current.left) current = current.left;
        else {
          current.left = node;
          break;
        }
      } else if (current.right) current = current.right;
      else {
        current.right = node;
        break;
      }
    }
    emit({ [node.id]: "found" }, `Attach ${key} as a BST leaf.`, `اربط ${key} كورقة BST.`, "insert");
  }
  const collect = (node: ThreadNode | null) => {
    if (!node) return;
    collect(node.left);
    order.push(node);
    collect(node.right);
  };
  collect(root);
  order.forEach((node, index) => {
    emit({ [node.id]: "active" }, `Visit ${node.key} in-order; inspect its null child links.`, `زر ${node.key} بالترتيب الداخلي وافحص روابط أبنائها الفارغة.`, "thread");
    if (!node.left) {
      node.leftThread = order[index - 1] ?? null;
      threads.push(`${node.key}←${node.leftThread?.key ?? "∅"}`);
      emit({ [node.id]: "found" }, `Replace null left link with predecessor thread to ${node.leftThread?.key ?? "∅"}.`, `استبدل الرابط الأيسر الفارغ بخيط إلى السابق ${node.leftThread?.key ?? "∅"}.`, "thread");
    }
    if (!node.right) {
      node.rightThread = order[index + 1] ?? null;
      threads.push(`${node.key}→${node.rightThread?.key ?? "∅"}`);
      emit({ [node.id]: "found" }, `Replace null right link with successor thread to ${node.rightThread?.key ?? "∅"}.`, `استبدل الرابط الأيمن الفارغ بخيط إلى التالي ${node.rightThread?.key ?? "∅"}.`, "thread");
    }
  });
  let current: ThreadNode | null = order[0] ?? null;
  while (current) {
    emit({ [current.id]: "visited" }, `Output ${current.key}; follow its successor thread or descend to the next leftmost node.`, `أخرج ${current.key}؛ اتبع خيط التالي أو انزل إلى العقدة اليسرى التالية.`, "traverse");
    if (current.rightThread) current = current.rightThread;
    else {
      current = current.right;
      while (current?.left) current = current.left;
    }
  }
  emit(Object.fromEntries(order.map((node) => [node.id, "sorted" as const])), "Threaded in-order traversal complete without recursion or an auxiliary stack.", "اكتمل الاجتياز الداخلي بالخيوط دون استدعاء ذاتي أو مكدس مساعد.", "done");
  return steps;
}

export const kdTree = makeModule<TreeFrame, KDInput>({
  slug: "kd-tree",
  title: "KD Tree",
  titleAr: "شجرة KD",
  category: "trees",
  difficulty: "Advanced",
  tags: ["spatial tree", "nearest neighbor", "axis split"],
  tagsAr: ["شجرة مكانية", "أقرب جار", "تقسيم محور"],
  summary: "Alternates x/y splits during insertion and performs nearest-neighbor search with legal branch pruning.",
  summaryAr: "تناوب تقسيم محوري x وy أثناء الإدراج وتبحث عن أقرب جار مع استبعاد الفروع بصورة صحيحة.",
  renderer: "tree",
  pseudocode: ["insert point comparing current depth axis", "alternate x and y axes", "nearest(node, query)", "  visit nearer branch first", "  update best distance", "  visit far branch only if split plane can beat best"],
  pseudocodeAr: ["أدرج النقطة بالمقارنة على محور العمق الحالي", "ناوب بين محوري x وy", "ابحث عن الأقرب", "  زر الفرع الأقرب أولاً", "  حدّث أفضل مسافة", "  زر البعيد فقط إن أمكنه تحسين الأفضل"],
  overview: "A KD tree recursively partitions multidimensional points. Nearest-neighbor search prunes a far branch only when its split plane cannot improve the current best.",
  overviewAr: "تقسم شجرة KD النقاط متعددة الأبعاد تكرارياً، ولا تستبعد فرعاً بعيداً إلا إذا تعذر على مستوى تقسيمه تحسين أفضل مسافة.",
  complexity: { time: { best: "O(log n)", average: "O(log n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["Nearest-neighbor search", "Spatial indexing", "Collision detection"],
  applicationsAr: ["بحث أقرب جار", "الفهرسة المكانية", "كشف التصادم"],
  inputFields: [{ key: "points", label: "Points x:y", labelAr: "النقاط x:y", placeholder: "30:40, 5:25, 70:70, 10:12, 50:30", help: "Comma-separated 2D points.", helpAr: "نقاط ثنائية الأبعاد مفصولة بفواصل." }, { key: "query", label: "Query x:y", labelAr: "نقطة البحث x:y", placeholder: "45:35", help: "Nearest-neighbor query.", helpAr: "نقطة بحث أقرب جار.", search: true }],
  defaultInput: () => ({ points: [[30, 40], [5, 25], [70, 70], [10, 12], [50, 30], [35, 45]], query: [45, 35] }),
  parseInput: (fields) => ({ points: parsePairList(fields.points ?? ""), query: parsePoint(fields.query ?? "", "Query") }),
  serializeInput: (input) => ({ points: input.points.map((point) => point.join(":")).join(", "), query: input.query.join(":") }),
  generate: generateKD,
});

export const intervalTree = makeModule<TreeFrame, IntervalInput>({
  slug: "interval-tree",
  title: "Interval Tree",
  titleAr: "شجرة الفترات",
  category: "trees",
  difficulty: "Advanced",
  tags: ["intervals", "augmented BST", "overlap query"],
  tagsAr: ["فترات", "BST معززة", "بحث التداخل"],
  summary: "Stores subtree maximum endpoints and uses them to prune overlap searches safely.",
  summaryAr: "تخزن أكبر نهاية في كل فرع وتستخدمها لاستبعاد فروع بحث التداخل بأمان.",
  renderer: "tree",
  pseudocode: ["BST-insert interval by low endpoint", "set node.max = interval.high", "update max on every ancestor", "overlap search at node", "  if left.max >= query.low, search left", "  otherwise search right"],
  pseudocodeAr: ["أدرج الفترة حسب بدايتها كـBST", "اجعل max نهاية الفترة", "حدّث max لكل سلف", "اختبر التداخل عند العقدة", "  إن كان left.max يصل لبداية البحث فاتجه يساراً", "  وإلا اتجه يميناً"],
  overview: "An interval tree augments a BST with the greatest high endpoint in each subtree, enabling efficient overlap queries.",
  overviewAr: "تعزز شجرة الفترات BST بأكبر نهاية في كل فرع، مما يتيح بحثاً فعالاً عن التداخل.",
  complexity: complexities.logarithmic,
  applications: ["Calendar conflicts", "Geometry", "Memory-region queries"],
  applicationsAr: ["تعارضات التقويم", "الهندسة", "استعلام مناطق الذاكرة"],
  inputFields: [{ key: "intervals", label: "Intervals low:high", labelAr: "الفترات البداية:النهاية", placeholder: "15:20, 10:30, 17:19, 5:20, 12:15, 30:40", help: "Each low endpoint must not exceed high.", helpAr: "يجب ألا تتجاوز بداية الفترة نهايتها." }, { key: "query", label: "Overlap query", labelAr: "فترة البحث عن تداخل", placeholder: "6:7", help: "Interval to search.", helpAr: "الفترة المطلوب البحث عن تداخل معها.", search: true }],
  defaultInput: () => ({ intervals: [[15, 20], [10, 30], [17, 19], [5, 20], [12, 15], [30, 40]], query: [6, 7] }),
  parseInput: (fields) => {
    const intervals = parsePairList(fields.intervals ?? "");
    const query = parsePoint(fields.query ?? "", "Query");
    if ([...intervals, query].some(([low, high]) => low > high)) throw new Error("Every interval must have low <= high.");
    return { intervals, query };
  },
  serializeInput: (input) => ({ intervals: input.intervals.map((interval) => interval.join(":")).join(", "), query: input.query.join(":") }),
  generate: generateInterval,
});

export const expressionTree = makeModule<TreeFrame, ExpressionInput>({
  slug: "expression-tree",
  title: "Expression Tree",
  titleAr: "شجرة التعبير",
  category: "trees",
  difficulty: "Intermediate",
  tags: ["expression", "shunting yard", "postfix", "evaluation"],
  tagsAr: ["تعبير", "ساحة التحويل", "صيغة لاحقة", "تقييم"],
  summary: "Converts infix to postfix, builds the exact operator tree, and evaluates it bottom-up.",
  summaryAr: "تحول الصيغة الوسطية إلى لاحقة، وتبني شجرة المؤثرات الدقيقة، ثم تقيمها من الأسفل.",
  renderer: "tree",
  pseudocode: ["convert infix tokens to postfix with precedence", "for each postfix token", "  operand: push leaf", "  operator: pop right and left, build subtree, push root", "evaluate children before parent"],
  pseudocodeAr: ["حوّل الرموز الوسطية إلى لاحقة حسب الأولوية", "لكل رمز لاحق", "  المعامل: ادفع ورقة", "  المؤثر: اسحب اليمين واليسار وابن فرعاً", "قيّم الأبناء قبل الأب"],
  overview: "An expression tree makes precedence explicit: operands are leaves and each binary operator owns its left and right operands.",
  overviewAr: "تجعل شجرة التعبير الأولوية صريحة؛ المعاملات أوراق وكل مؤثر ثنائي يملك معامليه الأيسر والأيمن.",
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["Compilers", "Calculators", "Symbolic algebra"],
  applicationsAr: ["المترجمات", "الآلات الحاسبة", "الجبر الرمزي"],
  inputFields: [{ key: "expression", label: "Infix expression", labelAr: "التعبير الوسطي", placeholder: "3 + 4 * (2 - 1)", help: "Numbers, parentheses, + - * / ^.", helpAr: "أرقام وأقواس والمؤثرات + - * / ^." }],
  defaultInput: () => ({ expression: "3 + 4 * (2 - 1)" }),
  parseInput: (fields) => {
    tokenize(fields.expression ?? "");
    return { expression: fields.expression };
  },
  serializeInput: (input) => ({ expression: input.expression }),
  generate: generateExpression,
});

export const threadedBinaryTree = makeModule<TreeFrame, ThreadInput>({
  slug: "threaded-binary-tree",
  title: "Threaded Binary Tree",
  titleAr: "الشجرة الثنائية ذات الخيوط",
  category: "trees",
  difficulty: "Advanced",
  tags: ["threaded tree", "inorder successor", "pointers"],
  tagsAr: ["شجرة ذات خيوط", "التالي بالترتيب الداخلي", "مؤشرات"],
  summary: "Reuses null links as predecessor/successor threads and traverses in-order without recursion or a stack.",
  summaryAr: "تعيد استخدام الروابط الفارغة كخيوط للسابق والتالي وتجتاز داخلياً دون استدعاء ذاتي أو مكدس.",
  renderer: "tree",
  pseudocode: ["build a BST", "collect nodes in inorder", "for each null left/right child", "  store predecessor/successor thread", "start at leftmost", "follow right thread or right-subtree leftmost"],
  pseudocodeAr: ["ابن شجرة BST", "اجمع العقد بالترتيب الداخلي", "لكل ابن أيسر أو أيمن فارغ", "  خزن خيط السابق أو التالي", "ابدأ من أقصى اليسار", "اتبع خيط اليمين أو أقصى يسار الفرع الأيمن"],
  overview: "A threaded binary tree turns otherwise-null child links into in-order predecessor and successor pointers.",
  overviewAr: "تحول الشجرة الثنائية ذات الخيوط روابط الأبناء الفارغة إلى مؤشرات للسابق والتالي بالترتيب الداخلي.",
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n) tree, O(1) traversal" },
  applications: ["Stackless traversal", "Memory-constrained iterators", "Successor navigation"],
  applicationsAr: ["اجتياز بلا مكدس", "مكررات محدودة الذاكرة", "التنقل إلى التالي"],
  inputFields: [numberField()],
  defaultInput: () => ({ values: [40, 20, 60, 10, 30, 50, 70] }),
  parseInput: (fields) => ({ values: unique(parseIntegerList(fields.values ?? "")) }),
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: generateThreaded,
});
