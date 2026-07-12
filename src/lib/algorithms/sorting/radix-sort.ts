import type { AlgorithmModule, ArrayFrame, AuxRow, CellState, Step } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

const PLACE_NAME = ["ones", "tens", "hundreds", "thousands"];
const PLACE_NAME_AR = ["الآحاد", "العشرات", "المئات", "الآلاف"];

function generate(input: Input): Step<ArrayFrame>[] {
  let a = [...input.values];
  const n = a.length;
  const max = Math.max(...a);
  const steps: Step<ArrayFrame>[] = [];
  let writes = 0;
  const counters = () => ({ writes, passes: passNo });
  let passNo = 0;

  const bucketRows = (buckets: number[][], activeDigit?: number): AuxRow[] =>
    buckets.map((b, d) => {
      const states: Record<number, CellState> = activeDigit === d ? { 0: "active" } : {};
      return { label: `bucket ${d}`, values: b.length ? [...b] : ["—"], states };
    });

  const snap = (states: Record<number, CellState>, aux: AuxRow[], description: string, codeLine: number, descriptionAr?: string) => {
    steps.push({ frame: { values: [...a], states, aux }, description, descriptionAr, codeLine, counters: counters() });
  };

  snap({}, [], `Radix sort (LSD): stably sort by each digit from least to most significant.`, 0, `ترتيب الأساس (LSD): رتّب بثبات حسب كل رقم من الأقل أهمية إلى الأكثر أهمية.`);

  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    passNo++;
    const place = PLACE_NAME[Math.log10(exp)] ?? `10^${Math.log10(exp)}`;
    const placeAr = PLACE_NAME_AR[Math.log10(exp)] ?? `10^${Math.log10(exp)}`;
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    snap({}, bucketRows(buckets), `Pass ${passNo}: distribute by the ${place} digit.`, 1, `المرور ${passNo}: وزّع حسب رقم خانة ${placeAr}.`);
    for (let i = 0; i < n; i++) {
      const digit = Math.floor(a[i] / exp) % 10;
      buckets[digit].push(a[i]);
      snap({ [i]: "compare" }, bucketRows(buckets, digit), `a[${i}] = ${a[i]} → ${place} digit ${digit}, drop into bucket ${digit}.`, 2, `a[${i}] = ${a[i]} ← رقم خانة ${placeAr} هو ${digit}، ضعه في الدلو ${digit}.`);
    }
    // gather
    const gathered: number[] = [];
    for (let d = 0; d < 10; d++) for (const v of buckets[d]) gathered.push(v);
    a = gathered;
    writes += n;
    snap({}, bucketRows(buckets), `Gather buckets 0→9 in order — array is now sorted by digits up to the ${place} place.`, 3, `اجمع الدلاء من 0←9 بالترتيب — المصفوفة الآن مرتبة حسب الأرقام حتى خانة ${placeAr}.`);
  }
  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  snap(sorted, [], `Sorted in O(d·(n + 10)) with d = ${passNo} digit passes — no comparisons.`, 4, `اكتمل الترتيب بزمن O(d·(n + 10)) حيث d = ${passNo} مرورًا رقميًا — دون مقارنات.`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "radix-sort",
  title: "Radix Sort (LSD)",
  titleAr: "ترتيب الأساس (LSD)",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["non-comparison", "stable", "digit-by-digit", "linear-ish"],
  tagsAr: ["ليس بالمقارنة", "مستقر", "رقمًا برقم", "شبه خطي"],
  summary: "Sorts integers digit by digit from least to most significant, using a stable bucket pass for each digit.",
  summaryAr: "يرتب الأعداد الصحيحة رقمًا برقم من الأقل إلى الأكثر أهمية، مستخدمًا مرور دلاء مستقرًا لكل رقم.",
  renderer: "array",
  pseudocode: [
    "procedure radixSort(a)",
    "  for each digit place (exp = 1, 10, 100, …):",
    "    distribute a into 10 buckets by that digit",
    "    gather buckets 0→9 back into a (stable)",
    "  // sorted once the most significant digit is processed",
    "  return a",
  ],
  code: {
    pseudocode: `for exp = 1; max/exp > 0; exp *= 10:
  buckets[0..9] = empty
  for x in a: buckets[(x / exp) % 10].append(x)
  a = concat(buckets[0..9])`,
    c: `void radix_sort(int a[], int n) {
    int max = a[0];
    for (int i = 1; i < n; i++) if (a[i] > max) max = a[i];
    int *out = malloc(n*sizeof(int));
    for (int exp = 1; max/exp > 0; exp *= 10) {
        int count[10] = {0};
        for (int i = 0; i < n; i++) count[(a[i]/exp)%10]++;
        for (int i = 1; i < 10; i++) count[i] += count[i-1];
        for (int i = n-1; i >= 0; i--) out[--count[(a[i]/exp)%10]] = a[i];
        for (int i = 0; i < n; i++) a[i] = out[i];
    }
    free(out);
}`,
    cpp: `void radixSort(std::vector<int>& a) {
    int mx = *std::max_element(a.begin(), a.end());
    std::vector<int> out(a.size());
    for (int exp = 1; mx/exp > 0; exp *= 10) {
        int count[10] = {0};
        for (int x : a) count[(x/exp)%10]++;
        for (int i = 1; i < 10; i++) count[i] += count[i-1];
        for (int i = a.size()-1; i >= 0; --i) out[--count[(a[i]/exp)%10]] = a[i];
        a = out;
    }
}`,
    java: `static void radixSort(int[] a) {
    int max = Arrays.stream(a).max().getAsInt();
    int[] out = new int[a.length];
    for (int exp = 1; max/exp > 0; exp *= 10) {
        int[] count = new int[10];
        for (int x : a) count[(x/exp)%10]++;
        for (int i = 1; i < 10; i++) count[i] += count[i-1];
        for (int i = a.length-1; i >= 0; i--) out[--count[(a[i]/exp)%10]] = a[i];
        System.arraycopy(out, 0, a, 0, a.length);
    }
}`,
    python: `def radix_sort(a: list[int]) -> list[int]:
    if not a: return a
    exp = 1
    mx = max(a)
    while mx // exp > 0:
        buckets = [[] for _ in range(10)]
        for x in a:
            buckets[(x // exp) % 10].append(x)
        a = [x for b in buckets for x in b]
        exp *= 10
    return a`,
    javascript: `function radixSort(a) {
  if (!a.length) return a;
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const buckets = Array.from({ length: 10 }, () => []);
    for (const x of a) buckets[Math.floor(x / exp) % 10].push(x);
    a = [].concat(...buckets);
  }
  return a;
}`,
    typescript: `function radixSort(a: number[]): number[] {
  if (!a.length) return a;
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    for (const x of a) buckets[Math.floor(x / exp) % 10].push(x);
    a = ([] as number[]).concat(...buckets);
  }
  return a;
}`,
    csharp: `static int[] RadixSort(int[] a) {
    if (a.Length == 0) return a;
    int max = a.Max();
    for (int exp = 1; max/exp > 0; exp *= 10) {
        var buckets = new List<int>[10];
        for (int i = 0; i < 10; i++) buckets[i] = new List<int>();
        foreach (int x in a) buckets[(x/exp)%10].Add(x);
        a = buckets.SelectMany(b => b).ToArray();
    }
    return a;
}`,
    go: `func radixSort(a []int) []int {
	if len(a) == 0 { return a }
	max := a[0]
	for _, x := range a { if x > max { max = x } }
	for exp := 1; max/exp > 0; exp *= 10 {
		buckets := make([][]int, 10)
		for _, x := range a { d := (x / exp) % 10; buckets[d] = append(buckets[d], x) }
		a = a[:0]
		for _, b := range buckets { a = append(a, b...) }
	}
	return a
}`,
    rust: `fn radix_sort(mut a: Vec<u32>) -> Vec<u32> {
    if a.is_empty() { return a; }
    let max = *a.iter().max().unwrap();
    let mut exp = 1u32;
    while max / exp > 0 {
        let mut buckets: Vec<Vec<u32>> = vec![Vec::new(); 10];
        for &x in &a { buckets[((x / exp) % 10) as usize].push(x); }
        a = buckets.into_iter().flatten().collect();
        exp *= 10;
    }
    a
}`,
    kotlin: `fun radixSort(a: IntArray): IntArray {
    if (a.isEmpty()) return a
    val max = a.max()
    var arr = a.toList()
    var exp = 1
    while (max / exp > 0) {
        val buckets = Array(10) { mutableListOf<Int>() }
        for (x in arr) buckets[(x / exp) % 10].add(x)
        arr = buckets.flatMap { it }
        exp *= 10
    }
    return arr.toIntArray()
}`,
    swift: `func radixSort(_ a: [Int]) -> [Int] {
    guard let max = a.max() else { return a }
    var arr = a
    var exp = 1
    while max / exp > 0 {
        var buckets = [[Int]](repeating: [], count: 10)
        for x in arr { buckets[(x / exp) % 10].append(x) }
        arr = buckets.flatMap { $0 }
        exp *= 10
    }
    return arr
}`,
  },
  content: {
    overview: `Radix sort sorts integers by processing their digits one place at a time. The LSD (least-significant-digit) variant starts with the ones digit, then the tens, then the hundreds, and so on. In each pass it distributes numbers into ten buckets by the current digit and then gathers the buckets back in order. Crucially, each pass must be stable so that the ordering achieved by earlier (less significant) digits is preserved.

Because it uses bucketing rather than comparisons, radix sort runs in O(d·(n + b)) time, where d is the number of digits and b is the base (10 here). When the number of digits is small and fixed, this is effectively linear — often faster than any comparison sort for large sets of bounded-size integers.`,
    howItWorks: [
      "Find the maximum value to know how many digit places d there are.",
      "For each place (ones, tens, hundreds, …), distribute numbers into 10 buckets by that digit.",
      "Gather the buckets in order 0→9 back into the array — this pass must be stable.",
      "Move to the next more-significant digit and repeat.",
      "After the most significant digit is processed, the array is fully sorted.",
    ],
    complexity: {
      time: { best: "O(d·(n + b))", average: "O(d·(n + b))", worst: "O(d·(n + b))" },
      space: "O(n + b)",
      notes: "d = number of digits, b = base (10). Effectively linear when d is a small constant. Requires a stable per-digit sort (usually counting sort).",
    },
    applications: [
      "Sorting large sets of fixed-width integers or strings",
      "Sorting keys like IDs, postal codes, or dates",
      "Suffix-array construction and other string algorithms",
      "Any bounded-key sorting where beating O(n log n) matters",
    ],
    advantages: [
      "Linear-time O(d·n) for bounded-width keys",
      "Stable",
      "No comparisons",
      "Predictable, data-independent performance",
    ],
    disadvantages: [
      "Only for integers/strings with a digit representation",
      "Needs O(n + b) extra memory per pass",
      "The per-digit pass must be stable or it breaks",
      "Overhead can exceed comparison sorts for small n or wide keys",
    ],
    commonMistakes: [
      "Using an unstable per-digit sort, corrupting earlier ordering.",
      "Sorting from most-significant digit without the recursive bucketing MSD needs.",
      "Ignoring that d (digit count) affects the constant significantly.",
      "Not handling negative numbers (needs an offset or sign handling).",
    ],
    interviewQuestions: [
      "Why must each digit pass in LSD radix sort be stable?",
      "How does radix sort achieve linear time despite the sorting lower bound?",
      "Contrast LSD and MSD radix sort.",
      "How would you extend radix sort to handle negative integers?",
    ],
    summary:
      "Radix sort (LSD) sorts integers digit by digit from least to most significant, using a stable bucket pass each round. It runs in O(d·(n + b)) — effectively linear for bounded-width keys — and is stable, but works only on digit-representable keys.",
    quiz: [
      { question: "LSD radix sort processes digits from…", options: ["Most to least significant", "Least to most significant", "Random order", "Middle out"], answer: 1, explanation: "It starts at the ones place and moves toward the most significant digit." },
      { question: "Each per-digit pass must be…", options: ["Unstable", "Stable", "Recursive", "Comparison-based"], answer: 1, explanation: "Stability preserves the order established by earlier, less significant digits." },
      { question: "Radix sort's time complexity is…", options: ["O(n log n)", "O(d·(n + b))", "O(n²)", "O(2ⁿ)"], answer: 1, explanation: "d digit passes each doing O(n + b) bucket work." },
      { question: "Radix sort works directly on…", options: ["Any comparable objects", "Integers/strings with a digit representation", "Only floats", "Only sorted data"], answer: 1, explanation: "It relies on extracting digits, so keys must be digit-representable." },
      { question: "The stable per-digit sort commonly used is…", options: ["Quick sort", "Counting sort", "Heap sort", "Merge sort"], answer: 1, explanation: "Counting sort is stable and O(n + b), a perfect fit for each digit pass." },
    ],
  },
  contentAr: {
    overview: `يرتب ترتيب الأساس الأعداد الصحيحة بمعالجة أرقامها خانة تلو الأخرى. الصيغة LSD (الرقم الأقل أهمية أولًا) تبدأ بخانة الآحاد، ثم العشرات، ثم المئات، وهكذا. في كل مرور، يوزّع الأعداد إلى عشرة دلاء حسب الرقم الحالي ثم يجمع الدلاء مجددًا بالترتيب. والمهم أن كل مرور يجب أن يكون مستقرًا كي يُحافَظ على الترتيب الذي حققته الأرقام الأقل أهمية السابقة.

لأنه يستخدم التوزيع في دلاء بدلًا من المقارنات، يعمل ترتيب الأساس بزمن O(d·(n + b))، حيث d عدد الأرقام وb الأساس (10 هنا). عندما يكون عدد الأرقام صغيرًا وثابتًا، يصبح هذا خطيًا فعليًا — وغالبًا أسرع من أي ترتيب بالمقارنة لمجموعات كبيرة من الأعداد الصحيحة محدودة الحجم.`,
    howItWorks: [
      "أوجد القيمة القصوى لمعرفة عدد خانات الأرقام d.",
      "لكل خانة (آحاد، عشرات، مئات، …)، وزّع الأعداد إلى 10 دلاء حسب ذلك الرقم.",
      "اجمع الدلاء بالترتيب من 0←9 مجددًا في المصفوفة — هذا المرور يجب أن يكون مستقرًا.",
      "انتقل إلى الرقم التالي الأكثر أهمية وكرر.",
      "بعد معالجة الرقم الأكثر أهمية، تكون المصفوفة مرتبة بالكامل.",
    ],
    complexity: {
      time: { best: "O(d·(n + b))", average: "O(d·(n + b))", worst: "O(d·(n + b))" },
      space: "O(n + b)",
      notes: "d = عدد الأرقام، b = الأساس (10). خطي فعليًا عندما يكون d ثابتًا صغيرًا. يتطلب ترتيبًا مستقرًا لكل رقم (عادة ترتيب العد).",
    },
    applications: [
      "ترتيب مجموعات كبيرة من الأعداد الصحيحة أو النصوص ثابتة العرض",
      "ترتيب مفاتيح مثل المعرّفات أو الرموز البريدية أو التواريخ",
      "بناء مصفوفة اللواحق وخوارزميات نصية أخرى",
      "أي ترتيب لمفاتيح محدودة حيث يهم التفوق على O(n log n)",
    ],
    advantages: [
      "زمن خطي O(d·n) للمفاتيح محدودة العرض",
      "مستقر",
      "دون مقارنات",
      "أداء قابل للتنبؤ ومستقل عن البيانات",
    ],
    disadvantages: [
      "فقط للأعداد الصحيحة/النصوص ذات تمثيل رقمي",
      "يحتاج ذاكرة إضافية O(n + b) لكل مرور",
      "يجب أن يكون مرور كل رقم مستقرًا وإلا انكسر",
      "قد يتجاوز العبء ترتيبات المقارنة عند n الصغيرة أو المفاتيح الواسعة",
    ],
    commonMistakes: [
      "استخدام ترتيب غير مستقر لكل رقم، مما يفسد الترتيب السابق.",
      "الترتيب من الرقم الأكثر أهمية دون التوزيع العودي الذي تحتاجه MSD.",
      "تجاهل أن d (عدد الأرقام) يؤثر كثيرًا على العامل الثابت.",
      "عدم التعامل مع الأعداد السالبة (يحتاج إزاحة أو معالجة إشارة).",
    ],
    interviewQuestions: [
      "لماذا يجب أن يكون كل مرور رقمي في ترتيب الأساس LSD مستقرًا؟",
      "كيف يحقق ترتيب الأساس زمنًا خطيًا رغم الحد الأدنى لترتيبات المقارنة؟",
      "قارن بين ترتيب الأساس LSD وMSD.",
      "كيف توسّع ترتيب الأساس للتعامل مع الأعداد الصحيحة السالبة؟",
    ],
    summary:
      "يرتب ترتيب الأساس (LSD) الأعداد الصحيحة رقمًا برقم من الأقل إلى الأكثر أهمية، مستخدمًا مرور دلاء مستقرًا في كل جولة. يعمل بزمن O(d·(n + b)) — خطي فعليًا للمفاتيح محدودة العرض — وهو مستقر، لكنه يعمل فقط على مفاتيح قابلة للتمثيل الرقمي.",
    quiz: [
      { question: "ترتيب الأساس LSD يعالج الأرقام من…", options: ["الأكثر إلى الأقل أهمية", "الأقل إلى الأكثر أهمية", "ترتيب عشوائي", "من الوسط للخارج"], answer: 1, explanation: "يبدأ بخانة الآحاد ويتجه نحو الرقم الأكثر أهمية." },
      { question: "يجب أن يكون كل مرور لكل رقم…", options: ["غير مستقر", "مستقرًا", "عوديًا", "قائمًا على المقارنة"], answer: 1, explanation: "الاستقرار يحافظ على الترتيب الذي أنشأته الأرقام الأقل أهمية السابقة." },
      { question: "التعقيد الزمني لترتيب الأساس هو…", options: ["O(n log n)", "O(d·(n + b))", "O(n²)", "O(2ⁿ)"], answer: 1, explanation: "d مرورًا رقميًا كل منها يُجري عمل دلاء O(n + b)." },
      { question: "يعمل ترتيب الأساس مباشرة على…", options: ["أي كائنات قابلة للمقارنة", "أعداد صحيحة/نصوص ذات تمثيل رقمي", "الأعداد العشرية فقط", "البيانات المرتبة فقط"], answer: 1, explanation: "يعتمد على استخراج الأرقام، فيجب أن تكون المفاتيح قابلة للتمثيل الرقمي." },
      { question: "الترتيب المستقر لكل رقم المستخدم عادة هو…", options: ["الترتيب السريع", "ترتيب العد", "ترتيب الكومة", "الترتيب بالدمج"], answer: 1, explanation: "ترتيب العد مستقر وبزمن O(n + b)، ملائم تمامًا لكل مرور رقمي." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values (0–999)", placeholder: "e.g. 170, 45, 75, 90, 802, 24, 2, 66", help: "2–30 non-negative integers up to 999." }],
  defaultInput: (level, rng) => {
    const size = [0, 6, 8, 10, 12, 14][level] ?? 8;
    const cap = [0, 99, 99, 999, 999, 999][level] ?? 999;
    return { values: Array.from({ length: size }, () => rng.int(0, cap)) };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: 0, max: 9999, maxLen: 30 });
    if (values.length < 2) throw new Error("Enter at least 2 non-negative integers.");
    if (!values.every((v) => Number.isInteger(v))) throw new Error("Radix sort needs integer values.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
