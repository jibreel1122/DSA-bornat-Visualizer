import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[]; target: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const { values, target } = input;
  const a = [...values];
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  const snap = (states: Record<number, CellState>, description: string, codeLine: number, pointers?: { index: number; label: string }[], descriptionAr?: string) => {
    steps.push({ frame: { values: [...a], states: { ...states }, pointers }, description, descriptionAr, codeLine, counters: { comparisons } });
  };

  snap({}, `Linear search scans left to right looking for ${target}.`, 0, undefined, `يمسح البحث الخطي المصفوفة من اليسار إلى اليمين بحثًا عن ${target}.`);
  for (let i = 0; i < a.length; i++) {
    comparisons++;
    const discarded: Record<number, CellState> = {};
    for (let k = 0; k < i; k++) discarded[k] = "discarded";
    snap({ ...discarded, [i]: "compare" }, `Check a[${i}] = ${a[i]} against ${target}.`, 1, [{ index: i, label: "i" }], `افحص a[${i}] = ${a[i]} مقابل ${target}.`);
    if (a[i] === target) {
      snap({ ...discarded, [i]: "found" }, `Found ${target} at index ${i} after ${comparisons} comparisons.`, 2, [{ index: i, label: "i" }], `عُثِر على ${target} عند الفهرس ${i} بعد ${comparisons} مقارنة.`);
      return steps;
    }
  }
  const allDiscarded: Record<number, CellState> = {};
  for (let k = 0; k < a.length; k++) allDiscarded[k] = "discarded";
  snap(allDiscarded, `${target} is not in the array (searched all ${a.length} elements).`, 4, undefined, `${target} غير موجود في المصفوفة (جرى البحث في كل العناصر البالغ عددها ${a.length}).`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "linear-search",
  title: "Linear Search",
  titleAr: "البحث الخطي",
  category: "searching",
  difficulty: "Beginner",
  tags: ["sequential", "unsorted ok", "O(n)"],
  tagsAr: ["تسلسلي", "يعمل مع غير المرتب", "O(n)"],
  summary: "Scans elements one by one until the target is found or the array ends — works on any array.",
  summaryAr: "يمسح العناصر واحدًا تلو الآخر حتى يُعثَر على الهدف أو تنتهي المصفوفة — يعمل مع أي مصفوفة.",
  renderer: "array",
  pseudocode: [
    "procedure linearSearch(a, target)",
    "  for i = 0 to n-1",
    "    if a[i] == target then return i",
    "  // fell through the loop",
    "  return -1   // not found",
  ],
  code: {
    pseudocode: `procedure linearSearch(a, target)
  for i = 0 to n-1
    if a[i] == target: return i
  return -1`,
    c: `int linear_search(int a[], int n, int target) {
    for (int i = 0; i < n; i++)
        if (a[i] == target) return i;
    return -1;
}`,
    cpp: `#include <vector>
int linearSearch(const std::vector<int>& a, int target) {
    for (int i = 0; i < (int)a.size(); ++i)
        if (a[i] == target) return i;
    return -1;
}`,
    java: `static int linearSearch(int[] a, int target) {
    for (int i = 0; i < a.length; i++)
        if (a[i] == target) return i;
    return -1;
}`,
    python: `def linear_search(a: list[int], target: int) -> int:
    for i, x in enumerate(a):
        if x == target:
            return i
    return -1`,
    javascript: `function linearSearch(a, target) {
  for (let i = 0; i < a.length; i++)
    if (a[i] === target) return i;
  return -1;
}`,
    typescript: `function linearSearch(a: number[], target: number): number {
  for (let i = 0; i < a.length; i++)
    if (a[i] === target) return i;
  return -1;
}`,
    csharp: `static int LinearSearch(int[] a, int target) {
    for (int i = 0; i < a.Length; i++)
        if (a[i] == target) return i;
    return -1;
}`,
    go: `func linearSearch(a []int, target int) int {
	for i, x := range a {
		if x == target {
			return i
		}
	}
	return -1
}`,
    rust: `fn linear_search(a: &[i32], target: i32) -> Option<usize> {
    a.iter().position(|&x| x == target)
}`,
    kotlin: `fun linearSearch(a: IntArray, target: Int): Int {
    for (i in a.indices) if (a[i] == target) return i
    return -1
}`,
    swift: `func linearSearch(_ a: [Int], _ target: Int) -> Int {
    for (i, x) in a.enumerated() where x == target { return i }
    return -1
}`,
  },
  content: {
    overview: `Linear search (or sequential search) is the most basic search: examine each element in turn until you find the target or reach the end. It makes no assumptions about the data — the array need not be sorted — which makes it universally applicable but only as fast as O(n).

Despite its simplicity, linear search is the right choice more often than beginners expect: for small arrays, for unsorted data you'd otherwise have to sort first, or for one-off lookups where building an index isn't worth it.`,
    howItWorks: [
      "Start at the first element with index i = 0.",
      "Compare a[i] with the target.",
      "If they match, return i — the search succeeds.",
      "Otherwise advance i and repeat.",
      "If the loop ends with no match, return −1 (not found).",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "Best case O(1) when the target is first; worst and average O(n). On average a successful search examines about n/2 elements.",
    },
    applications: [
      "Searching small or unsorted collections",
      "One-off lookups where preprocessing/sorting isn't worthwhile",
      "Finding an element by a property with no usable index",
      "Linked lists and other structures without random access",
    ],
    advantages: [
      "Works on unsorted data — no preprocessing",
      "Dead simple and hard to get wrong",
      "O(1) memory; no auxiliary structures",
      "Efficient for very small inputs",
    ],
    disadvantages: [
      "O(n) time — slow for large datasets",
      "No better than brute force for repeated queries",
      "Ignores any structure (like sortedness) that could speed things up",
    ],
    commonMistakes: [
      "Returning true/false instead of the index when the position is needed.",
      "Off-by-one on the loop bound, missing the last element.",
      "Using linear search on large sorted data where binary search would be far faster.",
      "Not handling the not-found case explicitly.",
    ],
    interviewQuestions: [
      "When is linear search preferable to binary search despite being O(n)?",
      "What is the average number of comparisons for a successful linear search?",
      "How would you speed up repeated membership queries on the same dataset?",
      "How does a sentinel value optimize the inner loop of linear search?",
    ],
    summary:
      "Linear search checks each element sequentially until it finds the target, running in O(n) time and O(1) space on any array, sorted or not. It's the simplest search and the right tool for small or unsorted data.",
    quiz: [
      { question: "What is the worst-case time complexity of linear search?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 2, explanation: "The target may be last or absent, requiring all n comparisons." },
      { question: "Which precondition does linear search require?", options: ["Sorted array", "Distinct elements", "None", "Numeric elements"], answer: 2, explanation: "It works on any array with no assumptions about order or uniqueness." },
      { question: "On average, a successful linear search examines about…", options: ["1 element", "log n elements", "n/2 elements", "n² elements"], answer: 2, explanation: "The target is equally likely at any position, averaging n/2 comparisons." },
      { question: "When is linear search a reasonable choice over binary search?", options: ["Large sorted arrays", "Small or unsorted arrays", "Never", "Only for strings"], answer: 1, explanation: "For small or unsorted data, sorting first to enable binary search isn't worth it." },
      { question: "Best-case time complexity of linear search is…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 0, explanation: "If the target is the first element, one comparison suffices." },
    ],
  },
  contentAr: {
    overview: `البحث الخطي (أو البحث التسلسلي) هو أبسط أنواع البحث: افحص كل عنصر بالتتابع حتى تجد الهدف أو تصل إلى النهاية. لا يفترض شيئًا عن البيانات — فلا حاجة لأن تكون المصفوفة مرتبة — مما يجعله قابلًا للتطبيق عالميًا لكنه سريع فقط بمقدار O(n).

رغم بساطته، يكون البحث الخطي الخيار الصحيح أكثر مما يتوقع المبتدئون: للمصفوفات الصغيرة، أو للبيانات غير المرتبة التي كنت ستضطر إلى ترتيبها أولًا، أو لعمليات البحث لمرة واحدة حيث لا يستحق الأمر بناء فهرس.`,
    howItWorks: [
      "ابدأ من العنصر الأول عند الفهرس i = 0.",
      "قارن a[i] مع الهدف.",
      "إذا تطابقا، أعِد i — نجح البحث.",
      "خلاف ذلك، قدّم i وكرّر.",
      "إذا انتهت الحلقة دون تطابق، أعِد −1 (غير موجود).",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(n)", worst: "O(n)" },
      space: "O(1)",
      notes: "أفضل حالة O(1) عندما يكون الهدف أول عنصر؛ وأسوأ حالة ومتوسطها O(n). في المتوسط يفحص البحث الناجح نحو n/2 من العناصر.",
    },
    applications: [
      "البحث في مجموعات صغيرة أو غير مرتبة",
      "عمليات البحث لمرة واحدة حيث لا يستحق التجهيز/الترتيب العناء",
      "إيجاد عنصر وفق خاصية دون وجود فهرس قابل للاستخدام",
      "القوائم المترابطة وغيرها من الهياكل التي لا تتيح الوصول العشوائي",
    ],
    advantages: [
      "يعمل مع البيانات غير المرتبة — دون تجهيز مسبق",
      "بسيط للغاية ويصعب الخطأ فيه",
      "ذاكرة O(1)؛ دون هياكل مساعدة",
      "فعّال للمدخلات الصغيرة جدًا",
    ],
    disadvantages: [
      "زمن O(n) — بطيء مع مجموعات البيانات الكبيرة",
      "لا يتفوق على القوة الغاشمة عند الاستعلامات المتكررة",
      "يتجاهل أي بنية (كالترتيب) قد تُسرّع الأمور",
    ],
    commonMistakes: [
      "إعادة true/false بدلًا من الفهرس عندما يكون الموضع مطلوبًا.",
      "خطأ الانزياح بمقدار واحد في حد الحلقة، مما يفوّت العنصر الأخير.",
      "استخدام البحث الخطي على بيانات مرتبة كبيرة حيث يكون البحث الثنائي أسرع بكثير.",
      "عدم معالجة حالة عدم العثور صراحةً.",
    ],
    interviewQuestions: [
      "متى يُفضَّل البحث الخطي على البحث الثنائي رغم كونه O(n)؟",
      "ما متوسط عدد المقارنات لبحث خطي ناجح؟",
      "كيف تُسرّع استعلامات العضوية المتكررة على مجموعة البيانات نفسها؟",
      "كيف تُحسّن القيمة الحارسة الحلقة الداخلية للبحث الخطي؟",
    ],
    summary:
      "يفحص البحث الخطي كل عنصر بالتتابع حتى يجد الهدف، ويعمل بزمن O(n) ومساحة O(1) على أي مصفوفة، مرتبة كانت أم لا. وهو أبسط أنواع البحث والأداة الصحيحة للبيانات الصغيرة أو غير المرتبة.",
    quiz: [
      { question: "ما تعقيد الزمن في أسوأ حالة للبحث الخطي؟", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 2, explanation: "قد يكون الهدف أخيرًا أو غائبًا، مما يستلزم كل المقارنات البالغ عددها n." },
      { question: "أي شرط مسبق يتطلبه البحث الخطي؟", options: ["مصفوفة مرتبة", "عناصر متمايزة", "لا شيء", "عناصر رقمية"], answer: 2, explanation: "يعمل على أي مصفوفة دون أي افتراضات حول الترتيب أو التمايز." },
      { question: "في المتوسط، يفحص البحث الخطي الناجح نحو…", options: ["عنصر واحد", "log n من العناصر", "n/2 من العناصر", "n² من العناصر"], answer: 2, explanation: "احتمال وجود الهدف في أي موضع متساوٍ، بمتوسط n/2 من المقارنات." },
      { question: "متى يكون البحث الخطي خيارًا معقولًا بدلًا من البحث الثنائي؟", options: ["المصفوفات المرتبة الكبيرة", "المصفوفات الصغيرة أو غير المرتبة", "أبدًا", "للسلاسل النصية فقط"], answer: 1, explanation: "للبيانات الصغيرة أو غير المرتبة، لا يستحق الترتيب أولًا لتمكين البحث الثنائي العناء." },
      { question: "تعقيد الزمن في أفضل حالة للبحث الخطي هو…", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 0, explanation: "إذا كان الهدف هو العنصر الأول، تكفي مقارنة واحدة." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values", placeholder: "e.g. 4, 17, 8, 23, 5, 42", help: "2–40 numbers, comma or space separated." },
    { key: "target", label: "Target", placeholder: "23" },
  ],
  defaultInput: (level, rng) => {
    const values = randomArray(level, rng);
    // half the time pick an existing target, half a possibly-missing one
    const target = rng.next() < 0.7 ? rng.pick(values) : rng.int(1, 99);
    return { values, target };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 1) throw new Error("Enter at least one number.");
    const target = Number((fields.target ?? "").trim());
    if (!Number.isFinite(target)) throw new Error("Enter a valid numeric target.");
    return { values, target };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), target: String(input.target) }),
  generate,
};

export default mod;
