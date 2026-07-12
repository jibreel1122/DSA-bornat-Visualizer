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
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });

  steps.push({
    frame: arrayFrame(a, {}, { sortedFrom: n }),
    description: `Start with ${n} unsorted elements. Each pass bubbles the largest remaining value to the end.`,
    descriptionAr: `ابدأ بـ ${n} عناصر غير مرتبة. كل مرور يُصعّد أكبر قيمة متبقية إلى النهاية.`,
    codeLine: 0,
    counters: counters(),
  });

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    steps.push({
      frame: arrayFrame(a, {}, { sortedFrom: n - i }),
      description: `Pass ${i + 1}: scan up to index ${n - i - 2}.`,
      descriptionAr: `المرور ${i + 1}: امسح حتى الفهرس ${n - i - 2}.`,
      codeLine: 1,
      counters: counters(),
    });
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++;
      steps.push({
        frame: arrayFrame(a, { [j]: "compare", [j + 1]: "compare" }, { sortedFrom: n - i }),
        description: `Compare a[${j}] = ${a[j]} with a[${j + 1}] = ${a[j + 1]}.`,
        descriptionAr: `قارن a[${j}] = ${a[j]} مع a[${j + 1}] = ${a[j + 1]}.`,
        codeLine: 3,
        counters: counters(),
      });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        swapped = true;
        steps.push({
          frame: arrayFrame(a, { [j]: "swap", [j + 1]: "swap" }, { sortedFrom: n - i }),
          description: `${a[j + 1]} > ${a[j]}, so swap them.`,
          descriptionAr: `${a[j + 1]} > ${a[j]}، فبدّلهما.`,
          codeLine: 4,
          counters: counters(),
        });
      }
    }
    steps.push({
      frame: arrayFrame(a, { [n - i - 1]: "sorted" }, { sortedFrom: n - i - 1 }),
      description: `Pass ${i + 1} done — ${a[n - i - 1]} is locked in its final position.`,
      descriptionAr: `انتهى المرور ${i + 1} — استقر ${a[n - i - 1]} في موضعه النهائي.`,
      codeLine: 5,
      counters: counters(),
    });
    if (!swapped) {
      steps.push({
        frame: arrayFrame(a, {}, { sortedFrom: 0 }),
        description: "No swaps in this pass — the array is already sorted. Early exit.",
        descriptionAr: "لا تبديل في هذا المرور — المصفوفة مرتبة بالفعل. خروج مبكر.",
        codeLine: 6,
        counters: counters(),
      });
      break;
    }
  }

  steps.push({
    frame: arrayFrame(a, {}, { sortedFrom: 0 }),
    description: `Sorted! ${comparisons} comparisons and ${swaps} swaps in total.`,
    descriptionAr: `اكتمل الترتيب! ${comparisons} مقارنة و${swaps} عملية تبديل إجمالًا.`,
    codeLine: 7,
    counters: counters(),
  });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "bubble-sort",
  title: "Bubble Sort",
  titleAr: "الترتيب الفقاعي",
  category: "sorting",
  difficulty: "Beginner",
  tags: ["comparison sort", "stable", "in-place", "quadratic"],
  tagsAr: ["ترتيب بالمقارنة", "مستقر", "في المكان", "تربيعي"],
  summary: "Repeatedly swaps adjacent out-of-order elements, bubbling the largest to the end each pass.",
  summaryAr: "يبدّل العناصر المتجاورة غير المرتبة مرارًا، فيصعد أكبر عنصر إلى النهاية في كل مرور.",
  renderer: "array",

  pseudocode: [
    "procedure bubbleSort(a[0..n-1])",
    "  for i = 0 to n-2",
    "    swapped = false",
    "    for j = 0 to n-i-2",
    "      if a[j] > a[j+1] then swap(a[j], a[j+1]); swapped = true",
    "    // a[n-i-1] is now in final position",
    "    if not swapped then break   // already sorted",
    "  return a",
  ],

  code: {
    pseudocode: `procedure bubbleSort(a[0..n-1])
  for i = 0 to n-2
    swapped = false
    for j = 0 to n-i-2
      if a[j] > a[j+1] then
        swap(a[j], a[j+1])
        swapped = true
    if not swapped then break
  return a`,
    c: `#include <stdbool.h>

void bubble_sort(int a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                int tmp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = tmp;
                swapped = true;
            }
        }
        if (!swapped) break;  /* already sorted */
    }
}`,
    cpp: `#include <vector>
#include <utility>

void bubbleSort(std::vector<int>& a) {
    const int n = static_cast<int>(a.size());
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; ++j) {
            if (a[j] > a[j + 1]) {
                std::swap(a[j], a[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;  // already sorted
    }
}`,
    java: `public class BubbleSort {
    public static void bubbleSort(int[] a) {
        int n = a.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (a[j] > a[j + 1]) {
                    int tmp = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = tmp;
                    swapped = true;
                }
            }
            if (!swapped) break;  // already sorted
        }
    }
}`,
    python: `def bubble_sort(a: list[int]) -> list[int]:
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - i - 1):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:  # already sorted
            break
    return a`,
    javascript: `function bubbleSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break; // already sorted
  }
  return a;
}`,
    typescript: `function bubbleSort(a: number[]): number[] {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break; // already sorted
  }
  return a;
}`,
    csharp: `public static class Sorting {
    public static void BubbleSort(int[] a) {
        int n = a.Length;
        for (int i = 0; i < n - 1; i++) {
            bool swapped = false;
            for (int j = 0; j < n - i - 1; j++) {
                if (a[j] > a[j + 1]) {
                    (a[j], a[j + 1]) = (a[j + 1], a[j]);
                    swapped = true;
                }
            }
            if (!swapped) break; // already sorted
        }
    }
}`,
    go: `func bubbleSort(a []int) {
	n := len(a)
	for i := 0; i < n-1; i++ {
		swapped := false
		for j := 0; j < n-i-1; j++ {
			if a[j] > a[j+1] {
				a[j], a[j+1] = a[j+1], a[j]
				swapped = true
			}
		}
		if !swapped { // already sorted
			break
		}
	}
}`,
    rust: `fn bubble_sort(a: &mut [i32]) {
    let n = a.len();
    for i in 0..n.saturating_sub(1) {
        let mut swapped = false;
        for j in 0..n - i - 1 {
            if a[j] > a[j + 1] {
                a.swap(j, j + 1);
                swapped = true;
            }
        }
        if !swapped {
            break; // already sorted
        }
    }
}`,
    kotlin: `fun bubbleSort(a: IntArray) {
    val n = a.size
    for (i in 0 until n - 1) {
        var swapped = false
        for (j in 0 until n - i - 1) {
            if (a[j] > a[j + 1]) {
                val tmp = a[j]; a[j] = a[j + 1]; a[j + 1] = tmp
                swapped = true
            }
        }
        if (!swapped) break // already sorted
    }
}`,
    swift: `func bubbleSort(_ a: inout [Int]) {
    let n = a.count
    guard n > 1 else { return }
    for i in 0..<(n - 1) {
        var swapped = false
        for j in 0..<(n - i - 1) {
            if a[j] > a[j + 1] {
                a.swapAt(j, j + 1)
                swapped = true
            }
        }
        if !swapped { break } // already sorted
    }
}`,
  },

  content: {
    overview: `Bubble sort is the simplest comparison-based sorting algorithm. It repeatedly steps through the array, compares each pair of adjacent elements, and swaps them if they are in the wrong order. After each full pass, the largest remaining element has "bubbled up" to its final position at the end of the array.

Although it is rarely used in production because of its quadratic running time, bubble sort is the classic teaching algorithm: every operation is local, visible, and easy to reason about, which makes it the perfect first sorting algorithm to visualize.`,
    howItWorks: [
      "Scan the array from left to right, comparing each adjacent pair (a[j], a[j+1]).",
      "If a pair is out of order, swap it. Track whether any swap happened this pass.",
      "At the end of a pass, the largest unsorted element sits in its final slot, so the next pass can stop one position earlier.",
      "If a whole pass finishes without a single swap, the array is sorted — exit early.",
      "Repeat until sorted; at most n−1 passes are needed.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes:
        "The O(n) best case requires the swapped-flag optimization and an already-sorted input. The number of swaps equals the number of inversions in the array.",
    },
    applications: [
      "Teaching the concept of comparison-based sorting and algorithm analysis",
      "Detecting whether a nearly-sorted list is sorted (one cheap pass)",
      "Tiny datasets where code size matters more than speed (embedded systems)",
      "Computer graphics: polygon-fill algorithms exploit its coherence on almost-sorted data",
    ],
    advantages: [
      "Extremely simple to implement and reason about",
      "In-place: needs only O(1) extra memory",
      "Stable: equal elements keep their relative order",
      "Adaptive with the swapped flag: O(n) on already-sorted input",
      "Detects a sorted array faster than selection sort",
    ],
    disadvantages: [
      "O(n²) comparisons and swaps on average — impractical for large inputs",
      "Performs many more swaps than insertion or selection sort",
      "Poor cache behavior compared to insertion sort in practice",
      "Almost always outperformed by insertion sort among simple quadratic sorts",
    ],
    commonMistakes: [
      "Looping j all the way to n-2 every pass instead of shrinking to n-i-2, wasting comparisons on the already-sorted suffix.",
      "Forgetting the swapped flag, which turns the best case from O(n) into O(n²).",
      "Off-by-one on the inner bound (j < n-i-1), causing an out-of-bounds access at a[j+1].",
      "Believing bubble sort and insertion sort are the same — insertion sort shifts instead of swapping and is measurably faster.",
    ],
    interviewQuestions: [
      "Why is bubble sort stable, and what code change would break its stability?",
      "How many swaps does bubble sort perform in terms of inversions of the input?",
      "Given a nearly-sorted array (each element at most k slots away), which simple sort would you pick and why?",
      "How does the swapped-flag optimization change best-case complexity?",
      "Can bubble sort be parallelized? Sketch odd-even transposition sort.",
    ],
    summary:
      "Bubble sort repeatedly swaps adjacent out-of-order pairs, locking the largest remaining element into place each pass. O(n²) time, O(1) space, stable, adaptive with early exit — a teaching classic rather than a production tool.",
    quiz: [
      {
        question: "After the first complete pass of bubble sort, which element is guaranteed to be in its final position?",
        options: ["The smallest element", "The largest element", "The median element", "No element is guaranteed"],
        answer: 1,
        explanation:
          "Each comparison pushes the larger element rightward, so the maximum reaches the last index by the end of the first pass.",
      },
      {
        question: "What is the best-case time complexity of bubble sort with the swapped-flag optimization?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: 2,
        explanation:
          "On sorted input the first pass makes n−1 comparisons, performs no swaps, and exits — linear time.",
      },
      {
        question: "The total number of swaps bubble sort performs equals…",
        options: [
          "the number of elements n",
          "the number of inversions in the array",
          "n log n on average",
          "always n(n−1)/2",
        ],
        answer: 1,
        explanation:
          "Every swap fixes exactly one adjacent inversion, and sorting requires removing all inversions.",
      },
      {
        question: "Which property does bubble sort have?",
        options: ["Unstable and out-of-place", "Stable and in-place", "Stable but needs O(n) extra space", "Unstable but in-place"],
        answer: 1,
        explanation:
          "It swaps only strictly out-of-order neighbors (equal elements never swap), and it uses constant extra memory.",
      },
      {
        question: "For an array sorted in reverse order, how many comparisons does bubble sort make (no early exit possible)?",
        options: ["n", "n log n", "n(n−1)/2", "n²·log n"],
        answer: 2,
        explanation:
          "Pass i makes n−1−i comparisons; summing over all passes gives (n−1) + (n−2) + … + 1 = n(n−1)/2.",
      },
    ],
  },

  contentAr: {
    overview: `الترتيب الفقاعي هو أبسط خوارزمية ترتيب قائمة على المقارنة. يجتاز المصفوفة مرارًا، ويقارن كل زوج من العناصر المتجاورة، ويبدّلهما إذا كانا بترتيب خاطئ. بعد كل مرور كامل، يكون أكبر عنصر متبقٍ قد "صعد" إلى موضعه النهائي في نهاية المصفوفة.

رغم ندرة استخدامه في الإنتاج بسبب زمنه التربيعي، يظل الترتيب الفقاعي خوارزمية التدريس الكلاسيكية: كل عملية محلية وواضحة وسهلة التتبع، ما يجعله الخوارزمية الأولى المثالية للتصور البصري.`,
    howItWorks: [
      "امسح المصفوفة من اليسار إلى اليمين، وقارن كل زوج متجاور (a[j], a[j+1]).",
      "إذا كان الزوج بترتيب خاطئ، بدّله. تتبّع ما إذا حدث أي تبديل في هذا المرور.",
      "في نهاية المرور، يستقر أكبر عنصر غير مرتب في موضعه النهائي، فيمكن للمرور التالي أن يتوقف قبل موضع واحد أبكر.",
      "إذا انتهى مرور كامل دون أي تبديل، فالمصفوفة مرتبة — اخرج مبكرًا.",
      "كرر حتى الترتيب؛ يلزم على الأكثر n−1 مرورًا.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes:
        "أفضل حالة O(n) تتطلب تحسين علم التبديل ومدخلات مرتبة مسبقًا. عدد التبديلات يساوي عدد الانقلابات (inversions) في المصفوفة.",
    },
    applications: [
      "تدريس مفهوم الترتيب القائم على المقارنة وتحليل الخوارزميات",
      "الكشف عمّا إذا كانت قائمة شبه مرتبة مرتبة بالفعل (مرور واحد رخيص)",
      "مجموعات بيانات صغيرة جدًا حيث حجم الكود أهم من السرعة (الأنظمة المدمجة)",
      "رسوميات الحاسوب: خوارزميات تعبئة المضلعات تستغل تماسكه على بيانات شبه مرتبة",
    ],
    advantages: [
      "بسيط جدًا في التنفيذ والفهم",
      "في المكان: يحتاج فقط ذاكرة إضافية O(1)",
      "مستقر: العناصر المتساوية تحافظ على ترتيبها النسبي",
      "متكيّف بفضل علم التبديل: O(n) على مدخلات مرتبة مسبقًا",
      "يكتشف المصفوفة المرتبة أسرع من ترتيب الاختيار",
    ],
    disadvantages: [
      "O(n²) مقارنة وتبديل في المتوسط — غير عملي للمدخلات الكبيرة",
      "يُجري تبديلات أكثر بكثير من ترتيب الإدراج أو الاختيار",
      "سلوك ذاكرة مؤقتة أضعف من ترتيب الإدراج عمليًا",
      "يتفوق عليه ترتيب الإدراج دائمًا تقريبًا بين الترتيبات التربيعية البسيطة",
    ],
    commonMistakes: [
      "تكرار j حتى n-2 في كل مرور بدلًا من تقليصه إلى n-i-2، مما يهدر مقارنات على اللاحقة المرتبة بالفعل.",
      "نسيان علم التبديل، مما يحوّل أفضل حالة من O(n) إلى O(n²).",
      "خطأ انزياح بمقدار واحد في الحد الداخلي (j < n-i-1)، مما يسبب وصولًا خارج الحدود إلى a[j+1].",
      "الاعتقاد بأن الترتيب الفقاعي وترتيب الإدراج متماثلان — ترتيب الإدراج يزيح بدلًا من التبديل وهو أسرع قابل للقياس.",
    ],
    interviewQuestions: [
      "لماذا الترتيب الفقاعي مستقر، وما التغيير في الكود الذي يكسر استقراره؟",
      "كم عملية تبديل يُجريها الترتيب الفقاعي بدلالة انقلابات المدخلات؟",
      "بالنظر إلى مصفوفة شبه مرتبة (كل عنصر على بعد k مواضع على الأكثر)، أي ترتيب بسيط تختار ولماذا؟",
      "كيف يغيّر تحسين علم التبديل التعقيد في أفضل حالة؟",
      "هل يمكن موازاة الترتيب الفقاعي؟ صف ترتيب النقل الزوجي-الفردي (odd-even transposition).",
    ],
    summary:
      "يبدّل الترتيب الفقاعي الأزواج المتجاورة غير المرتبة مرارًا، مثبّتًا أكبر عنصر متبقٍ في موضعه في كل مرور. زمن O(n²)، مساحة O(1)، مستقر، متكيّف بخروج مبكر — كلاسيكية تدريسية أكثر منها أداة إنتاج.",
    quiz: [
      {
        question: "بعد المرور الكامل الأول من الترتيب الفقاعي، أي عنصر يُضمن أنه في موضعه النهائي؟",
        options: ["أصغر عنصر", "أكبر عنصر", "العنصر الوسيط", "لا يوجد عنصر مضمون"],
        answer: 1,
        explanation:
          "كل مقارنة تدفع العنصر الأكبر نحو اليمين، فيصل الأقصى إلى الفهرس الأخير بنهاية المرور الأول.",
      },
      {
        question: "ما التعقيد الزمني في أفضل حالة للترتيب الفقاعي مع تحسين علم التبديل؟",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: 2,
        explanation:
          "على مدخلات مرتبة، يُجري المرور الأول n−1 مقارنة، دون أي تبديل، ثم يخرج — زمن خطي.",
      },
      {
        question: "إجمالي عدد التبديلات التي يُجريها الترتيب الفقاعي يساوي…",
        options: [
          "عدد العناصر n",
          "عدد الانقلابات في المصفوفة",
          "n log n في المتوسط",
          "دائمًا n(n−1)/2",
        ],
        answer: 1,
        explanation:
          "كل تبديل يُصلح انقلابًا متجاورًا واحدًا بالضبط، والترتيب يتطلب إزالة كل الانقلابات.",
      },
      {
        question: "أي خاصية يتمتع بها الترتيب الفقاعي؟",
        options: ["غير مستقر وخارج المكان", "مستقر وفي المكان", "مستقر لكن يحتاج مساحة O(n) إضافية", "غير مستقر لكنه في المكان"],
        answer: 1,
        explanation:
          "يبدّل فقط العناصر المتجاورة غير المرتبة بشكل صارم (العناصر المتساوية لا تتبدل أبدًا)، ويستخدم ذاكرة إضافية ثابتة.",
      },
      {
        question: "لمصفوفة مرتبة بترتيب عكسي، كم مقارنة يُجري الترتيب الفقاعي (لا خروج مبكر ممكن)؟",
        options: ["n", "n log n", "n(n−1)/2", "n²·log n"],
        answer: 2,
        explanation:
          "المرور i يُجري n−1−i مقارنة؛ وجمعها على كل المرورات يعطي (n−1) + (n−2) + … + 1 = n(n−1)/2.",
      },
    ],
  },

  inputFields: [
    {
      key: "values",
      label: "Array values",
      placeholder: "e.g. 34, 7, 23, 32, 5, 62",
      help: "2–40 numbers, separated by commas or spaces.",
    },
  ],
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
