import type { ArrayFrame, CellState, ListFrame, Step } from "@/lib/engine/types";
import { makeModule, numberField, parseIntegerList, randomUnique } from "./shared";

type DequeOp =
  | { kind: "push-front" | "push-back"; value: number }
  | { kind: "pop-front" | "pop-back" };
type DequeInput = { ops: DequeOp[] };

function parseDeque(raw: string): DequeOp[] {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 24) throw new Error("Enter 1 to 24 deque operations.");
  return tokens.map((token) => {
    const compact = token.replace(/\s+/g, "").toUpperCase();
    const push = /^([FB])\+(-?\d+)$/.exec(compact);
    if (push) return { kind: push[1] === "F" ? "push-front" : "push-back", value: Number(push[2]) };
    if (compact === "F-") return { kind: "pop-front" };
    if (compact === "B-") return { kind: "pop-back" };
    throw new Error(`Invalid deque operation "${token}". Use F+x, B+x, F-, or B-.`);
  });
}

function generateDeque(input: DequeInput): Step<ListFrame>[] {
  const items: { id: string; value: number }[] = [];
  const steps: Step<ListFrame>[] = [];
  let id = 0;
  const emit = (states: Record<string, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: {
        nodes: items.map((item) => ({ ...item })),
        links: items.flatMap((item, index) => {
          const next = items[index + 1];
          if (!next) return [];
          return [
            { from: item.id, to: next.id, kind: "next" as const },
            { from: next.id, to: item.id, kind: "prev" as const },
          ];
        }),
        pointers: [
          { nodeId: items[0]?.id ?? null, label: "front" },
          { nodeId: items.at(-1)?.id ?? null, label: "back" },
        ],
        states,
        doubly: true,
      },
      description,
      descriptionAr,
      codeLine: phase.startsWith("push") ? 1 : 2,
      phase,
    });
  };
  emit({}, "Start with an empty double-ended queue.", "ابدأ بطابور مزدوج النهاية فارغ.", "start");
  for (const op of input.ops) {
    if ("value" in op) {
      const node = { id: `d${id++}`, value: op.value };
      const front = op.kind === "push-front";
      emit({}, `Allocate ${node.value} for ${front ? "front" : "back"} insertion.`, `احجز ${node.value} للإدراج عند ${front ? "المقدمة" : "المؤخرة"}.`, op.kind);
      if (front) items.unshift(node);
      else items.push(node);
      emit({ [node.id]: "found" }, `Attach ${node.value} at the ${front ? "front" : "back"} and update both end pointers.`, `اربط ${node.value} عند ${front ? "المقدمة" : "المؤخرة"} وحدّث مؤشري النهايتين.`, op.kind);
    } else {
      const front = op.kind === "pop-front";
      const node = front ? items[0] : items.at(-1);
      if (!node) {
        emit({}, `${op.kind} sees an empty deque; underflow is handled without mutation.`, `${op.kind} وجد طابوراً فارغاً؛ عولج النقص بلا تغيير.`, op.kind);
        continue;
      }
      emit({ [node.id]: "swap" }, `Mark ${node.value} for removal from the ${front ? "front" : "back"}.`, `حدّد ${node.value} للحذف من ${front ? "المقدمة" : "المؤخرة"}.`, op.kind);
      if (front) items.shift();
      else items.pop();
      emit({}, `Remove ${node.value} and repair the exposed end pointer.`, `احذف ${node.value} وأصلح مؤشر النهاية المكشوفة.`, op.kind);
    }
  }
  emit(Object.fromEntries(items.map((item) => [item.id, "sorted" as const])), "Deque operations complete.", "اكتملت عمليات الطابور المزدوج.", "done");
  return steps;
}

type PriorityInput = { entries: { value: number; priority: number }[] };

function parsePriorities(raw: string): PriorityInput {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 16) throw new Error("Enter 1 to 16 value:priority pairs.");
  return {
    entries: tokens.map((token) => {
      const parts = token.split(":").map(Number);
      if (parts.length !== 2 || !parts.every(Number.isSafeInteger)) throw new Error(`Invalid priority entry "${token}".`);
      return { value: parts[0], priority: parts[1] };
    }),
  };
}

function generatePriority(input: PriorityInput): Step<ArrayFrame>[] {
  const heap: { value: number; priority: number; order: number }[] = [];
  const output: number[] = [];
  const steps: Step<ArrayFrame>[] = [];
  let swaps = 0;
  const better = (a: typeof heap[number], b: typeof heap[number]) => a.priority < b.priority || (a.priority === b.priority && a.order < b.order);
  const emit = (states: Record<number, CellState>, description: string, descriptionAr: string, phase: string) => {
    steps.push({
      frame: {
        values: heap.map((entry) => entry.value),
        states,
        aux: [
          { label: "priority", values: heap.map((entry) => entry.priority) },
          { label: "removed", values: [...output] },
        ],
        note: "Smaller priority number is served first; ties are FIFO.",
      },
      description,
      descriptionAr,
      codeLine: phase === "insert" ? 1 : 3,
      counters: { swaps, size: heap.length },
      phase,
    });
  };
  emit({}, "Start with an empty binary min-heap of priorities.", "ابدأ بكومة صغرى فارغة للأولويات.", "start");
  input.entries.forEach((entry, order) => {
    heap.push({ ...entry, order });
    let index = heap.length - 1;
    emit({ [index]: "found" }, `Enqueue ${entry.value} with priority ${entry.priority} at the next complete-tree slot.`, `أضف ${entry.value} بأولوية ${entry.priority} في الخانة التالية من الشجرة الكاملة.`, "insert");
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      emit({ [index]: "compare", [parent]: "compare" }, `Compare child priority ${heap[index].priority} with parent priority ${heap[parent].priority}.`, `قارن أولوية الابن ${heap[index].priority} بأولوية الأب ${heap[parent].priority}.`, "insert");
      if (!better(heap[index], heap[parent])) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      swaps++;
      index = parent;
      emit({ [index]: "swap" }, "Swap upward to restore priority order.", "بدّل إلى الأعلى لاستعادة ترتيب الأولوية.", "insert");
    }
  });
  while (heap.length > 0) {
    emit({ 0: "found" }, `Serve ${heap[0].value}, the highest-priority item.`, `اخدم ${heap[0].value}، وهو العنصر الأعلى أولوية.`, "remove");
    output.push(heap[0].value);
    const last = heap.pop()!;
    if (heap.length === 0) {
      emit({}, "The heap is now empty.", "أصبحت الكومة فارغة.", "remove");
      continue;
    }
    heap[0] = last;
    emit({ 0: "active" }, `Move the final item ${last.value} to the root before sifting down.`, `انقل العنصر الأخير ${last.value} إلى الجذر قبل إنزاله.`, "remove");
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let best = index;
      if (left < heap.length && better(heap[left], heap[best])) best = left;
      if (right < heap.length && better(heap[right], heap[best])) best = right;
      if (best === index) break;
      emit({ [index]: "compare", [best]: "compare" }, "Choose the better-priority child.", "اختر الابن ذي الأولوية الأفضل.", "remove");
      [heap[index], heap[best]] = [heap[best], heap[index]];
      swaps++;
      index = best;
      emit({ [index]: "swap" }, "Swap downward; the processed parent now satisfies heap order.", "بدّل إلى الأسفل؛ أصبح الأب المعالج يحقق ترتيب الكومة.", "remove");
    }
  }
  emit({}, "All entries were served in nondecreasing priority order.", "خُدمت كل العناصر بترتيب أولوية غير متناقص.", "done");
  return steps;
}

type NumberInput = { values: number[] };

function generateMonotonic(input: NumberInput): Step<ArrayFrame>[] {
  const stack: number[] = [];
  const answer = Array(input.values.length).fill(-1) as number[];
  const steps: Step<ArrayFrame>[] = [];
  const emit = (states: Record<number, CellState>, description: string, descriptionAr: string, phase: string, index = -1) => {
    steps.push({
      frame: {
        values: [...input.values],
        states,
        pointers: index >= 0 ? [{ index, label: "i" }] : [],
        aux: [
          { label: "stack(indices)", values: [...stack] },
          { label: "next greater", values: [...answer] },
        ],
      },
      description,
      descriptionAr,
      codeLine: phase === "pop" ? 2 : phase === "push" ? 3 : 1,
      phase,
    });
  };
  emit({}, "Find each element's next greater value using a decreasing stack.", "ابحث عن القيمة الأكبر التالية لكل عنصر باستخدام مكدس متناقص.", "start");
  input.values.forEach((value, index) => {
    emit({ [index]: "active" }, `Read ${value} at index ${index}.`, `اقرأ ${value} عند الفهرس ${index}.`, "scan", index);
    while (stack.length > 0 && input.values[stack.at(-1)!] < value) {
      const resolved = stack.pop()!;
      answer[resolved] = value;
      emit({ [resolved]: "found", [index]: "compare" }, `${value} is the first greater value to the right of ${input.values[resolved]}.`, `${value} هي أول قيمة أكبر إلى يمين ${input.values[resolved]}.`, "pop", index);
    }
    stack.push(index);
    emit({ [index]: "special" }, `Push index ${index}; stack values remain nonincreasing.`, `ادفع الفهرس ${index}؛ تبقى قيم المكدس غير متزايدة.`, "push", index);
  });
  emit(Object.fromEntries(input.values.map((_, index) => [index, "sorted" as const])), "Unresolved indices correctly keep -1.", "تحتفظ الفهارس غير المحلولة بالقيمة -1 بشكل صحيح.", "done");
  return steps;
}

type QueueOp = { kind: "enqueue"; value: number } | { kind: "dequeue" | "peek" };
type QueueInput = { ops: QueueOp[] };

function parseQueue(raw: string): QueueInput {
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 24) throw new Error("Enter 1 to 24 queue operations.");
  return {
    ops: tokens.map((token) => {
      const add = /^\+(-?\d+)$/.exec(token.replace(/\s+/g, ""));
      if (add) return { kind: "enqueue", value: Number(add[1]) };
      if (token === "-") return { kind: "dequeue" };
      if (token === "?") return { kind: "peek" };
      throw new Error(`Invalid queue operation "${token}". Use +x, -, or ?.`);
    }),
  };
}

function generateQueueStacks(input: QueueInput): Step<ArrayFrame>[] {
  const inputStack: number[] = [];
  const outputStack: number[] = [];
  const removed: number[] = [];
  const steps: Step<ArrayFrame>[] = [];
  const emit = (description: string, descriptionAr: string, phase: string, active?: { stack: "in" | "out"; index: number }) => {
    const values = [...inputStack, ...outputStack];
    const activeIndex = active ? (active.stack === "in" ? active.index : inputStack.length + active.index) : -1;
    steps.push({
      frame: {
        values,
        states: activeIndex >= 0 ? { [activeIndex]: "active" } : {},
        aux: [
          { label: "input stack", values: [...inputStack] },
          { label: "output stack", values: [...outputStack] },
          { label: "dequeued", values: [...removed] },
        ],
      },
      description,
      descriptionAr,
      codeLine: phase === "enqueue" ? 0 : phase === "transfer" ? 2 : 3,
      phase,
    });
  };
  const transfer = () => {
    if (outputStack.length > 0) return;
    while (inputStack.length > 0) {
      emit(`Pop ${inputStack.at(-1)} from the input stack.`, `اسحب ${inputStack.at(-1)} من مكدس الإدخال.`, "transfer", { stack: "in", index: inputStack.length - 1 });
      const value = inputStack.pop()!;
      outputStack.push(value);
      emit(`Push ${value} onto the output stack; order is reversed one item at a time.`, `ادفع ${value} إلى مكدس الإخراج؛ ينعكس الترتيب عنصراً بعد عنصر.`, "transfer", { stack: "out", index: outputStack.length - 1 });
    }
  };
  emit("Start with two empty stacks.", "ابدأ بمكدسين فارغين.", "start");
  for (const op of input.ops) {
    if (op.kind === "enqueue") {
      inputStack.push(op.value);
      emit(`Enqueue ${op.value} by pushing it onto the input stack.`, `أضف ${op.value} بدفعه إلى مكدس الإدخال.`, "enqueue", { stack: "in", index: inputStack.length - 1 });
      continue;
    }
    transfer();
    if (outputStack.length === 0) {
      emit(`${op.kind} on an empty queue changes nothing.`, `${op.kind} على طابور فارغ لا يغيّر شيئاً.`, op.kind);
    } else if (op.kind === "peek") {
      emit(`Peek reads ${outputStack.at(-1)} from the output-stack top.`, `تقرأ المعاينة ${outputStack.at(-1)} من قمة مكدس الإخراج.`, "peek", { stack: "out", index: outputStack.length - 1 });
    } else {
      const value = outputStack.pop()!;
      removed.push(value);
      emit(`Dequeue pops ${value} from the output stack.`, `الحذف يسحب ${value} من مكدس الإخراج.`, "dequeue");
    }
  }
  emit("Queue operations complete; FIFO order was preserved.", "اكتملت عمليات الطابور مع الحفاظ على ترتيب FIFO.", "done");
  return steps;
}

export const dequeOperations = makeModule<ListFrame, DequeInput>({
  slug: "deque-operations",
  title: "Deque Operations",
  titleAr: "عمليات الطابور مزدوج النهاية",
  category: "stacks-queues",
  difficulty: "Beginner",
  tags: ["deque", "double ended queue", "pointers"],
  tagsAr: ["طابور مزدوج", "نهايتان", "مؤشرات"],
  summary: "Pushes and pops at both ends while maintaining front/back links.",
  summaryAr: "يضيف ويحذف من النهايتين مع الحفاظ على روابط المقدمة والمؤخرة.",
  renderer: "list",
  pseudocode: ["for each operation", "  push_front/push_back: attach at selected end", "  pop_front/pop_back: detach selected end", "  update front and back"],
  pseudocodeAr: ["لكل عملية", "  أضف عند المقدمة أو المؤخرة", "  احذف من المقدمة أو المؤخرة", "  حدّث مؤشري النهايتين"],
  overview: "A deque supports constant-time insertion and removal at both the front and the back.",
  overviewAr: "يدعم الطابور مزدوج النهاية الإدراج والحذف بزمن ثابت عند المقدمة والمؤخرة.",
  complexity: { time: { best: "O(1)", average: "O(1)", worst: "O(1)" }, space: "O(n)" },
  applications: ["Sliding windows", "Work stealing", "Palindrome checks"],
  applicationsAr: ["النوافذ المنزلقة", "سرقة العمل", "فحص العبارات المتناظرة"],
  inputFields: [{ key: "ops", label: "Operations", labelAr: "العمليات", placeholder: "F+4, B+7, F-, B+9, B-", help: "F+x/B+x push; F-/B- pop.", helpAr: "F+x/B+x إضافة؛ F-/B- حذف." }],
  defaultInput: () => ({ ops: parseDeque("F+4, B+7, F+2, B-, B+9") }),
  parseInput: (fields) => ({ ops: parseDeque(fields.ops ?? "") }),
  serializeInput: (input) => ({ ops: input.ops.map((op) => op.kind === "push-front" ? `F+${op.value}` : op.kind === "push-back" ? `B+${op.value}` : op.kind === "pop-front" ? "F-" : "B-").join(", ") }),
  generate: generateDeque,
});

export const priorityQueue = makeModule<ArrayFrame, PriorityInput>({
  slug: "priority-queue",
  title: "Priority Queue",
  titleAr: "طابور الأولوية",
  category: "stacks-queues",
  difficulty: "Intermediate",
  tags: ["priority queue", "binary heap", "sift"],
  tagsAr: ["طابور أولوية", "كومة ثنائية", "إزاحة"],
  summary: "Uses a stable binary min-heap to enqueue and serve items by priority.",
  summaryAr: "يستخدم كومة صغرى ثنائية مستقرة لإضافة العناصر وخدمتها حسب الأولوية.",
  renderer: "array",
  pseudocode: ["enqueue(value, priority)", "  append then sift up", "dequeue()", "  remove root, move last to root, sift down", "break equal-priority ties by arrival order"],
  pseudocodeAr: ["أضف القيمة والأولوية", "  ألحقها ثم ارفعها", "احذف الأعلى أولوية", "  احذف الجذر وانقل الأخير ثم أنزله", "اكسر تعادل الأولوية بترتيب الوصول"],
  overview: "A priority queue serves the item with the best priority rather than the earliest raw position; this implementation uses a stable binary min-heap.",
  overviewAr: "يخدم طابور الأولوية العنصر صاحب الأولوية الأفضل، ويستخدم هذا التنفيذ كومة صغرى ثنائية مستقرة.",
  complexity: { time: { best: "O(1)", average: "O(log n)", worst: "O(log n)" }, space: "O(n)" },
  applications: ["Schedulers", "Dijkstra's algorithm", "Event simulation"],
  applicationsAr: ["المجدولات", "خوارزمية ديكسترا", "محاكاة الأحداث"],
  inputFields: [{ key: "entries", label: "Value:priority", labelAr: "القيمة:الأولوية", placeholder: "40:3, 10:1, 20:2, 11:1", help: "Lower priority number is served first.", helpAr: "يُخدم رقم الأولوية الأصغر أولاً." }],
  defaultInput: () => parsePriorities("40:3, 10:1, 20:2, 11:1"),
  parseInput: (fields) => parsePriorities(fields.entries ?? ""),
  serializeInput: (input) => ({ entries: input.entries.map((entry) => `${entry.value}:${entry.priority}`).join(", ") }),
  generate: generatePriority,
});

export const monotonicStack = makeModule<ArrayFrame, NumberInput>({
  slug: "monotonic-stack",
  title: "Monotonic Stack",
  titleAr: "المكدس الرتيب",
  category: "stacks-queues",
  difficulty: "Intermediate",
  tags: ["stack", "next greater element", "amortized analysis"],
  tagsAr: ["مكدس", "العنصر الأكبر التالي", "تحليل مستهلك"],
  summary: "Finds every next-greater element by maintaining a decreasing stack of unresolved indices.",
  summaryAr: "يجد العنصر الأكبر التالي لكل قيمة عبر مكدس متناقص من الفهارس غير المحلولة.",
  renderer: "array",
  pseudocode: ["for i from left to right", "  while stack.top value < values[i]", "    pop index and set its next greater to values[i]", "  push i"],
  pseudocodeAr: ["مرّ على الفهارس من اليسار", "  ما دامت قيمة القمة أصغر من القيمة الحالية", "    اسحب الفهرس وسجّل الأكبر التالي", "  ادفع الفهرس الحالي"],
  overview: "A monotonic stack keeps values ordered while scanning, allowing each index to enter and leave once.",
  overviewAr: "يحافظ المكدس الرتيب على ترتيب القيم أثناء المسح، فيدخل كل فهرس ويخرج مرة واحدة.",
  complexity: { time: { best: "O(n)", average: "O(n)", worst: "O(n)" }, space: "O(n)" },
  applications: ["Next greater element", "Histogram area", "Stock span"],
  applicationsAr: ["العنصر الأكبر التالي", "مساحة المدرج", "مدى الأسهم"],
  inputFields: [numberField()],
  defaultInput: (level, rng) => ({ values: randomUnique(level, rng) }),
  parseInput: (fields) => ({ values: parseIntegerList(fields.values ?? "") }),
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate: generateMonotonic,
});

export const queueUsingStacks = makeModule<ArrayFrame, QueueInput>({
  slug: "queue-using-stacks",
  title: "Queue Using Two Stacks",
  titleAr: "طابور باستخدام مكدسين",
  category: "stacks-queues",
  difficulty: "Intermediate",
  tags: ["queue", "two stacks", "amortized"],
  tagsAr: ["طابور", "مكدسان", "تحليل مستهلك"],
  summary: "Implements FIFO behavior by transferring items between input and output stacks only when needed.",
  summaryAr: "يحقق سلوك FIFO بنقل العناصر بين مكدسي الإدخال والإخراج عند الحاجة فقط.",
  renderer: "array",
  pseudocode: ["enqueue(x): push x on input stack", "dequeue/peek:", "  if output is empty, move every input item to output", "  pop/peek output top"],
  pseudocodeAr: ["الإضافة: ادفع x إلى مكدس الإدخال", "الحذف أو المعاينة:", "  إن كان الإخراج فارغاً فانقل إليه كل عناصر الإدخال", "  اسحب أو عاين قمة الإخراج"],
  overview: "Two LIFO reversals produce FIFO order. Each item transfers at most once, giving amortized O(1) queue operations.",
  overviewAr: "ينتج ترتيب FIFO من عكسين بنظام LIFO، وينتقل كل عنصر مرة واحدة كحد أقصى فتكون الكلفة المستهلكة O(1).",
  complexity: { time: { best: "O(1)", average: "O(1) amortized", worst: "O(n)" }, space: "O(n)" },
  applications: ["Queue abstraction", "Amortized-analysis teaching"],
  applicationsAr: ["تجريد الطابور", "تعليم التحليل المستهلك"],
  inputFields: [{ key: "ops", label: "Operations", labelAr: "العمليات", placeholder: "+4, +7, -, +9, ?, -", help: "+x enqueue, - dequeue, ? peek.", helpAr: "+x إضافة، - حذف، ? معاينة." }],
  defaultInput: () => parseQueue("+4, +7, -, +9, ?, -"),
  parseInput: (fields) => parseQueue(fields.ops ?? ""),
  serializeInput: (input) => ({ ops: input.ops.map((op) => op.kind === "enqueue" ? `+${op.value}` : op.kind === "dequeue" ? "-" : "?").join(", ") }),
  generate: generateQueueStacks,
});
