import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = input.values;
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  const dp = new Array(n).fill(1); // dp[i] = LIS length ending at i
  const prev = new Array(n).fill(-1); // predecessor for traceback

  const dpRow = () => ({ label: "dp (LIS end here)", values: dp.map((v) => v) });

  const frame = (
    i: number,
    j: number | null,
    chain: number[],
    description: string,
    codeLine: number,
    done = false,
    descriptionAr?: string,
  ): void => {
    const states: Record<number, CellState> = {};
    for (let k = 0; k < i; k++) states[k] = "visited";
    if (j !== null) states[j] = "compare";
    if (i < n) states[i] = "active";
    for (const k of chain) states[k] = done ? "sorted" : "found";
    const pointers = [];
    if (i < n && !done) pointers.push({ index: i, label: "i" });
    if (j !== null) pointers.push({ index: j, label: "j" });
    steps.push({
      frame: {
        values: [...a],
        states,
        pointers,
        aux: [dpRow()],
        note: `Longest Increasing Subsequence — dp[i] = 1 + max dp[j] over j<i with a[j] < a[i]`,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons },
    });
  };

  frame(0, null, [], `dp[0] = 1: a[0] = ${a[0]} alone is an increasing subsequence of length 1.`, 1, false, `dp[0] = 1: العنصر a[0] = ${a[0]} وحده تتابع فرعي متزايد بطول 1.`);

  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      comparisons++;
      if (a[j] < a[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        prev[i] = j;
        frame(i, j, [], `a[${j}]=${a[j]} < a[${i}]=${a[i]} and dp[${j}]+1=${dp[i]} improves dp[${i}] → ${dp[i]} (predecessor ${j}).`, 4, false, `a[${j}]=${a[j]} < a[${i}]=${a[i]} و dp[${j}]+1=${dp[i]} يُحسّن dp[${i}] → ${dp[i]} (السلف ${j}).`);
      } else {
        frame(i, j, [], `a[${j}]=${a[j]} ${a[j] < a[i] ? "<" : "≥"} a[${i}]=${a[i]}: dp[${i}] stays ${dp[i]}.`, 3, false, `a[${j}]=${a[j]} ${a[j] < a[i] ? "<" : "≥"} a[${i}]=${a[i]}: تبقى dp[${i}] عند ${dp[i]}.`);
      }
    }
  }

  // Find the best endpoint and trace the chain.
  let bestLen = 0;
  let bestEnd = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] > bestLen) {
      bestLen = dp[i];
      bestEnd = i;
    }
  }
  const chain: number[] = [];
  let cur = bestEnd;
  while (cur !== -1) {
    chain.push(cur);
    cur = prev[cur];
  }
  chain.reverse();
  const seq = chain.map((k) => a[k]);
  frame(n, null, chain, `Longest increasing subsequence has length ${bestLen}: [${seq.join(", ")}] at indices [${chain.join(", ")}].`, 6, true, `أطول تتابع فرعي متزايد طوله ${bestLen}: [${seq.join(", ")}] عند الفهارس [${chain.join(", ")}].`);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(arr: readonly T[]) => T[] }): Input {
  const n = Math.min(14, 5 + level * 2);
  const pool = Array.from({ length: n }, (_, k) => k + 1);
  return { values: rng.shuffle(pool) };
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "longest-increasing-subsequence",
  title: "Longest Increasing Subsequence",
  titleAr: "أطول تتابع فرعي متزايد",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "subsequence", "array", "LIS"],
  tagsAr: ["البرمجة الديناميكية", "تتابع فرعي", "مصفوفة", "LIS"],
  summary: "Finds the longest strictly increasing subsequence via an O(n²) DP, tracking predecessors to rebuild the chain.",
  summaryAr: "يجد أطول تتابع فرعي متزايد تمامًا عبر برمجة ديناميكية بزمن O(n²)، متتبعًا الأسلاف لإعادة بناء السلسلة.",
  renderer: "array",
  pseudocode: [
    "procedure LIS(a)",
    "  dp[i] = 1 for all i",
    "  for i = 1..n-1:",
    "    for j = 0..i-1:",
    "      if a[j] < a[i]: dp[i] = max(dp[i], dp[j] + 1)",
    "  // answer = max(dp); trace predecessors for the sequence",
    "  return max(dp)",
  ],
  code: {
    pseudocode: `dp[i] = 1 for all i
for i in 1..n-1:
  for j in 0..i-1:
    if a[j] < a[i]:
      dp[i] = max(dp[i], dp[j] + 1)
return max(dp)`,
    c: `int lis(int* a, int n) {
    int dp[n];
    int best = 0;
    for (int i = 0; i < n; i++) {
        dp[i] = 1;
        for (int j = 0; j < i; j++)
            if (a[j] < a[i] && dp[j] + 1 > dp[i]) dp[i] = dp[j] + 1;
        if (dp[i] > best) best = dp[i];
    }
    return best;
}`,
    cpp: `int lis(vector<int>& a) {
    int n = a.size(), best = 0;
    vector<int> dp(n, 1);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (a[j] < a[i]) dp[i] = max(dp[i], dp[j] + 1);
        best = max(best, dp[i]);
    }
    return best;
}`,
    java: `int lis(int[] a) {
    int n = a.length, best = 0;
    int[] dp = new int[n];
    for (int i = 0; i < n; i++) {
        dp[i] = 1;
        for (int j = 0; j < i; j++)
            if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        best = Math.max(best, dp[i]);
    }
    return best;
}`,
    python: `def lis(a):
    n = len(a)
    dp = [1] * n
    for i in range(n):
        for j in range(i):
            if a[j] < a[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp) if dp else 0`,
    javascript: `function lis(a) {
  const n = a.length;
  const dp = new Array(n).fill(1);
  let best = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++)
      if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    best = Math.max(best, dp[i]);
  }
  return best;
}`,
    typescript: `function lis(a: number[]): number {
  const n = a.length;
  const dp = new Array(n).fill(1);
  let best = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++)
      if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    best = Math.max(best, dp[i]);
  }
  return best;
}`,
    csharp: `int Lis(int[] a) {
    int n = a.Length, best = 0;
    var dp = new int[n];
    for (int i = 0; i < n; i++) {
        dp[i] = 1;
        for (int j = 0; j < i; j++)
            if (a[j] < a[i]) dp[i] = Math.Max(dp[i], dp[j] + 1);
        best = Math.Max(best, dp[i]);
    }
    return best;
}`,
    go: `func lis(a []int) int {
	n := len(a)
	dp := make([]int, n)
	best := 0
	for i := 0; i < n; i++ {
		dp[i] = 1
		for j := 0; j < i; j++ {
			if a[j] < a[i] && dp[j]+1 > dp[i] { dp[i] = dp[j] + 1 }
		}
		if dp[i] > best { best = dp[i] }
	}
	return best
}`,
    rust: `fn lis(a: &[i32]) -> usize {
    let n = a.len();
    let mut dp = vec![1usize; n];
    let mut best = 0;
    for i in 0..n {
        for j in 0..i {
            if a[j] < a[i] && dp[j] + 1 > dp[i] { dp[i] = dp[j] + 1; }
        }
        best = best.max(dp[i]);
    }
    best
}`,
    kotlin: `fun lis(a: IntArray): Int {
    val n = a.size
    val dp = IntArray(n) { 1 }
    var best = 0
    for (i in 0 until n) {
        for (j in 0 until i)
            if (a[j] < a[i]) dp[i] = maxOf(dp[i], dp[j] + 1)
        best = maxOf(best, dp[i])
    }
    return best
}`,
    swift: `func lis(_ a: [Int]) -> Int {
    let n = a.count
    var dp = Array(repeating: 1, count: n)
    var best = 0
    for i in 0..<n {
        for j in 0..<i where a[j] < a[i] {
            dp[i] = max(dp[i], dp[j] + 1)
        }
        best = max(best, dp[i])
    }
    return best
}`,
  },
  content: {
    overview: `The longest increasing subsequence (LIS) of an array is the longest subsequence whose elements are in strictly increasing order — again a subsequence, so gaps are allowed but order must be preserved. In [10, 9, 2, 5, 3, 7, 101, 18] one LIS is [2, 3, 7, 101] of length 4.

The O(n²) dynamic program defines dp[i] as the length of the longest increasing subsequence that ends exactly at index i. Every element starts as a subsequence of length 1. For each i you look back at every earlier index j: if a[j] < a[i], element i can extend the subsequence ending at j, giving a candidate length dp[j] + 1. Taking the best such candidate fills dp[i]. The overall answer is the maximum entry in dp, and storing each element's chosen predecessor lets you rebuild the actual subsequence. (A more advanced patience-sorting variant with binary search runs in O(n log n).)`,
    howItWorks: [
      "Set dp[i] = 1 for every index (each element alone is length 1).",
      "For each i, examine all earlier indices j < i.",
      "If a[j] < a[i], element i can follow j: candidate = dp[j] + 1.",
      "Keep the largest candidate as dp[i], and record j as i's predecessor.",
      "The answer is max(dp); follow predecessor links back from its index to recover the subsequence.",
    ],
    complexity: {
      time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" },
      space: "O(n)",
      notes: "The nested-loop DP is O(n²). A patience-sorting approach with binary search over 'tails' achieves O(n log n).",
    },
    applications: [
      "detecting the longest run of improving values in a time series",
      "box / envelope stacking (after sorting by one dimension)",
      "version-compatibility and scheduling chains",
      "the O(n log n) variant appears in the `diff` patience algorithm",
    ],
    advantages: [
      "Conceptually simple nested-loop recurrence",
      "Predecessor tracking recovers the actual subsequence",
      "Works for strictly or non-strictly increasing with a tiny tweak",
      "A drop-in O(n log n) speedup exists",
    ],
    disadvantages: [
      "The basic version is O(n²) — slow for large arrays",
      "The fast O(n log n) variant is trickier to also recover the sequence",
      "Only handles one LIS even when several exist",
    ],
    commonMistakes: [
      "Confusing subsequence (gaps allowed) with substring/contiguous run.",
      "Using ≤ instead of < when strictly increasing is required.",
      "Forgetting to initialize every dp[i] to 1.",
      "Reading the answer as dp[n−1] instead of max over all dp[i].",
    ],
    interviewQuestions: [
      "How do you reduce LIS from O(n²) to O(n log n)?",
      "How do you reconstruct the actual subsequence, not just its length?",
      "How would you handle non-strictly increasing subsequences?",
      "How does the patience-sorting / tails array work?",
      "How would you count the number of distinct longest increasing subsequences?",
    ],
    summary:
      "LIS finds the longest strictly increasing subsequence. The O(n²) DP sets dp[i] = 1 + max dp[j] over earlier j with a[j] < a[i], and predecessors rebuild the chain. A patience-sorting variant improves this to O(n log n).",
    quiz: [
      { question: "An increasing subsequence must be…", options: ["Contiguous", "Order-preserving but may skip elements", "Sorted in place", "Reversed"], answer: 1, explanation: "It preserves order but does not need to be contiguous." },
      { question: "dp[i] in the O(n²) LIS represents…", options: ["The value a[i]", "The LIS length ending at index i", "The global LIS length", "The number of inversions"], answer: 1, explanation: "dp[i] is the longest increasing subsequence terminating at i." },
      { question: "The transition considers j < i only when…", options: ["a[j] > a[i]", "a[j] < a[i]", "a[j] == a[i]", "always"], answer: 1, explanation: "Element i can extend j's subsequence only if a[j] < a[i]." },
      { question: "The final answer is…", options: ["dp[n-1]", "dp[0]", "max over all dp[i]", "the sum of dp"], answer: 2, explanation: "The LIS may end anywhere, so take the maximum dp value." },
      { question: "LIS can be sped up to O(n log n) using…", options: ["Bubble sort", "Binary search over a tails array (patience sorting)", "Hashing", "A stack"], answer: 1, explanation: "Maintaining smallest tails with binary search gives O(n log n)." },
    ],
  },
  contentAr: {
    overview: `أطول تتابع فرعي متزايد (LIS) لمصفوفة هو أطول تتابع فرعي عناصره في ترتيب متزايد تمامًا — وهو تتابع فرعي أيضًا، فيُسمح بالفجوات لكن يجب الحفاظ على الترتيب. في [10, 9, 2, 5, 3, 7, 101, 18] أحد تتابعات LIS هو [2, 3, 7, 101] بطول 4.

يعرّف البرنامج الديناميكي بزمن O(n²) القيمة dp[i] كطول أطول تتابع فرعي متزايد ينتهي بالضبط عند الفهرس i. يبدأ كل عنصر كتتابع فرعي بطول 1. لكل i تنظر رجوعًا إلى كل فهرس سابق j: إذا كان a[j] < a[i]، يمكن للعنصر i أن يمدد التتابع الفرعي المنتهي عند j، معطيًا طولًا مرشحًا dp[j] + 1. أخذ أفضل مرشح كهذا يملأ dp[i]. الجواب الكلي هو أكبر مُدخل في dp، وخزن سلف كل عنصر مختار يتيح إعادة بناء التتابع الفرعي الفعلي. (نسخة أكثر تقدمًا تستخدم فرز الصبر مع بحث ثنائي تعمل بزمن O(n log n).)`,
    howItWorks: [
      "اجعل dp[i] = 1 لكل فهرس (كل عنصر وحده بطول 1).",
      "لكل i، افحص كل الفهارس السابقة j < i.",
      "إذا كان a[j] < a[i]، يمكن للعنصر i أن يتبع j: المرشح = dp[j] + 1.",
      "احتفظ بأكبر مرشح كقيمة dp[i]، وسجّل j كسلف لـ i.",
      "الجواب هو max(dp)؛ اتبع روابط الأسلاف رجوعًا من فهرسه لاستعادة التتابع الفرعي.",
    ],
    complexity: {
      time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" },
      space: "O(n)",
      notes: "البرمجة الديناميكية بالحلقات المتداخلة بزمن O(n²). نهج فرز الصبر مع بحث ثنائي على مصفوفة 'الذيول' يحقق O(n log n).",
    },
    applications: [
      "كشف أطول سلسلة من القيم المتحسنة في سلسلة زمنية",
      "تكديس الصناديق/المغلفات (بعد الترتيب حسب بُعد واحد)",
      "توافق الإصدارات وسلاسل الجدولة",
      "النسخة O(n log n) تظهر في خوارزمية الصبر لأداة diff",
    ],
    advantages: [
      "علاقة تكرارية بسيطة مفاهيميًا بحلقات متداخلة",
      "تتبّع الأسلاف يستعيد التتابع الفرعي الفعلي",
      "يعمل للتزايد الصارم أو غير الصارم بتعديل بسيط",
      "يوجد تسريع مباشر إلى O(n log n)",
    ],
    disadvantages: [
      "النسخة الأساسية بزمن O(n²) — بطيئة للمصفوفات الكبيرة",
      "النسخة السريعة O(n log n) أصعب في استعادة التسلسل أيضًا",
      "تتعامل مع تتابع LIS واحد فقط حتى عند وجود عدة تتابعات",
    ],
    commonMistakes: [
      "الخلط بين التتابع الفرعي (يسمح بفجوات) والسلسلة الجزئية/التشغيل المتجاور.",
      "استخدام ≤ بدلًا من < عندما يُطلب التزايد الصارم.",
      "نسيان تهيئة كل dp[i] إلى 1.",
      "قراءة الجواب كـ dp[n−1] بدلًا من أكبر قيمة على كل dp[i].",
    ],
    interviewQuestions: [
      "كيف تقلل LIS من O(n²) إلى O(n log n)؟",
      "كيف تعيد بناء التتابع الفرعي الفعلي، لا طوله فقط؟",
      "كيف تتعامل مع التتابعات الفرعية غير المتزايدة الصارمة؟",
      "كيف يعمل فرز الصبر / مصفوفة الذيول؟",
      "كيف تحسب عدد أطول التتابعات الفرعية المتزايدة المميزة؟",
    ],
    summary:
      "يجد LIS أطول تتابع فرعي متزايد تمامًا. البرمجة الديناميكية بزمن O(n²) تضع dp[i] = 1 + أكبر dp[j] على j سابقة مع a[j] < a[i]، والأسلاف تعيد بناء السلسلة. نسخة فرز الصبر تحسّن هذا إلى O(n log n).",
    quiz: [
      { question: "يجب أن يكون التتابع الفرعي المتزايد…", options: ["متجاورًا", "حافظًا للترتيب لكن قد يتخطى عناصر", "مرتبًا في مكانه", "معكوسًا"], answer: 1, explanation: "يحافظ على الترتيب لكن لا يلزم أن يكون متجاورًا." },
      { question: "تمثّل dp[i] في LIS بزمن O(n²)…", options: ["القيمة a[i]", "طول LIS المنتهي عند الفهرس i", "طول LIS الكلي", "عدد الانقلابات"], answer: 1, explanation: "dp[i] هو أطول تتابع فرعي متزايد ينتهي عند i." },
      { question: "يُعتبر الانتقال من أجل j < i فقط عندما…", options: ["a[j] > a[i]", "a[j] < a[i]", "a[j] == a[i]", "دائمًا"], answer: 1, explanation: "يمكن للعنصر i أن يمدد تتابع j الفرعي فقط إذا كان a[j] < a[i]." },
      { question: "الجواب النهائي هو…", options: ["dp[n-1]", "dp[0]", "أكبر قيمة على كل dp[i]", "مجموع dp"], answer: 2, explanation: "قد ينتهي LIS في أي مكان، فتُؤخذ أكبر قيمة dp." },
      { question: "يمكن تسريع LIS إلى O(n log n) باستخدام…", options: ["الترتيب الفقاعي", "بحث ثنائي على مصفوفة ذيول (فرز الصبر)", "التجزئة", "مكدس"], answer: 1, explanation: "الاحتفاظ بأصغر الذيول مع بحث ثنائي يعطي O(n log n)." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array", placeholder: "10, 9, 2, 5, 3, 7, 101, 18", help: "Comma-separated integers, up to 30." },
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
    if (values.length < 1) throw new Error("Enter at least one number.");
    if (values.length > 30) throw new Error("Maximum 30 numbers.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
