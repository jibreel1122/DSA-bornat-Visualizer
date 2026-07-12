import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { items: (string | number)[] };

function generate(input: Input): Step<CallStackFrame>[] {
  const items = input.items;
  const n = items.length;
  const used = new Array(n).fill(false);
  const current: (string | number)[] = [];
  const output: string[] = [];
  const stack: CallStackItem[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let pid = 0;
  let placements = 0;
  let backtracks = 0;
  let truncated = false;

  const snap = (topState: "active" | "found" | "swap" | undefined, description: string, codeLine: number, descriptionAr?: string): void => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    const shown = stack.map((it, i) => ({ ...it, state: i === stack.length - 1 ? topState ?? it.state : it.state }));
    steps.push({
      frame: {
        stack: shown,
        output: output.map((o) => o),
        aux: [{ label: "current", values: current.length ? current.map((x) => x) : ["(empty)"] }],
        note: `permute [${items.join(", ")}] — place one unused element at each depth, backtrack after`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { placements, permutations: output.length, backtracks },
    });
  };

  snap(undefined, `Generate all ${n}! = ${factorial(n)} permutations of [${items.join(", ")}] by choosing an unused element at each level.`, 0, `ولّد جميع تباديل [${items.join(", ")}] البالغة ${n}! = ${factorial(n)} باختيار عنصر غير مستخدم عند كل مستوى.`);

  const recurse = (depth: number): void => {
    if (truncated) return;
    if (depth === n) {
      output.push(current.join(""));
      snap("found", `Depth ${depth}: all elements placed → permutation "${current.join("")}" recorded.`, 2, `العمق ${depth}: وُضِعت كل العناصر ← سُجِّل التبديل "${current.join("")}".`);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(items[i]);
      const id = `p${pid++}`;
      stack.push({ id, label: `place ${items[i]}`, detail: `[${current.join(" ")}]`, state: "active" });
      placements++;
      snap("active", `Depth ${depth}: place ${items[i]} → current = [${current.join(" ")}].`, 4, `العمق ${depth}: ضع ${items[i]} ← الحالي = [${current.join(" ")}].`);
      recurse(depth + 1);
      // backtrack
      current.pop();
      used[i] = false;
      stack.pop();
      backtracks++;
      snap("swap", `Backtrack: remove ${items[i]}, try the next unused element.`, 6, `تراجع: أزل ${items[i]}، وجرّب العنصر التالي غير المستخدم.`);
    }
  };

  recurse(0);
  stack.length = 0;
  snap(undefined, `Done. All ${output.length} permutations: ${output.join(", ")}.`, 7, `انتهى. جميع التباديل الـ ${output.length}: ${output.join(", ")}.`);
  return steps;
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function randomInput(level: number, rng: { shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const size = Math.min(4, 3 + Math.floor((level - 1) / 2)); // 3 or 4
  const pool = ["A", "B", "C", "D"].slice(0, size);
  return { items: rng.shuffle(pool) };
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "permutations",
  title: "Permutations (Backtracking)",
  titleAr: "التباديل (بالتراجع)",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "recursion", "permutations", "combinatorics"],
  tagsAr: ["التراجع", "العودية", "تباديل", "التوافيق"],
  summary: "Generates every ordering of a set by placing each unused element at the next position and backtracking.",
  summaryAr: "يولّد كل ترتيب لمجموعة بوضع كل عنصر غير مستخدم في الموضع التالي ثم التراجع.",
  renderer: "callstack",
  pseudocode: [
    "procedure permute(current)",
    "  if current.length == n:",
    "    output current; return",
    "  for each element e not yet used:",
    "    choose e (mark used, append)",
    "    permute(current)",
    "    un-choose e (mark unused, remove)  // backtrack",
    "  return all recorded permutations",
  ],
  code: {
    pseudocode: `permute(current):
  if len(current) == n: output(current); return
  for e in items where not used[e]:
    used[e]=true; current.push(e)
    permute(current)
    current.pop(); used[e]=false   # backtrack`,
    c: `void permute(int* a, int n, bool* used, int* cur, int depth) {
    if (depth == n) { printArr(cur, n); return; }
    for (int i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = true; cur[depth] = a[i];
        permute(a, n, used, cur, depth + 1);
        used[i] = false;
    }
}`,
    cpp: `void permute(vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& out) {
    if (cur.size() == a.size()) { out.push_back(cur); return; }
    for (int i = 0; i < (int)a.size(); i++) {
        if (used[i]) continue;
        used[i] = true; cur.push_back(a[i]);
        permute(a, used, cur, out);
        cur.pop_back(); used[i] = false;
    }
}`,
    java: `void permute(int[] a, boolean[] used, List<Integer> cur, List<List<Integer>> out) {
    if (cur.size() == a.length) { out.add(new ArrayList<>(cur)); return; }
    for (int i = 0; i < a.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.add(a[i]);
        permute(a, used, cur, out);
        cur.remove(cur.size() - 1); used[i] = false;
    }
}`,
    python: `def permute(items):
    out, used, cur = [], [False] * len(items), []
    def backtrack():
        if len(cur) == len(items):
            out.append(cur[:]); return
        for i, e in enumerate(items):
            if used[i]: continue
            used[i] = True; cur.append(e)
            backtrack()
            cur.pop(); used[i] = False
    backtrack()
    return out`,
    javascript: `function permute(items) {
  const out = [], used = Array(items.length).fill(false), cur = [];
  (function backtrack() {
    if (cur.length === items.length) { out.push([...cur]); return; }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(items[i]);
      backtrack();
      cur.pop(); used[i] = false;
    }
  })();
  return out;
}`,
    typescript: `function permute<T>(items: T[]): T[][] {
  const out: T[][] = [], used = Array(items.length).fill(false), cur: T[] = [];
  (function backtrack() {
    if (cur.length === items.length) { out.push([...cur]); return; }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(items[i]);
      backtrack();
      cur.pop(); used[i] = false;
    }
  })();
  return out;
}`,
    csharp: `void Permute(int[] a, bool[] used, List<int> cur, List<List<int>> outp) {
    if (cur.Count == a.Length) { outp.Add(new List<int>(cur)); return; }
    for (int i = 0; i < a.Length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.Add(a[i]);
        Permute(a, used, cur, outp);
        cur.RemoveAt(cur.Count - 1); used[i] = false;
    }
}`,
    go: `func permute(a []int, used []bool, cur []int, out *[][]int) {
	if len(cur) == len(a) {
		cp := make([]int, len(cur)); copy(cp, cur)
		*out = append(*out, cp); return
	}
	for i := range a {
		if used[i] { continue }
		used[i] = true
		permute(a, used, append(cur, a[i]), out)
		used[i] = false
	}
}`,
    rust: `fn permute(items: &[i32], used: &mut Vec<bool>, cur: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    if cur.len() == items.len() { out.push(cur.clone()); return; }
    for i in 0..items.len() {
        if used[i] { continue; }
        used[i] = true; cur.push(items[i]);
        permute(items, used, cur, out);
        cur.pop(); used[i] = false;
    }
}`,
    kotlin: `fun permute(a: IntArray, used: BooleanArray, cur: MutableList<Int>, out: MutableList<List<Int>>) {
    if (cur.size == a.size) { out.add(ArrayList(cur)); return }
    for (i in a.indices) {
        if (used[i]) continue
        used[i] = true; cur.add(a[i])
        permute(a, used, cur, out)
        cur.removeAt(cur.size - 1); used[i] = false
    }
}`,
    swift: `func permute(_ a: [Int], _ used: inout [Bool], _ cur: inout [Int], _ out: inout [[Int]]) {
    if cur.count == a.count { out.append(cur); return }
    for i in a.indices {
        if used[i] { continue }
        used[i] = true; cur.append(a[i])
        permute(a, &used, &cur, &out)
        cur.removeLast(); used[i] = false
    }
}`,
  },
  content: {
    overview: `Generating all permutations of a set means listing every possible ordering of its elements. A set of n distinct items has n! permutations — 6 for three items, 24 for four, 120 for five — so the output grows explosively. Backtracking is the natural way to enumerate them all without repetition.

The algorithm builds a permutation one position at a time. At each level of recursion it picks an element that has not yet been used, appends it to the current sequence, and recurses to fill the next position. When the sequence reaches length n, it is a complete permutation and gets recorded. The crucial move happens on the way back up: after recursing, the algorithm removes the element and marks it unused again — backtracking — so that the same position can be filled with a different choice. This "choose → explore → un-choose" rhythm is the essence of backtracking and reappears in N-Queens, subsets, and Sudoku.`,
    howItWorks: [
      "Keep a 'used' flag per element and a growing 'current' sequence.",
      "If current has length n, it is a full permutation — record it and return.",
      "Otherwise loop over all elements; skip any already used.",
      "Choose an unused element: mark it used and append it, then recurse.",
      "After recursing, un-choose it (unmark, remove) so the next choice can be tried — this is the backtrack.",
    ],
    complexity: {
      time: { best: "O(n·n!)", average: "O(n·n!)", worst: "O(n·n!)" },
      space: "O(n)",
      notes: "There are n! permutations and copying each of length n costs O(n), giving O(n·n!) total. Recursion depth and the used/current arrays use O(n) auxiliary space (excluding the output).",
    },
    applications: [
      "brute-force search over all orderings (e.g. small TSP)",
      "generating test cases and exhaustive schedules",
      "anagram and word-arrangement problems",
      "teaching the choose/explore/un-choose backtracking template",
    ],
    advantages: [
      "Enumerates every ordering exactly once",
      "Simple, uniform recursive template",
      "Uses only O(n) extra space beyond the output",
      "Easily adapted to permutations with constraints or duplicates",
    ],
    disadvantages: [
      "Output size n! is unavoidably exponential-plus",
      "Impractical beyond ~10–11 elements",
      "Naive version mishandles duplicate elements (repeats)",
      "Deep recursion for large n",
    ],
    commonMistakes: [
      "Forgetting to un-mark the element on backtrack, producing missing/incorrect permutations.",
      "Storing references to 'current' instead of copies, so all outputs alias the same list.",
      "Not skipping used elements, generating invalid sequences.",
      "Ignoring duplicate handling when the input has repeats.",
    ],
    interviewQuestions: [
      "How do you generate permutations when the input contains duplicates?",
      "How would you produce the next permutation in lexicographic order in place?",
      "Why must you copy the current sequence when recording it?",
      "What is the time complexity, and why the extra factor of n?",
      "How does the choose/explore/un-choose pattern generalize to other backtracking problems?",
    ],
    summary:
      "Permutation generation via backtracking places each unused element at the next position, recurses, and un-chooses on the way back, enumerating all n! orderings in O(n·n!) time. It is the archetypal choose/explore/un-choose backtracking template.",
    quiz: [
      { question: "How many permutations does a set of n distinct items have?", options: ["n²", "2^n", "n!", "n log n"], answer: 2, explanation: "Each ordering is counted once, giving n factorial." },
      { question: "The backtracking step in permutation generation is…", options: ["Recording the permutation", "Un-choosing an element after recursing", "Sorting the array", "Skipping the first element"], answer: 1, explanation: "Removing and unmarking the element lets other choices fill that slot." },
      { question: "Why copy 'current' when recording a permutation?", options: ["For speed", "Otherwise every stored result aliases the same mutating list", "To sort it", "It isn't necessary"], answer: 1, explanation: "Without a copy, later mutations corrupt previously stored results." },
      { question: "The time complexity is…", options: ["O(n!)", "O(n·n!)", "O(2^n)", "O(n²)"], answer: 1, explanation: "n! permutations each cost O(n) to build/copy." },
      { question: "The 'used' flags exist to…", options: ["Count permutations", "Avoid reusing an element within one permutation", "Sort elements", "Save memory"], answer: 1, explanation: "They ensure each element appears exactly once per ordering." },
    ],
  },
  contentAr: {
    overview: `توليد جميع تباديل مجموعة يعني سرد كل ترتيب ممكن لعناصرها. لمجموعة من n عنصرًا متمايزًا n! تبديلًا — 6 لثلاثة عناصر، و24 لأربعة، و120 لخمسة — فينمو الخرج بشكل انفجاري. التراجع هو الطريقة الطبيعية لتعدادها جميعًا دون تكرار.

تبني الخوارزمية تبديلًا موضعًا تلو الآخر. عند كل مستوى من العودية تنتقي عنصرًا لم يُستخدم بعد، تُلحِقه بالتسلسل الحالي، وتستدعي العودية لملء الموضع التالي. حين يبلغ التسلسل الطول n، يصبح تبديلًا كاملًا ويُسجَّل. الحركة الحاسمة تقع في طريق العودة إلى الأعلى: بعد العودية، تُزيل الخوارزمية العنصر وتعلّمه غير مستخدم مجددًا — أي تتراجع — كي يُملأ الموضع نفسه باختيار مختلف. إيقاع «اختر ← استكشف ← ألغِ الاختيار» هذا هو جوهر التراجع، ويتكرر في الملكات الـ N والمجموعات الجزئية وسودوكو.`,
    howItWorks: [
      "احتفظ بعلَم 'مستخدم' لكل عنصر وتسلسل 'حالي' متنامٍ.",
      "إذا بلغ الحالي الطول n، فهو تبديل كامل — سجّله وارجع.",
      "وإلا فمُرّ على كل العناصر؛ وتخطَّ أي عنصر مستخدم بالفعل.",
      "اختر عنصرًا غير مستخدم: علّمه مستخدمًا وألحِقه، ثم استدعِ العودية.",
      "بعد العودية، ألغِ اختياره (أزل التعليم واحذفه) كي يُجرَّب الاختيار التالي — هذا هو التراجع.",
    ],
    complexity: {
      time: { best: "O(n·n!)", average: "O(n·n!)", worst: "O(n·n!)" },
      space: "O(n)",
      notes: "هناك n! تبديلًا ونسخ كلٍّ بطول n يكلّف O(n)، مما يعطي O(n·n!) إجمالًا. عمق العودية ومصفوفتا مستخدم/حالي يستخدمان مساحة مساعدة O(n) (باستثناء الخرج).",
    },
    applications: [
      "بحث القوة الغاشمة عبر كل الترتيبات (مثل مسألة البائع المتجول الصغيرة)",
      "توليد حالات اختبار وجداول شاملة",
      "مسائل الجناس وترتيب الكلمات",
      "تعليم قالب التراجع اختر/استكشف/ألغِ الاختيار",
    ],
    advantages: [
      "يعدّ كل ترتيب مرة واحدة بالضبط",
      "قالب عودي بسيط وموحَّد",
      "يستخدم مساحة إضافية O(n) فقط فوق الخرج",
      "يتكيّف بسهولة مع التباديل ذات القيود أو التكرارات",
    ],
    disadvantages: [
      "حجم الخرج n! أسّي-وزيادة لا مفرّ منه",
      "غير عملي بعد نحو 10–11 عنصرًا",
      "النسخة الساذجة تسيء التعامل مع العناصر المكرَّرة (تكرارات)",
      "عودية عميقة لقيم n كبيرة",
    ],
    commonMistakes: [
      "نسيان إزالة تعليم العنصر عند التراجع، مما ينتج تباديل ناقصة/خاطئة.",
      "تخزين مراجع إلى 'الحالي' بدلًا من نسخ، فتشير كل المخرجات إلى القائمة نفسها.",
      "عدم تخطي العناصر المستخدمة، مما يولّد تسلسلات غير صالحة.",
      "تجاهل معالجة التكرار حين تحتوي المدخلات على مكرَّرات.",
    ],
    interviewQuestions: [
      "كيف تولّد التباديل حين تحتوي المدخلات على تكرارات؟",
      "كيف تُنتج التبديل التالي بالترتيب المعجمي في المكان؟",
      "لماذا يجب نسخ التسلسل الحالي عند تسجيله؟",
      "ما تعقيد الزمن، ولماذا العامل الإضافي n؟",
      "كيف يتعمم نمط اختر/استكشف/ألغِ الاختيار إلى مسائل التراجع الأخرى؟",
    ],
    summary:
      "يضع توليد التباديل بالتراجع كل عنصر غير مستخدم في الموضع التالي، يستدعي العودية، ويلغي الاختيار في طريق العودة، معدِّدًا جميع الترتيبات البالغة n! بزمن O(n·n!). إنه القالب النموذجي للتراجع اختر/استكشف/ألغِ الاختيار.",
    quiz: [
      { question: "كم تبديلًا لمجموعة من n عنصرًا متمايزًا؟", options: ["n²", "2^n", "n!", "n log n"], answer: 2, explanation: "يُحسَب كل ترتيب مرة واحدة، مما يعطي n مضروبًا." },
      { question: "خطوة التراجع في توليد التباديل هي…", options: ["تسجيل التبديل", "إلغاء اختيار عنصر بعد العودية", "ترتيب المصفوفة", "تخطي العنصر الأول"], answer: 1, explanation: "إزالة العنصر وتعليمه يتيحان لاختيارات أخرى ملء تلك الخانة." },
      { question: "لماذا تنسخ 'الحالي' عند تسجيل تبديل؟", options: ["للسرعة", "وإلا أشارت كل نتيجة مخزَّنة إلى القائمة المتغيّرة نفسها", "لترتيبه", "ليس ضروريًّا"], answer: 1, explanation: "دون نسخ، تُفسِد التغييرات اللاحقة النتائج المخزَّنة سابقًا." },
      { question: "تعقيد الزمن هو…", options: ["O(n!)", "O(n·n!)", "O(2^n)", "O(n²)"], answer: 1, explanation: "n! تبديلًا يكلّف كلٌّ منها O(n) للبناء/النسخ." },
      { question: "توجد أعلام 'مستخدم' كي…", options: ["تعدّ التباديل", "تتجنب إعادة استخدام عنصر داخل تبديل واحد", "ترتّب العناصر", "توفّر الذاكرة"], answer: 1, explanation: "تضمن أن يظهر كل عنصر مرة واحدة بالضبط لكل ترتيب." },
    ],
  },
  inputFields: [
    { key: "items", label: "Elements (distinct)", placeholder: "A, B, C", help: "2–5 distinct symbols or numbers.", list: true },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const items = (fields.items ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (items.length < 2) throw new Error("Enter at least 2 elements.");
    if (items.length > 5) throw new Error("Maximum 5 elements (5! = 120 permutations) to keep the step-by-step trace bounded.");
    if (new Set(items).size !== items.length) throw new Error("Elements must be distinct.");
    return { items };
  },
  serializeInput: (input) => ({ items: input.items.join(", ") }),
  generate,
};

export default mod;
