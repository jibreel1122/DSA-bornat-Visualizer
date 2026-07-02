import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function frame(values: number[], states: Record<number, CellState>, sortedTo: number, note?: string): ArrayFrame {
  const merged: Record<number, CellState> = { ...states };
  for (let i = 0; i < sortedTo; i++) merged[i] ??= "sorted";
  return { values: [...values], states: merged, note };
}

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });

  steps.push({ frame: frame(a, {}, 0), description: `Select the minimum of the unsorted region each pass and place it at the front.`, codeLine: 0, counters: counters() });

  for (let i = 0; i < n - 1; i++) {
    let min = i;
    steps.push({ frame: frame(a, { [i]: "active", [min]: "pivot" }, i), description: `Pass ${i + 1}: assume a[${i}] = ${a[i]} is the minimum.`, codeLine: 1, counters: counters() });
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      steps.push({ frame: frame(a, { [min]: "pivot", [j]: "compare" }, i), description: `Compare a[${j}] = ${a[j]} against current min a[${min}] = ${a[min]}.`, codeLine: 3, counters: counters() });
      if (a[j] < a[min]) {
        min = j;
        steps.push({ frame: frame(a, { [min]: "pivot" }, i), description: `New minimum found: a[${min}] = ${a[min]}.`, codeLine: 4, counters: counters() });
      }
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      swaps++;
      steps.push({ frame: frame(a, { [i]: "swap", [min]: "swap" }, i), description: `Swap the minimum into position ${i}.`, codeLine: 5, counters: counters() });
    } else {
      steps.push({ frame: frame(a, { [i]: "sorted" }, i), description: `a[${i}] is already the minimum — no swap needed.`, codeLine: 5, counters: counters() });
    }
    steps.push({ frame: frame(a, {}, i + 1), description: `Position ${i} is finalized.`, codeLine: 6, counters: counters() });
  }
  steps.push({ frame: frame(a, {}, n), description: `Sorted with exactly ${swaps} swaps — selection sort minimizes writes.`, codeLine: 7, counters: counters() });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "selection-sort",
  title: "Selection Sort",
  category: "sorting",
  difficulty: "Beginner",
  tags: ["comparison sort", "in-place", "quadratic", "few swaps"],
  summary: "Repeatedly selects the smallest remaining element and moves it to the front, using at most n−1 swaps.",
  renderer: "array",
  pseudocode: [
    "procedure selectionSort(a[0..n-1])",
    "  for i = 0 to n-2",
    "    min = i",
    "    for j = i+1 to n-1",
    "      if a[j] < a[min] then min = j",
    "    swap(a[i], a[min])",
    "    // a[i] is now finalized",
    "  return a",
  ],
  code: {
    pseudocode: `procedure selectionSort(a[0..n-1])
  for i = 0 to n-2
    min = i
    for j = i+1 to n-1
      if a[j] < a[min] then min = j
    swap(a[i], a[min])
  return a`,
    c: `void selection_sort(int a[], int n) {
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[min]) min = j;
        int tmp = a[i]; a[i] = a[min]; a[min] = tmp;
    }
}`,
    cpp: `#include <vector>
#include <utility>

void selectionSort(std::vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; ++i) {
        int min = i;
        for (int j = i + 1; j < n; ++j)
            if (a[j] < a[min]) min = j;
        std::swap(a[i], a[min]);
    }
}`,
    java: `static void selectionSort(int[] a) {
    int n = a.length;
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[min]) min = j;
        int tmp = a[i]; a[i] = a[min]; a[min] = tmp;
    }
}`,
    python: `def selection_sort(a: list[int]) -> list[int]:
    n = len(a)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if a[j] < a[min_idx]:
                min_idx = j
        a[i], a[min_idx] = a[min_idx], a[i]
    return a`,
    javascript: `function selectionSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) if (a[j] < a[min]) min = j;
    [a[i], a[min]] = [a[min], a[i]];
  }
  return a;
}`,
    typescript: `function selectionSort(a: number[]): number[] {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) if (a[j] < a[min]) min = j;
    [a[i], a[min]] = [a[min], a[i]];
  }
  return a;
}`,
    csharp: `static void SelectionSort(int[] a) {
    int n = a.Length;
    for (int i = 0; i < n - 1; i++) {
        int min = i;
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[min]) min = j;
        (a[i], a[min]) = (a[min], a[i]);
    }
}`,
    go: `func selectionSort(a []int) {
	n := len(a)
	for i := 0; i < n-1; i++ {
		min := i
		for j := i + 1; j < n; j++ {
			if a[j] < a[min] {
				min = j
			}
		}
		a[i], a[min] = a[min], a[i]
	}
}`,
    rust: `fn selection_sort(a: &mut [i32]) {
    let n = a.len();
    for i in 0..n.saturating_sub(1) {
        let mut min = i;
        for j in i + 1..n {
            if a[j] < a[min] { min = j; }
        }
        a.swap(i, min);
    }
}`,
    kotlin: `fun selectionSort(a: IntArray) {
    val n = a.size
    for (i in 0 until n - 1) {
        var min = i
        for (j in i + 1 until n) if (a[j] < a[min]) min = j
        val tmp = a[i]; a[i] = a[min]; a[min] = tmp
    }
}`,
    swift: `func selectionSort(_ a: inout [Int]) {
    let n = a.count
    for i in 0..<max(0, n - 1) {
        var min = i
        for j in (i + 1)..<n where a[j] < a[min] { min = j }
        a.swapAt(i, min)
    }
}`,
  },
  content: {
    overview: `Selection sort divides the array into a sorted prefix and an unsorted remainder. On each pass it scans the entire unsorted region to find the smallest element, then swaps that element into the first unsorted slot. The sorted prefix grows by one each pass until the whole array is ordered.

Its defining trait is write efficiency: it performs at most n−1 swaps total — one per pass — regardless of the input. When writes are far more expensive than reads (for example, wear-limited flash memory), that property can matter.`,
    howItWorks: [
      "Treat position i as the first slot of the unsorted region.",
      "Scan every element to its right to find the index of the minimum.",
      "Swap that minimum into position i, extending the sorted prefix.",
      "Advance i and repeat until only one element remains.",
    ],
    complexity: {
      time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes: "Always makes n(n−1)/2 comparisons — it can't detect an already-sorted array early. But it performs only O(n) swaps.",
    },
    applications: [
      "Systems where writes/swaps are far costlier than comparisons",
      "Teaching the sorted-prefix invariant and selection strategy",
      "Small arrays where simplicity trumps speed",
      "As a conceptual stepping stone to heap sort (a smarter selection)",
    ],
    advantages: [
      "At most n−1 swaps — minimal data movement",
      "In-place with O(1) extra memory",
      "Simple and predictable — same cost on any input",
      "Easy to reason about and implement correctly",
    ],
    disadvantages: [
      "Always O(n²) comparisons, even on sorted input",
      "Not adaptive — cannot exploit existing order",
      "Not stable in its classic swap-based form",
      "Outperformed by insertion sort on nearly-sorted data",
    ],
    commonMistakes: [
      "Starting the inner scan at i instead of i+1, wasting a comparison.",
      "Swapping inside the inner loop instead of once after finding the min — that breaks the low-swap guarantee.",
      "Assuming it is stable; the long-distance swap can reorder equal keys.",
      "Expecting an early exit on sorted input — there is none.",
    ],
    interviewQuestions: [
      "Why does selection sort perform only O(n) swaps while bubble sort may perform O(n²)?",
      "Is selection sort stable? Show an input where it reorders equal elements.",
      "How is heap sort a more efficient realization of the selection idea?",
      "Can you make selection sort stable, and at what cost?",
    ],
    summary:
      "Selection sort repeatedly finds the minimum of the unsorted region and swaps it into place, using O(n²) comparisons but only O(n) swaps. In-place, simple, non-adaptive, and unstable — chosen when writes are expensive.",
    quiz: [
      { question: "How many swaps does selection sort perform in the worst case?", options: ["O(n²)", "O(n log n)", "O(n)", "O(1)"], answer: 2, explanation: "Exactly one swap per pass, so at most n−1 swaps overall." },
      { question: "On an already-sorted array, selection sort makes how many comparisons?", options: ["0", "n−1", "n(n−1)/2", "n log n"], answer: 2, explanation: "It always scans the full unsorted region — no early exit — giving n(n−1)/2 comparisons." },
      { question: "Selection sort is best described as…", options: ["stable and adaptive", "unstable and non-adaptive", "stable and non-adaptive", "unstable and adaptive"], answer: 1, explanation: "The long-distance swap can reorder equal keys (unstable) and it never exploits existing order (non-adaptive)." },
      { question: "Which algorithm generalizes selection sort using a heap to find the min/max faster?", options: ["Merge sort", "Heap sort", "Radix sort", "Quick sort"], answer: 1, explanation: "Heap sort selects the extreme element in O(log n) instead of O(n)." },
      { question: "Why might selection sort be preferred despite O(n²) time?", options: ["It is stable", "It minimizes the number of writes", "It is adaptive", "It uses O(log n) memory"], answer: 1, explanation: "With at most n−1 swaps, it is attractive when writing memory is expensive." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 64, 25, 12, 22, 11", help: "2–40 numbers, comma or space separated." }],
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
