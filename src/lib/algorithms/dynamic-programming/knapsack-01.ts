import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Item = { w: number; v: number };
type Input = { items: Item[]; capacity: number };

function generate(input: Input): Step<TableFrame>[] {
  const items = input.items;
  const W = input.capacity;
  const n = items.length;
  const steps: Step<TableFrame>[] = [];
  let comparisons = 0;

  // dp[i][c] = best value using first i items with capacity c
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));

  const rowLabels = ["∅", ...items.map((it, i) => `#${i + 1} w${it.w} v${it.v}`)];
  const colLabels = Array.from({ length: W + 1 }, (_, c) => String(c));

  const frame = (
    filled: number,
    active: [number, number] | null,
    refs: [number, number][],
    description: string,
    codeLine: number,
    highlightCells?: Set<string>,
  ): void => {
    const cells = dp.map((row, i) =>
      row.map((val, c) => {
        let state: CellState | undefined;
        const key = `${i},${c}`;
        if (active && active[0] === i && active[1] === c) state = "active";
        else if (refs.some(([ri, rc]) => ri === i && rc === c)) state = "compare";
        else if (highlightCells?.has(key)) state = "found";
        else if (i * (W + 1) + c < filled) state = "sorted";
        const isFilledCell = i === 0 || i * (W + 1) + c < filled || (active && (i < active[0] || (i === active[0] && c <= active[1])));
        return { value: isFilledCell ? val : null, state };
      }),
    );
    steps.push({ frame: { rowLabels, colLabels, cells, note: `capacity W = ${W}` }, description, codeLine, counters: { comparisons } });
  };

  frame(0, null, [], `0/1 Knapsack: maximize value within capacity ${W}. Row 0 (no items) is all zeros.`, 0);

  let filledCount = W + 1; // row 0 done
  for (let i = 1; i <= n; i++) {
    const { w, v } = items[i - 1];
    for (let c = 0; c <= W; c++) {
      comparisons++;
      if (w > c) {
        dp[i][c] = dp[i - 1][c];
        filledCount++;
        frame(filledCount, [i, c], [[i - 1, c]], `Item ${i} (w=${w}) doesn't fit in capacity ${c}: copy above = ${dp[i][c]}.`, 3);
      } else {
        const exclude = dp[i - 1][c];
        const include = v + dp[i - 1][c - w];
        dp[i][c] = Math.max(exclude, include);
        filledCount++;
        frame(
          filledCount,
          [i, c],
          [[i - 1, c], [i - 1, c - w]],
          `Item ${i}: max(exclude ${exclude}, include ${v}+dp[${i - 1}][${c - w}]=${include}) = ${dp[i][c]}.`,
          5,
        );
      }
    }
  }

  // traceback
  const chosen: number[] = [];
  const highlight = new Set<string>();
  let c = W;
  for (let i = n; i >= 1; i--) {
    highlight.add(`${i},${c}`);
    if (dp[i][c] !== dp[i - 1][c]) {
      chosen.push(i);
      c -= items[i - 1].w;
    }
  }
  frame(filledCount, null, [], `Optimal value ${dp[n][W]}. Traceback selects items: ${chosen.reverse().join(", ") || "none"}.`, 7, highlight);
  return steps;
}

function randomItems(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(6, 3 + Math.floor(level / 2));
  const items: Item[] = Array.from({ length: n }, () => ({ w: rng.int(1, 6), v: rng.int(1, 15) }));
  const capacity = Math.min(12, 4 + level * 2);
  return { items, capacity };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "knapsack-01",
  title: "0/1 Knapsack",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "tabulation", "optimization", "NP-hard (pseudo-poly)"],
  summary: "Maximizes value under a weight limit where each item is taken whole or not at all, via a DP table.",
  renderer: "table",
  pseudocode: [
    "procedure knapsack(items, W)",
    "  dp[0][*] = 0",
    "  for i = 1..n, c = 0..W:",
    "    if weight[i] > c: dp[i][c] = dp[i-1][c]   // can't include",
    "    else:",
    "      dp[i][c] = max(dp[i-1][c],",
    "                     value[i] + dp[i-1][c-weight[i]])",
    "  // dp[n][W] is the optimal value; trace back for items",
    "  return dp[n][W]",
  ],
  code: {
    pseudocode: `dp[0..n][0..W]; dp[0][*] = 0
for i in 1..n:
  for c in 0..W:
    if w[i] > c: dp[i][c] = dp[i-1][c]
    else: dp[i][c] = max(dp[i-1][c], v[i] + dp[i-1][c-w[i]])
return dp[n][W]`,
    c: `int knapsack(int w[], int v[], int n, int W) {
    int dp[n + 1][W + 1];
    for (int c = 0; c <= W; c++) dp[0][c] = 0;
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++) {
            if (w[i - 1] > c) dp[i][c] = dp[i - 1][c];
            else {
                int inc = v[i - 1] + dp[i - 1][c - w[i - 1]];
                dp[i][c] = dp[i - 1][c] > inc ? dp[i - 1][c] : inc;
            }
        }
    return dp[n][W];
}`,
    cpp: `int knapsack(vector<int>& w, vector<int>& v, int W) {
    int n = w.size();
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++)
            dp[i][c] = (w[i-1] > c) ? dp[i-1][c]
                       : max(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]]);
    return dp[n][W];
}`,
    java: `int knapsack(int[] w, int[] v, int W) {
    int n = w.length;
    int[][] dp = new int[n + 1][W + 1];
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++)
            dp[i][c] = (w[i-1] > c) ? dp[i-1][c]
                       : Math.max(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]]);
    return dp[n][W];
}`,
    python: `def knapsack(w, v, W):
    n = len(w)
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for c in range(W + 1):
            if w[i-1] > c:
                dp[i][c] = dp[i-1][c]
            else:
                dp[i][c] = max(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]])
    return dp[n][W]`,
    javascript: `function knapsack(w, v, W) {
  const n = w.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let c = 0; c <= W; c++)
      dp[i][c] = w[i-1] > c ? dp[i-1][c]
                 : Math.max(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]]);
  return dp[n][W];
}`,
    typescript: `function knapsack(w: number[], v: number[], W: number): number {
  const n = w.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let c = 0; c <= W; c++)
      dp[i][c] = w[i-1] > c ? dp[i-1][c]
                 : Math.max(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]]);
  return dp[n][W];
}`,
    csharp: `int Knapsack(int[] w, int[] v, int W) {
    int n = w.Length;
    var dp = new int[n + 1, W + 1];
    for (int i = 1; i <= n; i++)
        for (int c = 0; c <= W; c++)
            dp[i, c] = (w[i-1] > c) ? dp[i-1, c]
                       : Math.Max(dp[i-1, c], v[i-1] + dp[i-1, c - w[i-1]]);
    return dp[n, W];
}`,
    go: `func knapsack(w, v []int, W int) int {
	n := len(w)
	dp := make([][]int, n+1)
	for i := range dp { dp[i] = make([]int, W+1) }
	for i := 1; i <= n; i++ {
		for c := 0; c <= W; c++ {
			if w[i-1] > c {
				dp[i][c] = dp[i-1][c]
			} else {
				inc := v[i-1] + dp[i-1][c-w[i-1]]
				if dp[i-1][c] > inc { dp[i][c] = dp[i-1][c] } else { dp[i][c] = inc }
			}
		}
	}
	return dp[n][W]
}`,
    rust: `fn knapsack(w: &[usize], v: &[i32], cap: usize) -> i32 {
    let n = w.len();
    let mut dp = vec![vec![0; cap + 1]; n + 1];
    for i in 1..=n {
        for c in 0..=cap {
            dp[i][c] = if w[i-1] > c { dp[i-1][c] }
                       else { dp[i-1][c].max(v[i-1] + dp[i-1][c - w[i-1]]) };
        }
    }
    dp[n][cap]
}`,
    kotlin: `fun knapsack(w: IntArray, v: IntArray, W: Int): Int {
    val n = w.size
    val dp = Array(n + 1) { IntArray(W + 1) }
    for (i in 1..n)
        for (c in 0..W)
            dp[i][c] = if (w[i-1] > c) dp[i-1][c]
                       else maxOf(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]])
    return dp[n][W]
}`,
    swift: `func knapsack(_ w: [Int], _ v: [Int], _ W: Int) -> Int {
    let n = w.count
    var dp = Array(repeating: Array(repeating: 0, count: W + 1), count: n + 1)
    for i in 1...n {
        for c in 0...W {
            dp[i][c] = w[i-1] > c ? dp[i-1][c]
                       : max(dp[i-1][c], v[i-1] + dp[i-1][c - w[i-1]])
        }
    }
    return dp[n][W]
}`,
  },
  content: {
    overview: `The 0/1 knapsack problem asks: given items each with a weight and a value, and a bag that holds at most W weight, which subset maximizes total value if each item is either taken whole or left behind? The "0/1" means no fractions — you can't take half an item.

The dynamic-programming solution fills a table dp[i][c] = the best value achievable using the first i items with capacity c. Each cell asks one question: is it better to skip item i (inherit dp[i−1][c]) or include it (its value plus dp[i−1][c − weight])? The answer at dp[n][W] is optimal, and a traceback recovers which items were chosen.`,
    howItWorks: [
      "Create a table dp[0..n][0..W]; row 0 (no items) is all zeros.",
      "Fill the table row by row: for item i and capacity c, first consider excluding it (dp[i−1][c]).",
      "If item i fits (weight ≤ c), also consider including it: value + dp[i−1][c − weight].",
      "Take the larger of exclude vs include — that's dp[i][c].",
      "dp[n][W] is the optimal value; trace back from it to recover the chosen items.",
    ],
    complexity: {
      time: { best: "O(n·W)", average: "O(n·W)", worst: "O(n·W)" },
      space: "O(n·W)",
      notes: "Pseudo-polynomial: linear in the number of items times the capacity W (which depends on W's value, not just input size). Space can be reduced to O(W) with a 1D rolling array processed right-to-left.",
    },
    applications: [
      "Budget and resource allocation under a hard limit",
      "Cargo loading and cutting-stock problems",
      "Portfolio and project selection with a cost cap",
      "Subset-sum and partition problems (special cases)",
    ],
    advantages: [
      "Guarantees the optimal subset (unlike greedy)",
      "Simple, systematic table-filling recurrence",
      "Traceback recovers the exact items chosen",
      "Space-optimizable to O(W)",
    ],
    disadvantages: [
      "Pseudo-polynomial — O(nW) blows up when W is large",
      "The base problem is NP-hard; no truly polynomial exact algorithm is known",
      "Requires integer (or discretized) weights",
    ],
    commonMistakes: [
      "Using the fractional-knapsack greedy approach, which is not optimal for 0/1.",
      "Indexing items off-by-one between the 1-based table and 0-based arrays.",
      "Iterating the 1D optimization left-to-right (that solves unbounded knapsack instead).",
      "Forgetting the base row/column of zeros.",
    ],
    interviewQuestions: [
      "Why doesn't the greedy value/weight strategy give the optimal 0/1 solution?",
      "How do you reduce the space from O(nW) to O(W)?",
      "Why is knapsack called pseudo-polynomial?",
      "How would you recover which items are in the optimal solution?",
      "How does 0/1 knapsack differ from unbounded knapsack in the recurrence?",
    ],
    summary:
      "0/1 knapsack maximizes value under a weight cap by filling dp[i][c] = max(exclude item i, include item i) in O(nW) time and space. It's the canonical DP optimization problem, optimal where greedy fails, and space-reducible to O(W).",
    quiz: [
      { question: "In 0/1 knapsack, each item can be…", options: ["Taken fractionally", "Taken whole or not at all", "Taken multiple times", "Only excluded"], answer: 1, explanation: "The '0/1' means a binary include/exclude choice per item." },
      { question: "dp[i][c] represents…", options: ["The i-th item's value", "Best value using the first i items within capacity c", "Total weight", "Number of items"], answer: 1, explanation: "It's the optimal value for a subproblem of the first i items and capacity c." },
      { question: "The time complexity O(n·W) is called…", options: ["Logarithmic", "Pseudo-polynomial", "Constant", "Exponential"], answer: 1, explanation: "It depends on the numeric value of W, not just the input size." },
      { question: "Why is greedy (value/weight) not optimal for 0/1 knapsack?", options: ["It's too slow", "Indivisible items can make a locally best choice globally suboptimal", "It needs sorting", "It always is optimal"], answer: 1, explanation: "Without fractions, a high-ratio item may crowd out a better-fitting combination." },
      { question: "The 1D space-optimized version must iterate capacity…", options: ["Left to right", "Right to left", "In any order", "Twice"], answer: 1, explanation: "Right-to-left ensures each item is used at most once (true 0/1 behavior)." },
    ],
  },
  inputFields: [
    { key: "items", label: "Items (weight:value)", placeholder: "2:3, 3:4, 4:5, 5:6", help: "Comma-separated weight:value pairs (up to 6)." },
    { key: "capacity", label: "Capacity W", placeholder: "8", help: "1–12." },
  ],
  defaultInput: (level, rng) => randomItems(level, rng),
  parseInput: (fields) => {
    const parts = (fields.items ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 1) throw new Error("Enter at least one item as weight:value, e.g. 2:3.");
    if (parts.length > 6) throw new Error("Maximum 6 items.");
    const items: Item[] = parts.map((p) => {
      const m = p.match(/^(\d+)\s*[:x]\s*(\d+)$/);
      if (!m) throw new Error(`"${p}" is invalid. Use weight:value like 3:4.`);
      const w = Number(m[1]);
      const v = Number(m[2]);
      if (w < 1) throw new Error("Weights must be at least 1.");
      return { w, v };
    });
    const capacity = Number((fields.capacity ?? "").trim());
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 12) throw new Error("Capacity must be a whole number from 1 to 12.");
    return { items, capacity };
  },
  serializeInput: (input) => ({ items: input.items.map((it) => `${it.w}:${it.v}`).join(", "), capacity: String(input.capacity) }),
  generate,
};

export default mod;
