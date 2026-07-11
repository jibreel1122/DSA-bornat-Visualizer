import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { items: (string | number)[] };

function generate(input: Input): Step<CallStackFrame>[] {
  const items = input.items;
  const n = items.length;
  const current: (string | number)[] = [];
  const output: string[] = [];
  const stack: CallStackItem[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let pid = 0;
  let calls = 0;
  let truncated = false;

  const fmtSet = (arr: (string | number)[]) => `{${arr.join(", ")}}`;

  const snap = (topState: CallStackItem["state"], description: string, codeLine: number, descriptionAr?: string): void => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    const shown = stack.map((it, i) => ({ ...it, state: i === stack.length - 1 ? topState ?? it.state : it.state }));
    steps.push({
      frame: {
        stack: shown,
        output: output.map((o) => o),
        aux: [{ label: "current subset", values: [fmtSet(current)] }],
        note: `powerSet([${items.join(", ")}]) — at each element, branch into "exclude it" and "include it".`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { calls, subsets: output.length },
    });
  };

  snap(
    undefined,
    `Generate the power set of [${items.join(", ")}]: 2^${n} = ${2 ** n} subsets, by deciding include/exclude for each element in turn.`,
    0,
    `ولّد مجموعة القوى لـ [${items.join(", ")}]: 2^${n} = ${2 ** n} مجموعة جزئية، بتحديد الإدراج/الاستبعاد لكل عنصر بالتتابع.`,
  );

  const recurse = (i: number): void => {
    if (truncated) return;
    calls++;
    const id = `c${pid++}`;
    stack.push({ id, label: `decide(${i})`, detail: fmtSet(current), state: "active" });
    if (i === n) {
      output.push(fmtSet(current));
      snap(
        "found",
        `All ${n} elements decided → record subset ${fmtSet(current)}.`,
        2,
        `تقرر مصير جميع العناصر الـ ${n} ← سجّل المجموعة الجزئية ${fmtSet(current)}.`,
      );
      stack.pop();
      return;
    }
    const item = items[i];

    // branch 1: exclude items[i]
    snap(
      "active",
      `At index ${i} (element ${item}): branch 1 — EXCLUDE it.`,
      3,
      `عند الفهرس ${i} (العنصر ${item}): الفرع 1 — استبعده.`,
    );
    recurse(i + 1);

    // branch 2: include items[i]
    current.push(item);
    snap(
      "swap",
      `At index ${i} (element ${item}): branch 2 — INCLUDE it → current = ${fmtSet(current)}.`,
      4,
      `عند الفهرس ${i} (العنصر ${item}): الفرع 2 — أدرجه ← current = ${fmtSet(current)}.`,
    );
    recurse(i + 1);
    current.pop();

    stack.pop();
  };

  recurse(0);
  stack.length = 0;
  snap(
    undefined,
    `Done. All ${output.length} subsets: ${output.join(", ")}.`,
    5,
    `انتهى. جميع المجموعات الجزئية الـ ${output.length}: ${output.join(", ")}.`,
  );
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "power-set",
  title: "Power Set (Subsets by Recursion)",
  titleAr: "مجموعة القوى (المجموعات الجزئية عوديًا)",
  category: "recursion",
  difficulty: "Intermediate",
  tags: ["recursion", "backtracking", "subsets", "combinatorics", "O(2^n)"],
  tagsAr: ["العودية", "التراجع", "مجموعات جزئية", "توافيقيات", "O(2^n)"],
  summary: "Generates every subset of a set by recursively branching into 'include this element' and 'exclude it' at each position.",
  summaryAr: "يولّد كل المجموعات الجزئية لمجموعة عبر التفرع عوديًا بين 'إدراج هذا العنصر' و'استبعاده' عند كل موضع.",
  renderer: "callstack",
  pseudocode: [
    "procedure powerSet(items, i, current)",
    "  call decide(i)",
    "  if i == n: record current as a subset; return  // base case",
    "  decide(i+1)                       // branch 1: exclude items[i]",
    "  current.push(items[i])",
    "  decide(i+1)                       // branch 2: include items[i]",
    "  current.pop()                     // undo before returning",
  ],
  code: {
    pseudocode: `procedure decide(i, current):
  if i == n: output.append(copy of current); return
  decide(i + 1)                 // exclude items[i]
  current.push(items[i])
  decide(i + 1)                 // include items[i]
  current.pop()`,
    c: `void decide(int* items, int n, int i, int* cur, int depth) {
    if (i == n) { printSet(cur, depth); return; }
    decide(items, n, i + 1, cur, depth);          // exclude
    cur[depth] = items[i];
    decide(items, n, i + 1, cur, depth + 1);      // include
}`,
    cpp: `void decide(const vector<int>& items, int i, vector<int>& cur, vector<vector<int>>& out) {
    if (i == (int)items.size()) { out.push_back(cur); return; }
    decide(items, i + 1, cur, out);               // exclude
    cur.push_back(items[i]);
    decide(items, i + 1, cur, out);               // include
    cur.pop_back();
}`,
    java: `static void decide(int[] items, int i, List<Integer> cur, List<List<Integer>> out) {
    if (i == items.length) { out.add(new ArrayList<>(cur)); return; }
    decide(items, i + 1, cur, out);               // exclude
    cur.add(items[i]);
    decide(items, i + 1, cur, out);               // include
    cur.remove(cur.size() - 1);
}`,
    python: `def power_set(items: list) -> list[list]:
    out = []
    def decide(i, current):
        if i == len(items):
            out.append(current[:])
            return
        decide(i + 1, current)          # exclude items[i]
        current.append(items[i])
        decide(i + 1, current)          # include items[i]
        current.pop()
    decide(0, [])
    return out`,
    javascript: `function powerSet(items) {
  const out = [];
  const current = [];
  function decide(i) {
    if (i === items.length) { out.push([...current]); return; }
    decide(i + 1);                      // exclude items[i]
    current.push(items[i]);
    decide(i + 1);                      // include items[i]
    current.pop();
  }
  decide(0);
  return out;
}`,
    typescript: `function powerSet<T>(items: T[]): T[][] {
  const out: T[][] = [];
  const current: T[] = [];
  function decide(i: number): void {
    if (i === items.length) { out.push([...current]); return; }
    decide(i + 1);                      // exclude items[i]
    current.push(items[i]);
    decide(i + 1);                      // include items[i]
    current.pop();
  }
  decide(0);
  return out;
}`,
    csharp: `static void Decide(int[] items, int i, List<int> cur, List<List<int>> outp) {
    if (i == items.Length) { outp.Add(new List<int>(cur)); return; }
    Decide(items, i + 1, cur, outp);              // exclude
    cur.Add(items[i]);
    Decide(items, i + 1, cur, outp);               // include
    cur.RemoveAt(cur.Count - 1);
}`,
    go: `func decide(items []int, i int, cur []int, out *[][]int) {
	if i == len(items) {
		cp := append([]int{}, cur...)
		*out = append(*out, cp)
		return
	}
	decide(items, i+1, cur, out) // exclude
	cur = append(cur, items[i])
	decide(items, i+1, cur, out) // include
}`,
    rust: `fn decide(items: &[i32], i: usize, current: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    if i == items.len() {
        out.push(current.clone());
        return;
    }
    decide(items, i + 1, current, out);      // exclude
    current.push(items[i]);
    decide(items, i + 1, current, out);      // include
    current.pop();
}`,
    kotlin: `fun decide(items: List<Int>, i: Int, current: MutableList<Int>, out: MutableList<List<Int>>) {
    if (i == items.size) { out.add(current.toList()); return }
    decide(items, i + 1, current, out)               // exclude
    current.add(items[i])
    decide(items, i + 1, current, out)               // include
    current.removeAt(current.size - 1)
}`,
    swift: `func decide(_ items: [Int], _ i: Int, _ current: inout [Int], _ out: inout [[Int]]) {
    if i == items.count { out.append(current); return }
    decide(items, i + 1, &current, &out)             // exclude
    current.append(items[i])
    decide(items, i + 1, &current, &out)             // include
    current.removeLast()
}`,
  },
  content: {
    overview: `The power set of a set with n elements contains all 2ⁿ possible subsets, including the empty set and the full set itself. The cleanest way to generate them is a per-element binary decision: for each element in turn, recursively explore the branch where it's excluded and the branch where it's included. After n such decisions, every leaf of the recursion tree corresponds to one unique subset — exactly the 2ⁿ combinations of "in" or "out" for each element.

This "include/exclude" recursion pattern is one of the most important templates in algorithm design: the same skeleton (branch on a binary choice per item, recurse, undo) underlies the 0/1 knapsack, subset-sum, and many other combinatorial search problems — power set is simply the version with no pruning, since every branch is always explored.`,
    howItWorks: [
      "Recurse on index i with the current partial subset: decide(i, current).",
      "Base case: when i reaches n (all elements decided), record a copy of current as one complete subset.",
      "Recursive case: first recurse into decide(i+1, current) without adding items[i] — the 'exclude' branch.",
      "Then push items[i] onto current, recurse into decide(i+1, current) — the 'include' branch — and pop it back off afterward (backtrack).",
      "Every root-to-leaf path makes exactly n include/exclude decisions, producing all 2ⁿ subsets.",
    ],
    complexity: {
      time: { best: "O(2ⁿ)", average: "O(2ⁿ)", worst: "O(2ⁿ)" },
      space: "O(n) recursion depth, O(2ⁿ·n) to store all output subsets",
      notes: "There are provably 2ⁿ subsets, so any algorithm producing all of them is Θ(2ⁿ) at minimum; this recursion matches that bound exactly with no wasted work.",
    },
    applications: [
      "Enumerating candidate solutions in 0/1 knapsack, subset-sum, and partition problems",
      "Feature subset selection in machine learning (trying all feature combinations for small n)",
      "Generating all possible team/group combinations from a small pool",
      "Testing all boolean configuration combinations in software (feature flags)",
    ],
    advantages: [
      "Simple, symmetric recursive structure — easy to prove correct and to adapt",
      "Directly matches the 2ⁿ subset count with no wasted recursive calls",
      "The include/exclude template generalizes immediately to pruned/constrained variants (subset-sum, knapsack)",
    ],
    disadvantages: [
      "Exponential — only practical for small n (roughly n ≤ 20-25 before 2ⁿ becomes too large)",
      "No pruning: generates every subset even if only some satisfy a target property",
      "Storing all 2ⁿ subsets can use significant memory for even moderate n",
    ],
    commonMistakes: [
      "Forgetting to pop/backtrack after the include branch, corrupting later branches' current subset.",
      "Pushing a copy vs. a reference to current when recording output (later mutations then corrupt already-recorded subsets).",
      "Confusing this with permutations — power set order within a subset doesn't matter, permutations do.",
      "Assuming an iterative bitmask approach (looping 0..2ⁿ−1) is fundamentally different — it's the same include/exclude decisions, just encoded as bits instead of recursion.",
    ],
    interviewQuestions: [
      "Why does the power set have exactly 2ⁿ elements?",
      "Walk through the include/exclude recursion template and how it generalizes to subset-sum.",
      "How would you generate the power set iteratively using bitmasks 0 to 2ⁿ−1?",
      "How does this recursion's time complexity compare to generating permutations (n! vs 2ⁿ)?",
      "How would you modify this to only output subsets that sum to a target value?",
    ],
    summary:
      "Power set generation recurses over each element, branching into 'exclude' and 'include' at every position, so every root-to-leaf path is a unique combination of in/out decisions — exactly the 2ⁿ subsets. It runs in the optimal Θ(2ⁿ) time for producing all subsets, and its include/exclude skeleton is the direct ancestor of subset-sum and 0/1 knapsack recursions.",
    quiz: [
      { question: "A set with n elements has how many subsets?", options: ["n", "n!", "2ⁿ", "n²"], answer: 2, explanation: "Each element is independently either in or out of a subset — 2 choices per element, n elements." },
      { question: "The recursion's two branches at each element represent…", options: ["Left and right child of a BST", "Exclude and include that element", "Sorted and unsorted", "Base case and recursive case only"], answer: 1, explanation: "Every element gets a binary in/out decision, generating both branches at each recursive level." },
      { question: "After the include branch, the code must…", options: ["Do nothing else", "Pop the just-added element off current (backtrack)", "Sort current", "Clear the whole output list"], answer: 1, explanation: "Without popping, the excluded-branch calls at the same level would see a corrupted current subset." },
      { question: "Power set generation and permutation generation both run in…", options: ["The same O(2ⁿ) time", "Different classes: O(2ⁿ) vs O(n!)", "O(n log n) each", "O(n) each"], answer: 1, explanation: "There are 2ⁿ subsets but n! permutations — very different growth rates for even modest n." },
      { question: "The include/exclude recursion template is the direct ancestor of…", options: ["Binary search", "Subset-sum and 0/1 knapsack recursions", "Merge sort", "Dijkstra's algorithm"], answer: 1, explanation: "Those problems add pruning (skip branches that can't reach the target) to this same per-element in/out skeleton." },
    ],
  },
  contentAr: {
    overview: `مجموعة القوى لمجموعة ذات n عنصر تحتوي كل المجموعات الجزئية الممكنة البالغ عددها 2ⁿ، بما فيها المجموعة الخالية والمجموعة الكاملة نفسها. أنظف طريقة لتوليدها هي قرار ثنائي لكل عنصر: لكل عنصر بالتتابع، استكشف عوديًا الفرع الذي يُستبعد فيه والفرع الذي يُدرَج فيه. بعد n قرارًا من هذا النوع، تقابل كل ورقة في شجرة العودية مجموعة جزئية فريدة واحدة — وبالضبط 2ⁿ توليفة من "داخل" أو "خارج" لكل عنصر.

نمط العودية "إدراج/استبعاد" هذا هو أحد أهم القوالب في تصميم الخوارزميات: نفس الهيكل (التفرع على قرار ثنائي لكل عنصر، العودية، ثم التراجع) يقوم عليه حقيبة الظهر 0/1 ومجموع المجموعة الجزئية والكثير من مسائل البحث التوافيقي الأخرى — مجموعة القوى هي ببساطة النسخة بلا تقليم، إذ يُستكشف كل فرع دائمًا.`,
    howItWorks: [
      "اعمل عودية على الفهرس i مع المجموعة الجزئية الحالية: decide(i, current).",
      "الحالة الأساسية: عندما يصل i إلى n (تقرر مصير كل العناصر)، سجّل نسخة من current كمجموعة جزئية كاملة واحدة.",
      "الحالة العودية: اعمل عودية أولًا على decide(i+1, current) دون إضافة items[i] — فرع 'الاستبعاد'.",
      "ثم ادفع items[i] إلى current، واعمل عودية على decide(i+1, current) — فرع 'الإدراج' — ثم أخرجه مرة أخرى بعد ذلك (تراجع).",
      "كل مسار من الجذر إلى الورقة يتخذ بالضبط n قرار إدراج/استبعاد، فيولّد كل المجموعات الجزئية الـ 2ⁿ.",
    ],
    complexity: {
      time: { best: "O(2ⁿ)", average: "O(2ⁿ)", worst: "O(2ⁿ)" },
      space: "O(n) recursion depth, O(2ⁿ·n) to store all output subsets",
      notes: "يوجد إثبات بأن عدد المجموعات الجزئية هو 2ⁿ، فأي خوارزمية تولّدها جميعًا هي Θ(2ⁿ) على الأقل؛ وهذه العودية تحقق هذا الحد بالضبط دون أي عمل مهدور.",
    },
    applications: [
      "تعداد الحلول المرشحة في حقيبة الظهر 0/1 ومجموع المجموعة الجزئية ومسائل التقسيم",
      "اختيار مجموعة السمات في تعلم الآلة (تجربة كل توليفات السمات عند n صغيرة)",
      "توليد كل توليفات الفرق/المجموعات الممكنة من مجموعة صغيرة",
      "اختبار كل توليفات الإعدادات المنطقية في البرمجيات (أعلام الميزات)",
    ],
    advantages: [
      "بنية عودية بسيطة ومتماثلة — سهلة الإثبات والتكييف",
      "تطابق مباشر مع عدد المجموعات الجزئية 2ⁿ دون أي استدعاءات عودية مهدورة",
      "قالب الإدراج/الاستبعاد يعمم فورًا على أشكال مقلَّمة/مقيَّدة (مجموع المجموعة الجزئية، حقيبة الظهر)",
    ],
    disadvantages: [
      "أسي — عملي فقط عند n صغيرة (تقريبًا n ≤ 20-25 قبل أن يصبح 2ⁿ كبيرًا جدًا)",
      "بلا تقليم: يولّد كل مجموعة جزئية حتى لو كان بعضها فقط يحقق خاصية مستهدفة",
      "تخزين كل المجموعات الجزئية الـ 2ⁿ قد يستهلك ذاكرة كبيرة حتى عند n متوسطة",
    ],
    commonMistakes: [
      "نسيان الإخراج/التراجع بعد فرع الإدراج، مما يُفسد المجموعة الجزئية الحالية للفروع اللاحقة.",
      "دفع نسخة بدلًا من مرجع من current عند تسجيل الناتج (التعديلات اللاحقة تُفسد حينها المجموعات الجزئية المسجَّلة سابقًا).",
      "الخلط بين هذا وبين التباديل — ترتيب مجموعة القوى داخل المجموعة الجزئية لا يهم، بخلاف التباديل.",
      "افتراض أن نهج القناع الثنائي (bitmask) التكراري (التكرار من 0 إلى 2ⁿ−1) مختلف جوهريًا — إنه نفس قرارات الإدراج/الاستبعاد، لكن مُرمَّزة كبتات بدل العودية.",
    ],
    interviewQuestions: [
      "لماذا يحتوي مجموعة القوى بالضبط على 2ⁿ عنصر؟",
      "اشرح قالب عودية الإدراج/الاستبعاد وكيف يُعمَّم على مجموع المجموعة الجزئية.",
      "كيف تولّد مجموعة القوى تكراريًا باستخدام أقنعة ثنائية من 0 إلى 2ⁿ−1؟",
      "كيف يقارَن التعقيد الزمني لهذه العودية بتوليد التباديل (n! مقابل 2ⁿ)؟",
      "كيف تعدّل هذا لإخراج فقط المجموعات الجزئية التي مجموعها يساوي قيمة مستهدفة؟",
    ],
    summary:
      "توليد مجموعة القوى يعمل عودية على كل عنصر، متفرعًا بين 'الاستبعاد' و'الإدراج' عند كل موضع، بحيث يكون كل مسار من الجذر إلى الورقة توليفة فريدة من قرارات داخل/خارج — بالضبط 2ⁿ مجموعة جزئية. يعمل في الزمن الأمثل Θ(2ⁿ) لتوليد كل المجموعات الجزئية، وهيكله إدراج/استبعاد هو السلف المباشر لعوديتي مجموع المجموعة الجزئية وحقيبة الظهر 0/1.",
    quiz: [
      { question: "مجموعة ذات n عنصر تحتوي على كم مجموعة جزئية؟", options: ["n", "n!", "2ⁿ", "n²"], answer: 2, explanation: "كل عنصر إما داخل المجموعة الجزئية أو خارجها باستقلالية — خياران لكل عنصر، وعدد العناصر n." },
      { question: "الفرعان في العودية عند كل عنصر يمثلان…", options: ["الابن الأيسر والأيمن في شجرة بحث ثنائية", "استبعاد العنصر وإدراجه", "المرتَّب وغير المرتَّب", "الحالة الأساسية والحالة العودية فقط"], answer: 1, explanation: "كل عنصر يأخذ قرار داخل/خارج ثنائيًا، فيولّد الفرعين عند كل مستوى عودي." },
      { question: "بعد فرع الإدراج، يجب على الكود أن…", options: ["لا يفعل شيئًا آخر", "يُخرج العنصر المُضاف للتو من current (تراجع)", "يرتّب current", "يمسح قائمة الناتج بأكملها"], answer: 1, explanation: "دون الإخراج، ستَرى استدعاءات فرع الاستبعاد عند نفس المستوى مجموعة جزئية حالية فاسدة." },
      { question: "توليد مجموعة القوى وتوليد التباديل كلاهما يعمل في…", options: ["نفس الزمن O(2ⁿ)", "فئتين مختلفتين: O(2ⁿ) مقابل O(n!)", "O(n log n) لكل منهما", "O(n) لكل منهما"], answer: 1, explanation: "توجد 2ⁿ مجموعة جزئية لكن n! تبديلة — معدلا نمو مختلفان جدًا حتى عند n متوسطة." },
      { question: "قالب عودية الإدراج/الاستبعاد هو السلف المباشر لـ…", options: ["البحث الثنائي", "عوديتي مجموع المجموعة الجزئية وحقيبة الظهر 0/1", "الترتيب بالدمج", "خوارزمية دايكسترا"], answer: 1, explanation: "تلك المسائل تضيف تقليمًا (تخطي الفروع التي لا يمكنها بلوغ الهدف) إلى نفس هيكل الداخل/الخارج لكل عنصر." },
    ],
  },
  inputFields: [{ key: "items", label: "Elements (distinct)", placeholder: "A, B, C", help: "2–10 distinct symbols or numbers (2^n subsets — 10 elements = 1024 subsets).", list: true }],
  defaultInput: (level) => {
    const pools: (string | number)[][] = [
      ["A", "B"],
      ["A", "B", "C"],
      ["A", "B", "C", "D"],
      [1, 2, 3, 4],
      ["A", "B", "C", "D", "E"],
    ];
    return { items: pools[Math.min(level, 5) - 1] ?? pools[1] };
  },
  parseInput: (fields) => {
    const raw = (fields.items ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (raw.length < 2 || raw.length > 10) throw new Error("Enter 2 to 10 distinct elements.");
    if (new Set(raw).size !== raw.length) throw new Error("Elements must be distinct.");
    const items = raw.map((s) => (/^-?\d+$/.test(s) ? Number(s) : s));
    return { items };
  },
  serializeInput: (input) => ({ items: input.items.join(", ") }),
  generate,
};

export default mod;
