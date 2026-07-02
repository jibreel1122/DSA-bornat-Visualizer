import type { AlgorithmModule, CellState, GridFrame, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { n: number };

function generate(input: Input): Step<GridFrame>[] {
  const n = Math.max(4, Math.min(8, input.n));
  const steps: Step<GridFrame>[] = [];
  const cols = new Array(n).fill(-1); // cols[row] = column of the queen in that row
  let placements = 0;
  let backtracks = 0;
  let solutions = 0;
  let truncated = false;

  const buildFrame = (active: [number, number] | null, conflict: [number, number] | null, note: string): GridFrame => {
    const cells: GridFrame["cells"] = [];
    for (let r = 0; r < n; r++) {
      const row: GridFrame["cells"][0] = [];
      for (let c = 0; c < n; c++) {
        let state: CellState | undefined;
        let value: string | undefined;
        if (cols[r] === c) {
          value = "♛";
          state = "sorted";
        }
        if (active && active[0] === r && active[1] === c) {
          state = "active";
          value = value ?? "·";
        }
        if (conflict && conflict[0] === r && conflict[1] === c) {
          state = "swap";
          value = "✕";
        }
        row.push({ value: value ?? "", state });
      }
      cells.push(row);
    }
    return { rows: n, cols: n, cells, note };
  };

  const snap = (active: [number, number] | null, conflict: [number, number] | null, description: string, codeLine: number) => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    steps.push({
      frame: buildFrame(active, conflict, `solutions: ${solutions}`),
      description,
      codeLine,
      counters: { placements, backtracks, solutions },
    });
  };

  const safe = (row: number, col: number): { ok: boolean; conflict: [number, number] | null } => {
    for (let r = 0; r < row; r++) {
      const c = cols[r];
      if (c === col || Math.abs(c - col) === Math.abs(r - row)) return { ok: false, conflict: [r, c] };
    }
    return { ok: true, conflict: null };
  };

  snap(null, null, `Place ${n} queens so none attack each other — one per row, backtracking on conflicts.`, 0);

  const solve = (row: number): boolean => {
    if (truncated) return true;
    if (row === n) {
      solutions++;
      snap(null, null, `Solution ${solutions} found! All ${n} queens are safe.`, 5);
      return true; // stop at the first solution to keep step count bounded
    }
    for (let col = 0; col < n; col++) {
      if (truncated) return true;
      snap([row, col], null, `Try placing a queen at row ${row}, column ${col}.`, 1);
      const { ok, conflict } = safe(row, col);
      if (ok) {
        cols[row] = col;
        placements++;
        snap([row, col], null, `Safe — place queen at (${row}, ${col}) and advance to row ${row + 1}.`, 2);
        if (solve(row + 1)) return true;
        cols[row] = -1;
        backtracks++;
        snap([row, col], null, `Dead end below — backtrack, remove queen from (${row}, ${col}).`, 4);
      } else {
        snap([row, col], conflict, `Conflict with the queen at (${conflict![0]}, ${conflict![1]}). Skip.`, 3);
      }
    }
    return false;
  };

  solve(0);
  if (solutions === 0) snap(null, null, `No solution exists for ${n} queens.`, 6);
  else snap(null, null, `Done — a valid ${n}-queens arrangement.${truncated ? " (search truncated)" : ""}`, 6);
  return steps;
}

const mod: AlgorithmModule<GridFrame, Input> = {
  slug: "n-queens",
  title: "N-Queens",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "constraint satisfaction", "recursion"],
  summary: "Places N queens on an N×N board so none attack each other, backtracking whenever a conflict arises.",
  renderer: "grid",
  pseudocode: [
    "procedure solve(row)",
    "  if trying a column: check safety",
    "    if safe: place queen; solve(row+1)",
    "    else: conflict — skip this column",
    "  on failure below: backtrack (remove queen)",
    "  if row == n: a full solution is found",
    "  return whether a solution was completed",
  ],
  code: {
    pseudocode: `procedure solve(board, row, n)
  if row == n: record solution; return true
  for col in 0..n-1:
    if safe(board, row, col):
      board[row] = col
      if solve(board, row+1, n): return true
      board[row] = -1   // backtrack
  return false`,
    c: `int cols[20];
int safe(int row, int col) {
    for (int r = 0; r < row; r++)
        if (cols[r] == col || abs(cols[r]-col) == abs(r-row)) return 0;
    return 1;
}
int solve(int row, int n) {
    if (row == n) return 1;
    for (int col = 0; col < n; col++)
        if (safe(row, col)) {
            cols[row] = col;
            if (solve(row+1, n)) return 1;
        }
    return 0;
}`,
    cpp: `vector<int> cols;
bool safe(int row, int col) {
    for (int r = 0; r < row; r++)
        if (cols[r] == col || abs(cols[r]-col) == abs(r-row)) return false;
    return true;
}
bool solve(int row, int n) {
    if (row == n) return true;
    for (int col = 0; col < n; col++)
        if (safe(row, col)) { cols[row] = col; if (solve(row+1, n)) return true; }
    return false;
}`,
    java: `int[] cols;
boolean safe(int row, int col) {
    for (int r = 0; r < row; r++)
        if (cols[r] == col || Math.abs(cols[r]-col) == Math.abs(r-row)) return false;
    return true;
}
boolean solve(int row, int n) {
    if (row == n) return true;
    for (int col = 0; col < n; col++)
        if (safe(row, col)) { cols[row] = col; if (solve(row+1, n)) return true; }
    return false;
}`,
    python: `def solve(cols, row, n):
    if row == n:
        return True
    for col in range(n):
        if all(cols[r] != col and abs(cols[r]-col) != row-r for r in range(row)):
            cols[row] = col
            if solve(cols, row+1, n):
                return True
            cols[row] = -1
    return False`,
    javascript: `function solve(cols, row, n) {
  if (row === n) return true;
  for (let col = 0; col < n; col++) {
    if (safe(cols, row, col)) {
      cols[row] = col;
      if (solve(cols, row + 1, n)) return true;
      cols[row] = -1;
    }
  }
  return false;
}
function safe(cols, row, col) {
  for (let r = 0; r < row; r++)
    if (cols[r] === col || Math.abs(cols[r]-col) === row-r) return false;
  return true;
}`,
    typescript: `function safe(cols: number[], row: number, col: number): boolean {
  for (let r = 0; r < row; r++)
    if (cols[r] === col || Math.abs(cols[r]-col) === row-r) return false;
  return true;
}
function solve(cols: number[], row: number, n: number): boolean {
  if (row === n) return true;
  for (let col = 0; col < n; col++)
    if (safe(cols, row, col)) { cols[row] = col; if (solve(cols, row+1, n)) return true; }
  return false;
}`,
    csharp: `int[] cols;
bool Safe(int row, int col) {
    for (int r = 0; r < row; r++)
        if (cols[r] == col || Math.Abs(cols[r]-col) == Math.Abs(r-row)) return false;
    return true;
}
bool Solve(int row, int n) {
    if (row == n) return true;
    for (int col = 0; col < n; col++)
        if (Safe(row, col)) { cols[row] = col; if (Solve(row+1, n)) return true; }
    return false;
}`,
    go: `var cols []int
func safe(row, col int) bool {
	for r := 0; r < row; r++ {
		if cols[r] == col || abs(cols[r]-col) == abs(r-row) { return false }
	}
	return true
}
func solve(row, n int) bool {
	if row == n { return true }
	for col := 0; col < n; col++ {
		if safe(row, col) { cols[row] = col; if solve(row+1, n) { return true } }
	}
	return false
}`,
    rust: `fn safe(cols: &[i32], row: usize, col: i32) -> bool {
    (0..row).all(|r| cols[r] != col && (cols[r]-col).abs() != (row as i32 - r as i32))
}
fn solve(cols: &mut Vec<i32>, row: usize, n: usize) -> bool {
    if row == n { return true; }
    for col in 0..n as i32 {
        if safe(cols, row, col) {
            cols[row] = col;
            if solve(cols, row+1, n) { return true; }
        }
    }
    false
}`,
    kotlin: `fun safe(cols: IntArray, row: Int, col: Int): Boolean {
    for (r in 0 until row)
        if (cols[r] == col || Math.abs(cols[r]-col) == row-r) return false
    return true
}
fun solve(cols: IntArray, row: Int, n: Int): Boolean {
    if (row == n) return true
    for (col in 0 until n)
        if (safe(cols, row, col)) { cols[row] = col; if (solve(cols, row+1, n)) return true }
    return false
}`,
    swift: `func safe(_ cols: [Int], _ row: Int, _ col: Int) -> Bool {
    for r in 0..<row where cols[r] == col || abs(cols[r]-col) == row-r { return false }
    return true
}
func solve(_ cols: inout [Int], _ row: Int, _ n: Int) -> Bool {
    if row == n { return true }
    for col in 0..<n where safe(cols, row, col) {
        cols[row] = col
        if solve(&cols, row+1, n) { return true }
    }
    return false
}`,
  },
  content: {
    overview: `The N-Queens problem asks you to place N chess queens on an N×N board so that no two attack each other — no shared row, column, or diagonal. It is the textbook example of backtracking: build a partial solution one queen at a time, and abandon (backtrack from) any placement that can't lead to a full solution.

The key insight is that exactly one queen goes in each row, so the search reduces to choosing a column for each row. When a candidate placement conflicts with an earlier queen, that branch is pruned immediately; when a dead end is reached, the algorithm removes the last queen and tries the next column — systematically exploring the space while skipping vast swaths of it.`,
    howItWorks: [
      "Process rows top to bottom, placing one queen per row.",
      "For the current row, try each column left to right.",
      "Check safety against all previously placed queens (same column or diagonal).",
      "If safe, place the queen and recurse into the next row.",
      "If the recursion fails (no valid placement below), backtrack: remove the queen and try the next column.",
    ],
    complexity: {
      time: { best: "O(N!)", average: "O(N!)", worst: "O(N!)" },
      space: "O(N)",
      notes: "The search tree is bounded by N! and pruning cuts it dramatically in practice. Space is O(N) for the column-per-row array plus O(N) recursion depth.",
    },
    applications: [
      "Canonical example for teaching backtracking and pruning",
      "Constraint-satisfaction problem (CSP) benchmarks",
      "Testing search heuristics and parallel search",
      "Scheduling/placement problems with mutual-exclusion constraints",
    ],
    advantages: [
      "Backtracking prunes invalid branches early, avoiding brute force",
      "Simple recursive structure",
      "O(N) memory using a column-per-row representation",
      "Naturally extends to counting all solutions",
    ],
    disadvantages: [
      "Worst-case exponential (O(N!)) time",
      "Naive versions revisit conflicts without incremental checks",
      "Not practical for very large N without stronger heuristics/symmetry breaking",
    ],
    commonMistakes: [
      "Only checking rows/columns and forgetting the two diagonals.",
      "Not undoing a placement on backtrack (state leaks into other branches).",
      "Placing more than one queen per row instead of exploiting the one-per-row structure.",
      "Off-by-one in the diagonal test |c1 − c2| == |r1 − r2|.",
    ],
    interviewQuestions: [
      "How do you check whether two queens share a diagonal in O(1)?",
      "How would you count all distinct solutions rather than finding one?",
      "How can bitmasks speed up the safety check?",
      "How does symmetry help reduce the search?",
      "Why is one-queen-per-row a valid and helpful assumption?",
    ],
    summary:
      "N-Queens places one queen per row on an N×N board, using backtracking to try columns and prune conflicts on shared columns or diagonals. It runs in O(N!) worst case with O(N) space and is the definitive introduction to backtracking search.",
    quiz: [
      { question: "Two queens attack each other if they share a row, column, or…", options: ["Color", "Diagonal", "Corner", "Knight's move"], answer: 1, explanation: "Queens also attack along both diagonals, checked via |Δrow| == |Δcol|." },
      { question: "Backtracking improves on brute force by…", options: ["Sorting the board", "Pruning branches that can't lead to a solution", "Using more memory", "Trying random placements"], answer: 1, explanation: "It abandons a partial placement the moment it becomes invalid." },
      { question: "Placing exactly one queen per row means the search chooses…", options: ["A row for each column", "A column for each row", "Two queens per row", "Diagonals only"], answer: 1, explanation: "The problem reduces to picking a safe column for each successive row." },
      { question: "The space complexity of the standard solution is…", options: ["O(1)", "O(N)", "O(N²)", "O(N!)"], answer: 1, explanation: "One column index per row plus O(N) recursion depth." },
      { question: "When a row has no safe column, the algorithm…", options: ["Stops entirely", "Backtracks to the previous row", "Restarts", "Places a queen anyway"], answer: 1, explanation: "It removes the previous queen and tries its next column." },
    ],
  },
  inputFields: [{ key: "n", label: "Board size N", placeholder: "6", help: "4–8 (shows the first solution)." }],
  defaultInput: (level) => ({ n: Math.min(8, 4 + Math.floor(level / 1.5)) }),
  parseInput: (fields) => {
    const n = Number((fields.n ?? "").trim());
    if (!Number.isInteger(n) || n < 4 || n > 8) throw new Error("Enter a whole number from 4 to 8.");
    return { n };
  },
  serializeInput: (input) => ({ n: String(input.n) }),
  generate,
};

export default mod;
