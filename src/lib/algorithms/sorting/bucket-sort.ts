import type { AlgorithmModule, ArrayFrame, AuxRow, CellState, Step } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";

type Input = { values: number[] };

function generate(input: Input): Step<ArrayFrame>[] {
  let a = [...input.values];
  const n = a.length;
  const min = Math.min(...a);
  const max = Math.max(...a);
  const range = max - min || 1;
  const bucketCount = Math.max(1, Math.min(10, n));
  const steps: Step<ArrayFrame>[] = [];
  let comparisons = 0;
  let writes = 0;

  const bucketRows = (buckets: number[][], activeBucket?: number): AuxRow[] =>
    buckets.map((b, i) => {
      const states: Record<number, CellState> = activeBucket === i ? { 0: "active" } : {};
      return { label: `bucket ${i}`, values: b.length ? [...b] : ["—"], states };
    });

  const snap = (states: Record<number, CellState>, aux: AuxRow[], description: string, codeLine: number) => {
    steps.push({ frame: { values: [...a], states, aux }, description, codeLine, counters: { comparisons, writes } });
  };

  snap(
    {},
    [],
    `Bucket sort: scatter n=${n} values into ${bucketCount} buckets by value range, sort each bucket, then concatenate.`,
    0,
  );

  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  const bucketOf = (v: number) => Math.min(bucketCount - 1, Math.floor(((v - min) / range) * bucketCount));

  for (let i = 0; i < n; i++) {
    const b = bucketOf(a[i]);
    buckets[b].push(a[i]);
    writes++;
    snap({ [i]: "active" }, bucketRows(buckets, b), `a[${i}] = ${a[i]} → scaled into bucket ${b} of ${bucketCount}.`, 1);
  }

  // insertion-sort each bucket (visualized as a whole per bucket, since buckets are small)
  for (let b = 0; b < bucketCount; b++) {
    if (buckets[b].length <= 1) continue;
    snap({}, bucketRows(buckets, b), `Sort bucket ${b} = [${buckets[b].join(", ")}] internally (insertion sort — buckets are small).`, 2);
    for (let i = 1; i < buckets[b].length; i++) {
      const key = buckets[b][i];
      let j = i - 1;
      while (j >= 0 && buckets[b][j] > key) {
        comparisons++;
        buckets[b][j + 1] = buckets[b][j];
        j--;
      }
      buckets[b][j + 1] = key;
    }
    snap({}, bucketRows(buckets, b), `Bucket ${b} sorted: [${buckets[b].join(", ")}].`, 2);
  }

  // gather
  const gathered: number[] = [];
  for (const b of buckets) for (const v of b) gathered.push(v);
  a = gathered;
  snap({}, bucketRows(buckets), `Concatenate buckets 0…${bucketCount - 1} in order — the array is now fully sorted.`, 3);

  const sorted: Record<number, CellState> = {};
  for (let i = 0; i < n; i++) sorted[i] = "sorted";
  snap(sorted, [], `Sorted in average O(n + k) with ${bucketCount} buckets, ${comparisons} internal comparisons.`, 4);
  return steps;
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "bucket-sort",
  title: "Bucket Sort",
  category: "sorting",
  difficulty: "Intermediate",
  tags: ["non-comparison", "distribution sort", "stable", "average O(n+k)"],
  summary: "Scatters values into range-based buckets, sorts each bucket internally, then concatenates — fast when input is uniformly distributed.",
  renderer: "array",
  pseudocode: [
    "procedure bucketSort(a)",
    "  create k empty buckets spanning [min(a), max(a)]",
    "  for each value: scale it into a bucket index, append",
    "  for each bucket: sort its (small) contents (e.g. insertion sort)",
    "  concatenate all buckets in order",
    "  // sorted",
    "  return a",
  ],
  code: {
    pseudocode: `k = number of buckets
for v in a: buckets[scale(v)].append(v)
for b in buckets: insertionSort(b)
return concat(buckets)`,
    c: `void bucketSort(float* a, int n) {
    typedef struct { float v[64]; int len; } Bucket;
    Bucket buckets[10] = {0};
    for (int i = 0; i < n; i++) {
        int b = (int)(a[i] * 10);
        buckets[b].v[buckets[b].len++] = a[i];
    }
    int idx = 0;
    for (int b = 0; b < 10; b++) {
        insertionSort(buckets[b].v, buckets[b].len);
        for (int j = 0; j < buckets[b].len; j++) a[idx++] = buckets[b].v[j];
    }
}`,
    cpp: `void bucketSort(vector<double>& a) {
    int n = a.size(), k = n;
    vector<vector<double>> buckets(k);
    double mn = *min_element(a.begin(), a.end()), mx = *max_element(a.begin(), a.end());
    double range = (mx - mn) ? (mx - mn) : 1;
    for (double v : a) {
        int b = min(k - 1, (int)((v - mn) / range * k));
        buckets[b].push_back(v);
    }
    a.clear();
    for (auto& b : buckets) {
        sort(b.begin(), b.end());
        a.insert(a.end(), b.begin(), b.end());
    }
}`,
    java: `static void bucketSort(double[] a) {
    int n = a.length, k = n;
    double mn = Arrays.stream(a).min().getAsDouble();
    double mx = Arrays.stream(a).max().getAsDouble();
    double range = (mx - mn) != 0 ? (mx - mn) : 1;
    List<List<Double>> buckets = new ArrayList<>();
    for (int i = 0; i < k; i++) buckets.add(new ArrayList<>());
    for (double v : a) {
        int b = Math.min(k - 1, (int) ((v - mn) / range * k));
        buckets.get(b).add(v);
    }
    int idx = 0;
    for (List<Double> b : buckets) {
        Collections.sort(b);
        for (double v : b) a[idx++] = v;
    }
}`,
    python: `def bucket_sort(a: list[float]) -> list[float]:
    n = len(a)
    k = max(1, n)
    lo, hi = min(a), max(a)
    span = (hi - lo) or 1
    buckets = [[] for _ in range(k)]
    for v in a:
        idx = min(k - 1, int((v - lo) / span * k))
        buckets[idx].append(v)
    result = []
    for b in buckets:
        b.sort()
        result.extend(b)
    return result`,
    javascript: `function bucketSort(a) {
  const n = a.length, k = Math.max(1, n);
  const lo = Math.min(...a), hi = Math.max(...a);
  const span = (hi - lo) || 1;
  const buckets = Array.from({ length: k }, () => []);
  for (const v of a) {
    const idx = Math.min(k - 1, Math.floor((v - lo) / span * k));
    buckets[idx].push(v);
  }
  return buckets.flatMap((b) => b.sort((x, y) => x - y));
}`,
    typescript: `function bucketSort(a: number[]): number[] {
  const n = a.length, k = Math.max(1, n);
  const lo = Math.min(...a), hi = Math.max(...a);
  const span = (hi - lo) || 1;
  const buckets: number[][] = Array.from({ length: k }, () => []);
  for (const v of a) {
    const idx = Math.min(k - 1, Math.floor((v - lo) / span * k));
    buckets[idx].push(v);
  }
  return buckets.flatMap((b) => b.sort((x, y) => x - y));
}`,
    csharp: `static double[] BucketSort(double[] a) {
    int n = a.Length, k = Math.Max(1, n);
    double lo = a.Min(), hi = a.Max();
    double span = (hi - lo) != 0 ? (hi - lo) : 1;
    var buckets = new List<double>[k];
    for (int i = 0; i < k; i++) buckets[i] = new List<double>();
    foreach (var v in a) {
        int idx = Math.Min(k - 1, (int)((v - lo) / span * k));
        buckets[idx].Add(v);
    }
    var result = new List<double>();
    foreach (var b in buckets) { b.Sort(); result.AddRange(b); }
    return result.ToArray();
}`,
    go: `func bucketSort(a []float64) []float64 {
	n := len(a)
	k := n
	if k < 1 {
		k = 1
	}
	lo, hi := a[0], a[0]
	for _, v := range a {
		if v < lo { lo = v }
		if v > hi { hi = v }
	}
	span := hi - lo
	if span == 0 { span = 1 }
	buckets := make([][]float64, k)
	for _, v := range a {
		idx := int((v - lo) / span * float64(k))
		if idx >= k { idx = k - 1 }
		buckets[idx] = append(buckets[idx], v)
	}
	result := make([]float64, 0, n)
	for _, b := range buckets {
		sort.Float64s(b)
		result = append(result, b...)
	}
	return result
}`,
    rust: `fn bucket_sort(a: &[f64]) -> Vec<f64> {
    let n = a.len();
    let k = n.max(1);
    let lo = a.iter().cloned().fold(f64::INFINITY, f64::min);
    let hi = a.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let span = if hi - lo != 0.0 { hi - lo } else { 1.0 };
    let mut buckets: Vec<Vec<f64>> = vec![Vec::new(); k];
    for &v in a {
        let idx = (((v - lo) / span * k as f64) as usize).min(k - 1);
        buckets[idx].push(v);
    }
    let mut result = Vec::with_capacity(n);
    for mut b in buckets {
        b.sort_by(|x, y| x.partial_cmp(y).unwrap());
        result.extend(b);
    }
    result
}`,
    kotlin: `fun bucketSort(a: DoubleArray): DoubleArray {
    val n = a.size
    val k = maxOf(1, n)
    val lo = a.min(); val hi = a.max()
    val span = if (hi - lo != 0.0) hi - lo else 1.0
    val buckets = Array(k) { mutableListOf<Double>() }
    for (v in a) {
        val idx = minOf(k - 1, ((v - lo) / span * k).toInt())
        buckets[idx].add(v)
    }
    return buckets.flatMap { it.sorted() }.toDoubleArray()
}`,
    swift: `func bucketSort(_ a: [Double]) -> [Double] {
    let n = a.count
    let k = max(1, n)
    let lo = a.min()!, hi = a.max()!
    let span = (hi - lo != 0) ? (hi - lo) : 1
    var buckets = Array(repeating: [Double](), count: k)
    for v in a {
        let idx = min(k - 1, Int((v - lo) / span * Double(k)))
        buckets[idx].append(v)
    }
    return buckets.flatMap { $0.sorted() }
}`,
  },
  content: {
    overview: `Bucket sort exploits knowledge of the input's distribution: if values are spread roughly uniformly over a known range, scattering them into k equally-sized sub-ranges ("buckets") puts only a handful of elements in each bucket. Sorting each small bucket (with insertion sort, since they're small) and concatenating the buckets in order yields a fully sorted array.

Its average-case O(n + k) speed depends critically on the uniform-distribution assumption: with n values evenly spread into n buckets, each bucket gets O(1) elements on average, so the total sorting work across all buckets is O(n). If the distribution is skewed — many values clustering into one bucket — that bucket's internal sort dominates and performance degrades toward O(n²), same as if you'd insertion-sorted the whole array in one bucket.`,
    howItWorks: [
      "Determine the value range [min, max] and choose k buckets (often k ≈ n).",
      "Scatter each value into bucket ⌊(v − min) / range × k⌋, clamped to the last bucket.",
      "Sort each bucket's contents independently (insertion sort is typical since buckets are expected to be small).",
      "Concatenate the buckets in index order 0, 1, …, k−1 — the result is sorted because bucket i only contains values less than everything in bucket i+1.",
      "No cross-bucket comparisons are ever needed, which is where the speed comes from when buckets are balanced.",
    ],
    complexity: {
      time: { best: "O(n + k)", average: "O(n + k)", worst: "O(n²)" },
      space: "O(n + k)",
      notes: "Average case assumes uniformly distributed input across k ≈ n buckets. Worst case: all values land in one bucket, degenerating to whatever the internal sort's worst case is (O(n²) for insertion sort).",
    },
    applications: [
      "Sorting uniformly distributed floating-point values in [0, 1) (the classic bucket-sort setting)",
      "Histogram-based sorting/binning in data processing pipelines",
      "A building block alongside radix sort for sorting by numeric ranges",
      "External sorting: partition data into range buckets that each fit in memory",
    ],
    advantages: [
      "Average O(n + k) — beats any comparison sort's Ω(n log n) lower bound when data is well-distributed",
      "Naturally parallelizable: each bucket can be sorted independently and concurrently",
      "Simple to reason about and implement",
    ],
    disadvantages: [
      "Requires knowledge of (or an assumption about) the input's distribution to size buckets well",
      "Degrades to O(n²) on skewed/clustered data — one overloaded bucket dominates",
      "Extra O(n + k) memory for the buckets themselves",
    ],
    commonMistakes: [
      "Choosing bucket boundaries without accounting for the actual min/max of the data (fixed [0,1) assumption on arbitrary input).",
      "Forgetting to clamp the top value's bucket index (v = max maps exactly to index k, out of bounds).",
      "Using an O(n log n) sort inside each bucket when buckets are meant to be small — insertion sort is typically faster there.",
      "Assuming O(n + k) average case applies to any input, including badly skewed distributions.",
    ],
    interviewQuestions: [
      "Why does bucket sort's average case beat the Ω(n log n) comparison-sort lower bound?",
      "What input distribution makes bucket sort degrade to O(n²), and why?",
      "How would you choose the number of buckets k, and how does that choice affect performance?",
      "Compare bucket sort to radix sort — when would you prefer one over the other?",
      "How would you parallelize bucket sort across multiple threads/machines?",
    ],
    summary:
      "Bucket sort scatters values into k range-based buckets, sorts each small bucket internally, and concatenates them in order — average O(n + k) when the input distribution is roughly uniform, since each bucket ends up with only a handful of elements. Skewed input concentrates elements into fewer buckets and degrades performance toward the internal sort's worst case.",
    quiz: [
      { question: "Bucket sort's average-case time complexity is…", options: ["O(n log n)", "O(n + k)", "O(n²)", "O(log n)"], answer: 1, explanation: "With values uniformly spread across k ≈ n buckets, each bucket holds O(1) elements on average, so total work is linear." },
      { question: "Why can bucket sort beat the comparison-sort lower bound of Ω(n log n)?", options: ["It doesn't — it's always slower", "It uses distribution information (bucket index) instead of pairwise comparisons", "It's a trick with no real basis", "It only works on already-sorted data"], answer: 1, explanation: "Like radix/counting sort, it sidesteps the comparison model entirely by using value information directly." },
      { question: "Bucket sort degrades to O(n²) when…", options: ["k = n exactly", "Values are uniformly distributed", "Most values fall into the same bucket (skewed distribution)", "The array is already sorted"], answer: 2, explanation: "One overloaded bucket's internal sort then dominates, same as sorting the whole array with that method." },
      { question: "Inside each bucket, which sort is typically used?", options: ["Merge sort", "Insertion sort (buckets are expected to be small)", "Quicksort", "Radix sort"], answer: 1, explanation: "Small buckets favor insertion sort's low constant factor over the overhead of a recursive O(n log n) sort." },
      { question: "Which property of the input does bucket sort rely on for its speed?", options: ["It must be already partially sorted", "Values roughly uniformly distributed across a known range", "All values are integers", "The array must be large"], answer: 1, explanation: "Uniform distribution ensures the buckets stay balanced, which is exactly what gives the O(n + k) average case." },
    ],
  },
  inputFields: [{ key: "values", label: "Array values", placeholder: "e.g. 29, 25, 3, 49, 9, 37, 21, 43", help: "2–60 numbers." }],
  defaultInput: (level, rng) => {
    const n = Math.min(24, 6 + level * 4);
    const values = Array.from({ length: n }, () => rng.int(1, 99));
    return { values };
  },
  parseInput: (fields) => {
    const values = parseNumberList(fields.values ?? "");
    if (values.length < 2 || values.length > 60) throw new Error("Enter 2 to 60 numbers.");
    return { values };
  },
  serializeInput: (input) => ({ values: input.values.join(", ") }),
  generate,
};

export default mod;
