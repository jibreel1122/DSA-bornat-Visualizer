import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { items: (string | number)[]; k: number };

function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

function generate(input: Input): Step<CallStackFrame>[] {
  const { items, k } = input;
  const n = items.length;
  const current: (string | number)[] = [];
  const output: string[] = [];
  const stack: CallStackItem[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let pid = 0;
  let calls = 0;
  let truncated = false;

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
        aux: [{ label: "current", values: current.length ? current.map((x) => x) : ["(empty)"] }],
        note: `C(${n}, ${k}) — choose ${k} of [${items.join(", ")}] with start-index pruning to avoid duplicates.`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { calls, combinations: output.length },
    });
  };

  snap(undefined, `Generate all C(${n}, ${k}) = ${nCk(n, k)} combinations of [${items.join(", ")}] taken ${k} at a time — order doesn't matter, so we only ever move the start index forward.`, 0, `ولّد جميع توافيق [${items.join(", ")}] البالغة C(${n}, ${k}) = ${nCk(n, k)}، مأخوذة ${k} في المرة — الترتيب لا يهم، لذا نحرّك فهرس البداية إلى الأمام فقط.`);

  const recurse = (start: number): void => {
    if (truncated) return;
    calls++;
    if (current.length === k) {
      output.push(`{${current.join(", ")}}`);
      snap("found", `${k} elements chosen → record combination {${current.join(", ")}}.`, 1, `اختير ${k} من العناصر ← سجّل التوفيقة {${current.join(", ")}}.`);
      return;
    }
    if (n - start < k - current.length) {
      snap("discarded", `Only ${n - start} elements remain but ${k - current.length} more are needed — prune this branch.`, 2, `تبقّى ${n - start} عنصرًا فقط لكن يلزم ${k - current.length} إضافية — قلّم هذا الفرع.`);
      return;
    }
    for (let i = start; i < n; i++) {
      if (truncated) return;
      current.push(items[i]);
      const id = `c${pid++}`;
      stack.push({ id, label: `choose ${items[i]}`, detail: `{${current.join(", ")}}`, state: "active" });
      snap("active", `Choose items[${i}] = ${items[i]} → current = {${current.join(", ")}}.`, 3, `اختر items[${i}] = ${items[i]} ← الحالي = {${current.join(", ")}}.`);
      recurse(i + 1);
      current.pop();
      stack.pop();
      snap("swap", `Backtrack: remove ${items[i]}, try the next candidate after index ${i}.`, 4, `تراجع: أزل ${items[i]}، وجرّب المرشّح التالي بعد الفهرس ${i}.`);
    }
  };

  recurse(0);
  stack.length = 0;
  snap(undefined, `Done. All ${output.length} combinations: ${output.join(", ")}.`, 5, `انتهى. جميع التوافيق الـ ${output.length}: ${output.join(", ")}.`);
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "combinations",
  title: "Combinations (C(n,k) by Backtracking)",
  titleAr: "التوافيق (C(n,k) بالتراجع)",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "combinatorics", "pruning", "C(n,k)"],
  tagsAr: ["التراجع", "التوافيق", "التقليم", "C(n,k)"],
  summary: "Generates every k-element subset of n items using a start-index that only moves forward, so each combination is produced exactly once.",
  summaryAr: "يولّد كل مجموعة جزئية من k عنصرًا من n عنصرًا باستخدام فهرس بداية يتحرك إلى الأمام فقط، فتُنتَج كل توفيقة مرة واحدة بالضبط.",
  renderer: "callstack",
  pseudocode: [
    "procedure combine(start, current)",
    "  call combine(start)",
    "  if |current| == k: record current; return       // base case",
    "  if remaining items < needed: return              // prune",
    "  for i = start .. n-1:",
    "    current.push(items[i]); combine(i+1)",
    "    current.pop()                                  // backtrack",
  ],
  code: {
    pseudocode: `procedure combine(start, current):
  if len(current) == k: output.append(copy of current); return
  if n - start < k - len(current): return   // prune: not enough left
  for i = start to n-1:
    current.push(items[i])
    combine(i + 1, current)
    current.pop()`,
    c: `void combine(int* items, int n, int k, int start, int* cur, int depth) {
    if (depth == k) { printSet(cur, depth); return; }
    if (n - start < k - depth) return;
    for (int i = start; i < n; i++) {
        cur[depth] = items[i];
        combine(items, n, k, i + 1, cur, depth + 1);
    }
}`,
    cpp: `void combine(const vector<int>& items, int k, int start, vector<int>& cur, vector<vector<int>>& out) {
    if ((int)cur.size() == k) { out.push_back(cur); return; }
    int n = items.size();
    if (n - start < k - (int)cur.size()) return;
    for (int i = start; i < n; i++) {
        cur.push_back(items[i]);
        combine(items, k, i + 1, cur, out);
        cur.pop_back();
    }
}`,
    java: `static void combine(int[] items, int k, int start, List<Integer> cur, List<List<Integer>> out) {
    if (cur.size() == k) { out.add(new ArrayList<>(cur)); return; }
    int n = items.length;
    if (n - start < k - cur.size()) return;
    for (int i = start; i < n; i++) {
        cur.add(items[i]);
        combine(items, k, i + 1, cur, out);
        cur.remove(cur.size() - 1);
    }
}`,
    python: `def combinations(items: list, k: int) -> list[list]:
    out = []
    n = len(items)
    def combine(start, current):
        if len(current) == k:
            out.append(current[:])
            return
        if n - start < k - len(current):
            return
        for i in range(start, n):
            current.append(items[i])
            combine(i + 1, current)
            current.pop()
    combine(0, [])
    return out`,
    javascript: `function combinations(items, k) {
  const out = [];
  const n = items.length;
  const current = [];
  function combine(start) {
    if (current.length === k) { out.push([...current]); return; }
    if (n - start < k - current.length) return;
    for (let i = start; i < n; i++) {
      current.push(items[i]);
      combine(i + 1);
      current.pop();
    }
  }
  combine(0);
  return out;
}`,
    typescript: `function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const n = items.length;
  const current: T[] = [];
  function combine(start: number): void {
    if (current.length === k) { out.push([...current]); return; }
    if (n - start < k - current.length) return;
    for (let i = start; i < n; i++) {
      current.push(items[i]);
      combine(i + 1);
      current.pop();
    }
  }
  combine(0);
  return out;
}`,
    csharp: `static void Combine(int[] items, int k, int start, List<int> cur, List<List<int>> outp) {
    if (cur.Count == k) { outp.Add(new List<int>(cur)); return; }
    int n = items.Length;
    if (n - start < k - cur.Count) return;
    for (int i = start; i < n; i++) {
        cur.Add(items[i]);
        Combine(items, k, i + 1, cur, outp);
        cur.RemoveAt(cur.Count - 1);
    }
}`,
    go: `func combine(items []int, k, start int, cur []int, out *[][]int) {
	if len(cur) == k {
		cp := append([]int{}, cur...)
		*out = append(*out, cp)
		return
	}
	n := len(items)
	if n-start < k-len(cur) {
		return
	}
	for i := start; i < n; i++ {
		combine(items, k, i+1, append(cur, items[i]), out)
	}
}`,
    rust: `fn combine(items: &[i32], k: usize, start: usize, current: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    if current.len() == k {
        out.push(current.clone());
        return;
    }
    let n = items.len();
    if n - start < k - current.len() {
        return;
    }
    for i in start..n {
        current.push(items[i]);
        combine(items, k, i + 1, current, out);
        current.pop();
    }
}`,
    kotlin: `fun combine(items: List<Int>, k: Int, start: Int, current: MutableList<Int>, out: MutableList<List<Int>>) {
    if (current.size == k) { out.add(current.toList()); return }
    val n = items.size
    if (n - start < k - current.size) return
    for (i in start until n) {
        current.add(items[i])
        combine(items, k, i + 1, current, out)
        current.removeAt(current.size - 1)
    }
}`,
    swift: `func combine(_ items: [Int], _ k: Int, _ start: Int, _ current: inout [Int], _ out: inout [[Int]]) {
    if current.count == k { out.append(current); return }
    let n = items.count
    if n - start < k - current.count { return }
    for i in start..<n {
        current.append(items[i])
        combine(items, k, i + 1, &current, &out)
        current.removeLast()
    }
}`,
  },
  content: {
    overview: `Generating all k-element combinations of n items is superficially similar to permutations, but with one crucial difference: order doesn't matter, so {A, B} and {B, A} are the same combination and must only be produced once. The clean way to enforce that is a start index that only ever moves forward — at each recursive call, only consider elements at or after the previous choice, so every combination is built with its elements in a single canonical (increasing-index) order.

This also enables a natural pruning rule: if the number of remaining candidates (n − start) is smaller than the number of elements still needed (k − |current|), that branch can never reach a valid combination, so it's cut immediately rather than explored to a dead end. The result is a clean backtracking search that visits exactly the C(n, k) valid combinations, plus a bounded number of pruned dead branches.`,
    howItWorks: [
      "Recurse with a start index and a partially built current combination.",
      "Base case: when current has k elements, record a copy of it as one complete combination.",
      "Pruning: if fewer than k − |current| candidates remain (n − start too small), abandon this branch immediately.",
      "Otherwise, for each index i from start to n−1: add items[i] to current, recurse with start = i + 1 (never revisiting earlier indices), then remove items[i] (backtrack) before trying the next i.",
      "Because the start index only advances, no combination is ever generated in more than one relative order — each of the C(n, k) results appears exactly once.",
    ],
    complexity: {
      time: { best: "O(C(n,k))", average: "O(C(n,k) · k)", worst: "O(C(n,k) · k)" },
      space: "O(k)",
      notes: "There are exactly C(n, k) = n!/(k!(n−k)!) combinations; each takes O(k) to copy into the output, giving O(C(n,k)·k) total work. The pruning rule discards dead branches without full exploration, keeping the search close to output-sensitive.",
    },
    applications: [
      "Choosing committees, teams, or lottery number sets",
      "Feature/subset selection when only combinations of a fixed size matter",
      "Enumerating candidate solutions in combinatorial optimization (before scoring/filtering)",
      "Generating test cases that cover all k-way parameter combinations",
    ],
    advantages: [
      "The start-index trick avoids ever generating a duplicate combination — no post-hoc deduplication needed",
      "Simple pruning rule cuts hopeless branches early",
      "Directly generalizes to combinations with repetition or constrained variants",
    ],
    disadvantages: [
      "C(n, k) can be enormous (peaks at k = n/2), making the full enumeration infeasible for large n",
      "Storing all combinations uses O(C(n,k) · k) memory if not processed lazily",
      "Choosing k close to n/2 maximizes both the count and the work — no way around the combinatorial explosion",
    ],
    commonMistakes: [
      "Recursing with start = 0 instead of i + 1 — this regenerates permutations of the same combination instead of unique combinations.",
      "Forgetting the prune check, wasting time exploring branches that can never reach size k.",
      "Off-by-one in the prune condition (n − start < k − |current|) — get this backwards and correct branches get cut.",
      "Confusing combinations (order doesn't matter) with permutations (order matters) when deciding which recursion template to use.",
    ],
    interviewQuestions: [
      "Why does using a start index (rather than a used[] array) prevent duplicate combinations?",
      "Derive the pruning condition and explain why it's safe to cut those branches.",
      "How would this change to generate combinations with repetition allowed?",
      "Compare the recursion structure here to the permutations algorithm — what's different and why?",
      "How many total recursive calls does this make in terms of n and k?",
    ],
    summary:
      "Combinations are generated by recursing with a forward-only start index — each call only considers items at or after the last chosen one — so every C(n, k) combination is produced exactly once with no duplicates. A simple 'not enough elements remain' pruning rule cuts dead branches early, keeping the search efficient relative to the output size.",
    quiz: [
      { question: "Why does the recursion pass i + 1 (not 0) as the next start index?", options: ["To make it faster", "So each combination is only generated once, in increasing-index order", "It's required for the base case", "To handle duplicates in input"], answer: 1, explanation: "Restricting future choices to indices after the current one prevents {A,B} and {B,A} from both being generated." },
      { question: "The pruning condition checks whether…", options: ["current is empty", "n − start < k − |current| (not enough elements remain)", "k equals n", "items are sorted"], answer: 1, explanation: "If fewer candidates remain than slots still needed, this branch can never produce a valid combination." },
      { question: "How many combinations does C(n, k) backtracking ultimately produce?", options: ["n!", "2ⁿ", "C(n, k) = n! / (k!(n−k)!)", "n·k"], answer: 2, explanation: "That's the exact count of k-element subsets of an n-element set, with no duplicates and no omissions." },
      { question: "Combinations differ from permutations in that…", options: ["Combinations use more memory always", "Order doesn't matter for combinations, but does for permutations", "Combinations don't use recursion", "There's no difference"], answer: 1, explanation: "{A,B} and {B,A} are the same combination but two different permutations." },
      { question: "What must happen after the recursive call inside the for-loop?", options: ["Nothing", "Pop the just-added element off current (backtrack)", "Sort current", "Return immediately"], answer: 1, explanation: "Without popping, the next iteration's current would incorrectly include the previous element too." },
    ],
  },
  contentAr: {
    overview: `توليد جميع التوافيق المكوَّنة من k عنصرًا من n عنصرًا يشبه ظاهريًّا التباديل، لكن باختلاف حاسم واحد: الترتيب لا يهم، فـ {A, B} و{B, A} توفيقة واحدة يجب أن تُنتَج مرة واحدة فقط. الطريقة النظيفة لفرض ذلك هي فهرس بداية لا يتحرك إلا إلى الأمام — عند كل استدعاء عودي، لا يُنظَر إلا إلى العناصر عند الاختيار السابق أو بعده، فتُبنى كل توفيقة بعناصرها في ترتيب قانوني وحيد (بفهرس متزايد).

يتيح ذلك أيضًا قاعدة تقليم طبيعية: إذا كان عدد المرشّحين المتبقين (n − start) أصغر من عدد العناصر التي ما زالت مطلوبة (k − |current|)، فلا يمكن لذلك الفرع أبدًا بلوغ توفيقة صالحة، فيُقطَع فورًا بدلًا من استكشافه إلى طريق مسدود. النتيجة بحث تراجع نظيف يزور بالضبط توافيق C(n, k) الصالحة، زائد عدد محدود من الفروع المسدودة المقلَّمة.`,
    howItWorks: [
      "استدعِ العودية بفهرس بداية وتوفيقة حالية مبنية جزئيًّا.",
      "حالة الأساس: حين تحوي الحالية k عنصرًا، سجّل نسخة منها كتوفيقة كاملة واحدة.",
      "التقليم: إذا تبقّى أقل من k − |current| مرشّحًا (n − start صغير جدًّا)، فتخلَّ عن هذا الفرع فورًا.",
      "وإلا، لكل فهرس i من start إلى n−1: أضِف items[i] إلى الحالية، استدعِ العودية بـ start = i + 1 (دون إعادة زيارة فهارس سابقة)، ثم أزل items[i] (تراجع) قبل تجريب الـ i التالية.",
      "لأن فهرس البداية لا يتقدّم إلا للأمام، لا تُولَّد أي توفيقة بأكثر من ترتيب نسبي واحد — تظهر كل نتيجة من C(n, k) مرة واحدة بالضبط.",
    ],
    complexity: {
      time: { best: "O(C(n,k))", average: "O(C(n,k) · k)", worst: "O(C(n,k) · k)" },
      space: "O(k)",
      notes: "هناك بالضبط C(n, k) = n!/(k!(n−k)!) توفيقة؛ كلٌّ يكلّف O(k) لنسخها إلى الخرج، مما يعطي O(C(n,k)·k) إجمالًا. قاعدة التقليم تتخلّص من الفروع المسدودة دون استكشاف كامل، فتُبقي البحث قريبًا من الحساسية للخرج.",
    },
    applications: [
      "اختيار اللجان أو الفرق أو مجموعات أرقام اليانصيب",
      "انتقاء السمات/المجموعات الجزئية حين تهمّ التوافيق ذات الحجم الثابت فقط",
      "تعداد الحلول المرشَّحة في التحسين التوافيقي (قبل التقييم/التصفية)",
      "توليد حالات اختبار تغطّي كل توافيق المعاملات k-اتجاهية",
    ],
    advantages: [
      "حيلة فهرس البداية تتجنّب توليد أي توفيقة مكرَّرة — لا حاجة لإزالة تكرار لاحقة",
      "قاعدة تقليم بسيطة تقطع الفروع اليائسة مبكرًا",
      "يتعمم مباشرةً إلى التوافيق مع التكرار أو المتغيّرات المقيَّدة",
    ],
    disadvantages: [
      "C(n, k) قد تكون هائلة (تبلغ ذروتها عند k = n/2)، مما يجعل التعداد الكامل غير عملي لقيم n كبيرة",
      "تخزين كل التوافيق يستخدم ذاكرة O(C(n,k) · k) إن لم تُعالَج كسولًا",
      "اختيار k قريبًا من n/2 يُعظِّم كلًّا من العدد والعمل — لا مفرّ من الانفجار التوافيقي",
    ],
    commonMistakes: [
      "الاستدعاء العودي بـ start = 0 بدلًا من i + 1 — هذا يعيد توليد تباديل التوفيقة نفسها بدلًا من توافيق فريدة.",
      "نسيان فحص التقليم، فيُهدر الوقت في استكشاف فروع لا يمكنها بلوغ الحجم k.",
      "خطأ انزياح بمقدار واحد في شرط التقليم (n − start < k − |current|) — اعكِسه فتُقطَع فروع صحيحة.",
      "الخلط بين التوافيق (الترتيب لا يهم) والتباديل (الترتيب يهم) عند اختيار قالب العودية.",
    ],
    interviewQuestions: [
      "لماذا يمنع استخدام فهرس بداية (بدلًا من مصفوفة used[]) التوافيق المكرَّرة؟",
      "اشتقّ شرط التقليم واشرح لماذا يكون قطع تلك الفروع آمنًا.",
      "كيف يتغيّر هذا لتوليد توافيق مع السماح بالتكرار؟",
      "قارن بنية العودية هنا بخوارزمية التباديل — ما الاختلاف ولماذا؟",
      "كم استدعاءً عوديًّا كليًّا يُجري هذا بدلالة n وk؟",
    ],
    summary:
      "تُولَّد التوافيق بالاستدعاء العودي بفهرس بداية يتقدّم للأمام فقط — كل استدعاء لا ينظر إلا إلى العناصر عند آخر اختيار أو بعده — فتُنتَج كل توفيقة من C(n, k) مرة واحدة بالضبط دون تكرار. وقاعدة تقليم بسيطة «لم يتبقّ ما يكفي من العناصر» تقطع الفروع المسدودة مبكرًا، فتُبقي البحث كفؤًا نسبةً إلى حجم الخرج.",
    quiz: [
      { question: "لماذا تمرّر العودية i + 1 (لا 0) كفهرس البداية التالي؟", options: ["لجعلها أسرع", "كي تُولَّد كل توفيقة مرة واحدة فقط، بترتيب فهرس متزايد", "إنه مطلوب لحالة الأساس", "لمعالجة التكرارات في المدخلات"], answer: 1, explanation: "حصر الاختيارات المستقبلية بالفهارس بعد الحالي يمنع توليد {A,B} و{B,A} معًا." },
      { question: "يفحص شرط التقليم ما إذا كان…", options: ["الحالي فارغًا", "n − start < k − |current| (لم يتبقّ ما يكفي من العناصر)", "k يساوي n", "العناصر مرتبة"], answer: 1, explanation: "إذا تبقّى مرشّحون أقل من الخانات المطلوبة، فلا يمكن لهذا الفرع إنتاج توفيقة صالحة." },
      { question: "كم توفيقة يُنتِج تراجع C(n, k) في النهاية؟", options: ["n!", "2ⁿ", "C(n, k) = n! / (k!(n−k)!)", "n·k"], answer: 2, explanation: "هذا هو العدد الدقيق للمجموعات الجزئية من k عنصرًا لمجموعة من n عنصرًا، دون تكرار أو إغفال." },
      { question: "تختلف التوافيق عن التباديل في أن…", options: ["التوافيق تستخدم ذاكرة أكثر دائمًا", "الترتيب لا يهم للتوافيق، لكنه يهم للتباديل", "التوافيق لا تستخدم العودية", "لا فرق"], answer: 1, explanation: "{A,B} و{B,A} توفيقة واحدة لكن تبديلان مختلفان." },
      { question: "ماذا يجب أن يحدث بعد الاستدعاء العودي داخل حلقة for؟", options: ["لا شيء", "أخرِج العنصر المُضاف للتوّ من الحالي (تراجع)", "رتّب الحالي", "ارجع فورًا"], answer: 1, explanation: "دون الإخراج، سيتضمّن الحالي في التكرار التالي العنصر السابق أيضًا بشكل خاطئ." },
    ],
  },
  inputFields: [
    { key: "items", label: "Elements (distinct)", placeholder: "A, B, C, D", help: "3–10 distinct symbols or numbers.", list: true },
    { key: "k", label: "Choose k", placeholder: "2", help: "1 to the number of elements." },
  ],
  defaultInput: (level, rng) => {
    const pools: (string | number)[][] = [
      ["A", "B", "C"],
      ["A", "B", "C", "D"],
      [1, 2, 3, 4, 5],
      ["A", "B", "C", "D", "E"],
      ["A", "B", "C", "D", "E", "F"],
    ];
    const items = pools[Math.min(level, 5) - 1] ?? pools[1];
    const k = rng.int(2, Math.max(2, items.length - 1));
    return { items, k };
  },
  parseInput: (fields) => {
    const raw = (fields.items ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (raw.length < 3 || raw.length > 10) throw new Error("Enter 3 to 10 distinct elements.");
    if (new Set(raw).size !== raw.length) throw new Error("Elements must be distinct.");
    const items = raw.map((s) => (/^-?\d+$/.test(s) ? Number(s) : s));
    const k = Number((fields.k ?? "").trim());
    if (!Number.isInteger(k) || k < 1 || k > items.length) throw new Error(`k must be an integer between 1 and ${items.length}.`);
    return { items, k };
  },
  serializeInput: (input) => ({ items: input.items.join(", "), k: String(input.k) }),
  generate,
};

export default mod;
