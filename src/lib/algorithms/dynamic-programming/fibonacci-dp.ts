import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { n: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const n = Math.max(1, Math.min(75, input.n));
  const steps: Step<CallStackFrame>[] = [];
  const memo: (number | null)[] = new Array(n + 1).fill(null);
  const stack: CallStackItem[] = [];
  let calls = 0;
  let hits = 0;
  let uid = 0;

  const memoRow = () => ({
    label: "memo",
    values: memo.map((v, i) => `${i}:${v ?? "·"}`),
  });

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"], descriptionAr?: string) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({ frame: { stack: shown, aux: [memoRow()] }, description, descriptionAr, codeLine, counters: { calls, memoHits: hits } });
  };

  snap(`Memoized Fibonacci: fib(n) = fib(n-1) + fib(n-2), caching each result.`, 0, undefined, `فيبوناتشي بالتخزين المؤقت: fib(n) = fib(n-1) + fib(n-2)‎، مع خزن كل نتيجة.`);

  const fib = (k: number): number => {
    calls++;
    const id = `f${k}-${uid++}`;
    stack.push({ id, label: `fib(${k})`, state: "active" });
    snap(`Call fib(${k}).`, 1, "active", `استدعِ fib(${k}).`);

    if (memo[k] !== null) {
      hits++;
      stack[stack.length - 1].detail = `cached = ${memo[k]}`;
      snap(`fib(${k}) is already cached = ${memo[k]}. Return immediately (memo hit).`, 2, "found", `fib(${k}) مخزّنة مسبقًا = ${memo[k]}. أعِدها فورًا (إصابة تخزين مؤقت).`);
      stack.pop();
      return memo[k]!;
    }
    if (k <= 1) {
      memo[k] = k;
      stack[stack.length - 1].detail = `= ${k}`;
      snap(`Base case: fib(${k}) = ${k}. Store in memo.`, 3, "sorted", `الحالة الأساسية: fib(${k}) = ${k}. خزّنها في الذاكرة المؤقتة.`);
      stack.pop();
      return k;
    }
    const a = fib(k - 1);
    const b = fib(k - 2);
    memo[k] = a + b;
    stack[stack.length - 1].detail = `${a}+${b}=${memo[k]}`;
    snap(`fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${a} + ${b} = ${memo[k]}. Cache it.`, 5, "sorted", `fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${a} + ${b} = ${memo[k]}. خزّنها.`);
    stack.pop();
    return memo[k]!;
  };

  const result = fib(n);
  snap(`fib(${n}) = ${result}. Only ${calls} calls thanks to memoization (naive recursion would take exponentially many).`, 6, undefined, `fib(${n}) = ${result}. ${calls} استدعاءً فقط بفضل التخزين المؤقت (العودية الساذجة كانت ستحتاج عددًا أسيًا منها).`);
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "fibonacci-dp",
  title: "Fibonacci — Memoization",
  titleAr: "فيبوناتشي — التخزين المؤقت للنتائج",
  category: "dynamic-programming",
  difficulty: "Beginner",
  tags: ["dynamic programming", "memoization", "top-down", "overlapping subproblems"],
  tagsAr: ["البرمجة الديناميكية", "التخزين المؤقت للنتائج", "من الأعلى للأسفل", "مسائل فرعية متداخلة"],
  summary: "Computes Fibonacci with top-down memoization, caching each subproblem so it's solved only once.",
  summaryAr: "يحسب متتالية فيبوناتشي بالتخزين المؤقت من الأعلى للأسفل، خازنًا كل مسألة فرعية بحيث تُحل مرة واحدة فقط.",
  renderer: "callstack",
  pseudocode: [
    "procedure fib(n, memo)",
    "  call fib(n)",
    "  if memo[n] set: return memo[n]   // cache hit",
    "  if n <= 1: memo[n] = n; return n // base case",
    "  // recursive case:",
    "  memo[n] = fib(n-1) + fib(n-2)",
    "  return memo[n]",
  ],
  code: {
    pseudocode: `procedure fib(n, memo)
  if memo[n] is set: return memo[n]
  if n <= 1: return n
  memo[n] = fib(n-1, memo) + fib(n-2, memo)
  return memo[n]`,
    c: `long memo[100];
long fib(int n) {
    if (n <= 1) return n;
    if (memo[n]) return memo[n];
    return memo[n] = fib(n - 1) + fib(n - 2);
}`,
    cpp: `#include <vector>
std::vector<long long> memo(100, -1);
long long fib(int n) {
    if (n <= 1) return n;
    if (memo[n] != -1) return memo[n];
    return memo[n] = fib(n - 1) + fib(n - 2);
}`,
    java: `long[] memo = new long[100];
long fib(int n) {
    if (n <= 1) return n;
    if (memo[n] != 0) return memo[n];
    return memo[n] = fib(n - 1) + fib(n - 2);
}`,
    python: `from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)`,
    javascript: `function fib(n, memo = {}) {
  if (n <= 1) return n;
  if (memo[n] !== undefined) return memo[n];
  return (memo[n] = fib(n - 1, memo) + fib(n - 2, memo));
}`,
    typescript: `function fib(n: number, memo: Record<number, number> = {}): number {
  if (n <= 1) return n;
  if (memo[n] !== undefined) return memo[n];
  return (memo[n] = fib(n - 1, memo) + fib(n - 2, memo));
}`,
    csharp: `Dictionary<int, long> memo = new();
long Fib(int n) {
    if (n <= 1) return n;
    if (memo.TryGetValue(n, out var v)) return v;
    return memo[n] = Fib(n - 1) + Fib(n - 2);
}`,
    go: `var memo = map[int]int64{}
func fib(n int) int64 {
	if n <= 1 {
		return int64(n)
	}
	if v, ok := memo[n]; ok {
		return v
	}
	memo[n] = fib(n-1) + fib(n-2)
	return memo[n]
}`,
    rust: `use std::collections::HashMap;
fn fib(n: u64, memo: &mut HashMap<u64, u64>) -> u64 {
    if n <= 1 { return n; }
    if let Some(&v) = memo.get(&n) { return v; }
    let r = fib(n - 1, memo) + fib(n - 2, memo);
    memo.insert(n, r);
    r
}`,
    kotlin: `val memo = HashMap<Int, Long>()
fun fib(n: Int): Long {
    if (n <= 1) return n.toLong()
    memo[n]?.let { return it }
    val r = fib(n - 1) + fib(n - 2)
    memo[n] = r
    return r
}`,
    swift: `var memo: [Int: Int] = [:]
func fib(_ n: Int) -> Int {
    if n <= 1 { return n }
    if let v = memo[n] { return v }
    let r = fib(n - 1) + fib(n - 2)
    memo[n] = r
    return r
}`,
  },
  content: {
    overview: `The Fibonacci sequence is the classic gateway to dynamic programming. The naive recursion fib(n) = fib(n−1) + fib(n−2) recomputes the same subproblems an exponential number of times. Memoization fixes this by caching each fib(k) the first time it's computed, so every distinct subproblem is solved exactly once.

This exposes the two hallmarks of dynamic programming: overlapping subproblems (the same fib(k) is needed many times) and optimal substructure (the answer is built from answers to smaller instances). With memoization the running time collapses from exponential to linear.`,
    howItWorks: [
      "Before computing fib(k), check the memo cache — if present, return it instantly (a cache hit).",
      "Handle base cases: fib(0) = 0 and fib(1) = 1, storing them in the memo.",
      "Otherwise recurse to compute fib(k−1) and fib(k−2).",
      "Store their sum in memo[k] before returning so it's never recomputed.",
      "Each subproblem k is solved once, giving n distinct computations total.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "Memoization reduces the naive O(φⁿ) recursion to O(n) time. Space is O(n) for the memo plus O(n) recursion stack. A bottom-up version uses O(1) space with two rolling variables.",
    },
    applications: [
      "Teaching memoization and the DP paradigm",
      "Any recurrence with overlapping subproblems (a template pattern)",
      "Combinatorics and counting problems (paths, tilings)",
      "Modeling growth, and as the base for matrix-exponentiation speedups",
    ],
    advantages: [
      "Turns exponential recursion into linear time",
      "Top-down memoization mirrors the natural recursive definition",
      "Only computes subproblems that are actually needed",
      "Easy to add to an existing recursive solution",
    ],
    disadvantages: [
      "Uses O(n) cache memory (though a rolling version needs O(1))",
      "Recursion depth can be O(n), risking stack overflow for large n",
      "Big Fibonacci numbers overflow fixed-width integers quickly",
    ],
    commonMistakes: [
      "Forgetting to store the result before returning, defeating memoization.",
      "Using 0 as an 'empty' cache sentinel when 0 is a valid value (fib(0)).",
      "Recomputing base cases instead of seeding them.",
      "Assuming top-down memo is free of stack limits for very large n.",
    ],
    interviewQuestions: [
      "Why does naive Fibonacci recursion run in exponential time?",
      "Contrast top-down memoization with bottom-up tabulation.",
      "How would you compute fib(n) in O(1) space?",
      "How does matrix exponentiation compute fib(n) in O(log n)?",
      "What are the two properties a problem needs for DP to apply?",
    ],
    summary:
      "Memoized Fibonacci caches each fib(k) so overlapping subproblems are computed once, cutting exponential recursion to O(n) time and O(n) space. It's the canonical illustration of dynamic programming's overlapping-subproblems and optimal-substructure properties.",
    quiz: [
      { question: "What makes naive recursive Fibonacci exponential?", options: ["Deep recursion only", "Recomputing the same subproblems repeatedly", "Large numbers", "Using a loop"], answer: 1, explanation: "The same fib(k) is recomputed across many branches of the recursion tree." },
      { question: "Memoization reduces Fibonacci's time complexity to…", options: ["O(1)", "O(log n)", "O(n)", "O(2ⁿ)"], answer: 2, explanation: "Each of the n distinct subproblems is computed exactly once." },
      { question: "The two properties enabling DP are optimal substructure and…", options: ["Greedy choice", "Overlapping subproblems", "Sorted input", "Randomization"], answer: 1, explanation: "Reusable, repeated subproblems are what memoization exploits." },
      { question: "A memo-hit occurs when…", options: ["A base case is reached", "The value is already cached", "n is negative", "The stack overflows"], answer: 1, explanation: "A cached subproblem is returned immediately without recomputation." },
      { question: "Bottom-up Fibonacci can run in how much space?", options: ["O(n)", "O(1) with two rolling variables", "O(n²)", "O(log n)"], answer: 1, explanation: "Only the two previous values are needed to compute the next." },
    ],
  },
  contentAr: {
    overview: `متتالية فيبوناتشي هي البوابة الكلاسيكية للبرمجة الديناميكية. العودية الساذجة fib(n) = fib(n−1) + fib(n−2) تعيد حساب المسائل الفرعية نفسها عددًا أسيًا من المرات. يعالج التخزين المؤقت هذه المشكلة بخزن كل fib(k) عند أول حساب له، بحيث تُحل كل مسألة فرعية مميزة مرة واحدة بالضبط.

هذا يكشف السمتين المميزتين للبرمجة الديناميكية: المسائل الفرعية المتداخلة (نفس fib(k) مطلوبة مرات عديدة) والبنية المثلى الفرعية (الجواب يُبنى من أجوبة حالات أصغر). مع التخزين المؤقت ينهار زمن التشغيل من الأسي إلى الخطي.`,
    howItWorks: [
      "قبل حساب fib(k)، تحقق من ذاكرة التخزين المؤقت — إن وُجدت، أعِدها فورًا (إصابة تخزين مؤقت).",
      "عالج الحالات الأساسية: fib(0) = 0 و fib(1) = 1، مع خزنهما في الذاكرة المؤقتة.",
      "وإلا، عُد عوديًا لحساب fib(k−1) و fib(k−2).",
      "خزّن مجموعهما في memo[k] قبل الإعادة كي لا يُعاد حسابه أبدًا.",
      "تُحل كل مسألة فرعية k مرة واحدة، فينتج عنها n حسابًا مميزًا إجمالًا.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n)", worst: "O(n)" },
      space: "O(n)",
      notes: "يختزل التخزين المؤقت العودية الساذجة O(φⁿ) إلى زمن O(n). المساحة O(n) للذاكرة المؤقتة بالإضافة إلى O(n) من مكدس العودية. النسخة من الأسفل للأعلى تستخدم مساحة O(1) بمتغيرين متجددين.",
    },
    applications: [
      "تعليم التخزين المؤقت ونمط البرمجة الديناميكية",
      "أي علاقة تكرارية ذات مسائل فرعية متداخلة (نمط قالبي)",
      "مسائل التوافقيات والعد (المسارات، التبليط)",
      "نمذجة النمو، والأساس لتسريعات رفع المصفوفات للأس",
    ],
    advantages: [
      "يحوّل العودية الأسية إلى زمن خطي",
      "التخزين المؤقت من الأعلى للأسفل يعكس التعريف العودي الطبيعي",
      "يحسب فقط المسائل الفرعية المطلوبة فعليًا",
      "سهل الإضافة إلى حل عودي موجود",
    ],
    disadvantages: [
      "يستخدم ذاكرة تخزين مؤقت بحجم O(n) (رغم أن النسخة المتجددة تحتاج O(1))",
      "عمق العودية قد يبلغ O(n)، مما يخاطر بفيضان المكدس عند n كبيرة",
      "أعداد فيبوناتشي الكبيرة تفيض الأعداد الصحيحة ثابتة العرض بسرعة",
    ],
    commonMistakes: [
      "نسيان خزن النتيجة قبل الإعادة، مما يبطل فائدة التخزين المؤقت.",
      "استخدام 0 كقيمة 'فارغة' للذاكرة المؤقتة بينما 0 قيمة صالحة (fib(0)).",
      "إعادة حساب الحالات الأساسية بدلًا من تهيئتها مسبقًا.",
      "افتراض أن التخزين المؤقت من الأعلى للأسفل خالٍ من قيود المكدس عند n كبيرة جدًا.",
    ],
    interviewQuestions: [
      "لماذا تعمل عودية فيبوناتشي الساذجة بزمن أسي؟",
      "قارن بين التخزين المؤقت من الأعلى للأسفل والجدولة من الأسفل للأعلى.",
      "كيف تحسب fib(n) بمساحة O(1)؟",
      "كيف يحسب رفع المصفوفات للأس fib(n) بزمن O(log n)؟",
      "ما الخاصيتان اللتان تحتاجهما مسألة كي تنطبق عليها البرمجة الديناميكية؟",
    ],
    summary:
      "يخزّن فيبوناتشي بالتخزين المؤقت كل fib(k) بحيث تُحسب المسائل الفرعية المتداخلة مرة واحدة، مختزلًا العودية الأسية إلى زمن O(n) ومساحة O(n). إنه المثال الكلاسيكي لخاصيتي البرمجة الديناميكية: المسائل الفرعية المتداخلة والبنية المثلى الفرعية.",
    quiz: [
      { question: "ما الذي يجعل عودية فيبوناتشي الساذجة أسية؟", options: ["العمق الكبير للعودية فقط", "إعادة حساب المسائل الفرعية نفسها مرارًا", "الأعداد الكبيرة", "استخدام حلقة تكرار"], answer: 1, explanation: "نفس fib(k) يُعاد حسابه عبر فروع عديدة من شجرة العودية." },
      { question: "التخزين المؤقت يختزل تعقيد فيبوناتشي الزمني إلى…", options: ["O(1)", "O(log n)", "O(n)", "O(2ⁿ)"], answer: 2, explanation: "كل مسألة فرعية من بين n مسألة مميزة تُحسب مرة واحدة بالضبط." },
      { question: "الخاصيتان اللتان تُمكّنان البرمجة الديناميكية هما البنية المثلى الفرعية و…", options: ["الاختيار الجشِع", "المسائل الفرعية المتداخلة", "المدخلات المرتبة", "العشوائية"], answer: 1, explanation: "المسائل الفرعية القابلة لإعادة الاستخدام والمتكررة هي ما يستغله التخزين المؤقت." },
      { question: "إصابة التخزين المؤقت تحدث عندما…", options: ["تُبلغ حالة أساسية", "تكون القيمة مخزّنة مسبقًا", "تكون n سالبة", "يفيض المكدس"], answer: 1, explanation: "تُعاد المسألة الفرعية المخزّنة فورًا دون إعادة حساب." },
      { question: "فيبوناتشي من الأسفل للأعلى يمكن أن يعمل بأي مساحة؟", options: ["O(n)", "O(1) بمتغيرين متجددين", "O(n²)", "O(log n)"], answer: 1, explanation: "لا يلزم سوى القيمتين السابقتين لحساب القيمة التالية." },
    ],
  },
  inputFields: [{ key: "n", label: "n", placeholder: "8", help: "1–75." }],
  defaultInput: (level) => ({ n: Math.min(75, 4 + level * 2) }),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 1 || n > 75) throw new Error("Enter a whole number from 1 to 75.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
