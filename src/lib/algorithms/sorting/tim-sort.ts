import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

const MIN_RUN = 4;

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let merges = 0;

  const snap = (
    states: Record<number, CellState>,
    description: string,
    codeLine: number,
    range?: { from: number; to: number },
    descriptionAr?: string,
  ) => {
    steps.push({ frame: { values: [...a], states, range: range ?? null }, description, descriptionAr, codeLine, counters: { comparisons, merges } });
  };

  snap({}, `Tim sort: split the array into runs of size ${MIN_RUN}, sort each with insertion sort, then merge runs in pairs (doubling merge size each pass) — like merge sort, but starting from insertion-sorted runs instead of single elements.`, 0, undefined, `ترتيب تيم: قسّم المصفوفة إلى دفعات (runs) بحجم ${MIN_RUN}، رتّب كل دفعة بترتيب الإدراج، ثم ادمج الدفعات في أزواج (مضاعفًا حجم الدمج كل مرور) — مثل الترتيب بالدمج، لكن بدءًا من دفعات مرتبة بالإدراج بدلًا من عناصر مفردة.`);

  // Phase 1: insertion-sort each run of size MIN_RUN
  for (let start = 0; start < n; start += MIN_RUN) {
    const end = Math.min(start + MIN_RUN - 1, n - 1);
    snap({}, `Run [${start}, ${end}]: sort with insertion sort.`, 1, { from: start, to: end }, `الدفعة [${start}, ${end}]: رتّبها بترتيب الإدراج.`);
    for (let i = start + 1; i <= end; i++) {
      const key = a[i];
      let j = i - 1;
      snap({ [i]: "active" }, `Insert a[${i}] = ${key} into the sorted part of the run.`, 2, { from: start, to: end }, `أدرج a[${i}] = ${key} في الجزء المرتب من الدفعة.`);
      while (j >= start) {
        comparisons++;
        if (a[j] <= key) break;
        a[j + 1] = a[j];
        j--;
        snap({ [j + 1]: "swap" }, `Shift ${a[j + 1]} right.`, 3, { from: start, to: end }, `أزح ${a[j + 1]} يمينًا.`);
      }
      a[j + 1] = key;
    }
    snap({}, `Run [${start}, ${end}] sorted: [${a.slice(start, end + 1).join(", ")}].`, 4, { from: start, to: end }, `اكتمل ترتيب الدفعة [${start}, ${end}]: [${a.slice(start, end + 1).join(", ")}].`);
  }

  // Phase 2: bottom-up merge, doubling run size
  let size = MIN_RUN;
  while (size < n) {
    for (let left = 0; left < n; left += 2 * size) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + 2 * size - 1, n - 1);
      if (mid >= right) continue;
      merges++;
      snap({}, `Merge run [${left}, ${mid}] with run [${mid + 1}, ${right}].`, 5, { from: left, to: right }, `ادمج الدفعة [${left}, ${mid}] مع الدفعة [${mid + 1}, ${right}].`);

      const leftArr = a.slice(left, mid + 1);
      const rightArr = a.slice(mid + 1, right + 1);
      let i = 0;
      let j = 0;
      let k = left;
      while (i < leftArr.length && j < rightArr.length) {
        comparisons++;
        if (leftArr[i] <= rightArr[j]) {
          a[k] = leftArr[i];
          i++;
        } else {
          a[k] = rightArr[j];
          j++;
        }
        snap({ [k]: "compare" }, `Place ${a[k]} at index ${k}.`, 6, { from: left, to: right }, `ضع ${a[k]} عند الفهرس ${k}.`);
        k++;
      }
      while (i < leftArr.length) {
        a[k] = leftArr[i];
        snap({ [k]: "compare" }, `Copy remaining left element ${a[k]} to index ${k}.`, 7, { from: left, to: right }, `انسخ العنصر الأيسر المتبقي ${a[k]} إلى الفهرس ${k}.`);
        i++;
        k++;
      }
      while (j < rightArr.length) {
        a[k] = rightArr[j];
        snap({ [k]: "compare" }, `Copy remaining right element ${a[k]} to index ${k}.`, 7, { from: left, to: right }, `انسخ العنصر الأيمن المتبقي ${a[k]} إلى الفهرس ${k}.`);
        j++;
        k++;
      }
      snap({}, `Merged range [${left}, ${right}]: [${a.slice(left, right + 1).join(", ")}].`, 8, { from: left, to: right }, `اكتمل دمج المجال [${left}, ${right}]: [${a.slice(left, right + 1).join(", ")}].`);
    }
    size *= 2;
  }

  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  snap(sorted, `Sorted with ${merges} merges and ${comparisons} comparisons. Real-world Timsort (Python, Java) also detects naturally-occurring runs and uses galloping mode — this shows the core fixed-run-size skeleton.`, 8, undefined, `اكتمل الترتيب بـ ${merges} عملية دمج و${comparisons} مقارنة. ترتيب تيم الحقيقي (بايثون، جافا) يكتشف أيضًا الدفعات الطبيعية ويستخدم وضع 'القفز السريع' — هذا يعرض الهيكل الأساسي بحجم دفعة ثابت.`);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "tim-sort",
  title: "Tim Sort (Simplified)",
  titleAr: "ترتيب تيم (مبسّط)",
  category: "sorting",
  difficulty: "Advanced",
  tags: ["hybrid sort", "stable", "insertion + merge", "O(n log n)", "real-world"],
  tagsAr: ["ترتيب هجين", "مستقر", "إدراج + دمج", "O(n log n)", "واقعي"],
  summary: "The hybrid behind Python's and Java's default sort: insertion-sort small runs, then merge them like merge sort — stable and fast on partially-sorted data.",
  summaryAr: "الترتيب الهجين خلف الترتيب الافتراضي في بايثون وجافا: يرتب دفعات صغيرة بالإدراج، ثم يدمجها كالترتيب بالدمج — مستقر وسريع على البيانات شبه المرتبة.",
  renderer: "array",
  pseudocode: [
    "procedure timSort(a)  // simplified fixed-run version",
    "  MIN_RUN = 32 (small constant; 4 here for visualization)",
    "  for each block of size MIN_RUN: insertion sort it",
    "  size = MIN_RUN",
    "  while size < n:",
    "    merge adjacent pairs of runs of length 'size' (like merge sort)",
    "    size *= 2",
    "  // real Timsort also detects natural runs and uses galloping merges",
    "  return a",
  ],
  code: {
    pseudocode: `MIN_RUN = 32
for start = 0; start < n; start += MIN_RUN:
  insertionSort(a, start, min(start+MIN_RUN-1, n-1))
size = MIN_RUN
while size < n:
  for left = 0; left < n; left += 2*size:
    mid = min(left+size-1, n-1); right = min(left+2*size-1, n-1)
    merge(a, left, mid, right)
  size *= 2`,
    c: `#define MIN_RUN 32
void insertionSortRange(int* a, int lo, int hi) {
    for (int i = lo + 1; i <= hi; i++) {
        int key = a[i], j = i - 1;
        while (j >= lo && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}
void timSort(int* a, int n) {
    for (int s = 0; s < n; s += MIN_RUN)
        insertionSortRange(a, s, (s + MIN_RUN - 1 < n - 1) ? s + MIN_RUN - 1 : n - 1);
    for (int size = MIN_RUN; size < n; size *= 2)
        for (int left = 0; left < n; left += 2 * size) {
            int mid = (left + size - 1 < n - 1) ? left + size - 1 : n - 1;
            int right = (left + 2 * size - 1 < n - 1) ? left + 2 * size - 1 : n - 1;
            if (mid < right) merge(a, left, mid, right);
        }
}`,
    cpp: `constexpr int MIN_RUN = 32;
void timSort(vector<int>& a) {
    int n = a.size();
    for (int s = 0; s < n; s += MIN_RUN)
        sort(a.begin() + s, a.begin() + min(s + MIN_RUN, n)); // insertion sort in practice
    for (int size = MIN_RUN; size < n; size *= 2)
        for (int left = 0; left < n; left += 2 * size) {
            int mid = min(left + size, n);
            int right = min(left + 2 * size, n);
            if (mid < right) inplace_merge(a.begin() + left, a.begin() + mid, a.begin() + right);
        }
}`,
    java: `static final int MIN_RUN = 32;
static void timSort(int[] a) {
    int n = a.length;
    for (int s = 0; s < n; s += MIN_RUN)
        insertionSort(a, s, Math.min(s + MIN_RUN - 1, n - 1));
    for (int size = MIN_RUN; size < n; size *= 2)
        for (int left = 0; left < n; left += 2 * size) {
            int mid = Math.min(left + size - 1, n - 1);
            int right = Math.min(left + 2 * size - 1, n - 1);
            if (mid < right) merge(a, left, mid, right);
        }
}`,
    python: `MIN_RUN = 32

def insertion_sort(a, lo, hi):
    for i in range(lo + 1, hi + 1):
        key, j = a[i], i - 1
        while j >= lo and a[j] > key:
            a[j + 1] = a[j]; j -= 1
        a[j + 1] = key

def tim_sort(a: list[int]) -> list[int]:
    n = len(a)
    for s in range(0, n, MIN_RUN):
        insertion_sort(a, s, min(s + MIN_RUN - 1, n - 1))
    size = MIN_RUN
    while size < n:
        for left in range(0, n, 2 * size):
            mid = min(left + size - 1, n - 1)
            right = min(left + 2 * size - 1, n - 1)
            if mid < right:
                a[left:right + 1] = merge(a[left:mid + 1], a[mid + 1:right + 1])
        size *= 2
    return a`,
    javascript: `const MIN_RUN = 32;
function insertionSort(a, lo, hi) {
  for (let i = lo + 1; i <= hi; i++) {
    const key = a[i]; let j = i - 1;
    while (j >= lo && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
}
function timSort(a) {
  const n = a.length;
  for (let s = 0; s < n; s += MIN_RUN) insertionSort(a, s, Math.min(s + MIN_RUN - 1, n - 1));
  for (let size = MIN_RUN; size < n; size *= 2)
    for (let left = 0; left < n; left += 2 * size) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + 2 * size - 1, n - 1);
      if (mid < right) merge(a, left, mid, right);
    }
  return a;
}`,
    typescript: `const MIN_RUN = 32;
function insertionSort(a: number[], lo: number, hi: number): void {
  for (let i = lo + 1; i <= hi; i++) {
    const key = a[i]; let j = i - 1;
    while (j >= lo && a[j] > key) { a[j + 1] = a[j]; j--; }
    a[j + 1] = key;
  }
}
function timSort(a: number[]): number[] {
  const n = a.length;
  for (let s = 0; s < n; s += MIN_RUN) insertionSort(a, s, Math.min(s + MIN_RUN - 1, n - 1));
  for (let size = MIN_RUN; size < n; size *= 2)
    for (let left = 0; left < n; left += 2 * size) {
      const mid = Math.min(left + size - 1, n - 1);
      const right = Math.min(left + 2 * size - 1, n - 1);
      if (mid < right) merge(a, left, mid, right);
    }
  return a;
}`,
    csharp: `const int MinRun = 32;
static void TimSort(int[] a) {
    int n = a.Length;
    for (int s = 0; s < n; s += MinRun)
        InsertionSort(a, s, Math.Min(s + MinRun - 1, n - 1));
    for (int size = MinRun; size < n; size *= 2)
        for (int left = 0; left < n; left += 2 * size) {
            int mid = Math.Min(left + size - 1, n - 1);
            int right = Math.Min(left + 2 * size - 1, n - 1);
            if (mid < right) Merge(a, left, mid, right);
        }
}`,
    go: `const MinRun = 32

func timSort(a []int) {
	n := len(a)
	for s := 0; s < n; s += MinRun {
		insertionSort(a, s, min(s+MinRun-1, n-1))
	}
	for size := MinRun; size < n; size *= 2 {
		for left := 0; left < n; left += 2 * size {
			mid := min(left+size-1, n-1)
			right := min(left+2*size-1, n-1)
			if mid < right {
				merge(a, left, mid, right)
			}
		}
	}
}`,
    rust: `const MIN_RUN: usize = 32;
fn tim_sort(a: &mut Vec<i32>) {
    let n = a.len();
    let mut s = 0;
    while s < n {
        insertion_sort(a, s, (s + MIN_RUN - 1).min(n - 1));
        s += MIN_RUN;
    }
    let mut size = MIN_RUN;
    while size < n {
        let mut left = 0;
        while left < n {
            let mid = (left + size - 1).min(n - 1);
            let right = (left + 2 * size - 1).min(n - 1);
            if mid < right { merge(a, left, mid, right); }
            left += 2 * size;
        }
        size *= 2;
    }
}`,
    kotlin: `const val MIN_RUN = 32
fun timSort(a: IntArray) {
    val n = a.size
    var s = 0
    while (s < n) { insertionSort(a, s, minOf(s + MIN_RUN - 1, n - 1)); s += MIN_RUN }
    var size = MIN_RUN
    while (size < n) {
        var left = 0
        while (left < n) {
            val mid = minOf(left + size - 1, n - 1)
            val right = minOf(left + 2 * size - 1, n - 1)
            if (mid < right) merge(a, left, mid, right)
            left += 2 * size
        }
        size *= 2
    }
}`,
    swift: `let MIN_RUN = 32
func timSort(_ a: inout [Int]) {
    let n = a.count
    var s = 0
    while s < n { insertionSort(&a, s, min(s + MIN_RUN - 1, n - 1)); s += MIN_RUN }
    var size = MIN_RUN
    while size < n {
        var left = 0
        while left < n {
            let mid = min(left + size - 1, n - 1)
            let right = min(left + 2 * size - 1, n - 1)
            if mid < right { merge(&a, left, mid, right) }
            left += 2 * size
        }
        size *= 2
    }
}`,
  },
  content: {
    overview: `Timsort is the sorting algorithm behind Python's list.sort()/sorted() and Java's Arrays.sort() for objects — a hybrid designed by Tim Peters in 2002 specifically to exploit the fact that real-world data is often already partially sorted. It combines insertion sort's excellent performance on small/nearly-sorted inputs with merge sort's guaranteed O(n log n) worst case and stability.

The full algorithm detects naturally occurring ascending or descending runs in the input and extends short ones with insertion sort up to a minimum run length (~32-64), then merges runs together using an adaptive "galloping mode" that speeds up merging when one run is consistently winning. This module visualizes the core skeleton with a simplified, fixed-size run length (rather than natural-run detection) to keep the mechanics clear: insertion-sort fixed-size blocks, then repeatedly merge adjacent runs, doubling the merge size each pass — exactly like merge sort, but starting from pre-sorted runs instead of single elements.`,
    howItWorks: [
      "Divide the array into consecutive runs of a minimum size (32-64 in production Timsort; a small constant here for visualization).",
      "Sort each run with insertion sort — cheap and fast because runs are short.",
      "Merge adjacent runs pairwise using the standard merge-sort merge, exactly as in bottom-up merge sort.",
      "Double the merge size each pass and repeat until the whole array is one sorted run.",
      "Real Timsort additionally detects existing ascending/descending runs (skipping insertion sort entirely on already-sorted data) and uses galloping mode to speed up merges when one side dominates.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(n)",
      notes: "Best case O(n) occurs on already-sorted (or already-reverse-sorted) input, since real Timsort detects the single natural run and does no merging at all. This simplified fixed-run version doesn't get that O(n) best case, but the merge phase is still O(n log n) worst case.",
    },
    applications: [
      "Python's built-in sort (list.sort, sorted()) since Python 2.3",
      "Java's Arrays.sort() and Collections.sort() for object arrays (primitives use dual-pivot quicksort)",
      "Android's platform sort and several other language runtimes",
      "Any workload where input is frequently partially pre-sorted (logs, incremental updates)",
    ],
    advantages: [
      "Adapts to existing order in the data — much faster than O(n log n) on nearly-sorted inputs",
      "Stable — equal elements keep their relative order, essential for multi-key sorts",
      "Guaranteed O(n log n) worst case, unlike quicksort's O(n²) worst case",
    ],
    disadvantages: [
      "Significantly more complex to implement correctly than quicksort or merge sort",
      "Uses O(n) auxiliary space for merging, unlike in-place quicksort",
      "The full galloping-mode optimization adds substantial implementation complexity for its speedup",
    ],
    commonMistakes: [
      "Implementing 'Timsort' as literally just merge sort without the insertion-sort-small-runs step, losing the real-world speed advantage.",
      "Choosing MIN_RUN as an arbitrary constant rather than a power of two close to a chosen threshold (production Timsort tunes this carefully).",
      "Forgetting that merge must be stable — using >= instead of > (or vice versa) in the merge comparison flips stability.",
      "Assuming this simplified fixed-run version gets Timsort's O(n) best case — that requires natural run detection, which this visualization omits for clarity.",
    ],
    interviewQuestions: [
      "Why does Timsort combine insertion sort and merge sort instead of using either alone?",
      "What makes Timsort adaptive, and what real-world data patterns does that help with?",
      "Explain merge sort's role in guaranteeing Timsort's O(n log n) worst case.",
      "What is 'galloping mode' and when does it activate?",
      "Why is stability important for a general-purpose language sort function?",
    ],
    summary:
      "Timsort insertion-sorts short runs (fast on small/nearly-sorted data) then merges them like merge sort in doubling passes (guaranteeing O(n log n) worst case) — a stable, adaptive hybrid that powers Python's and Java's default sorts. Production Timsort adds natural-run detection and galloping-mode merges for even better real-world performance; this module visualizes the core insertion+merge skeleton.",
    quiz: [
      { question: "Timsort is a hybrid of which two algorithms?", options: ["Quicksort and heapsort", "Insertion sort and merge sort", "Bubble sort and selection sort", "Radix sort and bucket sort"], answer: 1, explanation: "Small runs are insertion-sorted, then merged together using merge sort's merge step." },
      { question: "Why does Timsort use insertion sort on small runs instead of recursing further?", options: ["Insertion sort is asymptotically faster in general", "Insertion sort has a low constant factor and is fast on small/nearly-sorted inputs", "It's required for stability", "It uses less memory"], answer: 1, explanation: "For small n, insertion sort's simplicity beats the overhead of further recursive splitting." },
      { question: "Timsort's worst-case time complexity is…", options: ["O(n²)", "O(n log n)", "O(n)", "O(2ⁿ)"], answer: 1, explanation: "The merge phase guarantees O(n log n) regardless of input, just like merge sort." },
      { question: "Real-world Timsort's best case is O(n) because…", options: ["It always skips sorting", "It detects the input is already one natural run and performs no merging", "It uses a different comparison operator", "n is always small"], answer: 1, explanation: "Natural run detection recognizes fully sorted (or reverse-sorted) input immediately." },
      { question: "Timsort is used as the default sort in…", options: ["C's qsort only", "Python's sort and Java's Arrays.sort for objects", "Assembly language", "It isn't used in practice"], answer: 1, explanation: "It's the production sort behind Python's list.sort()/sorted() and Java's object array sorting." },
    ],
  },
  contentAr: {
    overview: `تيم سورت هو خوارزمية الترتيب خلف list.sort()/sorted() في بايثون وArrays.sort() في جافا للكائنات — ترتيب هجين صممه Tim Peters عام 2002 خصيصًا لاستغلال حقيقة أن بيانات العالم الحقيقي غالبًا مرتبة جزئيًا بالفعل. يجمع بين أداء ترتيب الإدراج الممتاز على المدخلات الصغيرة/شبه المرتبة وضمان الترتيب بالدمج O(n log n) في أسوأ حالة واستقراره.

الخوارزمية الكاملة تكتشف الدفعات (runs) التصاعدية أو التنازلية الطبيعية في المدخلات وتُمدّد القصيرة منها بترتيب الإدراج حتى طول دفعة أدنى (~32-64)، ثم تدمج الدفعات باستخدام "وضع القفز السريع" المتكيف الذي يُسرّع الدمج عندما تفوز دفعة واحدة باستمرار. تُصوّر هذه الوحدة الهيكل الأساسي بطول دفعة ثابت مبسّط (بدلًا من اكتشاف الدفعات الطبيعية) لإبقاء الآلية واضحة: رتّب كتلًا ثابتة الحجم بالإدراج، ثم ادمج الدفعات المتجاورة مرارًا، مضاعفًا حجم الدمج كل مرور — تمامًا مثل الترتيب بالدمج، لكن بدءًا من دفعات مرتبة مسبقًا بدلًا من عناصر مفردة.`,
    howItWorks: [
      "قسّم المصفوفة إلى دفعات متتالية بحجم أدنى (32-64 في تيم سورت الإنتاجي؛ ثابت صغير هنا للتصور).",
      "رتّب كل دفعة بترتيب الإدراج — رخيص وسريع لأن الدفعات قصيرة.",
      "ادمج الدفعات المتجاورة زوجيًا باستخدام دمج الترتيب بالدمج القياسي، تمامًا كما في الترتيب بالدمج من الأسفل إلى الأعلى.",
      "ضاعف حجم الدمج كل مرور وكرر حتى تصبح المصفوفة كاملة دفعة مرتبة واحدة.",
      "تيم سورت الحقيقي يكتشف أيضًا الدفعات التصاعدية/التنازلية الموجودة (متخطيًا ترتيب الإدراج كليًا على بيانات مرتبة بالفعل) ويستخدم وضع القفز السريع لتسريع الدمج عندما يهيمن أحد الجانبين.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(n)",
      notes: "أفضل حالة O(n) تحدث على مدخلات مرتبة بالفعل (أو معكوسة الترتيب بالفعل)، لأن تيم سورت الحقيقي يكتشف الدفعة الطبيعية الواحدة ولا يُجري أي دمج على الإطلاق. هذه النسخة المبسطة ثابتة الدفعة لا تحصل على أفضل حالة O(n) تلك، لكن مرحلة الدمج تبقى O(n log n) في أسوأ حالة.",
    },
    applications: [
      "الترتيب المدمج في بايثون (list.sort، sorted()) منذ بايثون 2.3",
      "Arrays.sort() وCollections.sort() في جافا لمصفوفات الكائنات (الأنواع الأولية تستخدم الترتيب السريع ثنائي المحور)",
      "ترتيب منصة أندرويد وعدة بيئات تشغيل لغات أخرى",
      "أي حمل عمل تكون فيه المدخلات مرتبة جزئيًا مسبقًا غالبًا (السجلات، التحديثات التزايدية)",
    ],
    advantages: [
      "يتكيف مع الترتيب الموجود في البيانات — أسرع بكثير من O(n log n) على مدخلات شبه مرتبة",
      "مستقر — العناصر المتساوية تحافظ على ترتيبها النسبي، ضروري للترتيب متعدد المفاتيح",
      "أسوأ حالة مضمونة O(n log n)، بخلاف أسوأ حالة الترتيب السريع O(n²)",
    ],
    disadvantages: [
      "أكثر تعقيدًا بكثير للتنفيذ الصحيح من الترتيب السريع أو الترتيب بالدمج",
      "يستخدم مساحة إضافية O(n) للدمج، بخلاف الترتيب السريع في المكان",
      "تحسين وضع القفز السريع الكامل يضيف تعقيدًا كبيرًا في التنفيذ مقابل تسريعه",
    ],
    commonMistakes: [
      "تنفيذ 'تيم سورت' كترتيب بالدمج فقط حرفيًا دون خطوة ترتيب الدفعات الصغيرة بالإدراج، مما يفقد ميزة السرعة الواقعية.",
      "اختيار MIN_RUN كثابت عشوائي بدلًا من قوة للعدد اثنين قريبة من حد مختار (تيم سورت الإنتاجي يضبط هذا بعناية).",
      "نسيان أن الدمج يجب أن يكون مستقرًا — استخدام >= بدلًا من > (أو العكس) في مقارنة الدمج يقلب الاستقرار.",
      "افتراض أن هذه النسخة المبسطة ثابتة الدفعة تحصل على أفضل حالة تيم سورت O(n) — ذلك يتطلب اكتشاف الدفعات الطبيعية، الذي يُغفله هذا التصور من أجل الوضوح.",
    ],
    interviewQuestions: [
      "لماذا يجمع تيم سورت بين ترتيب الإدراج والترتيب بالدمج بدلًا من استخدام أحدهما وحده؟",
      "ما الذي يجعل تيم سورت متكيفًا، وما أنماط البيانات الواقعية التي يساعد فيها ذلك؟",
      "اشرح دور الترتيب بالدمج في ضمان أسوأ حالة O(n log n) لتيم سورت.",
      "ما هو 'وضع القفز السريع' ومتى يُفعّل؟",
      "لماذا الاستقرار مهم لدالة ترتيب لغة برمجة عامة الغرض؟",
    ],
    summary:
      "يرتب تيم سورت الدفعات القصيرة بالإدراج (سريع على البيانات الصغيرة/شبه المرتبة) ثم يدمجها كالترتيب بالدمج بمرورات مضاعِفة (يضمن أسوأ حالة O(n log n)) — ترتيب هجين مستقر ومتكيف يقوم عليه الترتيب الافتراضي في بايثون وجافا. تيم سورت الإنتاجي يضيف اكتشاف الدفعات الطبيعية ودمج وضع القفز السريع لأداء واقعي أفضل؛ تُصوّر هذه الوحدة الهيكل الأساسي للإدراج+الدمج.",
    quiz: [
      { question: "تيم سورت خليط من أي خوارزميتين؟", options: ["الترتيب السريع وترتيب الكومة", "ترتيب الإدراج والترتيب بالدمج", "الترتيب الفقاعي وترتيب الاختيار", "ترتيب الأساس وترتيب الدلاء"], answer: 1, explanation: "الدفعات الصغيرة تُرتّب بالإدراج، ثم تُدمج معًا باستخدام خطوة دمج الترتيب بالدمج." },
      { question: "لماذا يستخدم تيم سورت ترتيب الإدراج على الدفعات الصغيرة بدلًا من المزيد من العودية؟", options: ["ترتيب الإدراج أسرع تقاربيًا بشكل عام", "ترتيب الإدراج له عامل ثابت منخفض وسريع على المدخلات الصغيرة/شبه المرتبة", "مطلوب للاستقرار", "يستخدم ذاكرة أقل"], answer: 1, explanation: "من أجل n الصغيرة، بساطة ترتيب الإدراج تتفوق على عبء المزيد من التقسيم العودي." },
      { question: "التعقيد الزمني لأسوأ حالة في تيم سورت هو…", options: ["O(n²)", "O(n log n)", "O(n)", "O(2ⁿ)"], answer: 1, explanation: "مرحلة الدمج تضمن O(n log n) بغض النظر عن المدخلات، تمامًا كالترتيب بالدمج." },
      { question: "أفضل حالة لتيم سورت الحقيقي هي O(n) لأنه…", options: ["يتخطى الترتيب دائمًا", "يكتشف أن المدخلات دفعة طبيعية واحدة بالفعل ولا يُجري أي دمج", "يستخدم عامل مقارنة مختلف", "n دائمًا صغير"], answer: 1, explanation: "اكتشاف الدفعة الطبيعية يتعرف فورًا على مدخلات مرتبة بالكامل (أو معكوسة الترتيب)." },
      { question: "يُستخدم تيم سورت كترتيب افتراضي في…", options: ["qsort في سي فقط", "ترتيب بايثون وArrays.sort في جافا للكائنات", "لغة التجميع", "لا يُستخدم عمليًا"], answer: 1, explanation: "هو الترتيب الإنتاجي خلف list.sort()/sorted() في بايثون وترتيب مصفوفات الكائنات في جافا." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 5, 21, 7, 23, 19, 3, 2, 8, 14, 1", help: "4–50 numbers." }],
  defaultInput: (level, rng) => {
    const n = Math.min(20, 8 + level * 3);
    const values = Array.from({ length: n }, () => rng.int(1, 99));
    return { values };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "");
    if (values.length < 4 || values.length > 50) throw new Error("Enter 4 to 50 numbers.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
