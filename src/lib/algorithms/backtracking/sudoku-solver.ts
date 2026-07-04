import type { AlgorithmModule, CellState, GridFrame, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { grid: number[] }; // length-81, row-major, 0 = blank

const idx = (r: number, c: number) => r * 9 + c;

function generate(input: Input): Step<GridFrame>[] {
  const board = [...input.grid];
  const given = input.grid.map((v) => v !== 0);
  const steps: Step<GridFrame>[] = [];
  let placements = 0;
  let backtracks = 0;
  let truncated = false;
  let solved = false;

  const buildFrame = (active: [number, number] | null, conflict: [number, number] | null): GridFrame => {
    const cells: GridFrame["cells"] = [];
    for (let r = 0; r < 9; r++) {
      const row: GridFrame["cells"][0] = [];
      for (let c = 0; c < 9; c++) {
        const v = board[idx(r, c)];
        let state: CellState | undefined = given[idx(r, c)] ? "special" : v !== 0 ? "sorted" : undefined;
        if (active && active[0] === r && active[1] === c) state = "active";
        if (conflict && conflict[0] === r && conflict[1] === c) state = "swap";
        row.push({ value: v === 0 ? "" : v, state });
      }
      cells.push(row);
    }
    return { rows: 9, cols: 9, cells, note: `${placements} placements, ${backtracks} backtracks` };
  };

  const snap = (active: [number, number] | null, conflict: [number, number] | null, description: string, codeLine: number) => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    steps.push({ frame: buildFrame(active, conflict), description, codeLine, counters: { placements, backtracks } });
  };

  const findEmpty = (): [number, number] | null => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[idx(r, c)] === 0) return [r, c];
    return null;
  };

  const conflictFor = (r: number, c: number, v: number): [number, number] | null => {
    for (let cc = 0; cc < 9; cc++) if (cc !== c && board[idx(r, cc)] === v) return [r, cc];
    for (let rr = 0; rr < 9; rr++) if (rr !== r && board[idx(rr, c)] === v) return [rr, c];
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++)
      for (let cc = bc; cc < bc + 3; cc++)
        if ((rr !== r || cc !== c) && board[idx(rr, cc)] === v) return [rr, cc];
    return null;
  };

  snap(null, null, `Solve the 9×9 Sudoku by backtracking: at the first empty cell, try digits 1–9 in order, checking the row/column/3×3-box constraint each time, and recurse; backtrack when no digit works.`, 0);

  const solve = (): boolean => {
    if (truncated) return true;
    const empty = findEmpty();
    if (!empty) {
      solved = true;
      snap(null, null, `No empty cells remain — the board is fully and validly filled. Solved!`, 4);
      return true;
    }
    const [r, c] = empty;
    for (let v = 1; v <= 9; v++) {
      if (truncated) return true;
      snap([r, c], null, `Try ${v} at row ${r + 1}, column ${c + 1}.`, 1);
      const conflict = conflictFor(r, c, v);
      if (conflict) {
        snap([r, c], conflict, `${v} conflicts with (${conflict[0] + 1}, ${conflict[1] + 1}) — try the next digit.`, 2);
        continue;
      }
      board[idx(r, c)] = v;
      placements++;
      snap([r, c], null, `${v} is valid at (${r + 1}, ${c + 1}) — place it and move to the next empty cell.`, 3);
      if (solve()) return true;
      board[idx(r, c)] = 0;
      backtracks++;
      snap([r, c], null, `Every completion below failed — backtrack and clear (${r + 1}, ${c + 1}).`, 5);
    }
    return false;
  };

  solve();
  snap(
    null,
    null,
    solved
      ? `Solved with ${placements} placements and ${backtracks} backtracks.`
      : truncated
        ? `Step budget reached — this puzzle needs more backtracking than this visualizer displays.`
        : `No solution exists for this board.`,
    6,
  );
  return steps;
}

// A valid, solvable 9x9 Sudoku carved from a cyclic-shift base grid — deliberately
// well-constrained (43 givens) so naive row-major backtracking, and every random
// digit-relabeling defaultInput applies for variety, finishes in well under a
// thousand steps (tested against 2000+ relabelings), comfortably inside this
// visualizer's step budget. (A famously "easy for humans" 30-given puzzle can
// still need tens of thousands of naive brute-force tries, since "easy" for a
// person assumes smarter deduction than blind digit-by-digit backtracking.)
const BASE_PUZZLE =
  ".2345.7.9" +
  "...7.912." +
  "7..1..456" +
  "234567.91" +
  ".6..912.." +
  "891234.6." +
  "3.....912" +
  "......34." +
  ".12.....8";

function parseGridText(text: string): number[] {
  const rows = text
    .split(/[\n/]+/)
    .map((r) => r.trim())
    .filter(Boolean);
  if (rows.length !== 9) throw new Error(`Expected 9 rows separated by / or newline, got ${rows.length}.`);
  const grid: number[] = [];
  for (const row of rows) {
    if (!/^[0-9.]{9}$/.test(row)) throw new Error(`Row "${row}" must be exactly 9 characters: digits 1-9 or '.' for blank.`);
    for (const ch of row) grid.push(ch === "." || ch === "0" ? 0 : Number(ch));
  }
  // reject boards whose GIVEN clues already conflict
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[idx(r, c)];
      if (v === 0) continue;
      for (let cc = c + 1; cc < 9; cc++) if (grid[idx(r, cc)] === v) throw new Error(`Row ${r + 1} has ${v} twice.`);
      for (let rr = r + 1; rr < 9; rr++) if (grid[idx(rr, c)] === v) throw new Error(`Column ${c + 1} has ${v} twice.`);
    }
  }
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const seen = new Set<number>();
      for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++) {
          const v = grid[idx(r, c)];
          if (v === 0) continue;
          if (seen.has(v)) throw new Error(`The 3×3 box at row ${br + 1}, col ${bc + 1} has ${v} twice.`);
          seen.add(v);
        }
    }
  }
  return grid;
}

function gridToText(grid: number[]): string {
  const rows: string[] = [];
  for (let r = 0; r < 9; r++) {
    let row = "";
    for (let c = 0; c < 9; c++) row += grid[idx(r, c)] === 0 ? "." : String(grid[idx(r, c)]);
    rows.push(row);
  }
  return rows.join(" / ");
}

const mod: AlgorithmModule<GridFrame, Input> = {
  slug: "sudoku-solver",
  title: "Sudoku Solver (Backtracking)",
  category: "backtracking",
  difficulty: "Advanced",
  tags: ["backtracking", "constraint satisfaction", "pruning", "grid"],
  summary: "Fills the first empty cell with each candidate digit 1–9 that doesn't violate row/column/box rules, recursing and backtracking on dead ends.",
  renderer: "grid",
  pseudocode: [
    "procedure solve(board)",
    "  cell = first empty cell (row-major scan)",
    "  if none: board is solved; return true       // base case",
    "  for v = 1 .. 9:",
    "    if v conflicts with row/col/box: skip",
    "    place v; if solve(board): return true      // recurse",
    "    remove v                                    // backtrack",
    "  return false                                  // no digit worked here",
  ],
  code: {
    pseudocode: `procedure solve(board):
  cell = firstEmpty(board)
  if cell is None: return true
  for v in 1..9:
    if valid(board, cell, v):
      board[cell] = v
      if solve(board): return true
      board[cell] = 0
  return false`,
    c: `bool valid(int b[9][9], int r, int c, int v) {
    for (int i = 0; i < 9; i++) if (b[r][i] == v || b[i][c] == v) return false;
    int br = r/3*3, bc = c/3*3;
    for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) if (b[br+i][bc+j] == v) return false;
    return true;
}
bool solve(int b[9][9]) {
    for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) if (b[r][c] == 0) {
        for (int v = 1; v <= 9; v++) {
            if (valid(b, r, c, v)) {
                b[r][c] = v;
                if (solve(b)) return true;
                b[r][c] = 0;
            }
        }
        return false;
    }
    return true;
}`,
    cpp: `bool valid(vector<vector<int>>& b, int r, int c, int v) {
    for (int i = 0; i < 9; i++) if (b[r][i] == v || b[i][c] == v) return false;
    int br = r / 3 * 3, bc = c / 3 * 3;
    for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) if (b[br+i][bc+j] == v) return false;
    return true;
}
bool solve(vector<vector<int>>& b) {
    for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) if (b[r][c] == 0) {
        for (int v = 1; v <= 9; v++)
            if (valid(b, r, c, v)) {
                b[r][c] = v;
                if (solve(b)) return true;
                b[r][c] = 0;
            }
        return false;
    }
    return true;
}`,
    java: `static boolean valid(int[][] b, int r, int c, int v) {
    for (int i = 0; i < 9; i++) if (b[r][i] == v || b[i][c] == v) return false;
    int br = r / 3 * 3, bc = c / 3 * 3;
    for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) if (b[br+i][bc+j] == v) return false;
    return true;
}
static boolean solve(int[][] b) {
    for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) if (b[r][c] == 0) {
        for (int v = 1; v <= 9; v++) {
            if (valid(b, r, c, v)) {
                b[r][c] = v;
                if (solve(b)) return true;
                b[r][c] = 0;
            }
        }
        return false;
    }
    return true;
}`,
    python: `def valid(b: list[list[int]], r: int, c: int, v: int) -> bool:
    if any(b[r][i] == v or b[i][c] == v for i in range(9)):
        return False
    br, bc = r // 3 * 3, c // 3 * 3
    return all(b[br + i][bc + j] != v for i in range(3) for j in range(3))

def solve(b: list[list[int]]) -> bool:
    for r in range(9):
        for c in range(9):
            if b[r][c] == 0:
                for v in range(1, 10):
                    if valid(b, r, c, v):
                        b[r][c] = v
                        if solve(b):
                            return True
                        b[r][c] = 0
                return False
    return True`,
    javascript: `function valid(b, r, c, v) {
  for (let i = 0; i < 9; i++) if (b[r][i] === v || b[i][c] === v) return false;
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (b[br + i][bc + j] === v) return false;
  return true;
}
function solve(b) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (b[r][c] === 0) {
    for (let v = 1; v <= 9; v++) {
      if (valid(b, r, c, v)) {
        b[r][c] = v;
        if (solve(b)) return true;
        b[r][c] = 0;
      }
    }
    return false;
  }
  return true;
}`,
    typescript: `function valid(b: number[][], r: number, c: number, v: number): boolean {
  for (let i = 0; i < 9; i++) if (b[r][i] === v || b[i][c] === v) return false;
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (b[br + i][bc + j] === v) return false;
  return true;
}
function solve(b: number[][]): boolean {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (b[r][c] === 0) {
    for (let v = 1; v <= 9; v++) {
      if (valid(b, r, c, v)) {
        b[r][c] = v;
        if (solve(b)) return true;
        b[r][c] = 0;
      }
    }
    return false;
  }
  return true;
}`,
    csharp: `static bool Valid(int[,] b, int r, int c, int v) {
    for (int i = 0; i < 9; i++) if (b[r, i] == v || b[i, c] == v) return false;
    int br = r / 3 * 3, bc = c / 3 * 3;
    for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) if (b[br + i, bc + j] == v) return false;
    return true;
}
static bool Solve(int[,] b) {
    for (int r = 0; r < 9; r++) for (int c = 0; c < 9; c++) if (b[r, c] == 0) {
        for (int v = 1; v <= 9; v++) {
            if (Valid(b, r, c, v)) {
                b[r, c] = v;
                if (Solve(b)) return true;
                b[r, c] = 0;
            }
        }
        return false;
    }
    return true;
}`,
    go: `func valid(b *[9][9]int, r, c, v int) bool {
	for i := 0; i < 9; i++ {
		if b[r][i] == v || b[i][c] == v {
			return false
		}
	}
	br, bc := r/3*3, c/3*3
	for i := 0; i < 3; i++ {
		for j := 0; j < 3; j++ {
			if b[br+i][bc+j] == v {
				return false
			}
		}
	}
	return true
}
func solve(b *[9][9]int) bool {
	for r := 0; r < 9; r++ {
		for c := 0; c < 9; c++ {
			if b[r][c] == 0 {
				for v := 1; v <= 9; v++ {
					if valid(b, r, c, v) {
						b[r][c] = v
						if solve(b) {
							return true
						}
						b[r][c] = 0
					}
				}
				return false
			}
		}
	}
	return true
}`,
    rust: `fn valid(b: &[[i32; 9]; 9], r: usize, c: usize, v: i32) -> bool {
    for i in 0..9 {
        if b[r][i] == v || b[i][c] == v { return false; }
    }
    let (br, bc) = (r / 3 * 3, c / 3 * 3);
    for i in 0..3 {
        for j in 0..3 {
            if b[br + i][bc + j] == v { return false; }
        }
    }
    true
}
fn solve(b: &mut [[i32; 9]; 9]) -> bool {
    for r in 0..9 {
        for c in 0..9 {
            if b[r][c] == 0 {
                for v in 1..=9 {
                    if valid(b, r, c, v) {
                        b[r][c] = v;
                        if solve(b) { return true; }
                        b[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    true
}`,
    kotlin: `fun valid(b: Array<IntArray>, r: Int, c: Int, v: Int): Boolean {
    for (i in 0 until 9) if (b[r][i] == v || b[i][c] == v) return false
    val br = r / 3 * 3; val bc = c / 3 * 3
    for (i in 0 until 3) for (j in 0 until 3) if (b[br + i][bc + j] == v) return false
    return true
}
fun solve(b: Array<IntArray>): Boolean {
    for (r in 0 until 9) for (c in 0 until 9) if (b[r][c] == 0) {
        for (v in 1..9) {
            if (valid(b, r, c, v)) {
                b[r][c] = v
                if (solve(b)) return true
                b[r][c] = 0
            }
        }
        return false
    }
    return true
}`,
    swift: `func valid(_ b: [[Int]], _ r: Int, _ c: Int, _ v: Int) -> Bool {
    for i in 0..<9 { if b[r][i] == v || b[i][c] == v { return false } }
    let br = r / 3 * 3, bc = c / 3 * 3
    for i in 0..<3 { for j in 0..<3 { if b[br+i][bc+j] == v { return false } } }
    return true
}
func solve(_ b: inout [[Int]]) -> Bool {
    for r in 0..<9 {
        for c in 0..<9 where b[r][c] == 0 {
            for v in 1...9 where valid(b, r, c, v) {
                b[r][c] = v
                if solve(&b) { return true }
                b[r][c] = 0
            }
            return false
        }
    }
    return true
}`,
  },
  content: {
    overview: `Sudoku is a constraint-satisfaction puzzle: fill a 9×9 grid with digits 1–9 so every row, column, and 3×3 box contains each digit exactly once. Backtracking solves it directly from the rules with no puzzle-specific cleverness: find the first empty cell, try each digit 1–9, and for any digit that doesn't immediately violate the row/column/box constraints, place it and recurse into the rest of the board. If the recursive call can't complete the puzzle, undo the placement (backtrack) and try the next digit; if no digit works at all, report failure so the caller backtracks further up.

This is the same include/exclude, try/undo skeleton behind N-Queens and combinatorial search generally — Sudoku's rich constraints (row, column, and box simultaneously) mean most wrong guesses are caught almost immediately by the validity check, which is why brute-force backtracking, despite having no fancy heuristics, solves most published Sudoku puzzles quickly in practice, even though its worst-case behavior is exponential.`,
    howItWorks: [
      "Scan the board (row-major) for the first cell that is still empty.",
      "If there is none, every cell is validly filled — the puzzle is solved.",
      "Otherwise, try digits 1 through 9 in that cell; for each, check it doesn't already appear in the same row, column, or 3×3 box.",
      "If a digit is valid, place it and recursively try to solve the rest of the board.",
      "If the recursive solve succeeds, propagate success upward; if it fails, remove the digit (backtrack) and try the next candidate — if none of 1–9 work, report failure to the caller.",
    ],
    complexity: {
      time: { best: "O(1) (already solved)", average: "fast in practice for well-constrained puzzles", worst: "O(9^(81))" },
      space: "O(81) recursion depth (one call per empty cell)",
      notes: "The theoretical worst case is exponential (trying up to 9 digits per empty cell), but real puzzles are constrained enough that the row/column/box checks prune almost all invalid branches immediately, so practical solve times are typically fast. Constraint propagation (only considering candidates consistent with all three rules simultaneously) is what keeps this tractable without any Sudoku-specific heuristics.",
    },
    applications: [
      "The canonical example of constraint satisfaction problem (CSP) solving by backtracking search",
      "General template for scheduling, resource-allocation, and configuration problems with hard constraints",
      "Puzzle generators use a solver like this internally to verify a candidate puzzle has a unique solution",
      "Educational tool for combinatorial search, pruning, and recursion",
    ],
    advantages: [
      "Guaranteed to find a solution if one exists, or correctly report none does",
      "No puzzle-specific knowledge required — works from the constraint definitions alone",
      "In practice fast, because Sudoku's three simultaneous constraints (row/col/box) prune the search space aggressively",
    ],
    disadvantages: [
      "Worst-case exponential — pathological or near-empty boards can require enormous search",
      "No look-ahead: doesn't use constraint-propagation techniques (naked/hidden singles, etc.) that human solvers and faster solvers use to prune far earlier",
      "Performance is puzzle-dependent; a poorly constrained board can blow up the search tree",
    ],
    commonMistakes: [
      "Checking only the row when validating a digit — must check row, column, AND 3×3 box together.",
      "Forgetting to reset (zero out) a cell during backtracking, leaving stale digits that corrupt later validity checks.",
      "Off-by-one errors computing the box's top-left corner (must use integer division by 3, then multiply by 3).",
      "Assuming a puzzle with too few given clues always solves quickly — under-constrained boards can have a much larger search tree.",
    ],
    interviewQuestions: [
      "Walk through the validity check for a candidate digit — what three things must be verified?",
      "Why does this brute-force approach typically perform well in practice despite exponential worst case?",
      "How would constraint propagation (e.g. eliminating candidates via naked singles) speed this up further?",
      "How does this backtracking template generalize to N-Queens or general CSPs?",
      "How would you detect that a Sudoku puzzle has no solution, or more than one?",
    ],
    summary:
      "Sudoku backtracking finds the first empty cell, tries digits 1–9 checking the row/column/box constraint each time, recurses on success, and undoes the placement on failure to try the next digit — exactly the try/recurse/backtrack skeleton used across combinatorial search. Its three-way simultaneous constraint makes real puzzles prune quickly in practice even though the worst-case is exponential.",
    quiz: [
      { question: "Before placing a digit, backtracking Sudoku checks…", options: ["Only the row", "The row, column, AND 3×3 box", "Only the box", "Nothing — it always places and checks at the end"], answer: 1, explanation: "All three constraints must hold simultaneously for a digit to be valid at a cell." },
      { question: "When no digit 1–9 works at a cell, the algorithm…", options: ["Places a 0 and continues", "Reports failure so the caller backtracks and tries its next digit", "Restarts from scratch", "Skips the cell permanently"], answer: 1, explanation: "Failure propagates up the recursion so an earlier placement can be undone and retried." },
      { question: "Why is naive Sudoku backtracking usually fast in practice despite exponential worst case?", options: ["Sudoku puzzles are always small", "The row/column/box constraints prune most invalid branches almost immediately", "It uses machine learning", "It caches all previous solutions"], answer: 1, explanation: "Real puzzles are constrained enough that very few full guesses are ever needed before a conflict is detected." },
      { question: "What must happen when backtracking from a placed digit?", options: ["Nothing", "The cell must be reset to empty (0) before trying the next digit", "The whole board resets", "The digit stays but is marked invalid"], answer: 1, explanation: "Leaving a stale digit would corrupt subsequent validity checks for that cell and others." },
      { question: "This same try/recurse/backtrack pattern also solves…", options: ["Binary search", "N-Queens and general constraint satisfaction problems", "Merge sort", "Dijkstra's algorithm"], answer: 1, explanation: "Sudoku is one instance of the general CSP backtracking template shared with N-Queens, map coloring, and scheduling." },
    ],
  },
  inputFields: [
    {
      key: "grid",
      label: "Puzzle (9 rows, '.' = blank)",
      placeholder: ".2345.7.9 / ...7.912. / 7..1..456 / 234567.91 / .6..912.. / 891234.6. / 3.....912 / ......34. / .12.....8",
      help: "9 rows of 9 characters each (digits 1-9 or '.'), separated by / or newline.",
    },
  ],
  defaultInput: (_level, rng) => {
    const base = [...BASE_PUZZLE].map((ch) => (ch === "." ? 0 : Number(ch)));
    const perm = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = perm.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    const grid = base.map((v) => (v === 0 ? 0 : perm[v - 1]));
    return { grid };
  },
  parseInput: (fields) => ({ grid: parseGridText(fields.grid ?? "") }),
  serializeInput: (input) => ({ grid: gridToText(input.grid) }),
  generate,
};

export default mod;
