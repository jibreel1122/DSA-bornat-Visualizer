import type { AlgorithmModule, ArrayFrame, AuxRow, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let writes = 0;
  const counters = () => ({ comparisons, writes });

  const snap = (
    states: Record<number, CellState>,
    range: { from: number; to: number } | null,
    description: string,
    codeLine: number,
    aux?: AuxRow[],
  ) => {
    steps.push({ frame: { values: [...a], states: { ...states }, range, aux }, description, codeLine, counters: counters() });
  };

  snap({}, null, `Merge sort recursively splits the array, then merges sorted halves.`, 0);

  const sort = (lo: number, hi: number, depth: number) => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    snap({}, { from: lo, to: hi }, `Split [${lo}..${hi}] at ${mid} (depth ${depth}).`, 1);
    sort(lo, mid, depth + 1);
    sort(mid + 1, hi, depth + 1);

    // merge
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    const bufRow = (): AuxRow[] => [
      { label: "left", values: left.slice(i) },
      { label: "right", values: right.slice(j) },
    ];
    snap({}, { from: lo, to: hi }, `Merge sorted halves [${lo}..${mid}] and [${mid + 1}..${hi}].`, 3, bufRow());
    while (i < left.length && j < right.length) {
      comparisons++;
      const states: Record<number, CellState> = { [k]: "active" };
      snap(states, { from: lo, to: hi }, `Compare ${left[i]} and ${right[j]}.`, 4, bufRow());
      if (left[i] <= right[j]) {
        a[k] = left[i++];
      } else {
        a[k] = right[j++];
      }
      writes++;
      snap({ [k]: "swap" }, { from: lo, to: hi }, `Place ${a[k]} at index ${k}.`, 5, bufRow());
      k++;
    }
    while (i < left.length) {
      a[k] = left[i++];
      writes++;
      snap({ [k]: "swap" }, { from: lo, to: hi }, `Copy remaining ${a[k]} from left.`, 6, bufRow());
      k++;
    }
    while (j < right.length) {
      a[k] = right[j++];
      writes++;
      snap({ [k]: "swap" }, { from: lo, to: hi }, `Copy remaining ${a[k]} from right.`, 6, bufRow());
      k++;
    }
    const done: Record<number, CellState> = {};
    for (let x = lo; x <= hi; x++) done[x] = "sorted";
    snap(done, { from: lo, to: hi }, `Subarray [${lo}..${hi}] is now sorted.`, 7);
  };

  sort(0, n - 1, 0);
  const allSorted: Record<number, CellState> = {};
  for (let x = 0; x < n; x++) allSorted[x] = "sorted";
  snap(allSorted, null, `Fully sorted in O(n log n) with ${comparisons} comparisons.`, 8);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "merge-sort",
  title: "Merge Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["divide & conquer", "stable", "O(n log n)", "not in-place"],
  summary: "Recursively splits the array in half, sorts each half, then merges them — guaranteed O(n log n).",
  renderer: "array",
  pseudocode: [
    "procedure mergeSort(a, lo, hi)",
    "  if lo >= hi return",
    "  mid = (lo+hi)/2",
    "  mergeSort(a, lo, mid); mergeSort(a, mid+1, hi)",
    "  // merge the two sorted halves:",
    "  while both halves have elements",
    "    copy the smaller front element into a",
    "  copy any remaining elements",
    "  // [lo..hi] is now sorted",
    "  return a",
  ],
  code: {
    pseudocode: `procedure mergeSort(a, lo, hi)
  if lo >= hi: return
  mid = (lo + hi) / 2
  mergeSort(a, lo, mid)
  mergeSort(a, mid + 1, hi)
  merge(a, lo, mid, hi)`,
    c: `void merge(int a[], int lo, int mid, int hi) {
    int n1 = mid - lo + 1, n2 = hi - mid;
    int L[n1], R[n2];
    for (int i = 0; i < n1; i++) L[i] = a[lo + i];
    for (int j = 0; j < n2; j++) R[j] = a[mid + 1 + j];
    int i = 0, j = 0, k = lo;
    while (i < n1 && j < n2) a[k++] = (L[i] <= R[j]) ? L[i++] : R[j++];
    while (i < n1) a[k++] = L[i++];
    while (j < n2) a[k++] = R[j++];
}
void merge_sort(int a[], int lo, int hi) {
    if (lo >= hi) return;
    int mid = (lo + hi) / 2;
    merge_sort(a, lo, mid);
    merge_sort(a, mid + 1, hi);
    merge(a, lo, mid, hi);
}`,
    cpp: `#include <vector>

void mergeSort(std::vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    std::vector<int> tmp;
    int i = lo, j = mid + 1;
    while (i <= mid && j <= hi) tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]);
    while (i <= mid) tmp.push_back(a[i++]);
    while (j <= hi) tmp.push_back(a[j++]);
    for (int k = 0; k < (int)tmp.size(); ++k) a[lo + k] = tmp[k];
}`,
    java: `static void mergeSort(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int mid = (lo + hi) / 2;
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    int[] tmp = new int[hi - lo + 1];
    int i = lo, j = mid + 1, k = 0;
    while (i <= mid && j <= hi) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    System.arraycopy(tmp, 0, a, lo, tmp.length);
}`,
    python: `def merge_sort(a: list[int]) -> list[int]:
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])
    right = merge_sort(a[mid:])
    merged, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged`,
    javascript: `function mergeSort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  return out.concat(left.slice(i), right.slice(j));
}`,
    typescript: `function mergeSort(a: number[]): number[] {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid));
  const right = mergeSort(a.slice(mid));
  const out: number[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  return out.concat(left.slice(i), right.slice(j));
}`,
    csharp: `static int[] MergeSort(int[] a) {
    if (a.Length <= 1) return a;
    int mid = a.Length / 2;
    var left = MergeSort(a[..mid]);
    var right = MergeSort(a[mid..]);
    var outp = new List<int>();
    int i = 0, j = 0;
    while (i < left.Length && j < right.Length)
        outp.Add(left[i] <= right[j] ? left[i++] : right[j++]);
    while (i < left.Length) outp.Add(left[i++]);
    while (j < right.Length) outp.Add(right[j++]);
    return outp.ToArray();
}`,
    go: `func mergeSort(a []int) []int {
	if len(a) <= 1 {
		return a
	}
	mid := len(a) / 2
	left := mergeSort(a[:mid])
	right := mergeSort(a[mid:])
	out := make([]int, 0, len(a))
	i, j := 0, 0
	for i < len(left) && j < len(right) {
		if left[i] <= right[j] {
			out = append(out, left[i]); i++
		} else {
			out = append(out, right[j]); j++
		}
	}
	out = append(out, left[i:]...)
	return append(out, right[j:]...)
}`,
    rust: `fn merge_sort(a: &[i32]) -> Vec<i32> {
    if a.len() <= 1 { return a.to_vec(); }
    let mid = a.len() / 2;
    let left = merge_sort(&a[..mid]);
    let right = merge_sort(&a[mid..]);
    let (mut i, mut j, mut out) = (0, 0, Vec::with_capacity(a.len()));
    while i < left.len() && j < right.len() {
        if left[i] <= right[j] { out.push(left[i]); i += 1; }
        else { out.push(right[j]); j += 1; }
    }
    out.extend_from_slice(&left[i..]);
    out.extend_from_slice(&right[j..]);
    out
}`,
    kotlin: `fun mergeSort(a: IntArray): IntArray {
    if (a.size <= 1) return a
    val mid = a.size / 2
    val left = mergeSort(a.copyOfRange(0, mid))
    val right = mergeSort(a.copyOfRange(mid, a.size))
    val out = IntArray(a.size)
    var i = 0; var j = 0; var k = 0
    while (i < left.size && j < right.size)
        out[k++] = if (left[i] <= right[j]) left[i++] else right[j++]
    while (i < left.size) out[k++] = left[i++]
    while (j < right.size) out[k++] = right[j++]
    return out
}`,
    swift: `func mergeSort(_ a: [Int]) -> [Int] {
    guard a.count > 1 else { return a }
    let mid = a.count / 2
    let left = mergeSort(Array(a[..<mid]))
    let right = mergeSort(Array(a[mid...]))
    var out: [Int] = []; var i = 0; var j = 0
    while i < left.count && j < right.count {
        if left[i] <= right[j] { out.append(left[i]); i += 1 }
        else { out.append(right[j]); j += 1 }
    }
    out.append(contentsOf: left[i...] )
    out.append(contentsOf: right[j...])
    return out
}`,
  },
  content: {
    overview: `Merge sort is the archetypal divide-and-conquer sort. It splits the array into two halves, recursively sorts each half, and then merges the two sorted halves into one. The merge step is the heart of the algorithm: because both inputs are already sorted, it can produce the combined sorted output in a single linear pass.

Its running time is O(n log n) in the best, average, and worst case — no input can make it slow. It is also stable, which makes it the sort of choice when a predictable guarantee and stability matter more than the O(n) auxiliary memory it requires.`,
    howItWorks: [
      "If the range has 0 or 1 elements, it is already sorted — return.",
      "Split the range at its midpoint into left and right halves.",
      "Recursively sort the left half, then the right half.",
      "Merge: repeatedly take the smaller of the two halves' front elements.",
      "Copy any leftover elements; the merged range is now fully sorted.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(n)",
      notes: "log n levels of recursion, each doing O(n) merge work. Needs O(n) auxiliary space for merging (O(log n) stack aside).",
    },
    applications: [
      "External sorting of data too large to fit in memory (k-way merge)",
      "Stable sorting where equal keys must keep their order",
      "Sorting linked lists (merge sort needs no random access)",
      "Counting inversions and other divide-and-conquer problems",
      "The merge step underlies Timsort, the default sort in Python and Java",
    ],
    advantages: [
      "Guaranteed O(n log n) — no bad inputs",
      "Stable",
      "Excellent for linked lists and external/streamed data",
      "Highly parallelizable (independent halves)",
    ],
    disadvantages: [
      "Requires O(n) extra memory for the standard array version",
      "Not in-place (in-place merge is complex and slow)",
      "Higher constant factors than quicksort on typical in-memory arrays",
    ],
    commonMistakes: [
      "Using a[i] < a[j] instead of a[i] <= a[j] in the merge, which breaks stability.",
      "Allocating a new temp buffer on every merge instead of reusing one, hurting performance.",
      "Computing mid as (lo+hi) in languages where that can overflow — use lo + (hi-lo)/2.",
      "Forgetting to copy the remaining tail of whichever half is left.",
    ],
    interviewQuestions: [
      "Why is merge sort's worst case O(n log n) while quicksort's is O(n²)?",
      "How do you make merge sort stable, and where exactly does stability come from?",
      "Explain how merge sort adapts to sorting a singly linked list.",
      "How would you use the merge step to count inversions in an array?",
      "Describe external merge sort for data larger than RAM.",
    ],
    summary:
      "Merge sort divides the array, sorts each half, and merges them in linear time, giving a guaranteed O(n log n) stable sort at the cost of O(n) extra space. It is the backbone of external sorting, linked-list sorting, and hybrid sorts like Timsort.",
    quiz: [
      { question: "What is merge sort's worst-case time complexity?", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: 1, explanation: "log n levels, each O(n) merge work — regardless of input." },
      { question: "How much auxiliary space does standard array merge sort use?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2, explanation: "The merge step needs a temporary buffer proportional to the range size." },
      { question: "Which comparison keeps the merge stable?", options: ["left[i] < right[j] takes left", "left[i] <= right[j] takes left", "right[j] < left[i] takes left", "stability is impossible"], answer: 1, explanation: "Taking from the left on ties preserves the original order of equal keys." },
      { question: "Why is merge sort well suited to linked lists?", options: ["It needs random access", "It needs no random access and splits/merges via pointers", "It is in-place", "It uses O(1) memory"], answer: 1, explanation: "Merging only walks nodes sequentially, so no indexing is required." },
      { question: "Merge sort is a classic example of which paradigm?", options: ["Greedy", "Dynamic programming", "Divide and conquer", "Backtracking"], answer: 2, explanation: "It divides the problem, solves subproblems, and combines their results." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 38, 27, 43, 3, 9, 82, 10", help: "2–40 numbers, comma or space separated." }],
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
