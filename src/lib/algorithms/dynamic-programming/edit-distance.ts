import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Input = { a: string; b: string };

function generate(input: Input): Step<TableFrame>[] {
  const a = input.a;
  const b = input.b;
  const n = a.length;
  const m = b.length;
  const steps: Step<TableFrame>[] = [];
  let comparisons = 0;

  // dp[i][j] = edit distance between a[0..i) and b[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

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

  frame(
    m + 1,
    null,
    [],
    `Edit distance from "${a}" to "${b}". Base cases: row 0 = insert j chars, column 0 = delete i chars.`,
    1,
  );

  let filled = m + 1;
  for (let i = 1; i <= n; i++) {
    filled++; // dp[i][0]
    for (let j = 1; j <= m; j++) {
      comparisons++;
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        filled++;
        frame(
          filled,
          [i, j],
          [[i - 1, j - 1]],
          `'${a[i - 1]}' = '${b[j - 1]}': no edit needed, copy diagonal = ${dp[i][j]}.`,
          4,
        );
      } else {
        const del = dp[i - 1][j];
        const ins = dp[i][j - 1];
        const sub = dp[i - 1][j - 1];
        dp[i][j] = 1 + Math.min(del, ins, sub);
        filled++;
        const op = sub <= del && sub <= ins ? "substitute" : del <= ins ? "delete" : "insert";
        frame(
          filled,
          [i, j],
          [[i - 1, j], [i, j - 1], [i - 1, j - 1]],
          `'${a[i - 1]}' ≠ '${b[j - 1]}': 1 + min(del ${del}, ins ${ins}, sub ${sub}) = ${dp[i][j]} (${op}).`,
          6,
        );
      }
    }
  }

  // Traceback the chosen operations.
  const highlight = new Set<string>();
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    highlight.add(`${i},${j}`);
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }
  highlight.add("0,0");
  frame(filled, null, [], `Minimum edit distance = ${dp[n][m]}. Highlighted path shows one optimal operation sequence.`, 8, highlight);
  return steps;
}

function randomStrings(level: number, rng: { pick: <T>(a: readonly T[]) => T }): Input {
  const alphabet = "abcde".split("");
  const len = Math.min(8, 3 + level);
  const build = () => Array.from({ length: len }, () => rng.pick(alphabet)).join("");
  return { a: build(), b: build() };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "edit-distance",
  title: "Edit Distance (Levenshtein)",
  category: "dynamic-programming",
  difficulty: "Intermediate",
  tags: ["dynamic programming", "strings", "levenshtein", "tabulation"],
  summary: "Computes the minimum number of insertions, deletions, and substitutions to transform one string into another.",
  renderer: "table",
  pseudocode: [
    "procedure editDistance(A, B)",
    "  dp[i][0] = i;  dp[0][j] = j",
    "  for i = 1..n, j = 1..m:",
    "    if A[i] == B[j]:",
    "      dp[i][j] = dp[i-1][j-1]",
    "    else:",
    "      dp[i][j] = 1 + min(delete, insert, substitute)",
    "  // dp[n][m] is the distance; trace back for the ops",
    "  return dp[n][m]",
  ],
  code: {
    pseudocode: `dp[i][0] = i; dp[0][j] = j
for i in 1..n, j in 1..m:
  if A[i]==B[j]: dp[i][j] = dp[i-1][j-1]
  else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
return dp[n][m]`,
    c: `int editDistance(const char* a, const char* b) {
    int n = strlen(a), m = strlen(b);
    int dp[n + 1][m + 1];
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (a[i-1] == b[j-1]) dp[i][j] = dp[i-1][j-1];
            else {
                int mn = dp[i-1][j];
                if (dp[i][j-1] < mn) mn = dp[i][j-1];
                if (dp[i-1][j-1] < mn) mn = dp[i-1][j-1];
                dp[i][j] = 1 + mn;
            }
        }
    return dp[n][m];
}`,
    cpp: `int editDistance(const string& a, const string& b) {
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = (a[i-1] == b[j-1]) ? dp[i-1][j-1]
                       : 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});
    return dp[n][m];
}`,
    java: `int editDistance(String a, String b) {
    int n = a.length(), m = b.length();
    int[][] dp = new int[n + 1][m + 1];
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = (a.charAt(i-1) == b.charAt(j-1)) ? dp[i-1][j-1]
                       : 1 + Math.min(dp[i-1][j-1], Math.min(dp[i-1][j], dp[i][j-1]));
    return dp[n][m];
}`,
    python: `def edit_distance(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[n][m]`,
    javascript: `function editDistance(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                 : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[n][m];
}`,
    typescript: `function editDistance(a: string, b: string): number {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                 : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[n][m];
}`,
    csharp: `int EditDistance(string a, string b) {
    int n = a.Length, m = b.Length;
    var dp = new int[n + 1, m + 1];
    for (int i = 0; i <= n; i++) dp[i, 0] = i;
    for (int j = 0; j <= m; j++) dp[0, j] = j;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i, j] = (a[i-1] == b[j-1]) ? dp[i-1, j-1]
                       : 1 + Math.Min(dp[i-1, j-1], Math.Min(dp[i-1, j], dp[i, j-1]));
    return dp[n, m];
}`,
    go: `func editDistance(a, b string) int {
	n, m := len(a), len(b)
	dp := make([][]int, n+1)
	for i := range dp { dp[i] = make([]int, m+1); dp[i][0] = i }
	for j := 0; j <= m; j++ { dp[0][j] = j }
	min3 := func(x, y, z int) int {
		if y < x { x = y }
		if z < x { x = z }
		return x
	}
	for i := 1; i <= n; i++ {
		for j := 1; j <= m; j++ {
			if a[i-1] == b[j-1] {
				dp[i][j] = dp[i-1][j-1]
			} else {
				dp[i][j] = 1 + min3(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
			}
		}
	}
	return dp[n][m]
}`,
    rust: `fn edit_distance(a: &[u8], b: &[u8]) -> usize {
    let (n, m) = (a.len(), b.len());
    let mut dp = vec![vec![0usize; m + 1]; n + 1];
    for i in 0..=n { dp[i][0] = i; }
    for j in 0..=m { dp[0][j] = j; }
    for i in 1..=n {
        for j in 1..=m {
            dp[i][j] = if a[i-1] == b[j-1] { dp[i-1][j-1] }
                       else { 1 + dp[i-1][j].min(dp[i][j-1]).min(dp[i-1][j-1]) };
        }
    }
    dp[n][m]
}`,
    kotlin: `fun editDistance(a: String, b: String): Int {
    val n = a.length; val m = b.length
    val dp = Array(n + 1) { IntArray(m + 1) }
    for (i in 0..n) dp[i][0] = i
    for (j in 0..m) dp[0][j] = j
    for (i in 1..n)
        for (j in 1..m)
            dp[i][j] = if (a[i-1] == b[j-1]) dp[i-1][j-1]
                       else 1 + minOf(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[n][m]
}`,
    swift: `func editDistance(_ a: [Character], _ b: [Character]) -> Int {
    let n = a.count, m = b.count
    var dp = Array(repeating: Array(repeating: 0, count: m + 1), count: n + 1)
    for i in 0...n { dp[i][0] = i }
    for j in 0...m { dp[0][j] = j }
    for i in stride(from: 1, through: n, by: 1) {
        for j in stride(from: 1, through: m, by: 1) {
            dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1]
                       : 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
        }
    }
    return dp[n][m]
}`,
  },
  content: {
    overview: `Edit distance (also called Levenshtein distance) measures how different two strings are: the minimum number of single-character insertions, deletions, and substitutions needed to turn one string into the other. Transforming "kitten" into "sitting" costs 3 (substitute k→s, substitute e→i, insert g).

The dynamic-programming table dp[i][j] holds the edit distance between the first i characters of A and the first j characters of B. The base cases are pure edits against an empty string: turning a length-i prefix into "" costs i deletions, and "" into a length-j prefix costs j insertions. For interior cells, matching characters cost nothing (inherit the diagonal), while mismatches take one edit plus the cheapest of the three neighbors — deletion (up), insertion (left), or substitution (diagonal).`,
    howItWorks: [
      "Initialize dp[i][0] = i and dp[0][j] = j (edits against the empty string).",
      "Fill the table row by row for each pair of prefixes.",
      "If A[i] == B[j], no edit is needed: dp[i][j] = dp[i−1][j−1].",
      "Otherwise dp[i][j] = 1 + min(dp[i−1][j] delete, dp[i][j−1] insert, dp[i−1][j−1] substitute).",
      "dp[n][m] is the minimum edit distance; trace back to list the actual operations.",
    ],
    complexity: {
      time: { best: "O(n·m)", average: "O(n·m)", worst: "O(n·m)" },
      space: "O(n·m)",
      notes: "Each cell depends only on three neighbors, so space can be reduced to O(min(n, m)) with two rolling rows when only the distance is needed.",
    },
    applications: [
      "spell checkers and autocorrect suggestions",
      "fuzzy string matching and record deduplication",
      "DNA sequence comparison and alignment scoring",
      "diff and merge tooling",
    ],
    advantages: [
      "Gives an exact, optimal edit cost",
      "Naturally handles all three edit operations uniformly",
      "Traceback recovers the concrete sequence of edits",
      "Weights per operation are easy to customize",
    ],
    disadvantages: [
      "O(n·m) time and space grows quickly on long strings",
      "The basic form treats all edits as equal cost",
      "Reduced-space version loses the easy operation traceback",
    ],
    commonMistakes: [
      "Forgetting the base-case row and column (i deletions / j insertions).",
      "Taking min of only two neighbors and omitting substitution.",
      "Adding 1 even when the characters match.",
      "Swapping the roles of insertion and deletion during traceback.",
    ],
    interviewQuestions: [
      "What do the three neighbor cells correspond to in terms of edit operations?",
      "How would you support different costs for insert, delete, and substitute?",
      "How is edit distance related to longest common subsequence?",
      "How do you reduce the space to O(min(n, m))?",
      "How would you add a transposition operation (Damerau–Levenshtein)?",
    ],
    summary:
      "Edit distance computes the fewest insert/delete/substitute operations to convert one string to another via dp[i][j] = dp[i−1][j−1] on a match, else 1 + min of the three neighbors, in O(n·m) time. It powers spell-checkers, fuzzy matching, and sequence alignment.",
    quiz: [
      { question: "Edit distance counts which operations?", options: ["Only substitutions", "Insertions, deletions, substitutions", "Rotations and swaps", "Only insertions and deletions"], answer: 1, explanation: "Levenshtein distance allows single-character insert, delete, and substitute." },
      { question: "The base case dp[i][0] equals…", options: ["0", "i", "1", "m"], answer: 1, explanation: "Turning an i-length prefix into the empty string takes i deletions." },
      { question: "On a character match, dp[i][j] equals…", options: ["1 + dp[i-1][j-1]", "dp[i-1][j-1]", "min of neighbors", "0"], answer: 1, explanation: "Matching characters require no edit, so it inherits the diagonal." },
      { question: "The three neighbors (up, left, diagonal) represent…", options: ["insert, delete, match", "delete, insert, substitute", "substitute, match, insert", "swap, insert, delete"], answer: 1, explanation: "Up = delete from A, left = insert into A, diagonal = substitute." },
      { question: "Edit distance and LCS are related because…", options: ["They are identical", "With only insert/delete allowed, edits = n + m − 2·LCS", "LCS is always larger", "They share no relation"], answer: 1, explanation: "Restricting to insert/delete, the distance equals n + m − 2·LCS." },
    ],
  },
  inputFields: [
    { key: "a", label: "String A (from)", placeholder: "kitten", help: "Up to 12 characters." },
    { key: "b", label: "String B (to)", placeholder: "sitting", help: "Up to 12 characters." },
  ],
  defaultInput: (level, rng) => randomStrings(level, rng),
  parseInput: (fields) => {
    const a = (fields.a ?? "").trim();
    const b = (fields.b ?? "").trim();
    if (!a || !b) throw new Error("Enter both strings.");
    if (a.length > 12 || b.length > 12) throw new Error("Each string must be at most 12 characters.");
    return { a, b };
  },
  serializeInput: (input) => ({ a: input.a, b: input.b }),
  generate,
};

export default mod;
