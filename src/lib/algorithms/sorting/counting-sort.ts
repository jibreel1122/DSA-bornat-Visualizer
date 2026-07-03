import type { AlgorithmModule, ArrayFrame, AuxRow, CellState, Step } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const max = Math.max(...a);
  const min = Math.min(...a);
  const range = max - min + 1;
  const count = new Array(range).fill(0);
  const output = new Array(n).fill(null as number | null);
  const steps: Step<ArrayFrame>[] = [];
  let reads = 0;
  let writes = 0;
  const counters = () => ({ reads, writes });

  const countRow = (active?: number): AuxRow => ({
    label: `count[${min}..${max}]`,
    values: count.map((c, i) => `${min + i}:${c}`),
    states: active !== undefined ? { [active]: "active" } : {},
  });
  const outRow = (active?: number): AuxRow => ({
    label: "output",
    values: output.map((v) => (v === null ? "·" : v)),
    states: active !== undefined ? { [active]: "swap" } : {},
  });

  const snap = (states: Record<number, CellState>, aux: AuxRow[], description: string, codeLine: number) => {
    steps.push({ frame: { values: [...a], states, aux }, description, codeLine, counters: counters() });
  };

  snap({}, [countRow()], `Counting sort tallies how many of each value, then places them in order — no comparisons.`, 0);

  // count occurrences
  for (let i = 0; i < n; i++) {
    reads++;
    count[a[i] - min]++;
    snap({ [i]: "compare" }, [countRow(a[i] - min)], `Tally a[${i}] = ${a[i]}: increment count[${a[i]}].`, 1);
  }

  // prefix sums
  for (let i = 1; i < range; i++) {
    count[i] += count[i - 1];
    snap({}, [countRow(i)], `Prefix sum: count[${min + i}] += count[${min + i - 1}] → ${count[i]}.`, 2);
  }

  // place from the back (stable)
  for (let i = n - 1; i >= 0; i--) {
    reads++;
    const pos = count[a[i] - min] - 1;
    count[a[i] - min]--;
    output[pos] = a[i];
    writes++;
    snap({ [i]: "active" }, [countRow(a[i] - min), outRow(pos)], `Place a[${i}] = ${a[i]} at output[${pos}] (stable, back to front).`, 3);
  }

  for (let i = 0; i < n; i++) a[i] = output[i]!;
  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  snap(sorted, [outRow()], `Copy output back. Sorted in O(n + k) with k = ${range} distinct-value range.`, 4);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "counting-sort",
  title: "Counting Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["non-comparison", "stable", "linear", "integer keys"],
  summary: "Counts occurrences of each key and uses prefix sums to place elements directly — O(n + k), no comparisons.",
  renderer: "array",
  pseudocode: [
    "procedure countingSort(a, k)",
    "  count each value into count[0..k]",
    "  turn counts into prefix sums (positions)",
    "  for i = n-1 down to 0 (stable):",
    "    place a[i] at output[--count[a[i]]]",
    "  copy output back to a",
  ],
  code: {
    pseudocode: `count[v] = number of a[i] == v
for i in 1..k: count[i] += count[i-1]
for i in n-1..0:
  output[count[a[i]]-1] = a[i]
  count[a[i]] -= 1
copy output to a`,
    c: `void counting_sort(int a[], int n, int max) {
    int *count = calloc(max+1, sizeof(int));
    int *out = malloc(n*sizeof(int));
    for (int i = 0; i < n; i++) count[a[i]]++;
    for (int i = 1; i <= max; i++) count[i] += count[i-1];
    for (int i = n-1; i >= 0; i--) out[--count[a[i]]] = a[i];
    for (int i = 0; i < n; i++) a[i] = out[i];
    free(count); free(out);
}`,
    cpp: `void countingSort(std::vector<int>& a, int maxV) {
    std::vector<int> count(maxV+1, 0), out(a.size());
    for (int x : a) count[x]++;
    for (int i = 1; i <= maxV; i++) count[i] += count[i-1];
    for (int i = a.size()-1; i >= 0; --i) out[--count[a[i]]] = a[i];
    a = out;
}`,
    java: `static void countingSort(int[] a, int max) {
    int[] count = new int[max+1], out = new int[a.length];
    for (int x : a) count[x]++;
    for (int i = 1; i <= max; i++) count[i] += count[i-1];
    for (int i = a.length-1; i >= 0; i--) out[--count[a[i]]] = a[i];
    System.arraycopy(out, 0, a, 0, a.length);
}`,
    python: `def counting_sort(a: list[int]) -> list[int]:
    if not a: return a
    lo, hi = min(a), max(a)
    count = [0] * (hi - lo + 1)
    for x in a:
        count[x - lo] += 1
    for i in range(1, len(count)):
        count[i] += count[i-1]
    out = [0] * len(a)
    for x in reversed(a):
        count[x - lo] -= 1
        out[count[x - lo]] = x
    return out`,
    javascript: `function countingSort(a) {
  if (!a.length) return a;
  const lo = Math.min(...a), hi = Math.max(...a);
  const count = new Array(hi - lo + 1).fill(0);
  for (const x of a) count[x - lo]++;
  for (let i = 1; i < count.length; i++) count[i] += count[i-1];
  const out = new Array(a.length);
  for (let i = a.length - 1; i >= 0; i--) out[--count[a[i] - lo]] = a[i];
  return out;
}`,
    typescript: `function countingSort(a: number[]): number[] {
  if (!a.length) return a;
  const lo = Math.min(...a), hi = Math.max(...a);
  const count = new Array(hi - lo + 1).fill(0);
  for (const x of a) count[x - lo]++;
  for (let i = 1; i < count.length; i++) count[i] += count[i-1];
  const out = new Array<number>(a.length);
  for (let i = a.length - 1; i >= 0; i--) out[--count[a[i] - lo]] = a[i];
  return out;
}`,
    csharp: `static int[] CountingSort(int[] a, int max) {
    int[] count = new int[max+1], outp = new int[a.Length];
    foreach (int x in a) count[x]++;
    for (int i = 1; i <= max; i++) count[i] += count[i-1];
    for (int i = a.Length-1; i >= 0; i--) outp[--count[a[i]]] = a[i];
    return outp;
}`,
    go: `func countingSort(a []int, max int) []int {
	count := make([]int, max+1)
	out := make([]int, len(a))
	for _, x := range a {
		count[x]++
	}
	for i := 1; i <= max; i++ {
		count[i] += count[i-1]
	}
	for i := len(a) - 1; i >= 0; i-- {
		count[a[i]]--
		out[count[a[i]]] = a[i]
	}
	return out
}`,
    rust: `fn counting_sort(a: &[usize], max: usize) -> Vec<usize> {
    let mut count = vec![0usize; max + 1];
    for &x in a { count[x] += 1; }
    for i in 1..=max { count[i] += count[i - 1]; }
    let mut out = vec![0usize; a.len()];
    for &x in a.iter().rev() {
        count[x] -= 1;
        out[count[x]] = x;
    }
    out
}`,
    kotlin: `fun countingSort(a: IntArray, max: Int): IntArray {
    val count = IntArray(max + 1)
    for (x in a) count[x]++
    for (i in 1..max) count[i] += count[i-1]
    val out = IntArray(a.size)
    for (i in a.indices.reversed()) { count[a[i]]--; out[count[a[i]]] = a[i] }
    return out
}`,
    swift: `func countingSort(_ a: [Int], _ maxV: Int) -> [Int] {
    var count = [Int](repeating: 0, count: maxV + 1)
    for x in a { count[x] += 1 }
    for i in 1...maxV { count[i] += count[i-1] }
    var out = [Int](repeating: 0, count: a.count)
    for x in a.reversed() { count[x] -= 1; out[count[x]] = x }
    return out
}`,
  },
  content: {
    overview: `Counting sort is a non-comparison sorting algorithm for integer keys drawn from a small range. Instead of comparing elements, it counts how many times each value appears, converts those counts into starting positions using a prefix sum, and then places each element directly into its correct slot in the output.

Because it never compares two elements, it sidesteps the O(n log n) lower bound that applies to comparison sorts, running in O(n + k) where k is the size of the key range. It is stable (equal keys keep their order) when elements are placed from back to front, and it serves as the stable subroutine inside radix sort.`,
    howItWorks: [
      "Scan the array and count occurrences of each key into a count array.",
      "Convert the counts into prefix sums, so count[v] becomes the last output index for value v.",
      "Iterate the input from the last element to the first (to stay stable).",
      "For each element, place it at output[count[value] − 1] and decrement that count.",
      "Copy the output array back; every key now sits in sorted position.",
    ],
    complexity: {
      time: { best: "O(n + k)", average: "O(n + k)", worst: "O(n + k)" },
      space: "O(n + k)",
      notes: "k is the size of the key range (max − min + 1). Efficient only when k is not much larger than n; otherwise the count array dominates.",
    },
    applications: [
      "Sorting integers or keys from a small, known range",
      "The stable digit-sort inside radix sort",
      "Sorting characters, grades, ages, or bucketed data",
      "Building histograms and frequency tables",
    ],
    advantages: [
      "Linear O(n + k) time — beats comparison sorts when k is small",
      "Stable when placed back-to-front",
      "Simple and deterministic",
      "No comparisons required",
    ],
    disadvantages: [
      "Only works for integer (or discretizable) keys",
      "O(k) memory blows up when the value range is large",
      "Not in-place",
      "Impractical for floating-point or large-range keys",
    ],
    commonMistakes: [
      "Iterating front-to-back in the placement loop, which breaks stability.",
      "Forgetting the prefix-sum step and mis-placing elements.",
      "Using it when k ≫ n, wasting huge amounts of memory.",
      "Not offsetting by the minimum value when keys don't start at 0.",
    ],
    interviewQuestions: [
      "Why can counting sort beat the O(n log n) comparison lower bound?",
      "Why must placement iterate from the last element for stability?",
      "When does counting sort become impractical?",
      "How is counting sort used as a building block in radix sort?",
    ],
    summary:
      "Counting sort tallies each key, prefix-sums the counts into positions, and places elements directly — a stable O(n + k) non-comparison sort. It's ideal for small integer ranges and is the engine behind radix sort.",
    quiz: [
      { question: "Counting sort's time complexity is…", options: ["O(n log n)", "O(n + k)", "O(n²)", "O(k log n)"], answer: 1, explanation: "Linear in the number of elements plus the size of the key range k." },
      { question: "Counting sort avoids the O(n log n) lower bound because it…", options: ["Uses recursion", "Makes no comparisons", "Is in-place", "Uses a heap"], answer: 1, explanation: "The comparison lower bound only applies to comparison-based sorts." },
      { question: "To keep counting sort stable, elements are placed…", options: ["Front to back", "Back to front", "In random order", "By value"], answer: 1, explanation: "Iterating the input in reverse preserves the original order of equal keys." },
      { question: "Counting sort is impractical when…", options: ["n is small", "The key range k is much larger than n", "Keys are integers", "The array is sorted"], answer: 1, explanation: "A huge value range makes the O(k) count array dominate memory and time." },
      { question: "The prefix-sum step converts counts into…", options: ["Random positions", "Output positions for each key", "Comparisons", "Bucket sizes only"], answer: 1, explanation: "Cumulative counts give each value its final index range in the output." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values (0–30)", placeholder: "e.g. 4, 2, 2, 8, 3, 3, 1", help: "2–40 non-negative integers, values 0–30 keep the count array small." }],
  defaultInput: (level, rng) => {
    const size = [0, 6, 9, 12, 16, 20][level] ?? 10;
    return { values: Array.from({ length: size }, () => rng.int(0, 12 + level * 2)) };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: 0, max: 40, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 non-negative integers.");
    if (!values.every((v) => Number.isInteger(v))) throw new Error("Counting sort needs integer values.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
