import type { AlgorithmModule, CellState, ListFrame, Step } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";
import { randomArray } from "@/lib/engine/random";

type Input = { values: number[] };

function generate(input: Input): Step<ListFrame>[] {
  const nodes = input.values.map((v, i) => ({ id: `n${i}`, value: v }));
  const steps: Step<ListFrame>[] = [];
  let pointerMoves = 0;
  let linkFlips = 0;

  // next[id] = id it currently points to (or null)
  const next = new Map<string, string | null>();
  nodes.forEach((n, i) => next.set(n.id, i + 1 < nodes.length ? nodes[i + 1].id : null));

  const frame = (
    prev: string | null,
    cur: string | null,
    nxt: string | null,
    states: Record<string, CellState>,
    description: string,
    codeLine: number,
    descriptionAr: string,
  ): void => {
    // build links from current next map
    const links = nodes
      .filter((n) => next.get(n.id))
      .map((n) => ({ from: n.id, to: next.get(n.id)!, kind: "next" as const }));
    const pointers = [
      { nodeId: prev, label: "prev" },
      { nodeId: cur, label: "curr" },
      { nodeId: nxt, label: "next" },
    ];
    steps.push({
      frame: { nodes: nodes.map((n) => ({ ...n })), links, pointers, states: { ...states } },
      description,
      descriptionAr,
      codeLine,
      counters: { pointerMoves, linkFlips },
    });
  };

  frame(
    null,
    nodes[0]?.id ?? null,
    null,
    {},
    `Reverse the list iteratively with three pointers: prev, curr, next.`,
    0,
    `اعكس القائمة تكراريًا باستخدام ثلاثة مؤشرات: prev وcurr وnext.`,
  );

  let prev: string | null = null;
  let cur: string | null = nodes[0]?.id ?? null;
  while (cur) {
    const nxt: string | null = next.get(cur) ?? null;
    frame(
      prev,
      cur,
      nxt,
      { [cur]: "active" },
      `Save next = ${nxt ? nodeVal(nodes, nxt) : "null"} before we overwrite curr's link.`,
      2,
      `احفظ next = ${nxt ? nodeVal(nodes, nxt) : "null"} قبل أن نستبدل رابط curr.`,
    );
    next.set(cur, prev);
    linkFlips++;
    frame(
      prev,
      cur,
      nxt,
      { [cur]: "swap", ...(prev ? { [prev]: "sorted" } : {}) },
      `Point curr (${nodeVal(nodes, cur)}) back to prev (${prev ? nodeVal(nodes, prev) : "null"}).`,
      3,
      `اجعل curr (${nodeVal(nodes, cur)}) يشير إلى الخلف نحو prev (${prev ? nodeVal(nodes, prev) : "null"}).`,
    );
    prev = cur;
    cur = nxt;
    pointerMoves++;
    frame(
      prev,
      cur,
      cur ? (next.get(cur) ?? null) : null,
      prev ? { [prev]: "sorted" } : {},
      `Advance: prev = ${nodeVal(nodes, prev)}, curr = ${cur ? nodeVal(nodes, cur) : "null"}.`,
      4,
      `تقدّم: prev = ${nodeVal(nodes, prev)}، curr = ${cur ? nodeVal(nodes, cur) : "null"}.`,
    );
  }
  const done: Record<string, CellState> = {};
  nodes.forEach((n) => (done[n.id] = "found"));
  frame(
    prev,
    null,
    null,
    done,
    `Done! New head is ${prev ? nodeVal(nodes, prev) : "null"}. The list is reversed.`,
    5,
    `انتهينا! الرأس الجديد هو ${prev ? nodeVal(nodes, prev) : "null"}. القائمة معكوسة الآن.`,
  );
  return steps;
}

function nodeVal(nodes: { id: string; value: number }[], id: string): number | string {
  return nodes.find((n) => n.id === id)?.value ?? "?";
}

const mod: AlgorithmModule<ListFrame, Input> = {
  slug: "reverse-linked-list",
  title: "Reverse a Linked List",
  titleAr: "عكس قائمة مترابطة",
  category: "linked-lists",
  difficulty: "Beginner",
  tags: ["linked list", "pointers", "in-place", "O(n)"],
  tagsAr: ["قائمة مترابطة", "مؤشرات", "في المكان", "O(n)"],
  summary: "Reverses a singly linked list in place by flipping each node's next pointer using three pointers.",
  summaryAr: "تعكس قائمة مترابطة أحادية الاتجاه في المكان بقلب مؤشر next لكل عقدة باستخدام ثلاثة مؤشرات.",
  renderer: "list",
  pseudocode: [
    "procedure reverse(head)",
    "  prev = null; curr = head",
    "  while curr != null:",
    "    next = curr.next   // save",
    "    curr.next = prev   // flip link",
    "    prev = curr; curr = next  // advance",
    "  return prev          // new head",
  ],
  code: {
    pseudocode: `procedure reverse(head)
  prev = null; curr = head
  while curr != null:
    next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  return prev`,
    c: `Node* reverse(Node* head) {
    Node *prev = NULL, *curr = head;
    while (curr) {
        Node* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}`,
    cpp: `Node* reverse(Node* head) {
    Node *prev = nullptr, *curr = head;
    while (curr) {
        Node* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}`,
    java: `Node reverse(Node head) {
    Node prev = null, curr = head;
    while (curr != null) {
        Node next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}`,
    python: `def reverse(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev, curr = curr, nxt
    return prev`,
    javascript: `function reverse(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
    typescript: `function reverse(head: Node | null): Node | null {
  let prev: Node | null = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
    csharp: `Node Reverse(Node head) {
    Node prev = null, curr = head;
    while (curr != null) {
        Node next = curr.Next;
        curr.Next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}`,
    go: `func reverse(head *Node) *Node {
	var prev *Node
	curr := head
	for curr != nil {
		next := curr.Next
		curr.Next = prev
		prev = curr
		curr = next
	}
	return prev
}`,
    rust: `fn reverse(mut head: Option<Box<Node>>) -> Option<Box<Node>> {
    let mut prev = None;
    while let Some(mut node) = head {
        head = node.next.take();
        node.next = prev;
        prev = Some(node);
    }
    prev
}`,
    kotlin: `fun reverse(head: Node?): Node? {
    var prev: Node? = null
    var curr = head
    while (curr != null) {
        val next = curr.next
        curr.next = prev
        prev = curr
        curr = next
    }
    return prev
}`,
    swift: `func reverse(_ head: Node?) -> Node? {
    var prev: Node? = nil
    var curr = head
    while let node = curr {
        let next = node.next
        node.next = prev
        prev = node
        curr = next
    }
    return prev
}`,
  },
  content: {
    overview: `Reversing a singly linked list means making every node point to its predecessor instead of its successor, so the last node becomes the head. Because each node only knows its next node, the trick is to walk the list once while carefully rewiring pointers without losing the rest of the list.

The standard iterative solution uses three pointers: prev (the reversed portion built so far), curr (the node being processed), and next (a temporary save of curr's original successor). At each step you save next, flip curr's link to prev, then advance both prev and curr forward. When curr falls off the end, prev is the new head.`,
    howItWorks: [
      "Initialize prev = null and curr = head.",
      "Save next = curr.next so you don't lose the rest of the list.",
      "Reverse the link: set curr.next = prev.",
      "Advance the window: prev = curr, then curr = next.",
      "When curr becomes null, the list is fully reversed and prev is the new head.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "One pass visits each node once → O(n). Only three pointers are used → O(1) space. A recursive version is also O(n) time but O(n) stack space.",
    },
    applications: [
      "A classic interview and teaching problem for pointer manipulation",
      "Reversing traversal order without extra storage",
      "Building blocks for reversing sublists (e.g. reverse-in-k-groups)",
      "Palindrome checks on linked lists (reverse half and compare)",
    ],
    advantages: [
      "In-place — O(1) extra memory",
      "Single linear pass",
      "No data copying; only pointers change",
      "Foundation for more complex list-rewiring problems",
    ],
    disadvantages: [
      "Pointer bugs are easy to introduce (losing the list)",
      "Recursive form risks stack overflow on long lists",
      "Only reverses direction; doesn't help with random access",
    ],
    commonMistakes: [
      "Not saving next before overwriting curr.next — losing the rest of the list.",
      "Returning head instead of prev as the new head.",
      "Updating prev and curr in the wrong order.",
      "Forgetting the empty-list / single-node edge cases.",
    ],
    interviewQuestions: [
      "Reverse a linked list iteratively and recursively — compare their space usage.",
      "Reverse only the nodes between positions m and n.",
      "Reverse a linked list in groups of k.",
      "Use list reversal to check if a linked list is a palindrome.",
      "Why is the temporary 'next' pointer essential?",
    ],
    summary:
      "Reversing a singly linked list flips each node's next pointer using three pointers (prev, curr, next) in a single O(n) pass with O(1) space. It's the canonical pointer-manipulation exercise and a building block for many list problems.",
    quiz: [
      { question: "How many pointers does the standard iterative reversal use?", options: ["One", "Two", "Three", "Four"], answer: 2, explanation: "prev, curr, and a temporary next pointer." },
      { question: "What is the space complexity of iterative reversal?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0, explanation: "Only a fixed set of pointers is used, independent of list length." },
      { question: "Why must you save curr.next before reversing the link?", options: ["For speed", "Otherwise you lose access to the rest of the list", "To count nodes", "It isn't necessary"], answer: 1, explanation: "Overwriting curr.next without saving would strand the remaining nodes." },
      { question: "After the loop ends, the new head is…", options: ["head", "curr", "prev", "next"], answer: 2, explanation: "prev points to the last node processed, which becomes the new head." },
      { question: "The recursive version's drawback compared to iterative is…", options: ["It's slower asymptotically", "It uses O(n) stack space", "It can't reverse", "It needs extra arrays"], answer: 1, explanation: "Recursion depth equals list length, risking stack overflow." },
    ],
  },
  contentAr: {
    overview: `عكس قائمة مترابطة أحادية الاتجاه يعني جعل كل عقدة تشير إلى سابقتها بدلاً من تاليتها، بحيث تصبح العقدة الأخيرة هي الرأس الجديد. ولأن كل عقدة تعرف فقط العقدة التالية لها، فإن الحيلة تكمن في اجتياز القائمة مرة واحدة مع إعادة توصيل المؤشرات بعناية دون فقدان بقية القائمة.

يستخدم الحل التكراري القياسي ثلاثة مؤشرات: prev (الجزء المعكوس الذي تم بناؤه حتى الآن)، وcurr (العقدة قيد المعالجة)، وnext (حفظ مؤقت لتالي curr الأصلي). في كل خطوة، تحفظ next، ثم تقلب رابط curr ليشير إلى prev، ثم تقدّم كلا من prev وcurr. عندما تسقط curr خارج نهاية القائمة، يصبح prev هو الرأس الجديد.`,
    howItWorks: [
      "ابدأ بـ prev = null و curr = head.",
      "احفظ next = curr.next حتى لا تفقد بقية القائمة.",
      "اعكس الرابط: اجعل curr.next = prev.",
      "قدّم النافذة: prev = curr، ثم curr = next.",
      "عندما تصبح curr = null، تكون القائمة قد انعكست بالكامل ويكون prev هو الرأس الجديد.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "مرور واحد يزور كل عقدة مرة واحدة ← O(n). يُستخدم ثلاثة مؤشرات فقط ← مساحة O(1). النسخة العودية أيضًا O(n) زمنًا لكنها تحتاج O(n) من مساحة المكدس.",
    },
    applications: [
      "مسألة كلاسيكية في المقابلات والتدريس لتلاعب المؤشرات",
      "عكس ترتيب الاجتياز دون تخزين إضافي",
      "لبنة بناء لعكس قوائم فرعية (مثل العكس على مجموعات من k)",
      "فحوصات المتتاليات المتناظرة (palindrome) على القوائم المترابطة (عكس النصف والمقارنة)",
    ],
    advantages: [
      "في المكان — ذاكرة إضافية O(1)",
      "مرور خطي واحد فقط",
      "لا نسخ للبيانات؛ تتغير المؤشرات فقط",
      "أساس لمسائل أكثر تعقيدًا في إعادة توصيل القوائم",
    ],
    disadvantages: [
      "من السهل الوقوع في أخطاء المؤشرات (فقدان القائمة)",
      "الشكل العودي يخاطر بفيضان المكدس في القوائم الطويلة",
      "يعكس الاتجاه فقط؛ لا يساعد في الوصول العشوائي",
    ],
    commonMistakes: [
      "عدم حفظ next قبل استبدال curr.next — مما يفقد بقية القائمة.",
      "إرجاع head بدلاً من prev كرأس جديد.",
      "تحديث prev وcurr بترتيب خاطئ.",
      "نسيان الحالات الحدّية للقائمة الفارغة أو ذات العقدة الواحدة.",
    ],
    interviewQuestions: [
      "اعكس قائمة مترابطة تكراريًا وعوديًا — قارن استخدام الذاكرة بينهما.",
      "اعكس فقط العقد الواقعة بين الموضعين m وn.",
      "اعكس قائمة مترابطة على مجموعات من k عقدة.",
      "استخدم عكس القائمة للتحقق مما إذا كانت القائمة المترابطة متناظرة (palindrome).",
      "لماذا يُعد مؤشر next المؤقت ضروريًا؟",
    ],
    summary:
      "عكس قائمة مترابطة أحادية الاتجاه يقلب مؤشر next لكل عقدة باستخدام ثلاثة مؤشرات (prev وcurr وnext) في مرور واحد بزمن O(n) ومساحة O(1). إنها تمرين تلاعب المؤشرات الكلاسيكي ولبنة بناء للعديد من مسائل القوائم.",
    quiz: [
      { question: "كم عدد المؤشرات التي يستخدمها العكس التكراري القياسي؟", options: ["واحد", "اثنان", "ثلاثة", "أربعة"], answer: 2, explanation: "prev وcurr ومؤشر next مؤقت." },
      { question: "ما هو التعقيد المكاني للعكس التكراري؟", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0, explanation: "يُستخدم عدد ثابت من المؤشرات فقط، بغض النظر عن طول القائمة." },
      { question: "لماذا يجب حفظ curr.next قبل عكس الرابط؟", options: ["من أجل السرعة", "وإلا ستفقد الوصول إلى بقية القائمة", "لعدّ العقد", "ليس ضروريًا"], answer: 1, explanation: "استبدال curr.next دون حفظه سيقطع الوصول إلى بقية العقد." },
      { question: "بعد انتهاء الحلقة، الرأس الجديد هو…", options: ["head", "curr", "prev", "next"], answer: 2, explanation: "يشير prev إلى آخر عقدة تمت معالجتها، وهي التي تصبح الرأس الجديد." },
      { question: "عيب النسخة العودية مقارنة بالتكرارية هو…", options: ["أبطأ من حيث التعقيد المقارب", "تستخدم مساحة مكدس O(n)", "لا يمكنها العكس", "تحتاج مصفوفات إضافية"], answer: 1, explanation: "عمق العودية يساوي طول القائمة، مما يخاطر بفيضان المكدس." },
    ],
  },
  inputFields: [{ key: "values", label: "List values (head → tail)", placeholder: "1, 2, 3, 4, 5", help: "2–40 numbers." }],
  defaultInput: (level, rng) => ({ values: randomArray(Math.min(3, level) as 1 | 2 | 3, rng).slice(0, Math.min(9, 3 + level)) }),
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 values.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
