import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[]; target: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const { target } = input;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;

  const snap = (states: Record<number, CellState>, range: { from: number; to: number } | null, description: string, codeLine: number, pointers?: { index: number; label: string }[], descriptionAr?: string) => {
    steps.push({ frame: { values: [...a], states: { ...states }, range, pointers }, description, descriptionAr, codeLine, counters: { comparisons } });
  };

  snap({}, { from: 0, to: a.length - 1 }, `Ternary search splits the sorted range into three parts using two midpoints.`, 0, undefined, `يقسم البحث الثلاثي المجال المرتب إلى ثلاثة أجزاء باستخدام نقطتي منتصف.`);

  let lo = 0;
  let hi = a.length - 1;
  while (lo <= hi) {
    const third = Math.floor((hi - lo) / 3);
    const m1 = lo + third;
    const m2 = hi - third;
    comparisons += 2;
    snap({ [m1]: "active", [m2]: "active" }, { from: lo, to: hi }, `Probe m1 = ${m1} (${a[m1]}) and m2 = ${m2} (${a[m2]}).`, 1, [{ index: lo, label: "lo" }, { index: m1, label: "m1" }, { index: m2, label: "m2" }, { index: hi, label: "hi" }], `افحص m1 = ${m1} (${a[m1]}) و m2 = ${m2} (${a[m2]}).`);
    if (a[m1] === target) { snap({ [m1]: "found" }, { from: lo, to: hi }, `Found ${target} at index ${m1}.`, 2, undefined, `عُثِر على ${target} عند الفهرس ${m1}.`); return steps; }
    if (a[m2] === target) { snap({ [m2]: "found" }, { from: lo, to: hi }, `Found ${target} at index ${m2}.`, 2, undefined, `عُثِر على ${target} عند الفهرس ${m2}.`); return steps; }
    if (target < a[m1]) {
      const newHi = m1 - 1;
      snap({ [m1]: "discarded", [m2]: "discarded" }, lo <= newHi ? { from: lo, to: newHi } : null, `${target} < ${a[m1]}: search the first third.`, 3, undefined, `${target} < ${a[m1]}: ابحث في الثلث الأول.`);
      hi = newHi;
    } else if (target > a[m2]) {
      const newLo = m2 + 1;
      snap({ [m1]: "discarded", [m2]: "discarded" }, newLo <= hi ? { from: newLo, to: hi } : null, `${target} > ${a[m2]}: search the last third.`, 4, undefined, `${target} > ${a[m2]}: ابحث في الثلث الأخير.`);
      lo = newLo;
    } else {
      const newLo = m1 + 1;
      const newHi = m2 - 1;
      snap({ [m1]: "discarded", [m2]: "discarded" }, newLo <= newHi ? { from: newLo, to: newHi } : null, `Between the probes: search the middle third.`, 5, undefined, `بين نقطتي الفحص: ابحث في الثلث الأوسط.`);
      lo = newLo; hi = newHi;
    }
  }
  snap({}, null, `${target} is not present.`, 6, undefined, `${target} غير موجود.`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "ternary-search",
  title: "Ternary Search",
  titleAr: "البحث الثلاثي",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["sorted required", "divide by 3", "O(log₃ n)"],
  tagsAr: ["يتطلب الترتيب", "القسمة على 3", "O(log₃ n)"],
  summary: "Divides a sorted range into three parts with two midpoints, discarding two-thirds each step.",
  summaryAr: "يقسم مجالًا مرتبًا إلى ثلاثة أجزاء بنقطتي منتصف، متخلصًا من ثلثين في كل خطوة.",
  renderer: "array",
  pseudocode: [
    "procedure ternarySearch(a, target)",
    "  m1 = lo + (hi-lo)/3; m2 = hi - (hi-lo)/3",
    "  if a[m1]==target or a[m2]==target: return it",
    "  if target < a[m1]: hi = m1-1",
    "  else if target > a[m2]: lo = m2+1",
    "  else: lo = m1+1; hi = m2-1   // middle third",
    "  return -1",
  ],
  code: {
    pseudocode: `while lo <= hi:
  m1 = lo + (hi-lo)/3
  m2 = hi - (hi-lo)/3
  if a[m1]==target: return m1
  if a[m2]==target: return m2
  if target < a[m1]: hi = m1-1
  elif target > a[m2]: lo = m2+1
  else: lo=m1+1; hi=m2-1
return -1`,
    c: `int ternary_search(int a[], int lo, int hi, int target) {
    while (lo <= hi) {
        int m1 = lo + (hi-lo)/3, m2 = hi - (hi-lo)/3;
        if (a[m1] == target) return m1;
        if (a[m2] == target) return m2;
        if (target < a[m1]) hi = m1-1;
        else if (target > a[m2]) lo = m2+1;
        else { lo = m1+1; hi = m2-1; }
    }
    return -1;
}`,
    cpp: `int ternarySearch(const std::vector<int>& a, int target) {
    int lo = 0, hi = a.size()-1;
    while (lo <= hi) {
        int m1 = lo + (hi-lo)/3, m2 = hi - (hi-lo)/3;
        if (a[m1] == target) return m1;
        if (a[m2] == target) return m2;
        if (target < a[m1]) hi = m1-1;
        else if (target > a[m2]) lo = m2+1;
        else { lo = m1+1; hi = m2-1; }
    }
    return -1;
}`,
    java: `static int ternarySearch(int[] a, int target) {
    int lo = 0, hi = a.length-1;
    while (lo <= hi) {
        int m1 = lo + (hi-lo)/3, m2 = hi - (hi-lo)/3;
        if (a[m1] == target) return m1;
        if (a[m2] == target) return m2;
        if (target < a[m1]) hi = m1-1;
        else if (target > a[m2]) lo = m2+1;
        else { lo = m1+1; hi = m2-1; }
    }
    return -1;
}`,
    python: `def ternary_search(a: list[int], target: int) -> int:
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        m1 = lo + (hi - lo) // 3
        m2 = hi - (hi - lo) // 3
        if a[m1] == target:
            return m1
        if a[m2] == target:
            return m2
        if target < a[m1]:
            hi = m1 - 1
        elif target > a[m2]:
            lo = m2 + 1
        else:
            lo, hi = m1 + 1, m2 - 1
    return -1`,
    javascript: `function ternarySearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const m1 = lo + Math.floor((hi - lo) / 3);
    const m2 = hi - Math.floor((hi - lo) / 3);
    if (a[m1] === target) return m1;
    if (a[m2] === target) return m2;
    if (target < a[m1]) hi = m1 - 1;
    else if (target > a[m2]) lo = m2 + 1;
    else { lo = m1 + 1; hi = m2 - 1; }
  }
  return -1;
}`,
    typescript: `function ternarySearch(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const m1 = lo + Math.floor((hi - lo) / 3);
    const m2 = hi - Math.floor((hi - lo) / 3);
    if (a[m1] === target) return m1;
    if (a[m2] === target) return m2;
    if (target < a[m1]) hi = m1 - 1;
    else if (target > a[m2]) lo = m2 + 1;
    else { lo = m1 + 1; hi = m2 - 1; }
  }
  return -1;
}`,
    csharp: `static int TernarySearch(int[] a, int target) {
    int lo = 0, hi = a.Length-1;
    while (lo <= hi) {
        int m1 = lo + (hi-lo)/3, m2 = hi - (hi-lo)/3;
        if (a[m1] == target) return m1;
        if (a[m2] == target) return m2;
        if (target < a[m1]) hi = m1-1;
        else if (target > a[m2]) lo = m2+1;
        else { lo = m1+1; hi = m2-1; }
    }
    return -1;
}`,
    go: `func ternarySearch(a []int, target int) int {
	lo, hi := 0, len(a)-1
	for lo <= hi {
		m1 := lo + (hi-lo)/3
		m2 := hi - (hi-lo)/3
		if a[m1] == target { return m1 }
		if a[m2] == target { return m2 }
		if target < a[m1] { hi = m1 - 1 } else if target > a[m2] { lo = m2 + 1 } else { lo = m1 + 1; hi = m2 - 1 }
	}
	return -1
}`,
    rust: `fn ternary_search(a: &[i32], target: i32) -> Option<usize> {
    let (mut lo, mut hi) = (0i64, a.len() as i64 - 1);
    while lo <= hi {
        let m1 = lo + (hi - lo) / 3;
        let m2 = hi - (hi - lo) / 3;
        if a[m1 as usize] == target { return Some(m1 as usize); }
        if a[m2 as usize] == target { return Some(m2 as usize); }
        if target < a[m1 as usize] { hi = m1 - 1; }
        else if target > a[m2 as usize] { lo = m2 + 1; }
        else { lo = m1 + 1; hi = m2 - 1; }
    }
    None
}`,
    kotlin: `fun ternarySearch(a: IntArray, target: Int): Int {
    var lo = 0; var hi = a.size - 1
    while (lo <= hi) {
        val m1 = lo + (hi - lo) / 3
        val m2 = hi - (hi - lo) / 3
        if (a[m1] == target) return m1
        if (a[m2] == target) return m2
        when {
            target < a[m1] -> hi = m1 - 1
            target > a[m2] -> lo = m2 + 1
            else -> { lo = m1 + 1; hi = m2 - 1 }
        }
    }
    return -1
}`,
    swift: `func ternarySearch(_ a: [Int], _ target: Int) -> Int {
    var lo = 0, hi = a.count - 1
    while lo <= hi {
        let m1 = lo + (hi - lo) / 3
        let m2 = hi - (hi - lo) / 3
        if a[m1] == target { return m1 }
        if a[m2] == target { return m2 }
        if target < a[m1] { hi = m1 - 1 }
        else if target > a[m2] { lo = m2 + 1 }
        else { lo = m1 + 1; hi = m2 - 1 }
    }
    return -1
}`,
  },
  content: {
    overview: `Ternary search splits a sorted range into three parts instead of two. It computes two probe points, m1 and m2, that divide the interval into thirds, and compares the target against both. Depending on the outcome it discards one or two of the three parts and repeats on what remains.

Although it eliminates two-thirds of the range each round (versus binary search's one-half), it uses two comparisons per round instead of one. Working the math out, ternary search makes about 2·log₃ n comparisons versus binary search's log₂ n — and since 2/ln 3 > 1/ln 2, ternary search actually does slightly more comparisons. It's mainly of theoretical and educational interest for arrays; its more important cousin is ternary search on a unimodal function to find an extremum.`,
    howItWorks: [
      "Divide the range [lo, hi] into thirds with m1 = lo + (hi−lo)/3 and m2 = hi − (hi−lo)/3.",
      "If the target equals a[m1] or a[m2], return that index.",
      "If the target is less than a[m1], keep only the first third.",
      "If it is greater than a[m2], keep only the last third.",
      "Otherwise keep the middle third, and repeat until the range empties.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log₃ n)", worst: "O(log₃ n)" },
      space: "O(1)",
      notes: "Fewer rounds than binary search (log₃ n), but two comparisons each round → slightly more total comparisons than binary search. Requires sorted data.",
    },
    applications: [
      "Finding the extremum of a unimodal function (its main real use)",
      "Teaching divide-by-more-than-two search strategies",
      "Optimization problems with a single peak/valley",
      "Comparing against binary search to show comparison counts matter",
    ],
    advantages: [
      "Fewer iterations than binary search (log₃ n rounds)",
      "O(1) memory",
      "Directly generalizes to unimodal-function optimization",
    ],
    disadvantages: [
      "More total comparisons than binary search on arrays",
      "Requires sorted data",
      "More complex bookkeeping (two midpoints)",
      "Rarely the best choice for plain array search",
    ],
    commonMistakes: [
      "Assuming it beats binary search — it does slightly more comparisons.",
      "Off-by-one errors updating lo/hi around m1 and m2.",
      "Forgetting to check both probe points for equality.",
      "Using integer division incorrectly for the thirds.",
    ],
    interviewQuestions: [
      "Why does ternary search do more comparisons than binary search despite fewer rounds?",
      "How is ternary search applied to find the maximum of a unimodal function?",
      "Derive the number of comparisons for ternary vs binary search.",
      "When, if ever, is ternary search preferable for array search?",
    ],
    summary:
      "Ternary search divides a sorted range into thirds using two probes, discarding up to two-thirds each round in O(log₃ n) iterations. On arrays it needs slightly more comparisons than binary search; its real value is optimizing unimodal functions.",
    quiz: [
      { question: "Ternary search divides the range into…", options: ["Two halves", "Three parts", "Four quarters", "√n blocks"], answer: 1, explanation: "It uses two midpoints to split the interval into thirds." },
      { question: "Compared to binary search, ternary search does…", options: ["Fewer comparisons overall", "Slightly more comparisons overall", "Exactly the same", "Quadratic comparisons"], answer: 1, explanation: "Two comparisons per round outweigh the reduction in rounds." },
      { question: "Each round, ternary search can discard up to…", options: ["Half the range", "Two-thirds of the range", "One element", "The whole range"], answer: 1, explanation: "It keeps only one of the three parts (or the middle third)." },
      { question: "Ternary search's most important real application is…", options: ["Sorting", "Finding the extremum of a unimodal function", "Hashing", "Graph traversal"], answer: 1, explanation: "It efficiently locates the peak/valley of a single-peaked function." },
      { question: "Ternary search requires the array to be…", options: ["Unsorted", "Sorted", "All equal", "A power of three"], answer: 1, explanation: "Ordered data is needed to decide which third to keep." },
    ],
  },
  contentAr: {
    overview: `يقسم البحث الثلاثي مجالًا مرتبًا إلى ثلاثة أجزاء بدلًا من جزأين. فهو يحسب نقطتي فحص، m1 و m2، تقسمان المجال إلى أثلاث، ويقارن الهدف بكليهما. ووفقًا للنتيجة يتخلص من جزء أو جزأين من الثلاثة ويكرر على ما تبقى.

مع أنه يستبعد ثلثي المجال في كل جولة (مقابل نصف واحد للبحث الثنائي)، فإنه يستخدم مقارنتين لكل جولة بدلًا من واحدة. وبحساب الأمر، يُجري البحث الثلاثي نحو 2·log₃ n مقارنة مقابل log₂ n للبحث الثنائي — وبما أن 2/ln 3 > 1/ln 2، فإن البحث الثلاثي يُجري في الواقع مقارنات أكثر قليلًا. وهو في المصفوفات ذو أهمية نظرية وتعليمية أساسًا؛ أما قريبه الأهم فهو البحث الثلاثي على دالة أحادية النمط لإيجاد قيمة قصوى.`,
    howItWorks: [
      "قسّم المجال [lo, hi] إلى أثلاث بـ m1 = lo + (hi−lo)/3 و m2 = hi − (hi−lo)/3.",
      "إذا كان الهدف يساوي a[m1] أو a[m2]، فأعِد ذلك الفهرس.",
      "إذا كان الهدف أصغر من a[m1]، فاحتفظ بالثلث الأول فقط.",
      "إذا كان أكبر من a[m2]، فاحتفظ بالثلث الأخير فقط.",
      "خلاف ذلك احتفظ بالثلث الأوسط، وكرّر حتى يفرغ المجال.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log₃ n)", worst: "O(log₃ n)" },
      space: "O(1)",
      notes: "جولات أقل من البحث الثنائي (log₃ n)، لكن مقارنتين في كل جولة ← مقارنات إجمالية أكثر قليلًا من البحث الثنائي. يتطلب بيانات مرتبة.",
    },
    applications: [
      "إيجاد القيمة القصوى لدالة أحادية النمط (استخدامه الحقيقي الأساسي)",
      "تدريس استراتيجيات البحث بالقسمة على أكثر من اثنين",
      "مسائل التحسين ذات قمة/قاع واحد",
      "المقارنة مع البحث الثنائي لإظهار أهمية عدد المقارنات",
    ],
    advantages: [
      "تكرارات أقل من البحث الثنائي (log₃ n جولة)",
      "ذاكرة O(1)",
      "يتعمم مباشرةً إلى تحسين الدوال أحادية النمط",
    ],
    disadvantages: [
      "مقارنات إجمالية أكثر من البحث الثنائي على المصفوفات",
      "يتطلب بيانات مرتبة",
      "مسك دفاتر أكثر تعقيدًا (نقطتا منتصف)",
      "نادرًا ما يكون الخيار الأفضل لبحث المصفوفات العادي",
    ],
    commonMistakes: [
      "افتراض أنه يتفوق على البحث الثنائي — إنه يُجري مقارنات أكثر قليلًا.",
      "أخطاء الانزياح بمقدار واحد عند تحديث lo/hi حول m1 و m2.",
      "نسيان فحص كلتا نقطتي الفحص للتساوي.",
      "استخدام القسمة الصحيحة بشكل خاطئ للأثلاث.",
    ],
    interviewQuestions: [
      "لماذا يُجري البحث الثلاثي مقارنات أكثر من البحث الثنائي رغم جولاته الأقل؟",
      "كيف يُطبَّق البحث الثلاثي لإيجاد القيمة العظمى لدالة أحادية النمط؟",
      "اشتق عدد المقارنات للبحث الثلاثي مقابل الثنائي.",
      "متى، إن وُجِد، يُفضَّل البحث الثلاثي لبحث المصفوفات؟",
    ],
    summary:
      "يقسم البحث الثلاثي مجالًا مرتبًا إلى أثلاث بنقطتي فحص، متخلصًا مما يصل إلى ثلثين في كل جولة في O(log₃ n) من التكرارات. وهو على المصفوفات يحتاج مقارنات أكثر قليلًا من البحث الثنائي؛ وقيمته الحقيقية في تحسين الدوال أحادية النمط.",
    quiz: [
      { question: "يقسم البحث الثلاثي المجال إلى…", options: ["نصفين", "ثلاثة أجزاء", "أربعة أرباع", "كتل بحجم √n"], answer: 1, explanation: "يستخدم نقطتي منتصف لتقسيم المجال إلى أثلاث." },
      { question: "مقارنةً بالبحث الثنائي، يُجري البحث الثلاثي…", options: ["مقارنات أقل إجمالًا", "مقارنات أكثر قليلًا إجمالًا", "العدد نفسه تمامًا", "مقارنات تربيعية"], answer: 1, explanation: "المقارنتان في كل جولة ترجحان على تقليل عدد الجولات." },
      { question: "في كل جولة، يمكن للبحث الثلاثي أن يتخلص مما يصل إلى…", options: ["نصف المجال", "ثلثي المجال", "عنصر واحد", "المجال بأكمله"], answer: 1, explanation: "يحتفظ بواحد فقط من الأجزاء الثلاثة (أو الثلث الأوسط)." },
      { question: "أهم تطبيق حقيقي للبحث الثلاثي هو…", options: ["الترتيب", "إيجاد القيمة القصوى لدالة أحادية النمط", "التجزئة", "اجتياز الرسم البياني"], answer: 1, explanation: "يحدد بكفاءة قمة/قاع دالة ذات ذروة واحدة." },
      { question: "يتطلب البحث الثلاثي أن تكون المصفوفة…", options: ["غير مرتبة", "مرتبة", "كلها متساوية", "قوة للعدد ثلاثة"], answer: 1, explanation: "البيانات المرتبة لازمة لتقرير أي ثلث يُحتفَظ به." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values (auto-sorted)", placeholder: "e.g. 1, 4, 7, 9, 12, 15, 20, 25, 30", help: "2–40 numbers; sorted before searching." },
    { key: "target", label: "Target", placeholder: "12" },
  ],
  defaultInput: (level, rng) => {
    const values = randomArray(level, rng, { sorted: true });
    const target = rng.next() < 0.7 ? rng.pick(values) : rng.int(1, 99);
    return { values, target };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 numbers.");
    const target = Number((fields.target ?? "").trim());
    if (!Number.isFinite(target)) throw new Error("Enter a valid numeric target.");
    return { values, target };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), target: String(input.target) }),
  generate,
};

export default mod;
