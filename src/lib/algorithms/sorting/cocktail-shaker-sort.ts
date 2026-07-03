import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function frame(values: number[], states: Record<number, CellState>, lo: number, hi: number): ArrayFrame {
  const merged: Record<number, CellState> = { ...states };
  for (let i = 0; i < lo; i++) merged[i] ??= "sorted";
  for (let i = hi + 1; i < values.length; i++) merged[i] ??= "sorted";
  return { values: [...values], states: merged, note: `active range [${lo}..${hi}]` };
}

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let swaps = 0;
  const c = () => ({ comparisons, swaps });

  steps.push({ frame: frame(a, {}, 0, n - 1), description: `Cocktail sort bubbles in both directions each pass, sorting from both ends inward.`, codeLine: 0, counters: c() });

  let lo = 0;
  let hi = n - 1;
  let swapped = true;
  while (swapped && lo < hi) {
    swapped = false;
    for (let i = lo; i < hi; i++) {
      comparisons++;
      steps.push({ frame: frame(a, { [i]: "compare", [i + 1]: "compare" }, lo, hi), description: `→ Compare a[${i}] = ${a[i]} and a[${i + 1}] = ${a[i + 1]}.`, codeLine: 2, counters: c() });
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swaps++;
        swapped = true;
        steps.push({ frame: frame(a, { [i]: "swap", [i + 1]: "swap" }, lo, hi), description: `Swap — larger bubbles right.`, codeLine: 3, counters: c() });
      }
    }
    hi--;
    steps.push({ frame: frame(a, {}, lo, hi), description: `Largest is parked at the right end; shrink upper bound.`, codeLine: 4, counters: c() });
    if (!swapped) break;
    swapped = false;
    for (let i = hi; i > lo; i--) {
      comparisons++;
      steps.push({ frame: frame(a, { [i - 1]: "compare", [i]: "compare" }, lo, hi), description: `← Compare a[${i - 1}] = ${a[i - 1]} and a[${i}] = ${a[i]}.`, codeLine: 5, counters: c() });
      if (a[i - 1] > a[i]) {
        [a[i - 1], a[i]] = [a[i], a[i - 1]];
        swaps++;
        swapped = true;
        steps.push({ frame: frame(a, { [i - 1]: "swap", [i]: "swap" }, lo, hi), description: `Swap — smaller bubbles left.`, codeLine: 6, counters: c() });
      }
    }
    lo++;
    steps.push({ frame: frame(a, {}, lo, hi), description: `Smallest is parked at the left end; raise lower bound.`, codeLine: 7, counters: c() });
  }
  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  steps.push({ frame: { values: [...a], states: sorted }, description: `Sorted from both ends inward.`, codeLine: 8, counters: c() });
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "cocktail-shaker-sort",
  title: "Cocktail Shaker Sort",
  category: "sorting",
  difficulty: "Beginner",
  tags: ["bidirectional", "stable", "in-place", "bubble variant"],
  summary: "A bidirectional bubble sort that alternates forward and backward passes, sorting from both ends inward.",
  renderer: "array",
  pseudocode: [
    "procedure cocktailSort(a)",
    "  lo=0; hi=n-1; swapped=true",
    "  while swapped:",
    "    forward pass lo→hi: bubble largest right; hi--",
    "    backward pass hi→lo: bubble smallest left; lo++",
    "    // both ends grow sorted",
    "  return a",
  ],
  code: {
    pseudocode: `lo = 0; hi = n-1; swapped = true
while swapped and lo < hi:
  swapped = false
  for i in lo..hi-1: if a[i] > a[i+1]: swap; swapped = true
  hi -= 1
  for i in hi..lo+1: if a[i-1] > a[i]: swap; swapped = true
  lo += 1`,
    c: `void cocktail_sort(int a[], int n) {
    int lo = 0, hi = n-1, swapped = 1;
    while (swapped && lo < hi) {
        swapped = 0;
        for (int i = lo; i < hi; i++) if (a[i] > a[i+1]) { int t=a[i];a[i]=a[i+1];a[i+1]=t; swapped=1; }
        hi--;
        for (int i = hi; i > lo; i--) if (a[i-1] > a[i]) { int t=a[i];a[i]=a[i-1];a[i-1]=t; swapped=1; }
        lo++;
    }
}`,
    cpp: `void cocktailSort(std::vector<int>& a) {
    int lo = 0, hi = a.size()-1; bool swapped = true;
    while (swapped && lo < hi) {
        swapped = false;
        for (int i = lo; i < hi; i++) if (a[i] > a[i+1]) { std::swap(a[i], a[i+1]); swapped = true; }
        hi--;
        for (int i = hi; i > lo; i--) if (a[i-1] > a[i]) { std::swap(a[i-1], a[i]); swapped = true; }
        lo++;
    }
}`,
    java: `static void cocktailSort(int[] a) {
    int lo = 0, hi = a.length-1; boolean swapped = true;
    while (swapped && lo < hi) {
        swapped = false;
        for (int i = lo; i < hi; i++) if (a[i] > a[i+1]) { int t=a[i];a[i]=a[i+1];a[i+1]=t; swapped=true; }
        hi--;
        for (int i = hi; i > lo; i--) if (a[i-1] > a[i]) { int t=a[i];a[i]=a[i-1];a[i-1]=t; swapped=true; }
        lo++;
    }
}`,
    python: `def cocktail_sort(a: list[int]) -> list[int]:
    lo, hi, swapped = 0, len(a) - 1, True
    while swapped and lo < hi:
        swapped = False
        for i in range(lo, hi):
            if a[i] > a[i+1]:
                a[i], a[i+1] = a[i+1], a[i]; swapped = True
        hi -= 1
        for i in range(hi, lo, -1):
            if a[i-1] > a[i]:
                a[i-1], a[i] = a[i], a[i-1]; swapped = True
        lo += 1
    return a`,
    javascript: `function cocktailSort(a) {
  let lo = 0, hi = a.length - 1, swapped = true;
  while (swapped && lo < hi) {
    swapped = false;
    for (let i = lo; i < hi; i++) if (a[i] > a[i+1]) { [a[i],a[i+1]]=[a[i+1],a[i]]; swapped = true; }
    hi--;
    for (let i = hi; i > lo; i--) if (a[i-1] > a[i]) { [a[i-1],a[i]]=[a[i],a[i-1]]; swapped = true; }
    lo++;
  }
  return a;
}`,
    typescript: `function cocktailSort(a: number[]): number[] {
  let lo = 0, hi = a.length - 1, swapped = true;
  while (swapped && lo < hi) {
    swapped = false;
    for (let i = lo; i < hi; i++) if (a[i] > a[i+1]) { [a[i],a[i+1]]=[a[i+1],a[i]]; swapped = true; }
    hi--;
    for (let i = hi; i > lo; i--) if (a[i-1] > a[i]) { [a[i-1],a[i]]=[a[i],a[i-1]]; swapped = true; }
    lo++;
  }
  return a;
}`,
    csharp: `static void CocktailSort(int[] a) {
    int lo = 0, hi = a.Length-1; bool swapped = true;
    while (swapped && lo < hi) {
        swapped = false;
        for (int i = lo; i < hi; i++) if (a[i] > a[i+1]) { (a[i],a[i+1])=(a[i+1],a[i]); swapped = true; }
        hi--;
        for (int i = hi; i > lo; i--) if (a[i-1] > a[i]) { (a[i-1],a[i])=(a[i],a[i-1]); swapped = true; }
        lo++;
    }
}`,
    go: `func cocktailSort(a []int) {
	lo, hi, swapped := 0, len(a)-1, true
	for swapped && lo < hi {
		swapped = false
		for i := lo; i < hi; i++ {
			if a[i] > a[i+1] { a[i], a[i+1] = a[i+1], a[i]; swapped = true }
		}
		hi--
		for i := hi; i > lo; i-- {
			if a[i-1] > a[i] { a[i-1], a[i] = a[i], a[i-1]; swapped = true }
		}
		lo++
	}
}`,
    rust: `fn cocktail_sort(a: &mut [i32]) {
    let (mut lo, mut hi, mut swapped) = (0usize, a.len().saturating_sub(1), true);
    while swapped && lo < hi {
        swapped = false;
        for i in lo..hi { if a[i] > a[i+1] { a.swap(i, i+1); swapped = true; } }
        hi -= 1;
        let mut i = hi;
        while i > lo { if a[i-1] > a[i] { a.swap(i-1, i); swapped = true; } i -= 1; }
        lo += 1;
    }
}`,
    kotlin: `fun cocktailSort(a: IntArray) {
    var lo = 0; var hi = a.size - 1; var swapped = true
    while (swapped && lo < hi) {
        swapped = false
        for (i in lo until hi) if (a[i] > a[i+1]) { val t=a[i];a[i]=a[i+1];a[i+1]=t; swapped = true }
        hi--
        for (i in hi downTo lo+1) if (a[i-1] > a[i]) { val t=a[i];a[i]=a[i-1];a[i-1]=t; swapped = true }
        lo++
    }
}`,
    swift: `func cocktailSort(_ a: inout [Int]) {
    var lo = 0, hi = a.count - 1, swapped = true
    while swapped && lo < hi {
        swapped = false
        for i in lo..<hi where a[i] > a[i+1] { a.swapAt(i, i+1); swapped = true }
        hi -= 1
        var i = hi
        while i > lo { if a[i-1] > a[i] { a.swapAt(i-1, i); swapped = true }; i -= 1 }
        lo += 1
    }
}`,
  },
  content: {
    overview: `Cocktail shaker sort (also called bidirectional bubble sort or shaker sort) is a variation of bubble sort that traverses the array in both directions on alternating passes. A forward pass bubbles the largest remaining element to the right end; a backward pass then bubbles the smallest remaining element to the left end. The sorted region therefore grows from both ends toward the middle.

Its main advantage over plain bubble sort is that it handles "turtles" — small values near the end of the array — much faster. In bubble sort a turtle moves left only one position per full pass; cocktail sort's backward pass moves it many positions at once. It remains a simple, stable, O(n²) sort, useful mainly for teaching.`,
    howItWorks: [
      "Maintain a shrinking active window [lo, hi].",
      "Forward pass: compare adjacent pairs from lo to hi, swapping out-of-order ones; the max lands at hi.",
      "Shrink hi by one — the right end is now sorted.",
      "Backward pass: compare adjacent pairs from hi down to lo; the min lands at lo.",
      "Raise lo by one and repeat until a full round makes no swaps.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes: "Best case O(n) on already-sorted input (one pass, no swaps). Average and worst O(n²). Handles small-value 'turtles' better than bubble sort but is asymptotically the same.",
    },
    applications: [
      "Teaching bubble-sort variants and the 'turtle' problem",
      "Nearly-sorted small arrays where simplicity matters",
      "Situations needing a stable, in-place, tiny-code sort",
      "Demonstrating bidirectional passes",
    ],
    advantages: [
      "Handles small trailing values faster than bubble sort",
      "Stable and in-place",
      "Adaptive: O(n) on sorted input",
      "Simple to implement",
    ],
    disadvantages: [
      "Still O(n²) on average",
      "More complex than plain bubble sort for little gain",
      "Outclassed by insertion sort in practice",
    ],
    commonMistakes: [
      "Not shrinking both bounds (lo and hi), redoing sorted work.",
      "Forgetting the early-exit when a pass makes no swaps.",
      "Off-by-one errors in the backward loop bounds.",
      "Believing it's asymptotically better than bubble sort — it isn't.",
    ],
    interviewQuestions: [
      "What problem with bubble sort does cocktail sort address?",
      "Why can both ends of the array be marked sorted as it runs?",
      "Is cocktail sort stable? Why?",
      "What is its best-case complexity and when does it occur?",
    ],
    summary:
      "Cocktail shaker sort is bubble sort that alternates forward and backward passes, growing a sorted region from both ends. Stable, in-place, O(n²) average, but faster than bubble sort at moving small values that sit near the end.",
    quiz: [
      { question: "Cocktail sort improves on bubble sort mainly by…", options: ["Using recursion", "Passing in both directions to move small trailing values faster", "Being O(n log n)", "Avoiding swaps"], answer: 1, explanation: "The backward pass quickly moves 'turtles' (small values near the end) leftward." },
      { question: "As cocktail sort runs, the sorted region grows…", options: ["From the left only", "From both ends inward", "From the middle out", "Randomly"], answer: 1, explanation: "Forward passes fix the right end; backward passes fix the left end." },
      { question: "Its average-case time complexity is…", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], answer: 2, explanation: "Like bubble sort, it does quadratic work on average." },
      { question: "Cocktail sort is…", options: ["unstable", "stable and in-place", "out-of-place", "non-adaptive"], answer: 1, explanation: "It only swaps adjacent out-of-order pairs and uses O(1) memory." },
      { question: "Its best case O(n) occurs when the input is…", options: ["Reverse sorted", "Already sorted", "All equal to zero", "Random"], answer: 1, explanation: "One forward pass with no swaps triggers the early exit." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 5, 1, 4, 2, 8, 0, 2", help: "2–40 numbers." }],
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
