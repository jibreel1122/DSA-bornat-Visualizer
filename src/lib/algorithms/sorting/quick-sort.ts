import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  const finalized = new Set<number>();
  let comparisons = 0;
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });

  const snap = (
    states: Record<number, CellState>,
    range: { from: number; to: number } | null,
    description: string,
    codeLine: number,
    pointers?: { index: number; label: string }[],
  ) => {
    const merged: Record<number, CellState> = { ...states };
    for (const idx of finalized) merged[idx] ??= "sorted";
    steps.push({ frame: { values: [...a], states: merged, range, pointers }, description, codeLine, counters: counters() });
  };

  snap({}, null, `Quick sort partitions around a pivot (last element), then recurses on each side.`, 0);

  const quick = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      finalized.add(lo);
      snap({}, null, `Single element a[${lo}] is in place.`, 1);
      return;
    }
    const pivot = a[hi];
    snap({ [hi]: "pivot" }, { from: lo, to: hi }, `Partition [${lo}..${hi}] around pivot ${pivot}.`, 2, [{ index: hi, label: "pivot" }]);
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      snap({ [hi]: "pivot", [j]: "compare" }, { from: lo, to: hi }, `Is a[${j}] = ${a[j]} ≤ pivot ${pivot}?`, 3, [{ index: i + 1, label: "i+1" }, { index: j, label: "j" }]);
      if (a[j] <= pivot) {
        i++;
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          swaps++;
          snap({ [hi]: "pivot", [i]: "swap", [j]: "swap" }, { from: lo, to: hi }, `Yes — swap into the ≤ region at index ${i}.`, 4);
        }
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    swaps++;
    const p = i + 1;
    finalized.add(p);
    snap({ [p]: "sorted" }, { from: lo, to: hi }, `Place pivot at index ${p}; everything left is smaller, right is larger.`, 5);
    quick(lo, p - 1);
    quick(p + 1, hi);
  };

  quick(0, n - 1);
  const all: Record<number, CellState> = {};
  for (let x = 0; x < n; x++) all[x] = "sorted";
  snap(all, null, `Sorted! Average O(n log n); worst case O(n²) on poor pivots.`, 6);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "quick-sort",
  title: "Quick Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["divide & conquer", "in-place", "unstable", "O(n log n) avg"],
  summary: "Partitions around a pivot so smaller elements go left and larger go right, then recurses on each side.",
  renderer: "array",
  pseudocode: [
    "procedure quickSort(a, lo, hi)",
    "  if lo >= hi return",
    "  pivot = a[hi]; i = lo-1",
    "  for j = lo to hi-1: if a[j] <= pivot then i++; swap(a[i], a[j])",
    "  swap(a[i+1], a[hi])   // pivot to its final spot",
    "  quickSort(a, lo, i); quickSort(a, i+2, hi)",
    "  return a",
  ],
  code: {
    pseudocode: `procedure quickSort(a, lo, hi)
  if lo >= hi: return
  p = partition(a, lo, hi)   // Lomuto, pivot = a[hi]
  quickSort(a, lo, p - 1)
  quickSort(a, p + 1, hi)`,
    c: `int partition(int a[], int lo, int hi) {
    int pivot = a[hi], i = lo - 1;
    for (int j = lo; j < hi; j++)
        if (a[j] <= pivot) { i++; int t=a[i];a[i]=a[j];a[j]=t; }
    int t=a[i+1];a[i+1]=a[hi];a[hi]=t;
    return i + 1;
}
void quick_sort(int a[], int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quick_sort(a, lo, p - 1);
    quick_sort(a, p + 1, hi);
}`,
    cpp: `#include <vector>
#include <utility>

int partition(std::vector<int>& a, int lo, int hi) {
    int pivot = a[hi], i = lo - 1;
    for (int j = lo; j < hi; ++j)
        if (a[j] <= pivot) std::swap(a[++i], a[j]);
    std::swap(a[i + 1], a[hi]);
    return i + 1;
}
void quickSort(std::vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}`,
    java: `static int partition(int[] a, int lo, int hi) {
    int pivot = a[hi], i = lo - 1;
    for (int j = lo; j < hi; j++)
        if (a[j] <= pivot) { i++; int t=a[i];a[i]=a[j];a[j]=t; }
    int t=a[i+1];a[i+1]=a[hi];a[hi]=t;
    return i + 1;
}
static void quickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}`,
    python: `def quick_sort(a: list[int], lo: int = 0, hi: int | None = None) -> list[int]:
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return a
    pivot, i = a[hi], lo - 1
    for j in range(lo, hi):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[hi] = a[hi], a[i + 1]
    p = i + 1
    quick_sort(a, lo, p - 1)
    quick_sort(a, p + 1, hi)
    return a`,
    javascript: `function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const pivot = a[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++)
    if (a[j] <= pivot) { i++; [a[i], a[j]] = [a[j], a[i]]; }
  [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
  const p = i + 1;
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
  return a;
}`,
    typescript: `function quickSort(a: number[], lo = 0, hi = a.length - 1): number[] {
  if (lo >= hi) return a;
  const pivot = a[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++)
    if (a[j] <= pivot) { i++; [a[i], a[j]] = [a[j], a[i]]; }
  [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
  const p = i + 1;
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
  return a;
}`,
    csharp: `static void QuickSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi], i = lo - 1;
    for (int j = lo; j < hi; j++)
        if (a[j] <= pivot) { i++; (a[i], a[j]) = (a[j], a[i]); }
    (a[i + 1], a[hi]) = (a[hi], a[i + 1]);
    int p = i + 1;
    QuickSort(a, lo, p - 1);
    QuickSort(a, p + 1, hi);
}`,
    go: `func quickSort(a []int, lo, hi int) {
	if lo >= hi {
		return
	}
	pivot, i := a[hi], lo-1
	for j := lo; j < hi; j++ {
		if a[j] <= pivot {
			i++
			a[i], a[j] = a[j], a[i]
		}
	}
	a[i+1], a[hi] = a[hi], a[i+1]
	p := i + 1
	quickSort(a, lo, p-1)
	quickSort(a, p+1, hi)
}`,
    rust: `fn quick_sort(a: &mut [i32]) {
    if a.len() <= 1 { return; }
    let hi = a.len() - 1;
    let pivot = a[hi];
    let mut i = 0;
    for j in 0..hi {
        if a[j] <= pivot { a.swap(i, j); i += 1; }
    }
    a.swap(i, hi);
    let (left, right) = a.split_at_mut(i);
    quick_sort(left);
    quick_sort(&mut right[1..]);
}`,
    kotlin: `fun quickSort(a: IntArray, lo: Int, hi: Int) {
    if (lo >= hi) return
    val pivot = a[hi]; var i = lo - 1
    for (j in lo until hi) {
        if (a[j] <= pivot) { i++; val t=a[i];a[i]=a[j];a[j]=t }
    }
    val t=a[i+1];a[i+1]=a[hi];a[hi]=t
    val p = i + 1
    quickSort(a, lo, p - 1)
    quickSort(a, p + 1, hi)
}`,
    swift: `func quickSort(_ a: inout [Int], _ lo: Int, _ hi: Int) {
    if lo >= hi { return }
    let pivot = a[hi]; var i = lo - 1
    for j in lo..<hi where a[j] <= pivot { i += 1; a.swapAt(i, j) }
    a.swapAt(i + 1, hi)
    let p = i + 1
    quickSort(&a, lo, p - 1)
    quickSort(&a, p + 1, hi)
}`,
  },
  content: {
    overview: `Quicksort is the most widely used in-memory sorting algorithm. It picks a pivot element and partitions the array so that everything smaller than the pivot ends up on its left and everything larger on its right. The pivot is then in its final sorted position, and the algorithm recurses on the two sides.

Its average-case running time is O(n log n) with small constant factors and excellent cache locality, which is why it (or a hybrid built on it, like introsort) backs many standard library sorts. The catch is a worst case of O(n²) when pivots are chosen poorly — mitigated in practice with randomized or median-of-three pivot selection.`,
    howItWorks: [
      "Choose a pivot (here, the last element of the range).",
      "Partition: scan the range, moving every element ≤ pivot to the left region.",
      "Swap the pivot into the boundary — it is now in its final position.",
      "Recurse on the left sub-range (elements < pivot).",
      "Recurse on the right sub-range (elements > pivot).",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" },
      space: "O(log n)",
      notes: "Worst case O(n²) occurs on already-sorted input with last-element pivots. Randomized or median-of-three pivots make it extremely unlikely. Recursion stack is O(log n) on balanced splits.",
    },
    applications: [
      "General-purpose in-memory sorting (basis of many standard libraries)",
      "The quickselect algorithm for finding the k-th smallest element",
      "Situations valuing in-place sorting with low memory overhead",
      "Systems where average speed matters more than worst-case guarantees",
    ],
    advantages: [
      "Fast in practice with small constants and great cache locality",
      "In-place: only O(log n) stack space",
      "Tuneable via pivot strategy and hybrid fallbacks",
      "Partitioning generalizes to quickselect (k-th order statistics)",
    ],
    disadvantages: [
      "O(n²) worst case with naive pivot choice",
      "Not stable in its standard form",
      "Performance sensitive to pivot selection and duplicate-heavy inputs",
      "Recursion depth can be O(n) without tail-recursion/smaller-side tricks",
    ],
    commonMistakes: [
      "Always choosing the first or last element as pivot — pathological on sorted data.",
      "Off-by-one errors in the partition boundary (i, j) indices.",
      "Recursing on the larger side first, risking O(n) stack depth.",
      "Not handling many duplicate keys (consider three-way / Dutch-flag partitioning).",
    ],
    interviewQuestions: [
      "Why does last-element-pivot quicksort degrade to O(n²) on sorted input?",
      "How do randomized or median-of-three pivots improve expected performance?",
      "Explain quickselect and its expected O(n) running time.",
      "What is three-way (Dutch national flag) partitioning and when does it help?",
      "How does introsort combine quicksort with heapsort to bound the worst case?",
    ],
    summary:
      "Quicksort partitions around a pivot into smaller/larger regions and recurses, achieving O(n log n) average time in-place with excellent locality. Its O(n²) worst case is tamed by randomized or median-of-three pivots — making it the practical default for in-memory sorting.",
    quiz: [
      { question: "After one partition step, what is guaranteed about the pivot?", options: ["It is the smallest element", "It is in its final sorted position", "It is at the array's midpoint", "Nothing is guaranteed"], answer: 1, explanation: "Partitioning places the pivot where all smaller elements precede it and all larger follow." },
      { question: "Quicksort's worst-case time complexity is…", options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"], answer: 2, explanation: "Consistently unbalanced partitions (e.g. sorted input, last-element pivot) yield n levels of O(n) work." },
      { question: "Which pivot strategy best avoids the worst case in practice?", options: ["Always first element", "Always last element", "Randomized or median-of-three", "Always the maximum"], answer: 2, explanation: "Randomization/median-of-three makes consistently bad splits vanishingly unlikely." },
      { question: "Standard quicksort is…", options: ["stable", "unstable", "always O(n) space", "non-recursive only"], answer: 1, explanation: "Partition swaps can reorder equal keys, so it is not stable." },
      { question: "Which selection algorithm reuses quicksort's partition?", options: ["Merge select", "Quickselect", "Heap select", "Bucket select"], answer: 1, explanation: "Quickselect partitions and recurses into only the side containing the k-th element, giving expected O(n)." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 10, 80, 30, 90, 40, 50, 70", help: "2–40 numbers, comma or space separated." }],
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
