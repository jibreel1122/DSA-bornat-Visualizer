import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function frame(values: number[], states: Record<number, CellState>, note?: string, pointers?: { index: number; label: string }[]): ArrayFrame {
  return { values: [...values], states: { ...states }, note, pointers };
}

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let shifts = 0;
  const counters = () => ({ comparisons, shifts });

  steps.push({ frame: frame(a, {}, "gap sequence: n/2, n/4, … 1"), description: `Shell sort runs insertion sort on elements spaced by a shrinking gap.`, codeLine: 0, counters: counters() });

  for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
    steps.push({ frame: frame(a, {}, `gap = ${gap}`), description: `Start a pass with gap ${gap}.`, codeLine: 1, counters: counters() });
    for (let i = gap; i < n; i++) {
      const key = a[i];
      let j = i;
      steps.push({ frame: frame(a, { [i]: "active" }, `gap = ${gap}`, [{ index: i, label: "i" }]), description: `Take key a[${i}] = ${key}; compare backwards in steps of ${gap}.`, codeLine: 2, counters: counters() });
      while (j >= gap) {
        comparisons++;
        steps.push({ frame: frame(a, { [j - gap]: "compare", [j]: "active" }, `gap = ${gap}`), description: `Compare a[${j - gap}] = ${a[j - gap]} with key ${key}.`, codeLine: 3, counters: counters() });
        if (a[j - gap] > key) {
          a[j] = a[j - gap];
          shifts++;
          steps.push({ frame: frame(a, { [j]: "swap", [j - gap]: "swap" }, `gap = ${gap}`), description: `${a[j]} > ${key}, shift it forward by ${gap}.`, codeLine: 4, counters: counters() });
          j -= gap;
        } else break;
      }
      a[j] = key;
      steps.push({ frame: frame(a, { [j]: "found" }, `gap = ${gap}`), description: `Place key ${key} at index ${j}.`, codeLine: 5, counters: counters() });
    }
  }
  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  steps.push({ frame: frame(a, sorted), description: `Sorted! Gaps let elements move long distances early, beating plain insertion sort.`, codeLine: 6, counters: counters() });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "shell-sort",
  title: "Shell Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["gap sequence", "in-place", "adaptive", "insertion-based"],
  summary: "Generalizes insertion sort by comparing elements a shrinking gap apart, moving them long distances early.",
  renderer: "array",
  pseudocode: [
    "procedure shellSort(a[0..n-1])",
    "  for gap = n/2 down to 1 (halving):",
    "    for i = gap to n-1:  key = a[i]; j = i",
    "      while j >= gap and a[j-gap] > key:",
    "        a[j] = a[j-gap]; j -= gap   // gapped shift",
    "      a[j] = key                    // insert",
    "  return a",
  ],
  code: {
    pseudocode: `procedure shellSort(a, n)
  gap = n / 2
  while gap > 0:
    for i = gap to n-1:
      key = a[i]; j = i
      while j >= gap and a[j-gap] > key:
        a[j] = a[j-gap]; j -= gap
      a[j] = key
    gap = gap / 2`,
    c: `void shell_sort(int a[], int n) {
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    cpp: `void shellSort(std::vector<int>& a) {
    int n = a.size();
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; ++i) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    java: `static void shellSort(int[] a) {
    int n = a.length;
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    python: `def shell_sort(a: list[int]) -> list[int]:
    n = len(a)
    gap = n // 2
    while gap > 0:
        for i in range(gap, n):
            key, j = a[i], i
            while j >= gap and a[j-gap] > key:
                a[j] = a[j-gap]; j -= gap
            a[j] = key
        gap //= 2
    return a`,
    javascript: `function shellSort(a) {
  const n = a.length;
  for (let gap = n >> 1; gap > 0; gap >>= 1)
    for (let i = gap; i < n; i++) {
      const key = a[i]; let j = i;
      while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
      a[j] = key;
    }
  return a;
}`,
    typescript: `function shellSort(a: number[]): number[] {
  const n = a.length;
  for (let gap = n >> 1; gap > 0; gap >>= 1)
    for (let i = gap; i < n; i++) {
      const key = a[i]; let j = i;
      while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
      a[j] = key;
    }
  return a;
}`,
    csharp: `static void ShellSort(int[] a) {
    int n = a.Length;
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int key = a[i], j = i;
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap; }
            a[j] = key;
        }
}`,
    go: `func shellSort(a []int) {
	n := len(a)
	for gap := n / 2; gap > 0; gap /= 2 {
		for i := gap; i < n; i++ {
			key, j := a[i], i
			for j >= gap && a[j-gap] > key {
				a[j] = a[j-gap]
				j -= gap
			}
			a[j] = key
		}
	}
}`,
    rust: `fn shell_sort(a: &mut [i32]) {
    let n = a.len();
    let mut gap = n / 2;
    while gap > 0 {
        for i in gap..n {
            let key = a[i];
            let mut j = i;
            while j >= gap && a[j - gap] > key { a[j] = a[j - gap]; j -= gap; }
            a[j] = key;
        }
        gap /= 2;
    }
}`,
    kotlin: `fun shellSort(a: IntArray) {
    val n = a.size
    var gap = n / 2
    while (gap > 0) {
        for (i in gap until n) {
            val key = a[i]; var j = i
            while (j >= gap && a[j-gap] > key) { a[j] = a[j-gap]; j -= gap }
            a[j] = key
        }
        gap /= 2
    }
}`,
    swift: `func shellSort(_ a: inout [Int]) {
    let n = a.count
    var gap = n / 2
    while gap > 0 {
        for i in gap..<n {
            let key = a[i]; var j = i
            while j >= gap && a[j-gap] > key { a[j] = a[j-gap]; j -= gap }
            a[j] = key
        }
        gap /= 2
    }
}`,
  },
  content: {
    overview: `Shell sort is a generalization of insertion sort that allows elements to move far across the array in a single step. Plain insertion sort only ever swaps adjacent elements, so a small value stuck at the end takes many moves to reach the front. Shell sort fixes this by first sorting elements that are a large "gap" apart, then repeatedly shrinking the gap until it reaches 1 — at which point the array is nearly sorted and the final insertion pass is cheap.

Its performance depends heavily on the gap sequence. The simple halving sequence (n/2, n/4, …, 1) shown here is easy to understand but not optimal; sequences like Ciura's or Sedgewick's push it well below O(n²). Shell sort is in-place, reasonably fast on medium arrays, and was historically important as a simple sub-quadratic sort.`,
    howItWorks: [
      "Choose a starting gap (here, n/2).",
      "Run an insertion sort where compared elements are 'gap' positions apart instead of adjacent.",
      "Long-range shifts move out-of-place elements most of the way home early.",
      "Halve the gap and repeat, each pass leaving the array 'more sorted'.",
      "The final pass with gap 1 is an ordinary insertion sort on nearly-sorted data — fast.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "≈O(n^1.25)", worst: "O(n²)" },
      space: "O(1)",
      notes: "Complexity depends on the gap sequence. Halving gives O(n²) worst case; better sequences (Ciura, Sedgewick) achieve around O(n^1.3) or better. In-place, O(1) extra memory.",
    },
    applications: [
      "Medium-sized arrays where a simple, in-place, sub-quadratic sort is wanted",
      "Embedded systems (small code, no recursion, no extra memory)",
      "Situations avoiding recursion/stack usage of quicksort/merge sort",
      "As a teaching bridge between insertion sort and advanced sorts",
    ],
    advantages: [
      "In-place with O(1) extra memory",
      "Much faster than plain insertion sort on larger inputs",
      "Simple, iterative, no recursion",
      "Adaptive — benefits from partial order",
    ],
    disadvantages: [
      "Not stable",
      "Performance is very sensitive to the gap sequence",
      "Worst case O(n²) with poor gaps",
      "Harder to analyze than most sorts",
    ],
    commonMistakes: [
      "Using a poor gap sequence and expecting O(n log n).",
      "Off-by-one errors in the gapped inner loop (j >= gap).",
      "Assuming shell sort is stable — the long jumps reorder equal keys.",
      "Forgetting the final gap must reach 1.",
    ],
    interviewQuestions: [
      "Why does shell sort outperform plain insertion sort?",
      "How does the choice of gap sequence affect complexity?",
      "Is shell sort stable? Why or why not?",
      "Why is the final pass (gap = 1) always cheap?",
    ],
    summary:
      "Shell sort is gapped insertion sort: it sorts elements a large gap apart, then shrinks the gap to 1, letting values travel long distances early. In-place and O(1) space, with complexity between O(n log n) and O(n²) depending on the gap sequence.",
    quiz: [
      { question: "Shell sort is a generalization of which algorithm?", options: ["Merge sort", "Insertion sort", "Quick sort", "Heap sort"], answer: 1, explanation: "It performs insertion sort on elements a gap apart, shrinking the gap to 1." },
      { question: "What mainly determines shell sort's running time?", options: ["The pivot", "The gap sequence", "The recursion depth", "The alphabet size"], answer: 1, explanation: "Different gap sequences yield very different asymptotic bounds." },
      { question: "Why is the gap = 1 pass fast?", options: ["It is skipped", "The array is already nearly sorted by then", "It uses binary search", "It sorts in place"], answer: 1, explanation: "Earlier gapped passes leave few remaining inversions for the final insertion pass." },
      { question: "Shell sort's extra space usage is…", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0, explanation: "It sorts in place with only a few index variables." },
      { question: "Shell sort is…", options: ["stable", "unstable", "always O(n log n)", "recursive"], answer: 1, explanation: "Long-distance moves can reorder equal keys, so it is not stable." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 23, 12, 1, 8, 34, 54, 2, 3", help: "2–40 numbers." }],
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
