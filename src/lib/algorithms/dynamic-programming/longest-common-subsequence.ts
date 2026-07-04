import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Input = { a: string; b: string };

function generate(input: Input): Step<TableFrame>[] {
  const a = input.a;
  const b = input.b;
  const n = a.length;
  const m = b.length;
  const steps: Step<TableFrame>[] = [];
  let comparisons = 0;

  // dp[i][j] = LCS length of a[0..i) and b[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  const rowLabels = ["∅", ...a.split("").map((ch, i) => `${ch}${i + 1}`)];
  const colLabels = ["∅", ...b.split("").map((ch, j) => `${ch}${j + 1}`)];

  const frame = (
    filled: number,
    active: [number, number] | null,
    refs: [number, number][],
    description: string,
    codeLine: number,
    highlight?: Set<string>,
  ): void => {
    const cells = dp.map((row, i) =>
      row.map((val, j) => {
        let state: CellState | undefined;
        const key = `${i},${j}`;
        if (active && active[0] === i && active[1] === j) state = "active";
        else if (refs.some(([ri, rj]) => ri === i && rj === j)) state = "compare";
        else if (highlight?.has(key)) state = "found";
        else if (i * (m + 1) + j < filled) state = "sorted";
        const isFilled =
          i === 0 || j === 0 || i * (m + 1) + j < filled || (active && (i < active[0] || (i === active[0] && j <= active[1])));
        return { value: isFilled ? val : null, state };
      }),
    );
    steps.push({ frame: { rowLabels, colLabels, cells, note: `A = "${a}"  B = "${b}"` }, description, codeLine, counters: { comparisons } });
  };

  frame(0, null, [], `Longest Common Subsequence of "${a}" and "${b}". Row 0 and column 0 (empty prefixes) are all zeros.`, 0);

  let filled = m + 1; // row 0 done
  for (let i = 1; i <= n; i++) {
    filled++; // dp[i][0] = 0
    for (let j = 1; j <= m; j++) {
      comparisons++;
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        filled++;
        frame(
          filled,
          [i, j],
          [[i - 1, j - 1]],
          `A[${i}]='${a[i - 1]}' = B[${j}]='${b[j - 1]}': extend diagonal → dp[${i - 1}][${j - 1}]+1 = ${dp[i][j]}.`,
          3,
        );
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        filled++;
        frame(
          filled,
          [i, j],
          [[i - 1, j], [i, j - 1]],
          `A[${i}]='${a[i - 1]}' ≠ B[${j}]='${b[j - 1]}': take max(up ${dp[i - 1][j]}, left ${dp[i][j - 1]}) = ${dp[i][j]}.`,
          5,
        );
      }
    }
  }

  // Traceback to recover the subsequence.
  const highlight = new Set<string>();
  let i = n;
  let j = m;
  const seq: string[] = [];
  while (i > 0 && j > 0) {
    highlight.add(`${i},${j}`);
    if (a[i - 1] === b[j - 1]) {
      seq.push(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  seq.reverse();
  frame(filled, null, [], `LCS length = ${dp[n][m]}. Traceback recovers "${seq.join("")}".`, 7, highlight);
  return steps;
}

function randomStrings(level: number, rng: { int: (a: number, b: number) => number; pick: <T>(a: readonly T[]) => T }): Input {
  const alphabet = "ABCD".split("");
  const len = Math.min(8, 3 + level);
  const build = () => Array.from({ length: len }, () => rng.pick(alphabet)).join("");
  return { a: build(), b: build() };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "longest-common-subsequence",
  title: "Longest Common Subsequence",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "strings", "tabulation", "subsequence"],
  summary: "Finds the longest subsequence common to two strings by filling a 2-D DP table, then tracing it back.",
  renderer: "table",
  pseudocode: [
    "procedure LCS(A, B)",
    "  dp[i][0] = dp[0][j] = 0",
    "  for i = 1..n, j = 1..m:",
    "    if A[i] == B[j]: dp[i][j] = dp[i-1][j-1] + 1",
    "    else:",
    "      dp[i][j] = max(dp[i-1][j], dp[i][j-1])",
    "  // dp[n][m] is the length; trace back for the sequence",
    "  return dp[n][m]",
  ],
  code: {
    pseudocode: `dp[0..n][0..m] = 0
for i in 1..n:
  for j in 1..m:
    if A[i] == B[j]: dp[i][j] = dp[i-1][j-1] + 1
    else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
return dp[n][m]`,
    c: `int lcs(const char* a, const char* b) {
    int n = strlen(a), m = strlen(b);
    int dp[n + 1][m + 1];
    for (int i = 0; i <= n; i++) dp[i][0] = 0;
    for (int j = 0; j <= m; j++) dp[0][j] = 0;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = (a[i-1] == b[j-1]) ? dp[i-1][j-1] + 1
                       : (dp[i-1][j] > dp[i][j-1] ? dp[i-1][j] : dp[i][j-1]);
    return dp[n][m];
}`,
    cpp: `int lcs(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = (a[i-1] == b[j-1]) ? dp[i-1][j-1] + 1
                       : max(dp[i-1][j], dp[i][j-1]);
    return dp[n][m];
}`,
    java: `int lcs(String a, String b) {
    int n = a.length(), m = b.length();
    int[][] dp = new int[n + 1][m + 1];
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = (a.charAt(i-1) == b.charAt(j-1)) ? dp[i-1][j-1] + 1
                       : Math.max(dp[i-1][j], dp[i][j-1]);
    return dp[n][m];
}`,
    python: `def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[n][m]`,
    javascript: `function lcs(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1
                 : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp[n][m];
}`,
    typescript: `function lcs(a: string, b: string): number {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1
                 : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp[n][m];
}`,
    csharp: `int Lcs(string a, string b) {
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i, j] = (a[i-1] == b[j-1]) ? dp[i-1, j-1] + 1
                       : Math.Max(dp[i-1, j], dp[i, j-1]);
    return dp[n, m];
}`,
    go: `func lcs(a, b string) int {
	n, m := len(a), len(b)
	dp := make([][]int, n+1)
	for i := range dp { dp[i] = make([]int, m+1) }
	for i := 1; i <= n; i++ {
		for j := 1; j <= m; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1] + 1
			} else if dp[i-1][j] > dp[i][j-1] {
				dp[i][j] = dp[i-1][j]
			} else {
				dp[i][j] = dp[i][j-1]
			}
		}
	}
	return dp[n][m]
}`,
    rust: `fn lcs(a: &[u8], b: &[u8]) -> usize {
    let (n, m) = (a.len(), b.len());
    let mut dp = vec![vec![0usize; m + 1]; n + 1];
    for i in 1..=n {
        for j in 1..=m {
            dp[i][j] = if a[i-1] == b[j-1] { dp[i-1][j-1] + 1 }
                       else { dp[i-1][j].max(dp[i][j-1]) };
        }
    }
    dp[n][m]
}`,
    kotlin: `fun lcs(a: String, b: String): Int {
    val n = a.length; val m = b.length
    val dp = Array(n + 1) { IntArray(m + 1) }
    for (i in 1..n)
        for (j in 1..m)
            dp[i][j] = if (a[i-1] == b[j-1]) dp[i-1][j-1] + 1
                       else maxOf(dp[i-1][j], dp[i][j-1])
    return dp[n][m]
}`,
    swift: `func lcs(_ a: [Character], _ b: [Character]) -> Int {
    let n = a.count, m = b.count
    var dp = Array(repeating: Array(repeating: 0, count: m + 1), count: n + 1)
    for i in stride(from: 1, through: n, by: 1) {
        for j in stride(from: 1, through: m, by: 1) {
            dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1
                       : max(dp[i-1][j], dp[i][j-1])
        }
    }
    return dp[n][m]
}`,
  },
  content: {
    overview: `The longest common subsequence (LCS) of two strings is the longest sequence of characters that appears in both, in the same relative order but not necessarily contiguously. For "ABCBDAB" and "BDCAB" the LCS is "BCAB" (length 4). Unlike a substring, a subsequence may skip characters.

The dynamic-programming solution builds a table dp[i][j] = the LCS length of the first i characters of A and the first j characters of B. When the current characters match, the answer extends the diagonal (dp[i−1][j−1] + 1); when they differ, it inherits the better of dropping A's character (dp[i−1][j]) or B's character (dp[i][j−1]). The bottom-right cell holds the final length, and a walk back through the table reconstructs the subsequence itself.`,
    howItWorks: [
      "Create a table dp[0..n][0..m]; the empty-prefix row and column are all zeros.",
      "Scan the table row by row. For A[i] and B[j], compare the two characters.",
      "If they match, dp[i][j] = dp[i−1][j−1] + 1 (extend the common subsequence diagonally).",
      "If they differ, dp[i][j] = max(dp[i−1][j], dp[i][j−1]) (carry over the best so far).",
      "dp[n][m] is the LCS length; trace back from it (diagonal on matches, toward the larger neighbor otherwise) to recover the sequence.",
    ],
    complexity: {
      time: { best: "O(n·m)", average: "O(n·m)", worst: "O(n·m)" },
      space: "O(n·m)",
      notes: "Every cell is computed once in constant time. Space can be reduced to O(min(n, m)) with two rolling rows if only the length is needed (but that loses easy traceback).",
    },
    applications: [
      "diff tools and version control (line-level LCS)",
      "DNA / protein sequence alignment in bioinformatics",
      "plagiarism and similarity detection",
      "spell-checking and fuzzy matching foundations",
    ],
    advantages: [
      "Guarantees the optimal (longest) common subsequence",
      "Simple, regular table-filling recurrence",
      "Traceback reconstructs the actual subsequence, not just its length",
      "Space-reducible to O(min(n, m)) for the length",
    ],
    disadvantages: [
      "O(n·m) time and space is costly for very long strings",
      "The reduced-space variant makes recovering the sequence harder",
      "Only finds one LCS even when several of equal length exist",
    ],
    commonMistakes: [
      "Confusing subsequence (order preserved, gaps allowed) with substring (contiguous).",
      "Off-by-one errors between the 1-based table and 0-based strings.",
      "Forgetting to initialize the zero row/column.",
      "Tracing back toward the wrong neighbor and producing an invalid sequence.",
    ],
    interviewQuestions: [
      "How does LCS differ from longest common substring, and how do the recurrences differ?",
      "How would you reduce the space complexity to O(min(n, m))?",
      "How do you reconstruct the actual subsequence from the table?",
      "How is edit distance related to LCS?",
      "How would you find the length of the shortest common supersequence using LCS?",
    ],
    summary:
      "LCS finds the longest order-preserving common subsequence of two strings by filling dp[i][j] = dp[i−1][j−1]+1 on a match, else max(dp[i−1][j], dp[i][j−1]), in O(n·m) time and space. It underpins diff tools and sequence alignment, and a traceback recovers the subsequence itself.",
    quiz: [
      { question: "A subsequence differs from a substring in that it…", options: ["Must be contiguous", "May skip characters but keeps order", "Must be reversed", "Ignores order"], answer: 1, explanation: "A subsequence preserves relative order but need not be contiguous." },
      { question: "When A[i] == B[j], dp[i][j] equals…", options: ["dp[i-1][j]", "dp[i][j-1]", "dp[i-1][j-1] + 1", "0"], answer: 2, explanation: "A match extends the diagonal subproblem by one character." },
      { question: "When the characters differ, dp[i][j] is…", options: ["dp[i-1][j-1]", "max(dp[i-1][j], dp[i][j-1])", "min of the neighbors", "dp[i-1][j-1] + 1"], answer: 1, explanation: "You keep the better of dropping A's or B's current character." },
      { question: "The time complexity of the table method is…", options: ["O(n + m)", "O(n·m)", "O(n log m)", "O(2^n)"], answer: 1, explanation: "Each of the n·m cells is filled in constant time." },
      { question: "The LCS length is found in which cell?", options: ["dp[0][0]", "dp[n][m]", "dp[1][1]", "the maximum cell anywhere"], answer: 1, explanation: "The full-string subproblem sits at the bottom-right corner." },
    ],
  },
  inputFields: [
    { key: "a", label: "String A", placeholder: "ABCBDAB", help: "Up to 18 characters." },
    { key: "b", label: "String B", placeholder: "BDCAB", help: "Up to 18 characters." },
  ],
  defaultInput: (level, rng) => randomStrings(level, rng),
  parseInput: (fields) => {
    const a = (fields.a ?? "").trim();
    const b = (fields.b ?? "").trim();
    if (!a || !b) throw new Error("Enter both strings.");
    if (a.length > 18 || b.length > 18) throw new Error("Each string must be at most 18 characters.");
    return { a, b };
  },
  serializeInput: (input) => ({ a: input.a, b: input.b }),
  generate,
};

export default mod;
