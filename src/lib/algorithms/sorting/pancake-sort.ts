import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  let flips = 0;
  let comparisons = 0;

  const snap = (states: Record<number, CellState>, description: string, codeLine: number, range?: { from: number; to: number }) => {
    steps.push({ frame: { values: [...a], states, range: range ?? null }, description, codeLine, counters: { flips, comparisons } });
  };

  const flip = (k: number) => {
    // reverse a[0..k]
    let lo = 0;
    let hi = k;
    while (lo < hi) {
      [a[lo], a[hi]] = [a[hi], a[lo]];
      lo++;
      hi--;
    }
    flips++;
  };

  snap({}, `Pancake sort: repeatedly find the largest unsorted element and "flip" it to the front, then flip it into its final position — like flipping a stack of pancakes with a spatula.`, 0);

  for (let size = n; size > 1; size--) {
    let maxIdx = 0;
    for (let i = 1; i < size; i++) {
      comparisons++;
      if (a[i] > a[maxIdx]) maxIdx = i;
    }
    snap(
      { [maxIdx]: "pivot" },
      `Among a[0..${size - 1}], the largest is a[${maxIdx}] = ${a[maxIdx]}.`,
      1,
      { from: 0, to: size - 1 },
    );

    if (maxIdx === size - 1) {
      snap({ [maxIdx]: "sorted" }, `a[${maxIdx}] = ${a[maxIdx]} is already at the end of this range — no flip needed.`, 2, { from: 0, to: size - 1 });
      continue;
    }

    if (maxIdx !== 0) {
      const before = [...a];
      flip(maxIdx);
      snap(
        { 0: "swap" },
        `Flip 1: reverse a[0..${maxIdx}] so the max (${before[maxIdx]}) moves to the front: [${a.slice(0, size).join(", ")}].`,
        3,
        { from: 0, to: size - 1 },
      );
    }

    flip(size - 1);
    snap(
      { [size - 1]: "sorted" },
      `Flip 2: reverse a[0..${size - 1}] to send the max to its final position, index ${size - 1}.`,
      4,
      { from: 0, to: size - 1 },
    );
  }

  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  snap(sorted, `Sorted using ${flips} flips and ${comparisons} comparisons (at most 2(n−1) flips are ever needed).`, 5);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "pancake-sort",
  title: "Pancake Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["comparison sort", "flip-based", "O(n²)", "prefix reversal"],
  summary: "Sorts using only 'flip the first k elements' operations — find the max, flip it to the front, then flip it to its final position.",
  renderer: "array",
  pseudocode: [
    "procedure pancakeSort(a)",
    "  for size = n downto 2:",
    "    find index of the max in a[0..size-1]",
    "    if max is not already at a[size-1]:",
    "      flip(a, maxIndex)      // send the max to the front",
    "      flip(a, size-1)        // send the max to its final spot",
    "  // after n-1 rounds, a is sorted",
    "  return a",
  ],
  code: {
    pseudocode: `flip(a, k): reverse a[0..k]
for size = n downto 2:
  i = index of max in a[0..size-1]
  if i != size - 1:
    flip(a, i)
    flip(a, size - 1)`,
    c: `void flip(int* a, int k) {
    for (int lo = 0, hi = k; lo < hi; lo++, hi--) {
        int t = a[lo]; a[lo] = a[hi]; a[hi] = t;
    }
}
void pancakeSort(int* a, int n) {
    for (int size = n; size > 1; size--) {
        int mi = 0;
        for (int i = 1; i < size; i++) if (a[i] > a[mi]) mi = i;
        if (mi != size - 1) {
            if (mi != 0) flip(a, mi);
            flip(a, size - 1);
        }
    }
}`,
    cpp: `void flip(vector<int>& a, int k) {
    reverse(a.begin(), a.begin() + k + 1);
}
void pancakeSort(vector<int>& a) {
    for (int size = a.size(); size > 1; size--) {
        int mi = max_element(a.begin(), a.begin() + size) - a.begin();
        if (mi != size - 1) {
            if (mi != 0) flip(a, mi);
            flip(a, size - 1);
        }
    }
}`,
    java: `static void flip(int[] a, int k) {
    for (int lo = 0, hi = k; lo < hi; lo++, hi--) {
        int t = a[lo]; a[lo] = a[hi]; a[hi] = t;
    }
}
static void pancakeSort(int[] a) {
    for (int size = a.length; size > 1; size--) {
        int mi = 0;
        for (int i = 1; i < size; i++) if (a[i] > a[mi]) mi = i;
        if (mi != size - 1) {
            if (mi != 0) flip(a, mi);
            flip(a, size - 1);
        }
    }
}`,
    python: `def flip(a: list[int], k: int) -> None:
    a[:k + 1] = reversed(a[:k + 1])

def pancake_sort(a: list[int]) -> list[int]:
    for size in range(len(a), 1, -1):
        mi = max(range(size), key=lambda i: a[i])
        if mi != size - 1:
            if mi != 0:
                flip(a, mi)
            flip(a, size - 1)
    return a`,
    javascript: `function flip(a, k) {
  for (let lo = 0, hi = k; lo < hi; lo++, hi--) [a[lo], a[hi]] = [a[hi], a[lo]];
}
function pancakeSort(a) {
  for (let size = a.length; size > 1; size--) {
    let mi = 0;
    for (let i = 1; i < size; i++) if (a[i] > a[mi]) mi = i;
    if (mi !== size - 1) {
      if (mi !== 0) flip(a, mi);
      flip(a, size - 1);
    }
  }
  return a;
}`,
    typescript: `function flip(a: number[], k: number): void {
  for (let lo = 0, hi = k; lo < hi; lo++, hi--) [a[lo], a[hi]] = [a[hi], a[lo]];
}
function pancakeSort(a: number[]): number[] {
  for (let size = a.length; size > 1; size--) {
    let mi = 0;
    for (let i = 1; i < size; i++) if (a[i] > a[mi]) mi = i;
    if (mi !== size - 1) {
      if (mi !== 0) flip(a, mi);
      flip(a, size - 1);
    }
  }
  return a;
}`,
    csharp: `static void Flip(int[] a, int k) {
    for (int lo = 0, hi = k; lo < hi; lo++, hi--) (a[lo], a[hi]) = (a[hi], a[lo]);
}
static void PancakeSort(int[] a) {
    for (int size = a.Length; size > 1; size--) {
        int mi = 0;
        for (int i = 1; i < size; i++) if (a[i] > a[mi]) mi = i;
        if (mi != size - 1) {
            if (mi != 0) Flip(a, mi);
            Flip(a, size - 1);
        }
    }
}`,
    go: `func flip(a []int, k int) {
	for lo, hi := 0, k; lo < hi; lo, hi = lo+1, hi-1 {
		a[lo], a[hi] = a[hi], a[lo]
	}
}
func pancakeSort(a []int) {
	for size := len(a); size > 1; size-- {
		mi := 0
		for i := 1; i < size; i++ {
			if a[i] > a[mi] {
				mi = i
			}
		}
		if mi != size-1 {
			if mi != 0 {
				flip(a, mi)
			}
			flip(a, size-1)
		}
	}
}`,
    rust: `fn flip(a: &mut [i32], k: usize) {
    a[0..=k].reverse();
}
fn pancake_sort(a: &mut Vec<i32>) {
    let n = a.len();
    for size in (2..=n).rev() {
        let mi = (0..size).max_by_key(|&i| a[i]).unwrap();
        if mi != size - 1 {
            if mi != 0 { flip(a, mi); }
            flip(a, size - 1);
        }
    }
}`,
    kotlin: `fun flip(a: IntArray, k: Int) {
    var lo = 0; var hi = k
    while (lo < hi) {
        val t = a[lo]; a[lo] = a[hi]; a[hi] = t
        lo++; hi--
    }
}
fun pancakeSort(a: IntArray) {
    for (size in a.size downTo 2) {
        var mi = 0
        for (i in 1 until size) if (a[i] > a[mi]) mi = i
        if (mi != size - 1) {
            if (mi != 0) flip(a, mi)
            flip(a, size - 1)
        }
    }
}`,
    swift: `func flip(_ a: inout [Int], _ k: Int) {
    var lo = 0, hi = k
    while lo < hi { a.swapAt(lo, hi); lo += 1; hi -= 1 }
}
func pancakeSort(_ a: inout [Int]) {
    var size = a.count
    while size > 1 {
        var mi = 0
        for i in 1..<size where a[i] > a[mi] { mi = i }
        if mi != size - 1 {
            if mi != 0 { flip(&a, mi) }
            flip(&a, size - 1)
        }
        size -= 1
    }
}`,
  },
  content: {
    overview: `Pancake sort is a delightfully constrained sorting model: the only operation allowed is "flip" — reverse the first k elements of the array, like a spatula flipping the top k pancakes of a stack. Despite this restriction, it's easy to sort anything with a simple two-flip-per-pass strategy: find the largest unsorted pancake, flip it to the top of the stack, then flip the whole unsorted portion so that pancake lands at the bottom of the unsorted region (its final position).

The algorithm itself is a straightforward O(n²) comparison sort — its real interest is the "flip" operation model, which is a classic combinatorics/algorithms puzzle (the "pancake sorting problem" or "pancake number" problem) asking for the minimum number of flips needed in the worst case. This simple greedy strategy uses at most 2(n−1) flips; the true worst-case minimum is an open problem in general, known precisely only for small n.`,
    howItWorks: [
      "Consider the unsorted prefix a[0..size-1], starting with size = n.",
      "Find the index of the maximum value within that prefix.",
      "If it's already at the end of the prefix (index size−1), it's in its final position — move to the next smaller size.",
      "Otherwise, flip the prefix up to the max's index (bringing the max to the front), then flip the whole prefix a[0..size-1] (sending the max to the end of that range).",
      "Shrink size by 1 and repeat; after processing size = n down to 2, the array is sorted.",
    ],
    complexity: {
      time: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" },
      space: "O(1)",
      notes: "Each of the n−1 passes does O(n) work to find the max and O(n) work to flip, giving O(n²) total. At most 2(n−1) flip operations are performed regardless of input.",
    },
    applications: [
      "Classic algorithms puzzle: minimizing flips to sort (the 'pancake number' problem, studied by Bill Gates as an undergraduate)",
      "Modeling systems where only 'reverse a prefix' operations are physically available (e.g. certain robotic sorting mechanisms)",
      "Teaching example for constrained-operation algorithm design",
      "Genome rearrangement research uses a close relative (sorting by reversals)",
    ],
    advantages: [
      "Extremely simple operation model — only prefix reversal needed",
      "In-place, O(1) extra space",
      "Guarantees at most 2(n−1) flips, a clean and easy-to-prove bound",
    ],
    disadvantages: [
      "O(n²) comparisons — no better than simple selection sort in the standard comparison model",
      "Not the minimum possible number of flips (finding that minimum is a hard/open combinatorial problem)",
      "Rarely useful outside its specific flip-based niche — not a practical general-purpose sort",
    ],
    commonMistakes: [
      "Forgetting to skip the first flip when the max is already at index 0 (flipping a single element is a no-op but wastes a step).",
      "Off-by-one on flip bounds — flip(k) must reverse indices 0..k inclusive.",
      "Confusing this with bubble sort — pancake sort's only allowed move is a prefix reversal, not adjacent swaps.",
      "Assuming 2(n-1) is the true minimum flip count — it's just this greedy strategy's bound, not the proven optimum.",
    ],
    interviewQuestions: [
      "Why does this greedy strategy use at most 2(n−1) flips?",
      "What is the 'pancake number' problem, and why is finding the true minimum hard?",
      "Why is pancake sort O(n²) despite its simple flip operation?",
      "How would you adapt pancake sort to a 'burnt pancake' variant where each flip also inverts orientation?",
      "Relate pancake sort's flip operation to genome rearrangement by reversals.",
    ],
    summary:
      "Pancake sort repeatedly flips the largest unsorted element to the front, then flips it into its final position — using only prefix-reversal operations, in O(n²) time with at most 2(n−1) flips. It's less a practical sorting algorithm than a showcase for the classic 'pancake number' puzzle of minimizing flips in a constrained operation model.",
    quiz: [
      { question: "Pancake sort's only allowed operation is…", options: ["Swap any two elements", "Reverse the first k elements (a 'flip')", "Insert an element anywhere", "Rotate the whole array"], answer: 1, explanation: "Every step is literally 'flip the top k pancakes' — a prefix reversal, nothing else." },
      { question: "Each pass performs how many flips (when needed)?", options: ["Exactly 1", "Up to 2 — one to bring the max to the front, one to send it to its final spot", "n flips", "0"], answer: 1, explanation: "First flip surfaces the max at index 0; second flip pushes it to the end of the current unsorted range." },
      { question: "Pancake sort's overall time complexity is…", options: ["O(n log n)", "O(n²)", "O(n)", "O(2ⁿ)"], answer: 1, explanation: "Finding the max each pass and flipping are both O(n), repeated over n−1 passes." },
      { question: "The greedy strategy shown uses at most how many flips?", options: ["n", "2(n − 1)", "n²", "log n"], answer: 1, explanation: "Two flips per pass, over n−1 passes, gives the 2(n−1) bound — not necessarily the true minimum." },
      { question: "The 'pancake number' problem asks…", options: ["How to bake pancakes fastest", "The minimum number of flips needed to sort any arrangement of n pancakes in the worst case", "How many pancakes fit on a plate", "The average case flip count"], answer: 1, explanation: "It's an open combinatorial question for general n, famously worked on by Bill Gates and Christos Papadimitriou." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 3, 6, 1, 10, 2, 5", help: "2–35 numbers." }],
  defaultInput: (level, rng) => {
    const n = Math.min(14, 5 + level * 2);
    const values = Array.from({ length: n }, () => rng.int(1, 99));
    return { values };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "");
    if (values.length < 2 || values.length > 35) throw new Error("Enter 2 to 35 numbers.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
