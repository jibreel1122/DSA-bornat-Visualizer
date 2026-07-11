import type { AlgorithmModule, AuxRow, CellState, ListFrame, Step } from "@/lib/engine/types";

type Input = { a: number[]; b: number[] };

function generate(input: Input): Step<ListFrame>[] {
  const A = [...input.a].sort((x, y) => x - y);
  const B = [...input.b].sort((x, y) => x - y);
  const steps: Step<ListFrame>[] = [];
  let comparisons = 0;
  let appends = 0;

  const result: number[] = [];

  const auxFor = (i: number, j: number, from: "A" | "B" | null): AuxRow[] => {
    const aStates: Record<number, CellState> = {};
    for (let k = 0; k < A.length; k++) aStates[k] = k < i ? "discarded" : k === i ? (from === "A" ? "active" : "compare") : "default";
    const bStates: Record<number, CellState> = {};
    for (let k = 0; k < B.length; k++) bStates[k] = k < j ? "discarded" : k === j ? (from === "B" ? "active" : "compare") : "default";
    return [
      { label: "List A", values: A.map((v) => v), states: aStates },
      { label: "List B", values: B.map((v) => v), states: bStates },
    ];
  };

  const frame = (
    i: number,
    j: number,
    from: "A" | "B" | null,
    description: string,
    codeLine: number,
    descriptionAr: string,
    done = false,
  ): void => {
    const nodes = result.map((v, k) => ({ id: `r${k}`, value: v }));
    const links = nodes.slice(0, -1).map((nd, k) => ({ from: nd.id, to: nodes[k + 1].id, kind: "next" as const }));
    const states: Record<string, CellState> = {};
    if (nodes.length) states[nodes[nodes.length - 1].id] = done ? "found" : "sorted";
    const pointers = nodes.length ? [{ nodeId: nodes[nodes.length - 1].id, label: "tail" }] : [];
    steps.push({
      frame: {
        nodes,
        links,
        pointers,
        states,
        aux: auxFor(i, j, from),
        note: done ? `merged list complete` : `building the merged sorted list`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons, appends },
    });
  };

  frame(
    0,
    0,
    null,
    `Merge two sorted lists A=[${A.join(", ")}] and B=[${B.join(", ")}] into one sorted list.`,
    1,
    `ادمج قائمتين مرتبتين A=[${A.join(", ")}] وB=[${B.join(", ")}] في قائمة واحدة مرتبة.`,
  );

  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    comparisons++;
    if (A[i] <= B[j]) {
      result.push(A[i]);
      appends++;
      frame(i, j, "A", `A[${i}]=${A[i]} ≤ B[${j}]=${B[j]}: append ${A[i]} from A.`, 3, `A[${i}]=${A[i]} ≤ B[${j}]=${B[j]}: أضِف ${A[i]} من A.`);
      i++;
    } else {
      result.push(B[j]);
      appends++;
      frame(i, j, "B", `B[${j}]=${B[j]} < A[${i}]=${A[i]}: append ${B[j]} from B.`, 5, `B[${j}]=${B[j]} < A[${i}]=${A[i]}: أضِف ${B[j]} من B.`);
      j++;
    }
  }
  while (i < A.length) {
    result.push(A[i]);
    appends++;
    frame(i, j, "A", `List B is exhausted: append remaining ${A[i]} from A.`, 7, `نفدت القائمة B: أضِف الباقي ${A[i]} من A.`);
    i++;
  }
  while (j < B.length) {
    result.push(B[j]);
    appends++;
    frame(i, j, "B", `List A is exhausted: append remaining ${B[j]} from B.`, 7, `نفدت القائمة A: أضِف الباقي ${B[j]} من B.`);
    j++;
  }

  frame(i, j, null, `Done. Merged sorted list: [${result.join(", ")}].`, 8, `انتهينا. القائمة المرتبة المدمجة: [${result.join(", ")}].`, true);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const size = Math.min(6, 2 + level);
  const build = () => {
    const out: number[] = [];
    let v = rng.int(1, 5);
    for (let k = 0; k < size; k++) {
      out.push(v);
      v += rng.int(1, 6);
    }
    return out;
  };
  return { a: build(), b: build() };
}

const mod: AlgorithmModule<ListFrame, Input> = {
  slug: "merge-two-sorted-lists",
  title: "Merge Two Sorted Lists",
  titleAr: "دمج قائمتين مرتبتين",
  category: "linked-lists",
  difficulty: "Beginner",
  tags: ["linked list", "two pointers", "merge", "sorted"],
  tagsAr: ["قائمة مترابطة", "مؤشران", "دمج", "مرتبة"],
  summary: "Merges two sorted linked lists into one sorted list by repeatedly splicing the smaller head node.",
  summaryAr: "تدمج قائمتين مترابطتين مرتبتين في قائمة واحدة مرتبة بوصل العقدة الأصغر من الرأسين تكرارًا.",
  renderer: "list",
  pseudocode: [
    "procedure merge(a, b)",
    "  dummy = tail = new node",
    "  while a and b:",
    "    if a.val <= b.val: tail.next = a; a = a.next",
    "    else:",
    "      tail.next = b; b = b.next",
    "    tail = tail.next",
    "  tail.next = a or b   // append the rest",
    "  return dummy.next",
  ],
  code: {
    pseudocode: `dummy = tail = Node()
while a and b:
  if a.val <= b.val: tail.next = a; a = a.next
  else: tail.next = b; b = b.next
  tail = tail.next
tail.next = a if a else b
return dummy.next`,
    c: `Node* merge(Node* a, Node* b) {
    Node dummy; Node* tail = &dummy; dummy.next = NULL;
    while (a && b) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}`,
    cpp: `Node* merge(Node* a, Node* b) {
    Node dummy; Node* tail = &dummy;
    while (a && b) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}`,
    java: `Node merge(Node a, Node b) {
    Node dummy = new Node(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;
    return dummy.next;
}`,
    python: `def merge(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b
    return dummy.next`,
    javascript: `function merge(a, b) {
  const dummy = { next: null };
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a || b;
  return dummy.next;
}`,
    typescript: `function merge(a: Node | null, b: Node | null): Node | null {
  const dummy: Node = { val: 0, next: null };
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}`,
    csharp: `Node Merge(Node a, Node b) {
    Node dummy = new Node(0), tail = dummy;
    while (a != null && b != null) {
        if (a.Val <= b.Val) { tail.Next = a; a = a.Next; }
        else { tail.Next = b; b = b.Next; }
        tail = tail.Next;
    }
    tail.Next = a ?? b;
    return dummy.Next;
}`,
    go: `func merge(a, b *Node) *Node {
	dummy := &Node{}
	tail := dummy
	for a != nil && b != nil {
		if a.Val <= b.Val {
			tail.Next = a; a = a.Next
		} else {
			tail.Next = b; b = b.Next
		}
		tail = tail.Next
	}
	if a != nil { tail.Next = a } else { tail.Next = b }
	return dummy.Next
}`,
    rust: `fn merge(mut a: Option<Box<Node>>, mut b: Option<Box<Node>>) -> Option<Box<Node>> {
    let mut dummy = Box::new(Node { val: 0, next: None });
    let mut tail = &mut dummy;
    while a.is_some() && b.is_some() {
        if a.as_ref().unwrap().val <= b.as_ref().unwrap().val {
            let mut n = a.take().unwrap();
            a = n.next.take();
            tail.next = Some(n);
        } else {
            let mut n = b.take().unwrap();
            b = n.next.take();
            tail.next = Some(n);
        }
        tail = tail.next.as_mut().unwrap();
    }
    tail.next = if a.is_some() { a } else { b };
    dummy.next
}`,
    kotlin: `fun merge(a0: Node?, b0: Node?): Node? {
    var a = a0; var b = b0
    val dummy = Node(0); var tail = dummy
    while (a != null && b != null) {
        if (a.value <= b.value) { tail.next = a; a = a.next }
        else { tail.next = b; b = b.next }
        tail = tail.next!!
    }
    tail.next = a ?: b
    return dummy.next
}`,
    swift: `func merge(_ a0: Node?, _ b0: Node?) -> Node? {
    var a = a0, b = b0
    let dummy = Node(0); var tail = dummy
    while let x = a, let y = b {
        if x.val <= y.val { tail.next = x; a = x.next }
        else { tail.next = y; b = y.next }
        tail = tail.next!
    }
    tail.next = a ?? b
    return dummy.next
}`,
  },
  content: {
    overview: `Merging two sorted linked lists produces a single list that is also sorted, containing all nodes from both inputs. It is the linchpin of merge sort and a favorite warm-up interview question because it exercises careful pointer splicing.

The technique walks both lists in parallel with two pointers. At each step it compares the two current head nodes and splices the smaller one onto the tail of the result, then advances that list's pointer. When one list runs out, the remainder of the other — already sorted — is attached in a single link. A "dummy" head node removes the need to special-case the very first append, keeping the code short and branch-free at the boundaries.`,
    howItWorks: [
      "Create a dummy head node and a tail pointer starting at it.",
      "While both lists are non-empty, compare their front nodes.",
      "Splice the smaller node onto tail.next and advance that list's pointer.",
      "Move tail forward to the node just appended.",
      "When one list empties, link the rest of the other list; return dummy.next.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" },
      space: "O(1)",
      notes: "Each node is visited once. Merging is done in place by relinking existing nodes — no new nodes (besides the dummy) are allocated, giving O(1) auxiliary space.",
    },
    applications: [
      "the merge step of merge sort on linked lists",
      "combining sorted streams or log files",
      "k-way merging (repeatedly merging pairs)",
      "database sort-merge join implementations",
    ],
    advantages: [
      "Linear time in the total number of nodes",
      "In-place relinking — constant extra space",
      "The dummy-head trick avoids messy first-node handling",
      "Stable: equal elements keep their relative order",
    ],
    disadvantages: [
      "Requires both inputs to already be sorted",
      "Pointer relinking is error-prone if done carelessly",
      "Not directly parallelizable across the single output list",
    ],
    commonMistakes: [
      "Forgetting to attach the remaining tail of the non-empty list.",
      "Not using a dummy head, leading to awkward first-node special cases.",
      "Using < instead of ≤ and thereby breaking stability on equal keys.",
      "Losing nodes by overwriting next before advancing the pointer.",
    ],
    interviewQuestions: [
      "Why does a dummy head node simplify the merge?",
      "How do you merge k sorted lists efficiently (heap vs. pairwise)?",
      "How is this merge used inside merge sort for linked lists?",
      "Why does using ≤ preserve stability?",
      "Can you merge in O(1) space, and how?",
    ],
    summary:
      "Merging two sorted linked lists splices the smaller head node onto a result list until one input empties, then appends the rest, in O(n + m) time and O(1) space. A dummy head simplifies the boundary, and it is the core of merge sort on lists.",
    quiz: [
      { question: "Merging two sorted lists of sizes n and m takes…", options: ["O(n·m)", "O(n + m)", "O(log(n+m))", "O((n+m) log(n+m))"], answer: 1, explanation: "Each node is handled exactly once." },
      { question: "The dummy head node is used to…", options: ["Store the result length", "Avoid special-casing the first appended node", "Sort the lists", "Detect cycles"], answer: 1, explanation: "It gives tail a stable starting point before any real node exists." },
      { question: "Auxiliary space for the in-place merge is…", options: ["O(1)", "O(n)", "O(n + m)", "O(log n)"], answer: 0, explanation: "Existing nodes are relinked; no per-node allocation is needed." },
      { question: "Using ≤ instead of < in the comparison ensures…", options: ["Faster runtime", "Stability for equal keys", "Less memory", "Correct cycle detection"], answer: 1, explanation: "Taking from the first list on ties preserves relative order." },
      { question: "After one list empties, you must…", options: ["Stop immediately", "Attach the remainder of the other list", "Reverse the result", "Restart the merge"], answer: 1, explanation: "The rest of the non-empty list is already sorted and is linked on directly." },
    ],
  },
  contentAr: {
    overview: `دمج قائمتين مترابطتين مرتبتين ينتج قائمة واحدة مرتبة أيضًا، تحتوي على جميع عقد القائمتين المدخلتين. وهي حجر الأساس في الترتيب بالدمج، ومسألة إحماء مفضّلة في المقابلات لأنها تتطلب توصيلًا دقيقًا للمؤشرات.

تسير التقنية على القائمتين بالتوازي باستخدام مؤشرين. في كل خطوة تقارن العقدتين الأماميتين الحاليتين وتصل الأصغر منهما بذيل النتيجة، ثم تقدّم مؤشر تلك القائمة. عندما تنفد إحدى القائمتين، يُلحق باقي القائمة الأخرى — وهو مرتب بالفعل — برابط واحد. عقدة "وهمية" (dummy) في الرأس تزيل الحاجة لمعالجة أول إلحاق كحالة خاصة، مما يبقي الشيفرة قصيرة وخالية من التفرعات عند الحدود.`,
    howItWorks: [
      "أنشئ عقدة رأس وهمية (dummy) ومؤشر tail يبدأ عندها.",
      "طالما أن كلتا القائمتين غير فارغتين، قارن عقدتيهما الأماميتين.",
      "صِل العقدة الأصغر بـ tail.next وقدّم مؤشر تلك القائمة.",
      "حرّك tail إلى الأمام نحو العقدة التي تم إلحاقها للتو.",
      "عندما تفرغ إحدى القائمتين، صِل بقية القائمة الأخرى؛ ثم أعد dummy.next.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" },
      space: "O(1)",
      notes: "تُزار كل عقدة مرة واحدة. يتم الدمج في المكان بإعادة ربط العقد الموجودة — لا تُخصَّص عقد جديدة (باستثناء العقدة الوهمية)، مما يمنح مساحة مساعدة O(1).",
    },
    applications: [
      "خطوة الدمج في الترتيب بالدمج على القوائم المترابطة",
      "دمج تدفقات أو ملفات سجلّ مرتبة",
      "الدمج من نوع k-way (دمج أزواج بشكل متكرر)",
      "تنفيذات ربط الفرز-الدمج (sort-merge join) في قواعد البيانات",
    ],
    advantages: [
      "زمن خطي في إجمالي عدد العقد",
      "إعادة ربط في المكان — مساحة إضافية ثابتة",
      "حيلة الرأس الوهمي تتجنب معالجة العقدة الأولى بشكل معقّد",
      "مستقر: تحافظ العناصر المتساوية على ترتيبها النسبي",
    ],
    disadvantages: [
      "يتطلب أن تكون المدخلتان مرتبتين مسبقًا",
      "إعادة ربط المؤشرات عرضة للخطأ إذا لم تُنفَّذ بعناية",
      "غير قابل للتوازي مباشرة عبر قائمة الخرج الواحدة",
    ],
    commonMistakes: [
      "نسيان إلحاق ذيل القائمة غير الفارغة المتبقي.",
      "عدم استخدام رأس وهمي، مما يؤدي إلى معالجة معقّدة للعقدة الأولى كحالة خاصة.",
      "استخدام < بدلاً من ≤ مما يكسر الاستقرار عند تساوي المفاتيح.",
      "فقدان العقد بالكتابة فوق next قبل تقديم المؤشر.",
    ],
    interviewQuestions: [
      "لماذا تبسّط عقدة الرأس الوهمية عملية الدمج؟",
      "كيف تدمج k قائمة مرتبة بكفاءة (كومة مقابل دمج ثنائي متكرر)؟",
      "كيف يُستخدم هذا الدمج داخل الترتيب بالدمج للقوائم المترابطة؟",
      "لماذا يحافظ استخدام ≤ على الاستقرار؟",
      "هل يمكنك الدمج بمساحة O(1)، وكيف؟",
    ],
    summary:
      "دمج قائمتين مترابطتين مرتبتين يصل العقدة الأصغر من الرأسين بقائمة النتيجة حتى تنفد إحدى المدخلتين، ثم يلحق الباقي، في زمن O(n + m) ومساحة O(1). يبسّط الرأس الوهمي الحدود، وهو جوهر الترتيب بالدمج على القوائم.",
    quiz: [
      { question: "دمج قائمتين مرتبتين بحجمي n وm يستغرق…", options: ["O(n·m)", "O(n + m)", "O(log(n+m))", "O((n+m) log(n+m))"], answer: 1, explanation: "تتم معالجة كل عقدة مرة واحدة بالضبط." },
      { question: "تُستخدم العقدة الرأس الوهمية من أجل…", options: ["تخزين طول النتيجة", "تجنّب معالجة أول عقدة مُلحَقة كحالة خاصة", "ترتيب القائمتين", "كشف الدورات"], answer: 1, explanation: "تمنح tail نقطة بداية ثابتة قبل وجود أي عقدة حقيقية." },
      { question: "المساحة المساعدة للدمج في المكان هي…", options: ["O(1)", "O(n)", "O(n + m)", "O(log n)"], answer: 0, explanation: "تتم إعادة ربط العقد الموجودة؛ لا حاجة إلى تخصيص لكل عقدة." },
      { question: "استخدام ≤ بدلاً من < في المقارنة يضمن…", options: ["زمن تنفيذ أسرع", "الاستقرار عند تساوي المفاتيح", "ذاكرة أقل", "كشفًا صحيحًا للدورات"], answer: 1, explanation: "أخذ العنصر من القائمة الأولى عند التعادل يحافظ على الترتيب النسبي." },
      { question: "بعد نفاد إحدى القائمتين، يجب أن…", options: ["تتوقف فورًا", "تُلحق بقية القائمة الأخرى", "تعكس النتيجة", "تعيد بدء الدمج"], answer: 1, explanation: "بقية القائمة غير الفارغة مرتبة بالفعل وتُربط مباشرة." },
    ],
  },
  inputFields: [
    { key: "a", label: "Sorted list A", placeholder: "1, 2, 4", help: "Numbers (auto-sorted), up to 20." },
    { key: "b", label: "Sorted list B", placeholder: "1, 3, 4", help: "Numbers (auto-sorted), up to 20." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const parse = (s: string, name: string) => {
      const arr = (s ?? "")
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const v = Number(p);
          if (!Number.isInteger(v)) throw new Error(`${name}: "${p}" is not a whole number.`);
          return v;
        });
      if (arr.length > 20) throw new Error(`${name}: maximum 20 numbers.`);
      return arr;
    };
    const a = parse(fields.a ?? "", "List A");
    const b = parse(fields.b ?? "", "List B");
    if (a.length + b.length < 2) throw new Error("Enter at least 2 numbers across both lists.");
    return { a, b };
  },
  serializeInput: (input) => ({ a: input.a.join(", "), b: input.b.join(", ") }),
  generate,
};

export default mod;
