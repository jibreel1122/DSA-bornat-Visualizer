import type { AlgorithmModule, CellState, ListFrame, Step } from "@/lib/engine/types";

type Input = { values: number[]; cyclePos: number };

function generate(input: Input): Step<ListFrame>[] {
  const nodes = input.values.map((v, i) => ({ id: `n${i}`, value: v }));
  const n = nodes.length;
  const cyclePos = input.cyclePos; // index the tail links back to, or -1
  const steps: Step<ListFrame>[] = [];
  let slowMoves = 0;
  let fastMoves = 0;

  // next[i] = index or null
  const nextIdx: (number | null)[] = nodes.map((_, i) => (i + 1 < n ? i + 1 : cyclePos >= 0 ? cyclePos : null));

  const links = () =>
    nodes
      .map((node, i) => {
        const t = nextIdx[i];
        if (t === null) return null;
        const kind = t <= i ? ("loop" as const) : ("next" as const);
        return { from: node.id, to: nodes[t].id, kind };
      })
      .filter((l): l is { from: string; to: string; kind: "loop" | "next" } => l !== null);

  const frame = (
    slow: number | null,
    fast: number | null,
    states: Record<string, CellState>,
    description: string,
    codeLine: number,
    descriptionAr: string,
  ): void => {
    const pointers = [
      { nodeId: slow === null ? null : nodes[slow].id, label: "slow 🐢" },
      { nodeId: fast === null ? null : nodes[fast].id, label: "fast 🐇" },
    ];
    steps.push({
      frame: {
        nodes: nodes.map((nd) => ({ ...nd })),
        links: links(),
        pointers,
        states: { ...states },
        note: cyclePos >= 0 ? `tail links back to index ${cyclePos}` : `no cycle (tail → null)`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { slowMoves, fastMoves },
    });
  };

  frame(
    0,
    0,
    { [nodes[0].id]: "active" },
    `Floyd's tortoise & hare: slow and fast both start at the head (${nodes[0].value}).`,
    1,
    `السلحفاة والأرنب عند فلويد: يبدأ كل من slow وfast عند الرأس (${nodes[0].value}).`,
  );

  let slow: number | null = 0;
  let fast: number | null = 0;
  let met = false;
  let guard = 0;

  while (fast !== null && nextIdx[fast] !== null && guard < 4 * n + 10) {
    guard++;
    slow = nextIdx[slow!]!;
    slowMoves++;
    const f1: number = nextIdx[fast]!;
    fast = nextIdx[f1];
    fastMoves += 2;
    if (fast === null) {
      frame(
        slow,
        null,
        { [nodes[slow!].id]: "active" },
        `Fast walked off the end → the list is acyclic. No cycle exists.`,
        3,
        `وصل fast إلى النهاية → القائمة غير دورية. لا توجد دورة.`,
      );
      break;
    }
    if (slow === fast) {
      met = true;
      frame(
        slow,
        fast,
        { [nodes[slow!].id]: "found" },
        `slow and fast met at ${nodes[slow!].value}! A cycle is present.`,
        4,
        `التقى slow وfast عند ${nodes[slow!].value}! توجد دورة.`,
      );
      break;
    }
    frame(
      slow,
      fast,
      { [nodes[slow!].id]: "compare", [nodes[fast].id]: "swap" },
      `slow steps 1 → ${nodes[slow!].value}, fast steps 2 → ${nodes[fast].value}. Not equal yet, keep going.`,
      3,
      `slow يتقدم 1 خطوة → ${nodes[slow!].value}، وfast يتقدم 2 خطوة → ${nodes[fast].value}. لم يتساويا بعد، تابع.`,
    );
  }

  if (met) {
    // Phase 2: find the cycle entrance.
    let p1: number = 0;
    let p2: number = slow!;
    frame(
      p1,
      p2,
      { [nodes[p1].id]: "active", [nodes[p2].id]: "active" },
      `Phase 2: reset one pointer to the head. Advance both by 1 until they meet.`,
      6,
      `المرحلة 2: أعد أحد المؤشرين إلى الرأس. قدّم كليهما بمقدار 1 حتى يلتقيا.`,
    );
    let g2 = 0;
    while (p1 !== p2 && g2 < n + 2) {
      g2++;
      p1 = nextIdx[p1]!;
      p2 = nextIdx[p2]!;
      slowMoves++;
      fastMoves++;
      if (p1 === p2) break;
      frame(
        p1,
        p2,
        { [nodes[p1].id]: "compare", [nodes[p2].id]: "compare" },
        `Advance both: ${nodes[p1].value} vs ${nodes[p2].value}. Not the entrance yet.`,
        7,
        `قدّم كليهما: ${nodes[p1].value} مقابل ${nodes[p2].value}. لم تصل إلى نقطة الدخول بعد.`,
      );
    }
    const done: Record<string, CellState> = {};
    // highlight the cycle
    for (let i = cyclePos; i < n; i++) done[nodes[i].id] = "visited";
    done[nodes[p1].id] = "found";
    frame(
      p1,
      p2,
      done,
      `Cycle entrance found at node ${nodes[p1].value} (index ${p1}). The highlighted nodes form the loop.`,
      8,
      `وُجدت نقطة دخول الدورة عند العقدة ${nodes[p1].value} (الفهرس ${p1}). العقد المظللة تشكّل الحلقة.`,
    );
  } else if (guard >= 4 * n + 10) {
    frame(slow, fast, {}, `Guard reached — stopping.`, 3, `تم الوصول إلى الحد الأقصى للحماية — التوقف.`);
  }

  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(9, 4 + level);
  const values = Array.from({ length: n }, () => rng.int(1, 60));
  // Odd levels get a cycle, even levels are acyclic — deterministic variety.
  const cyclePos = level % 2 === 1 ? rng.int(0, n - 2) : -1;
  return { values, cyclePos };
}

const mod: AlgorithmModule<ListFrame, Input> = {
  slug: "floyd-cycle-detection",
  title: "Floyd's Cycle Detection",
  titleAr: "كشف الدورات لفلويد (Floyd)",
  category: "linked-lists",
  difficulty: "Intermediate",
  tags: ["linked list", "two pointers", "cycle", "tortoise & hare"],
  tagsAr: ["قائمة مترابطة", "مؤشران", "دورة", "السلحفاة والأرنب"],
  summary: "Detects a loop in a linked list with two pointers moving at different speeds, then finds the cycle's entry node.",
  summaryAr: "تكشف عن حلقة في قائمة مترابطة باستخدام مؤشرين يتحركان بسرعتين مختلفتين، ثم تجد عقدة دخول الدورة.",
  renderer: "list",
  pseudocode: [
    "procedure hasCycle(head)",
    "  slow = fast = head",
    "  while fast and fast.next:",
    "    slow = slow.next          // 1 step",
    "    fast = fast.next.next      // 2 steps",
    "    if slow == fast: cycle!",
    "  // to find entry: reset slow to head,",
    "  //   advance both by 1 until they meet",
    "  return meeting node",
  ],
  code: {
    pseudocode: `slow = fast = head
while fast and fast.next:
  slow = slow.next
  fast = fast.next.next
  if slow == fast: return true   # cycle
return false                     # no cycle`,
    c: `bool hasCycle(Node* head) {
    Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}`,
    cpp: `bool hasCycle(Node* head) {
    Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}`,
    java: `boolean hasCycle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}`,
    python: `def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
    javascript: `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
    typescript: `function hasCycle(head: Node | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
    csharp: `bool HasCycle(Node head) {
    Node slow = head, fast = head;
    while (fast != null && fast.Next != null) {
        slow = slow.Next;
        fast = fast.Next.Next;
        if (slow == fast) return true;
    }
    return false;
}`,
    go: `func hasCycle(head *Node) bool {
	slow, fast := head, head
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
		if slow == fast {
			return true
		}
	}
	return false
}`,
    rust: `fn has_cycle(head: &Option<Rc<RefCell<Node>>>) -> bool {
    let mut slow = head.clone();
    let mut fast = head.clone();
    while let Some(f) = fast.clone() {
        let fnext = f.borrow().next.clone();
        match fnext {
            Some(fn2) => {
                fast = fn2.borrow().next.clone();
                slow = slow.and_then(|s| s.borrow().next.clone());
                if let (Some(a), Some(b)) = (&slow, &fast) {
                    if Rc::ptr_eq(a, b) { return true; }
                }
            }
            None => break,
        }
    }
    false
}`,
    kotlin: `fun hasCycle(head: Node?): Boolean {
    var slow = head
    var fast = head
    while (fast != null && fast.next != null) {
        slow = slow!!.next
        fast = fast.next!!.next
        if (slow === fast) return true
    }
    return false
}`,
    swift: `func hasCycle(_ head: Node?) -> Bool {
    var slow = head, fast = head
    while fast != nil && fast!.next != nil {
        slow = slow!.next
        fast = fast!.next!.next
        if slow === fast { return true }
    }
    return false
}`,
  },
  content: {
    overview: `Floyd's cycle-detection algorithm — nicknamed "tortoise and hare" — determines whether a linked list contains a loop, using only two pointers and O(1) extra memory. A slow pointer advances one node per step while a fast pointer advances two. If the list ends, there is no cycle; if the two pointers ever land on the same node, a cycle exists.

The key insight is that inside a loop the fast pointer gains one position on the slow pointer every step, so it must eventually lap it — they are guaranteed to meet. A second, elegant phase then locates the exact node where the cycle begins: reset one pointer to the head and advance both by one step at a time; the node where they meet again is the loop's entry point. This works because the distance from the head to the entry equals the distance from the meeting point to the entry, measured around the loop.`,
    howItWorks: [
      "Start both slow and fast at the head.",
      "Each iteration, move slow one node and fast two nodes forward.",
      "If fast (or fast.next) reaches null, the list is acyclic — stop and report no cycle.",
      "If slow and fast reference the same node, a cycle is confirmed.",
      "To find the entry, move one pointer back to the head and advance both by one until they meet again.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "Detection and entry-finding are both linear. Only two pointers are stored, so extra space is constant — a big win over a hash-set approach which needs O(n) space.",
    },
    applications: [
      "detecting infinite loops in linked structures and iterators",
      "finding cycles in functional graphs (x → f(x)) like pseudo-random sequences",
      "duplicate-number detection (LeetCode 'Find the Duplicate')",
      "memory-safety checks in pointer-based data structures",
    ],
    advantages: [
      "O(1) extra space — no auxiliary hash set",
      "Linear time detection",
      "Also pinpoints the cycle's start node and length",
      "Simple, pointer-only implementation",
    ],
    disadvantages: [
      "Only detects a single reachable cycle, not all structural loops",
      "Trickier to reason about than the hash-set method",
      "Requires care with null checks on fast and fast.next",
    ],
    commonMistakes: [
      "Advancing fast without checking both fast and fast.next for null.",
      "Comparing node values instead of node identity/reference.",
      "Starting slow and fast at different nodes, breaking the meeting guarantee.",
      "Forgetting the second phase when the entry node (not just existence) is required.",
    ],
    interviewQuestions: [
      "Why are the tortoise and hare guaranteed to meet inside a cycle?",
      "Prove that resetting one pointer to the head finds the cycle's entry node.",
      "How do you compute the length of the cycle once a meeting is found?",
      "Compare Floyd's algorithm with the hash-set approach in time and space.",
      "How does 'Find the Duplicate Number' reduce to cycle detection?",
    ],
    summary:
      "Floyd's tortoise-and-hare detects a linked-list cycle in O(n) time and O(1) space by moving two pointers at speeds 1 and 2 until they meet. A second phase resets one pointer to the head to locate the cycle's entry node.",
    quiz: [
      { question: "In Floyd's algorithm, the fast pointer moves…", options: ["One node per step", "Two nodes per step", "Three nodes per step", "Randomly"], answer: 1, explanation: "Fast advances two nodes while slow advances one." },
      { question: "The extra space used is…", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], answer: 2, explanation: "Only two pointers are stored regardless of list size." },
      { question: "If fast reaches null, the list is…", options: ["Cyclic", "Acyclic", "Empty", "Sorted"], answer: 1, explanation: "Reaching the end means there is no loop to trap the fast pointer." },
      { question: "The pointers are guaranteed to meet in a cycle because…", options: ["They start apart", "Fast gains one position per step and laps slow", "The list is sorted", "Slow moves backward"], answer: 1, explanation: "The relative speed of 1 closes the gap every iteration." },
      { question: "To find the cycle's entry node you…", options: ["Reset both to the tail", "Reset one pointer to the head and advance both by 1", "Double both speeds", "Reverse the list"], answer: 1, explanation: "Equal head-to-entry and meeting-to-entry distances make them meet at the entry." },
    ],
  },
  contentAr: {
    overview: `خوارزمية كشف الدورات لفلويد (Floyd) — الملقّبة بـ"السلحفاة والأرنب" — تحدد ما إذا كانت القائمة المترابطة تحتوي على حلقة، باستخدام مؤشرين فقط ومساحة إضافية O(1). يتقدم مؤشر بطيء عقدة واحدة في كل خطوة بينما يتقدم مؤشر سريع بعقدتين. إذا انتهت القائمة فلا توجد دورة؛ وإذا حطّ المؤشران يومًا على العقدة نفسها فهذا يعني وجود دورة.

الفكرة الأساسية هي أنه داخل الحلقة يكسب المؤشر السريع موضعًا واحدًا على المؤشر البطيء في كل خطوة، لذا لا بد أن يلحق به في النهاية — فالتقاؤهما مضمون. ثم تحدد مرحلة ثانية أنيقة العقدة بالضبط التي تبدأ عندها الدورة: أعد أحد المؤشرين إلى الرأس وقدّم كليهما بخطوة واحدة في كل مرة؛ العقدة التي يلتقيان عندها مجددًا هي نقطة دخول الحلقة. يعمل هذا لأن المسافة من الرأس إلى نقطة الدخول تساوي المسافة من نقطة اللقاء إلى نقطة الدخول، مقيسة حول الحلقة.`,
    howItWorks: [
      "ابدأ كلا من slow وfast عند الرأس.",
      "في كل تكرار، حرّك slow عقدة واحدة وfast عقدتين إلى الأمام.",
      "إذا وصل fast (أو fast.next) إلى null، فالقائمة غير دورية — توقف وأبلغ بعدم وجود دورة.",
      "إذا أشار slow وfast إلى العقدة نفسها، فقد تأكدت الدورة.",
      "لإيجاد نقطة الدخول، أعد أحد المؤشرين إلى الرأس وقدّم كليهما بخطوة واحدة حتى يلتقيا مجددًا.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "الكشف وإيجاد نقطة الدخول كلاهما خطي. يُخزَّن مؤشران فقط، لذا المساحة الإضافية ثابتة — وهذا مكسب كبير مقارنة بأسلوب مجموعة التجزئة (hash-set) الذي يحتاج مساحة O(n).",
    },
    applications: [
      "كشف الحلقات اللانهائية في الهياكل المترابطة والمُكرِّرات (iterators)",
      "إيجاد الدورات في الرسوم البيانية الدالية (x → f(x)) مثل المتتاليات شبه العشوائية",
      "كشف الأرقام المكررة (مسألة LeetCode \"Find the Duplicate\")",
      "فحوصات سلامة الذاكرة في هياكل البيانات القائمة على المؤشرات",
    ],
    advantages: [
      "مساحة إضافية O(1) — بلا مجموعة تجزئة مساعدة",
      "كشف بزمن خطي",
      "تحدد أيضًا عقدة بداية الدورة وطولها",
      "تنفيذ بسيط قائم على المؤشرات فقط",
    ],
    disadvantages: [
      "تكتشف فقط دورة واحدة يمكن الوصول إليها، وليس كل الحلقات البنيوية",
      "أصعب في الفهم من أسلوب مجموعة التجزئة",
      "تتطلب حذرًا في التحقق من القيم الفارغة لـ fast وfast.next",
    ],
    commonMistakes: [
      "تقديم fast دون التحقق من كل من fast وfast.next للقيمة الفارغة.",
      "مقارنة قيم العقد بدلاً من هوية/مرجع العقدة.",
      "بدء slow وfast من عقدتين مختلفتين، مما يكسر ضمان اللقاء.",
      "نسيان المرحلة الثانية عندما تكون نقطة الدخول (وليس مجرد الوجود) مطلوبة.",
    ],
    interviewQuestions: [
      "لماذا يضمن التقاء السلحفاة والأرنب داخل الدورة؟",
      "أثبت أن إعادة أحد المؤشرين إلى الرأس تجد نقطة دخول الدورة.",
      "كيف تحسب طول الدورة بمجرد إيجاد نقطة اللقاء؟",
      "قارن خوارزمية فلويد بأسلوب مجموعة التجزئة من حيث الزمن والمساحة.",
      "كيف تُختزل مسألة \"Find the Duplicate Number\" إلى كشف الدورات؟",
    ],
    summary:
      "يكشف أسلوب السلحفاة والأرنب لفلويد عن دورة في قائمة مترابطة بزمن O(n) ومساحة O(1) بتحريك مؤشرين بسرعتي 1 و2 حتى يلتقيا. تعيد مرحلة ثانية أحد المؤشرين إلى الرأس لإيجاد عقدة دخول الدورة.",
    quiz: [
      { question: "في خوارزمية فلويد، يتحرك المؤشر السريع…", options: ["عقدة واحدة في كل خطوة", "عقدتين في كل خطوة", "ثلاث عقد في كل خطوة", "بشكل عشوائي"], answer: 1, explanation: "يتقدم fast بعقدتين بينما يتقدم slow بعقدة واحدة." },
      { question: "المساحة الإضافية المستخدمة هي…", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], answer: 2, explanation: "يُخزَّن مؤشران فقط بغض النظر عن حجم القائمة." },
      { question: "إذا وصل fast إلى null، فإن القائمة…", options: ["دورية", "غير دورية", "فارغة", "مرتبة"], answer: 1, explanation: "الوصول إلى النهاية يعني عدم وجود حلقة تحبس المؤشر السريع." },
      { question: "يُضمن التقاء المؤشرين في الدورة لأن…", options: ["يبدآن متباعدين", "fast يكسب موضعًا واحدًا في كل خطوة ويلحق بـ slow", "القائمة مرتبة", "slow يتحرك للخلف"], answer: 1, explanation: "السرعة النسبية 1 تُغلق الفجوة في كل تكرار." },
      { question: "لإيجاد نقطة دخول الدورة…", options: ["أعد كليهما إلى الذيل", "أعد أحد المؤشرين إلى الرأس وقدّم كليهما بخطوة واحدة", "ضاعف كلتا السرعتين", "اعكس القائمة"], answer: 1, explanation: "تساوي المسافتين من الرأس إلى نقطة الدخول ومن نقطة اللقاء إلى نقطة الدخول يجعلهما يلتقيان عند نقطة الدخول." },
    ],
  },
  inputFields: [
    { key: "values", label: "List values (head → tail)", placeholder: "3, 2, 0, -4", help: "2–20 numbers." },
    { key: "cyclePos", label: "Cycle links to index", placeholder: "1", help: "Index the tail points back to, or -1 for no cycle." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const values = (fields.values ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v)) throw new Error(`"${p}" is not a whole number.`);
        return v;
      });
    if (values.length < 2) throw new Error("Enter at least 2 values.");
    if (values.length > 20) throw new Error("Maximum 20 values.");
    const cyclePos = Number((fields.cyclePos ?? "-1").trim());
    if (!Number.isInteger(cyclePos) || cyclePos < -1 || cyclePos >= values.length) {
      throw new Error(`Cycle index must be -1 (no cycle) or between 0 and ${values.length - 1}.`);
    }
    return { values, cyclePos };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), cyclePos: String(input.cyclePos) }),
  generate,
};

export default mod;
