import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";
import { randomArray } from "@/lib/engine/random";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[]; target: number };

function generate(input: Input): Step<ArrayFrame>[] {
  const a = [...input.values].sort((x, y) => x - y);
  const { target } = input;
  const steps: Step<ArrayFrame>[] = [];
  let probes = 0;

  const snap = (states: Record<number, CellState>, range: { from: number; to: number } | null, description: string, codeLine: number, pointers?: { index: number; label: string }[]) => {
    steps.push({ frame: { values: [...a], states: { ...states }, range, pointers }, description, codeLine, counters: { probes } });
  };

  snap({}, { from: 0, to: a.length - 1 }, `Interpolation search estimates the target's position assuming uniform spacing.`, 0);

  let lo = 0;
  let hi = a.length - 1;
  while (lo <= hi && target >= a[lo] && target <= a[hi]) {
    if (lo === hi) {
      probes++;
      if (a[lo] === target) { snap({ [lo]: "found" }, { from: lo, to: hi }, `Found ${target} at index ${lo}.`, 3); return steps; }
      break;
    }
    const pos = lo + Math.floor(((target - a[lo]) * (hi - lo)) / (a[hi] - a[lo]));
    probes++;
    snap({ [pos]: "active" }, { from: lo, to: hi }, `Estimate pos = ${lo} + (${target}−${a[lo]})·(${hi}−${lo})/(${a[hi]}−${a[lo]}) = ${pos}; a[${pos}] = ${a[pos]}.`, 2, [{ index: lo, label: "lo" }, { index: pos, label: "pos" }, { index: hi, label: "hi" }]);
    if (a[pos] === target) { snap({ [pos]: "found" }, { from: lo, to: hi }, `Found ${target} at index ${pos} in ${probes} probes.`, 3); return steps; }
    if (a[pos] < target) { snap({ [pos]: "discarded" }, { from: pos + 1, to: hi }, `${a[pos]} < ${target}: search the right part.`, 4); lo = pos + 1; }
    else { snap({ [pos]: "discarded" }, { from: lo, to: pos - 1 }, `${a[pos]} > ${target}: search the left part.`, 5); hi = pos - 1; }
  }
  snap({}, null, `${target} is not present.`, 6);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "interpolation-search",
  title: "Interpolation Search",
  category: "searching",
  difficulty: "Intermediate",
  tags: ["sorted required", "uniform data", "O(log log n) avg"],
  summary: "Predicts the target's index by linear interpolation on value — near O(log log n) on uniformly distributed data.",
  renderer: "array",
  pseudocode: [
    "procedure interpolationSearch(a, target)",
    "  lo=0; hi=n-1",
    "  pos = lo + (target-a[lo])·(hi-lo)/(a[hi]-a[lo])",
    "  if a[pos]==target: return pos",
    "  else if a[pos]<target: lo = pos+1",
    "  else: hi = pos-1     // repeat while target in [a[lo],a[hi]]",
    "  return -1",
  ],
  code: {
    pseudocode: `lo=0; hi=n-1
while lo<=hi and a[lo]<=target<=a[hi]:
  pos = lo + (target-a[lo])*(hi-lo)/(a[hi]-a[lo])
  if a[pos]==target: return pos
  elif a[pos]<target: lo=pos+1
  else: hi=pos-1
return -1`,
    c: `int interpolation_search(int a[], int n, int target) {
    int lo = 0, hi = n - 1;
    while (lo <= hi && target >= a[lo] && target <= a[hi]) {
        if (a[hi] == a[lo]) { return a[lo] == target ? lo : -1; }
        int pos = lo + (long)(target - a[lo]) * (hi - lo) / (a[hi] - a[lo]);
        if (a[pos] == target) return pos;
        if (a[pos] < target) lo = pos + 1; else hi = pos - 1;
    }
    return -1;
}`,
    cpp: `int interpolationSearch(const std::vector<int>& a, int target) {
    int lo = 0, hi = a.size() - 1;
    while (lo <= hi && target >= a[lo] && target <= a[hi]) {
        if (a[hi] == a[lo]) return a[lo] == target ? lo : -1;
        int pos = lo + (long long)(target - a[lo]) * (hi - lo) / (a[hi] - a[lo]);
        if (a[pos] == target) return pos;
        if (a[pos] < target) lo = pos + 1; else hi = pos - 1;
    }
    return -1;
}`,
    java: `static int interpolationSearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi && target >= a[lo] && target <= a[hi]) {
        if (a[hi] == a[lo]) return a[lo] == target ? lo : -1;
        int pos = lo + (int)((long)(target - a[lo]) * (hi - lo) / (a[hi] - a[lo]));
        if (a[pos] == target) return pos;
        if (a[pos] < target) lo = pos + 1; else hi = pos - 1;
    }
    return -1;
}`,
    python: `def interpolation_search(a: list[int], target: int) -> int:
    lo, hi = 0, len(a) - 1
    while lo <= hi and a[lo] <= target <= a[hi]:
        if a[hi] == a[lo]:
            return lo if a[lo] == target else -1
        pos = lo + (target - a[lo]) * (hi - lo) // (a[hi] - a[lo])
        if a[pos] == target:
            return pos
        if a[pos] < target:
            lo = pos + 1
        else:
            hi = pos - 1
    return -1`,
    javascript: `function interpolationSearch(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi && target >= a[lo] && target <= a[hi]) {
    if (a[hi] === a[lo]) return a[lo] === target ? lo : -1;
    const pos = lo + Math.floor((target - a[lo]) * (hi - lo) / (a[hi] - a[lo]));
    if (a[pos] === target) return pos;
    if (a[pos] < target) lo = pos + 1; else hi = pos - 1;
  }
  return -1;
}`,
    typescript: `function interpolationSearch(a: number[], target: number): number {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi && target >= a[lo] && target <= a[hi]) {
    if (a[hi] === a[lo]) return a[lo] === target ? lo : -1;
    const pos = lo + Math.floor((target - a[lo]) * (hi - lo) / (a[hi] - a[lo]));
    if (a[pos] === target) return pos;
    if (a[pos] < target) lo = pos + 1; else hi = pos - 1;
  }
  return -1;
}`,
    csharp: `static int InterpolationSearch(int[] a, int target) {
    int lo = 0, hi = a.Length - 1;
    while (lo <= hi && target >= a[lo] && target <= a[hi]) {
        if (a[hi] == a[lo]) return a[lo] == target ? lo : -1;
        int pos = lo + (int)((long)(target - a[lo]) * (hi - lo) / (a[hi] - a[lo]));
        if (a[pos] == target) return pos;
        if (a[pos] < target) lo = pos + 1; else hi = pos - 1;
    }
    return -1;
}`,
    go: `func interpolationSearch(a []int, target int) int {
	lo, hi := 0, len(a)-1
	for lo <= hi && target >= a[lo] && target <= a[hi] {
		if a[hi] == a[lo] {
			if a[lo] == target { return lo }
			return -1
		}
		pos := lo + (target-a[lo])*(hi-lo)/(a[hi]-a[lo])
		if a[pos] == target { return pos }
		if a[pos] < target { lo = pos + 1 } else { hi = pos - 1 }
	}
	return -1
}`,
    rust: `fn interpolation_search(a: &[i32], target: i32) -> Option<usize> {
    let (mut lo, mut hi) = (0i64, a.len() as i64 - 1);
    while lo <= hi && target >= a[lo as usize] && target <= a[hi as usize] {
        let (al, ah) = (a[lo as usize], a[hi as usize]);
        if ah == al { return if al == target { Some(lo as usize) } else { None }; }
        let pos = lo + (target - al) as i64 * (hi - lo) / (ah - al) as i64;
        let p = pos as usize;
        if a[p] == target { return Some(p); }
        if a[p] < target { lo = pos + 1; } else { hi = pos - 1; }
    }
    None
}`,
    kotlin: `fun interpolationSearch(a: IntArray, target: Int): Int {
    var lo = 0; var hi = a.size - 1
    while (lo <= hi && target >= a[lo] && target <= a[hi]) {
        if (a[hi] == a[lo]) return if (a[lo] == target) lo else -1
        val pos = lo + (target - a[lo]) * (hi - lo) / (a[hi] - a[lo])
        when {
            a[pos] == target -> return pos
            a[pos] < target -> lo = pos + 1
            else -> hi = pos - 1
        }
    }
    return -1
}`,
    swift: `func interpolationSearch(_ a: [Int], _ target: Int) -> Int {
    var lo = 0, hi = a.count - 1
    while lo <= hi && target >= a[lo] && target <= a[hi] {
        if a[hi] == a[lo] { return a[lo] == target ? lo : -1 }
        let pos = lo + (target - a[lo]) * (hi - lo) / (a[hi] - a[lo])
        if a[pos] == target { return pos }
        if a[pos] < target { lo = pos + 1 } else { hi = pos - 1 }
    }
    return -1
}`,
  },
  content: {
    overview: `Interpolation search improves on binary search when the data is sorted and roughly uniformly distributed. Rather than always probing the middle, it estimates where the target should be by linearly interpolating between the values at the current bounds — much like guessing that a name starting with "B" is near the front of a phone book rather than the middle.

When the distribution is uniform, this estimate is so accurate that the search converges in O(log log n) probes on average — dramatically faster than binary search. However, if the data is highly non-uniform (clustered), the estimates can be poor and the worst case degrades to O(n).`,
    howItWorks: [
      "Maintain a search range [lo, hi] where a[lo] ≤ target ≤ a[hi].",
      "Estimate the probe position with interpolation: pos = lo + (target − a[lo])·(hi − lo)/(a[hi] − a[lo]).",
      "If a[pos] equals the target, done.",
      "If a[pos] is too small, search the right part (lo = pos + 1); if too large, the left part (hi = pos − 1).",
      "Stop when the target leaves the [a[lo], a[hi]] value window or the range empties.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(log log n)", worst: "O(n)" },
      space: "O(1)",
      notes: "O(log log n) average on uniformly distributed data; O(n) worst case on clustered data. Requires a sorted array and guards against division by zero when a[hi] == a[lo].",
    },
    applications: [
      "Searching large, uniformly distributed sorted datasets",
      "Database and index lookups on evenly spread keys",
      "Phone-book / dictionary-style lookups",
      "Numeric tables with regular spacing",
    ],
    advantages: [
      "O(log log n) average on uniform data — faster than binary search",
      "O(1) extra memory",
      "Intuitive value-based position estimate",
    ],
    disadvantages: [
      "Worst case O(n) on non-uniform/clustered data",
      "Requires sorted, numeric, uniformly spread keys",
      "Division and overflow pitfalls in the position formula",
      "More complex than binary search for uncertain gains",
    ],
    commonMistakes: [
      "Dividing by zero when a[hi] == a[lo] (guard this case).",
      "Integer overflow in (target − a[lo])·(hi − lo).",
      "Using it on non-uniform data expecting O(log log n).",
      "Forgetting the loop condition a[lo] ≤ target ≤ a[hi].",
    ],
    interviewQuestions: [
      "Why is interpolation search faster than binary search on uniform data?",
      "When does interpolation search degrade to O(n)?",
      "How do you avoid division by zero and overflow in the probe formula?",
      "How does the probe position formula work intuitively?",
    ],
    summary:
      "Interpolation search estimates the target's index by linear interpolation on value, converging in O(log log n) on uniformly distributed sorted data — but degrading to O(n) on clustered data. It's binary search made smarter about where to probe.",
    quiz: [
      { question: "Interpolation search performs best when the data is…", options: ["Unsorted", "Sorted and uniformly distributed", "All equal", "Reverse sorted"], answer: 1, explanation: "Uniform spacing makes the interpolation estimate very accurate." },
      { question: "Its average-case complexity on uniform data is…", options: ["O(1)", "O(log log n)", "O(log n)", "O(n)"], answer: 1, explanation: "Accurate position estimates converge doubly-logarithmically." },
      { question: "Interpolation search's worst case is…", options: ["O(log n)", "O(√n)", "O(n)", "O(1)"], answer: 2, explanation: "Highly clustered data makes estimates poor, degrading to linear." },
      { question: "A key edge case to guard is…", options: ["Empty target", "Division by zero when a[hi] == a[lo]", "Negative indices only", "Sorted input"], answer: 1, explanation: "Equal bound values make the denominator zero." },
      { question: "Compared to binary search, interpolation search probes…", options: ["Always the middle", "An estimated position based on the target's value", "The first element", "Random positions"], answer: 1, explanation: "It interpolates where the value should lie rather than splitting in half." },
    ],
  },
  inputFields: [
    { key: "values", label: "Array values (auto-sorted)", placeholder: "e.g. 10, 20, 30, 40, 50, 60, 70", help: "2–40 numbers; sorted before searching. Works best on evenly spaced values." },
    { key: "target", label: "Target", placeholder: "40" },
  ],
  defaultInput: (level, rng) => {
    // roughly uniform ascending values
    const size = [0, 6, 9, 12, 16, 20][level] ?? 10;
    const startV = rng.int(0, 5);
    const stepV = rng.int(2, 6);
    const values = Array.from({ length: size }, (_, i) => startV + i * stepV + rng.int(0, 1));
    const target = rng.next() < 0.7 ? rng.pick(values) : rng.int(startV, startV + size * stepV);
    return { values, target };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "", { min: -9999, max: 9999, maxLen: 40 });
    if (values.length < 2) throw new Error("Enter at least 2 numbers.");
    const target = Number((fields.target ?? "").trim());
    if (!Number.isFinite(target)) throw new Error("Enter a valid numeric target.");
    return { values, target };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), target: String(input.target) }),
  generate,
};

export default mod;
