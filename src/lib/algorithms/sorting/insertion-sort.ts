import type { AlgorithmModule, ArrayFrame, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";
import { arrayFrame } from "../step-helpers";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let shifts = 0;
  const counters = () => ({ comparisons, shifts });

  steps.push({ frame: arrayFrame(a, { 0: "sorted" }, { sortedTo: 1 }), description: `The first element is a trivially sorted prefix. Insert each following element into it.`, descriptionAr: `العنصر الأول بادئة مرتبة بداهةً. أدرج كل عنصر تالٍ فيها.`, codeLine: 0, counters: counters() });

  for (let i = 1; i < n; i++) {
    const key = a[i];
    steps.push({ frame: arrayFrame(a, { [i]: "active" }, { sortedTo: i }), description: `Take key = a[${i}] = ${key}; find where it belongs in the sorted prefix.`, descriptionAr: `خذ المفتاح = a[${i}] = ${key}؛ أوجد موضعه في البادئة المرتبة.`, codeLine: 1, counters: counters() });
    let j = i - 1;
    while (j >= 0) {
      comparisons++;
      steps.push({ frame: arrayFrame(a, { [j]: "compare", [j + 1]: "active" }, { sortedTo: i }), description: `Compare key ${key} with a[${j}] = ${a[j]}.`, descriptionAr: `قارن المفتاح ${key} مع a[${j}] = ${a[j]}.`, codeLine: 3, counters: counters() });
      if (a[j] > key) {
        a[j + 1] = a[j];
        shifts++;
        steps.push({ frame: arrayFrame(a, { [j]: "swap", [j + 1]: "swap" }, { sortedTo: i }), description: `${a[j]} > ${key}, shift it right.`, descriptionAr: `${a[j]} > ${key}، أزحه يمينًا.`, codeLine: 4, counters: counters() });
        j--;
      } else {
        break;
      }
    }
    a[j + 1] = key;
    steps.push({ frame: arrayFrame(a, { [j + 1]: "found" }, { sortedTo: i + 1 }), description: `Insert key ${key} at position ${j + 1}.`, descriptionAr: `أدرج المفتاح ${key} في الموضع ${j + 1}.`, codeLine: 5, counters: counters() });
  }
  steps.push({ frame: arrayFrame(a, {}, { sortedTo: n }), description: `Sorted with ${comparisons} comparisons and ${shifts} shifts.`, descriptionAr: `اكتمل الترتيب بـ ${comparisons} مقارنة و${shifts} إزاحة.`, codeLine: 6, counters: counters() });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "insertion-sort",
  title: "Insertion Sort",
  titleAr: "ترتيب الإدراج",
  category: "sorting",
  difficulty: "Beginner",
  tags: ["comparison sort", "stable", "in-place", "adaptive"],
  tagsAr: ["ترتيب بالمقارنة", "مستقر", "في المكان", "متكيّف"],
  summary: "Builds a sorted prefix one element at a time, shifting larger elements right to open a slot for each key.",
  summaryAr: "يبني بادئة مرتبة عنصرًا تلو الآخر، مزيحًا العناصر الأكبر يمينًا ليفتح خانة لكل مفتاح.",
  renderer: "array",
  pseudocode: [
    "procedure insertionSort(a[0..n-1])",
    "  for i = 1 to n-1",
    "    key = a[i]; j = i-1",
    "    while j >= 0 and a[j] > key",
    "      a[j+1] = a[j]; j = j-1   // shift",
    "    a[j+1] = key               // insert",
    "  return a",
  ],
  code: {
    pseudocode: `procedure insertionSort(a[0..n-1])
  for i = 1 to n-1
    key = a[i]; j = i-1
    while j >= 0 and a[j] > key
      a[j+1] = a[j]; j = j-1
    a[j+1] = key
  return a`,
    c: `void insertion_sort(int a[], int n) {
    for (int i = 1; i < n; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}`,
    cpp: `#include <vector>

void insertionSort(std::vector<int>& a) {
    for (size_t i = 1; i < a.size(); ++i) {
        int key = a[i];
        int j = static_cast<int>(i) - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; --j; }
        a[j + 1] = key;
    }
}`,
    java: `static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}`,
    python: `def insertion_sort(a: list[int]) -> list[int]:
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a`,
    javascript: `function insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
  return a;
}`,
    typescript: `function insertionSort(a: number[]): number[] {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
  return a;
}`,
    csharp: `static void InsertionSort(int[] a) {
    for (int i = 1; i < a.Length; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}`,
    go: `func insertionSort(a []int) {
	for i := 1; i < len(a); i++ {
		key := a[i]
		j := i - 1
		for j >= 0 && a[j] > key {
			a[j+1] = a[j]
			j--
		}
		a[j+1] = key
	}
}`,
    rust: `fn insertion_sort(a: &mut [i32]) {
    for i in 1..a.len() {
        let key = a[i];
        let mut j = i;
        while j > 0 && a[j - 1] > key {
            a[j] = a[j - 1];
            j -= 1;
        }
        a[j] = key;
    }
}`,
    kotlin: `fun insertionSort(a: IntArray) {
    for (i in 1 until a.size) {
        val key = a[i]
        var j = i - 1
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j-- }
        a[j + 1] = key
    }
}`,
    swift: `func insertionSort(_ a: inout [Int]) {
    for i in 1..<a.count {
        let key = a[i]
        var j = i - 1
        while j >= 0 && a[j] > key { a[j + 1] = a[j]; j -= 1 }
        a[j + 1] = key
    }
}`,
  },
  content: {
    overview: `Insertion sort grows a sorted prefix one element at a time. For each new element (the "key"), it slides larger elements of the prefix one slot to the right until it finds the correct spot, then drops the key in. It is exactly how most people sort a hand of playing cards.

It shines on small or nearly-sorted inputs: if the array is almost ordered, each key barely moves, giving near-linear performance. For this reason it is the algorithm many libraries switch to for small subarrays inside quicksort or Timsort.`,
    howItWorks: [
      "The first element alone forms a sorted prefix.",
      "Pick the next element as the key.",
      "Shift every prefix element greater than the key one position right.",
      "Drop the key into the gap that opens up.",
      "Repeat until every element has been inserted.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes: "Best case O(n) on already-sorted input (one comparison per element). Worst case O(n²) on reverse-sorted input. The number of shifts equals the number of inversions.",
    },
    applications: [
      "Sorting small arrays (often the base case inside quicksort/Timsort)",
      "Nearly-sorted or streaming data where elements arrive in near-order",
      "Online sorting — inserting into an already-sorted list as data arrives",
      "Situations needing a stable, in-place sort with tiny code footprint",
    ],
    advantages: [
      "Adaptive: O(n) on nearly-sorted input",
      "Stable — equal keys keep their order",
      "In-place, O(1) extra memory",
      "Efficient for small n and simple to implement",
      "Online: can sort as elements arrive",
    ],
    disadvantages: [
      "O(n²) on average and worst case",
      "Many element shifts on reverse-sorted data",
      "Impractical for large unsorted datasets",
    ],
    commonMistakes: [
      "Overwriting the key before shifting — you must save a[i] first.",
      "Using j >= 0 without also checking a[j] > key, causing extra work or errors.",
      "Swapping instead of shifting, doing ~3× the writes.",
      "Off-by-one when placing the key (it goes at j+1, not j).",
    ],
    interviewQuestions: [
      "Why is insertion sort O(n) on an already-sorted array?",
      "How does the number of shifts relate to the number of inversions?",
      "Why do hybrid sorts (Timsort, introsort) fall back to insertion sort for small subarrays?",
      "How would you use binary search to reduce comparisons, and why doesn't it reduce the asymptotic time?",
    ],
    summary:
      "Insertion sort inserts each element into a growing sorted prefix by shifting larger elements right. Stable, in-place, adaptive (O(n) best case), and excellent for small or nearly-sorted inputs — which is why it backs the base case of faster hybrid sorts.",
    quiz: [
      { question: "What is the best-case time complexity of insertion sort?", options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "On sorted input each key triggers a single comparison and no shifts — linear time." },
      { question: "The number of shifts insertion sort performs equals…", options: ["n", "the number of inversions", "n log n", "n²"], answer: 1, explanation: "Each shift removes exactly one inversion between the key and a prefix element." },
      { question: "Insertion sort is…", options: ["unstable", "stable", "stable only for distinct keys", "never in-place"], answer: 1, explanation: "It only moves elements strictly greater than the key, so equal keys retain their order." },
      { question: "Why do hybrid sorts use insertion sort for small subarrays?", options: ["It has the best asymptotic bound", "Low overhead and great cache behavior on small n", "It needs no comparisons", "It is the only stable sort"], answer: 1, explanation: "For small n its constant factors and locality beat asymptotically faster sorts." },
      { question: "Reverse-sorted input causes insertion sort to run in…", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: 2, explanation: "Every key must shift past the entire prefix, giving n(n−1)/2 operations." },
    ],
  },
  contentAr: {
    overview: `ينمّي ترتيب الإدراج بادئة مرتبة عنصرًا تلو الآخر. لكل عنصر جديد ("المفتاح")، يزيح عناصر البادئة الأكبر منه خانة واحدة يمينًا حتى يجد الموضع الصحيح، ثم يضع المفتاح فيه. هذه بالضبط الطريقة التي يرتب بها معظم الناس أوراق اللعب في أيديهم.

يتألق على المدخلات الصغيرة أو شبه المرتبة: إذا كانت المصفوفة شبه مرتبة، يتحرك كل مفتاح بالكاد، فيعطي أداءً شبه خطي. لهذا السبب تتحول إليه مكتبات كثيرة للمصفوفات الفرعية الصغيرة داخل الترتيب السريع أو Timsort.`,
    howItWorks: [
      "العنصر الأول وحده يشكّل بادئة مرتبة.",
      "اختر العنصر التالي كمفتاح.",
      "أزح كل عنصر في البادئة أكبر من المفتاح خانة واحدة يمينًا.",
      "ضع المفتاح في الفجوة التي تفتحت.",
      "كرر حتى يُدرَج كل عنصر.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes: "أفضل حالة O(n) على مدخلات مرتبة مسبقًا (مقارنة واحدة لكل عنصر). أسوأ حالة O(n²) على مدخلات معكوسة الترتيب. عدد الإزاحات يساوي عدد الانقلابات.",
    },
    applications: [
      "ترتيب المصفوفات الصغيرة (غالبًا الحالة الأساسية داخل الترتيب السريع/Timsort)",
      "البيانات شبه المرتبة أو المتدفقة حيث تصل العناصر شبه مرتبة",
      "الترتيب الفوري (online) — الإدراج في قائمة مرتبة بالفعل مع وصول البيانات",
      "المواقف التي تحتاج ترتيبًا مستقرًا وفي المكان بحجم كود ضئيل",
    ],
    advantages: [
      "متكيّف: O(n) على مدخلات شبه مرتبة",
      "مستقر — المفاتيح المتساوية تحافظ على ترتيبها",
      "في المكان، ذاكرة إضافية O(1)",
      "فعّال لـ n الصغيرة وبسيط التنفيذ",
      "فوري: يمكنه الترتيب مع وصول العناصر",
    ],
    disadvantages: [
      "O(n²) في المتوسط وأسوأ حالة",
      "إزاحات عديدة على البيانات معكوسة الترتيب",
      "غير عملي لمجموعات البيانات الكبيرة غير المرتبة",
    ],
    commonMistakes: [
      "الكتابة فوق المفتاح قبل الإزاحة — يجب حفظ a[i] أولًا.",
      "استخدام j >= 0 دون فحص a[j] > key أيضًا، مما يسبب عملًا إضافيًا أو أخطاء.",
      "التبديل بدلًا من الإزاحة، مما يُجري نحو 3 أضعاف عمليات الكتابة.",
      "خطأ انزياح بمقدار واحد عند وضع المفتاح (يوضع عند j+1، وليس j).",
    ],
    interviewQuestions: [
      "لماذا ترتيب الإدراج O(n) على مصفوفة مرتبة بالفعل؟",
      "كيف يرتبط عدد الإزاحات بعدد الانقلابات؟",
      "لماذا تلجأ الترتيبات الهجينة (Timsort، introsort) إلى ترتيب الإدراج للمصفوفات الفرعية الصغيرة؟",
      "كيف تستخدم البحث الثنائي لتقليل المقارنات، ولماذا لا يقلّل ذلك الزمن التقاربي؟",
    ],
    summary:
      "يُدرج ترتيب الإدراج كل عنصر في بادئة مرتبة متنامية بإزاحة العناصر الأكبر يمينًا. مستقر، في المكان، متكيّف (أفضل حالة O(n))، وممتاز للمدخلات الصغيرة أو شبه المرتبة — ولهذا يدعم الحالة الأساسية للترتيبات الهجينة الأسرع.",
    quiz: [
      { question: "ما التعقيد الزمني في أفضل حالة لترتيب الإدراج؟", options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 1, explanation: "على مدخلات مرتبة يسبب كل مفتاح مقارنة واحدة فقط ودون إزاحات — زمن خطي." },
      { question: "عدد الإزاحات التي يُجريها ترتيب الإدراج يساوي…", options: ["n", "عدد الانقلابات", "n log n", "n²"], answer: 1, explanation: "كل إزاحة تزيل انقلابًا واحدًا بالضبط بين المفتاح وعنصر في البادئة." },
      { question: "ترتيب الإدراج…", options: ["غير مستقر", "مستقر", "مستقر فقط للمفاتيح المتمايزة", "ليس في المكان أبدًا"], answer: 1, explanation: "يحرّك فقط العناصر الأكبر من المفتاح بشكل صارم، فتحتفظ المفاتيح المتساوية بترتيبها." },
      { question: "لماذا تستخدم الترتيبات الهجينة ترتيب الإدراج للمصفوفات الفرعية الصغيرة؟", options: ["لديه أفضل حد تقاربي", "عبء منخفض وسلوك ذاكرة مؤقتة ممتاز عند n الصغيرة", "لا يحتاج مقارنات", "هو الترتيب المستقر الوحيد"], answer: 1, explanation: "عند n الصغيرة، عوامله الثابتة وموضعيته تتفوق على الترتيبات الأسرع تقاربيًا." },
      { question: "المدخلات معكوسة الترتيب تجعل ترتيب الإدراج يعمل بزمن…", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: 2, explanation: "يجب على كل مفتاح أن يتجاوز البادئة كاملة إزاحةً، فيعطي n(n−1)/2 عملية." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 12, 11, 13, 5, 6", help: "2–40 numbers, comma or space separated." }],
  defaultInput: (level, rng) => ({ values: randomArray(level, rng) }),
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -999, max: 999, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 numbers to sort.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
