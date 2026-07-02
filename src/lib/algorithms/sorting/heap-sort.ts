import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values];
  const n = a.length;
  const steps: Step<ArrayFrame>[] = [];
  const sorted = new Set<number>();
  let comparisons = 0;
  let swaps = 0;
  const counters = () => ({ comparisons, swaps });

  const snap = (states: Record<number, CellState>, description: string, codeLine: number, heapSize?: number) => {
    const merged: Record<number, CellState> = { ...states };
    for (const idx of sorted) merged[idx] ??= "sorted";
    const note = heapSize !== undefined ? `heap size: ${heapSize}` : undefined;
    steps.push({ frame: { values: [...a], states: merged, note }, description, codeLine, counters: counters() });
  };

  const siftDown = (i: number, size: number) => {
    while (true) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < size) {
        comparisons++;
        if (a[l] > a[largest]) largest = l;
      }
      if (r < size) {
        comparisons++;
        if (a[r] > a[largest]) largest = r;
      }
      if (largest === i) break;
      snap({ [i]: "active", [largest]: "compare" }, `a[${i}] = ${a[i]} is smaller than child a[${largest}] = ${a[largest]}; sift down.`, 5, size);
      [a[i], a[largest]] = [a[largest], a[i]];
      swaps++;
      snap({ [i]: "swap", [largest]: "swap" }, `Swap so the larger child rises.`, 6, size);
      i = largest;
    }
  };

  snap({}, `Heap sort builds a max-heap, then repeatedly extracts the maximum to the end.`, 0);

  // build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    snap({ [i]: "active" }, `Heapify subtree rooted at index ${i}.`, 2, n);
    siftDown(i, n);
  }
  snap({}, `Max-heap built: the largest element is at the root (index 0).`, 3, n);

  // extract
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    swaps++;
    sorted.add(end);
    snap({ 0: "swap", [end]: "sorted" }, `Move max ${a[end]} to index ${end}; shrink heap to ${end}.`, 4, end);
    siftDown(0, end);
  }
  sorted.add(0);
  snap({}, `Sorted in O(n log n) with O(1) extra space.`, 7);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "heap-sort",
  title: "Heap Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["heap", "in-place", "unstable", "O(n log n)"],
  summary: "Builds a max-heap in the array, then repeatedly swaps the root maximum to the end and re-heapifies.",
  renderer: "array",
  pseudocode: [
    "procedure heapSort(a[0..n-1])",
    "  // build max-heap",
    "  for i = n/2-1 downto 0: siftDown(i, n)",
    "  // repeatedly extract max",
    "  for end = n-1 downto 1:",
    "    swap(a[0], a[end])",
    "    siftDown(0, end)   // restore heap on shrunk range",
    "  return a",
  ],
  code: {
    pseudocode: `procedure heapSort(a, n)
  for i = n/2 - 1 downto 0: siftDown(a, i, n)
  for end = n - 1 downto 1:
    swap(a[0], a[end])
    siftDown(a, 0, end)`,
    c: `void sift_down(int a[], int i, int size) {
    while (1) {
        int largest = i, l = 2*i+1, r = 2*i+2;
        if (l < size && a[l] > a[largest]) largest = l;
        if (r < size && a[r] > a[largest]) largest = r;
        if (largest == i) break;
        int t=a[i];a[i]=a[largest];a[largest]=t;
        i = largest;
    }
}
void heap_sort(int a[], int n) {
    for (int i = n/2-1; i >= 0; i--) sift_down(a, i, n);
    for (int end = n-1; end > 0; end--) {
        int t=a[0];a[0]=a[end];a[end]=t;
        sift_down(a, 0, end);
    }
}`,
    cpp: `#include <vector>
#include <utility>

void siftDown(std::vector<int>& a, int i, int size) {
    while (true) {
        int largest = i, l = 2*i+1, r = 2*i+2;
        if (l < size && a[l] > a[largest]) largest = l;
        if (r < size && a[r] > a[largest]) largest = r;
        if (largest == i) break;
        std::swap(a[i], a[largest]);
        i = largest;
    }
}
void heapSort(std::vector<int>& a) {
    int n = a.size();
    for (int i = n/2-1; i >= 0; --i) siftDown(a, i, n);
    for (int end = n-1; end > 0; --end) { std::swap(a[0], a[end]); siftDown(a, 0, end); }
}`,
    java: `static void siftDown(int[] a, int i, int size) {
    while (true) {
        int largest = i, l = 2*i+1, r = 2*i+2;
        if (l < size && a[l] > a[largest]) largest = l;
        if (r < size && a[r] > a[largest]) largest = r;
        if (largest == i) break;
        int t=a[i];a[i]=a[largest];a[largest]=t;
        i = largest;
    }
}
static void heapSort(int[] a) {
    int n = a.length;
    for (int i = n/2-1; i >= 0; i--) siftDown(a, i, n);
    for (int end = n-1; end > 0; end--) { int t=a[0];a[0]=a[end];a[end]=t; siftDown(a, 0, end); }
}`,
    python: `def sift_down(a, i, size):
    while True:
        largest, l, r = i, 2*i+1, 2*i+2
        if l < size and a[l] > a[largest]: largest = l
        if r < size and a[r] > a[largest]: largest = r
        if largest == i: break
        a[i], a[largest] = a[largest], a[i]
        i = largest

def heap_sort(a: list[int]) -> list[int]:
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):
        sift_down(a, i, n)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        sift_down(a, 0, end)
    return a`,
    javascript: `function siftDown(a, i, size) {
  while (true) {
    let largest = i, l = 2*i+1, r = 2*i+2;
    if (l < size && a[l] > a[largest]) largest = l;
    if (r < size && a[r] > a[largest]) largest = r;
    if (largest === i) break;
    [a[i], a[largest]] = [a[largest], a[i]];
    i = largest;
  }
}
function heapSort(a) {
  const n = a.length;
  for (let i = (n>>1)-1; i >= 0; i--) siftDown(a, i, n);
  for (let end = n-1; end > 0; end--) { [a[0], a[end]] = [a[end], a[0]]; siftDown(a, 0, end); }
  return a;
}`,
    typescript: `function siftDown(a: number[], i: number, size: number): void {
  while (true) {
    let largest = i;
    const l = 2*i+1, r = 2*i+2;
    if (l < size && a[l] > a[largest]) largest = l;
    if (r < size && a[r] > a[largest]) largest = r;
    if (largest === i) break;
    [a[i], a[largest]] = [a[largest], a[i]];
    i = largest;
  }
}
function heapSort(a: number[]): number[] {
  const n = a.length;
  for (let i = (n>>1)-1; i >= 0; i--) siftDown(a, i, n);
  for (let end = n-1; end > 0; end--) { [a[0], a[end]] = [a[end], a[0]]; siftDown(a, 0, end); }
  return a;
}`,
    csharp: `static void SiftDown(int[] a, int i, int size) {
    while (true) {
        int largest = i, l = 2*i+1, r = 2*i+2;
        if (l < size && a[l] > a[largest]) largest = l;
        if (r < size && a[r] > a[largest]) largest = r;
        if (largest == i) break;
        (a[i], a[largest]) = (a[largest], a[i]);
        i = largest;
    }
}
static void HeapSort(int[] a) {
    int n = a.Length;
    for (int i = n/2-1; i >= 0; i--) SiftDown(a, i, n);
    for (int end = n-1; end > 0; end--) { (a[0], a[end]) = (a[end], a[0]); SiftDown(a, 0, end); }
}`,
    go: `func siftDown(a []int, i, size int) {
	for {
		largest, l, r := i, 2*i+1, 2*i+2
		if l < size && a[l] > a[largest] {
			largest = l
		}
		if r < size && a[r] > a[largest] {
			largest = r
		}
		if largest == i {
			break
		}
		a[i], a[largest] = a[largest], a[i]
		i = largest
	}
}
func heapSort(a []int) {
	n := len(a)
	for i := n/2 - 1; i >= 0; i-- {
		siftDown(a, i, n)
	}
	for end := n - 1; end > 0; end-- {
		a[0], a[end] = a[end], a[0]
		siftDown(a, 0, end)
	}
}`,
    rust: `fn sift_down(a: &mut [i32], mut i: usize, size: usize) {
    loop {
        let (mut largest, l, r) = (i, 2*i+1, 2*i+2);
        if l < size && a[l] > a[largest] { largest = l; }
        if r < size && a[r] > a[largest] { largest = r; }
        if largest == i { break; }
        a.swap(i, largest);
        i = largest;
    }
}
fn heap_sort(a: &mut [i32]) {
    let n = a.len();
    for i in (0..n/2).rev() { sift_down(a, i, n); }
    for end in (1..n).rev() { a.swap(0, end); sift_down(a, 0, end); }
}`,
    kotlin: `fun siftDown(a: IntArray, start: Int, size: Int) {
    var i = start
    while (true) {
        var largest = i; val l = 2*i+1; val r = 2*i+2
        if (l < size && a[l] > a[largest]) largest = l
        if (r < size && a[r] > a[largest]) largest = r
        if (largest == i) break
        val t=a[i];a[i]=a[largest];a[largest]=t
        i = largest
    }
}
fun heapSort(a: IntArray) {
    val n = a.size
    for (i in n/2-1 downTo 0) siftDown(a, i, n)
    for (end in n-1 downTo 1) { val t=a[0];a[0]=a[end];a[end]=t; siftDown(a, 0, end) }
}`,
    swift: `func siftDown(_ a: inout [Int], _ start: Int, _ size: Int) {
    var i = start
    while true {
        var largest = i; let l = 2*i+1; let r = 2*i+2
        if l < size && a[l] > a[largest] { largest = l }
        if r < size && a[r] > a[largest] { largest = r }
        if largest == i { break }
        a.swapAt(i, largest)
        i = largest
    }
}
func heapSort(_ a: inout [Int]) {
    let n = a.count
    for i in stride(from: n/2 - 1, through: 0, by: -1) { siftDown(&a, i, n) }
    for end in stride(from: n - 1, through: 1, by: -1) { a.swapAt(0, end); siftDown(&a, 0, end) }
}`,
  },
  content: {
    overview: `Heap sort treats the array as a binary heap. It first rearranges the elements into a max-heap, where each parent is at least as large as its children, so the maximum sits at the root (index 0). It then repeatedly swaps the root to the end of the unsorted region and restores the heap property on the remaining elements — growing a sorted suffix one element per step.

Heap sort is the practical realization of selection sort's idea: instead of an O(n) linear scan to find the maximum each round, the heap finds it in O(log n). The result is a guaranteed O(n log n), in-place sort with no recursion — valued when worst-case guarantees and O(1) space both matter.`,
    howItWorks: [
      "View the array as a complete binary tree: children of i are at 2i+1 and 2i+2.",
      "Build a max-heap by sifting down every internal node from the bottom up.",
      "The root now holds the maximum; swap it with the last heap element.",
      "Shrink the heap by one and sift the new root down to restore the heap.",
      "Repeat until the heap is empty; the array is sorted ascending.",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(1)",
      notes: "Building the heap is O(n); each of the n extractions costs O(log n). Sorting is done in place with only constant extra memory.",
    },
    applications: [
      "Sorting when a guaranteed O(n log n) and O(1) space are both required",
      "The selection phase of introsort's worst-case fallback",
      "Priority-queue-based scheduling and streaming top-k problems (the heap itself)",
      "Embedded/real-time systems that cannot risk quicksort's O(n²) worst case",
    ],
    advantages: [
      "Guaranteed O(n log n) in all cases",
      "In-place — O(1) auxiliary memory",
      "No recursion (iterative sift-down)",
      "The underlying heap is independently useful as a priority queue",
    ],
    disadvantages: [
      "Not stable",
      "Poor cache locality — jumps around the array (slower than quicksort in practice)",
      "More element movement than a well-tuned quicksort",
    ],
    commonMistakes: [
      "Starting heap construction from the top instead of the last internal node (n/2−1).",
      "Sifting up during construction instead of sifting down (gives O(n log n) build instead of O(n)).",
      "Forgetting to shrink the heap size when extracting, corrupting the sorted suffix.",
      "Child index errors: children of i are 2i+1 and 2i+2 for 0-based arrays.",
    ],
    interviewQuestions: [
      "Why is building a heap O(n) even though it does n/2 sift-downs?",
      "How does heap sort relate to selection sort conceptually?",
      "Why is heap sort not stable?",
      "Why does heap sort often lose to quicksort in practice despite equal asymptotics?",
      "How would you sort in descending order — what changes?",
    ],
    summary:
      "Heap sort builds a max-heap in place, then repeatedly extracts the root maximum to the end and re-heapifies, giving a guaranteed O(n log n) sort with O(1) space. It trades quicksort's cache-friendliness for a rock-solid worst case and no recursion.",
    quiz: [
      { question: "In a 0-indexed binary heap, the children of node i are at…", options: ["i-1 and i+1", "2i and 2i+1", "2i+1 and 2i+2", "i/2 and i/2+1"], answer: 2, explanation: "For 0-based arrays the left child is 2i+1 and the right child is 2i+2." },
      { question: "What is the time complexity of building a heap from an unsorted array?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 2, explanation: "Bottom-up heapify sums to O(n) because most nodes are shallow." },
      { question: "Heap sort's worst-case time is…", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], answer: 1, explanation: "n extractions each costing O(log n) — with no bad-input degradation." },
      { question: "Heap sort is…", options: ["stable and in-place", "unstable and in-place", "stable and out-of-place", "unstable and out-of-place"], answer: 1, explanation: "It sorts within the array (in-place) but sift-down swaps can reorder equal keys (unstable)." },
      { question: "Why is heap sort often slower than quicksort in practice?", options: ["Worse asymptotic bound", "Poor cache locality from scattered accesses", "It uses O(n) memory", "It is recursive"], answer: 1, explanation: "Heap operations jump across the array, causing more cache misses than quicksort's local scans." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 12, 11, 13, 5, 6, 7", help: "2–40 numbers, comma or space separated." }],
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
