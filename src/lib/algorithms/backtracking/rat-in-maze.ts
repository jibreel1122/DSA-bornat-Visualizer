import type { AlgorithmModule, CellState, GridFrame, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { grid: number[][] };

const DIRS: [number, number, string][] = [
  [1, 0, "Down"],
  [0, 1, "Right"],
  [-1, 0, "Up"],
  [0, -1, "Left"],
];

function generate(input: Input): Step<GridFrame>[] {
  const g = input.grid;
  const n = g.length;
  const visited = Array.from({ length: n }, () => new Array(n).fill(false));
  const steps: Step<GridFrame>[] = [];
  let moves = 0;
  let backtracks = 0;
  let truncated = false;
  let solved = false;

  const frame = (cur: [number, number] | null, dead: [number, number] | null, description: string, codeLine: number): void => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    const cells: GridFrame["cells"] = [];
    for (let r = 0; r < n; r++) {
      const row: GridFrame["cells"][0] = [];
      for (let c = 0; c < n; c++) {
        let state: CellState | undefined;
        let value = "";
        if (g[r][c] === 0) {
          state = "discarded";
          value = "█";
        } else if (visited[r][c]) {
          state = "sorted";
          value = "·";
        }
        if (cur && cur[0] === r && cur[1] === c) {
          state = "active";
          value = "🐁";
        }
        if (dead && dead[0] === r && dead[1] === c) {
          state = "visited";
          value = "✗";
        }
        if (r === n - 1 && c === n - 1 && !(cur && cur[0] === r && cur[1] === c)) value = value || "🧀";
        row.push({ value, state });
      }
      cells.push(row);
    }
    steps.push({
      frame: { rows: n, cols: n, cells, note: `rat starts top-left 🐁, cheese bottom-right 🧀 · move on open cells (1)` },
      description,
      codeLine,
      counters: { moves, backtracks },
    });
  };

  const inBounds = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n;

  const solve = (r: number, c: number): boolean => {
    if (!inBounds(r, c) || g[r][c] === 0 || visited[r][c]) return false;
    visited[r][c] = true;
    moves++;
    frame([r, c], null, `Move to (${r}, ${c}) and mark it as part of the current path.`, 3);
    if (r === n - 1 && c === n - 1) {
      solved = true;
      frame([r, c], null, `Reached the cheese at (${r}, ${c})! A path exists.`, 4);
      return true;
    }
    for (const [dr, dc, name] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && g[nr][nc] === 1 && !visited[nr][nc]) {
        if (solve(nr, nc)) return true;
      }
    }
    // dead end: backtrack
    visited[r][c] = false;
    backtracks++;
    frame(null, [r, c], `(${r}, ${c}) leads to a dead end — backtrack and un-mark it.`, 6);
    return false;
  };

  frame([0, 0], null, `Backtracking: try to walk from the top-left to the bottom-right, undoing moves that dead-end.`, 0);
  if (g[0][0] === 0 || g[n - 1][n - 1] === 0) {
    frame(null, null, `The start or the goal is blocked — no path is possible.`, 1);
    return steps;
  }
  solve(0, 0);
  if (solved) {
    frame(null, null, `Solved! The green cells trace a valid path from start to cheese.`, 7);
  } else if (!truncated) {
    frame(null, null, `Explored every route — the maze has no path from start to goal.`, 7);
  }
  return steps;
}

const TEMPLATES: string[][] = [
  ["1100", "1110", "0110", "0011"],
  ["10000", "11110", "01010", "01110", "00011"],
  ["11000", "01100", "01011", "00010", "00011"],
  ["100000", "110000", "011100", "000110", "000010", "000011"],
  ["1000000", "1110000", "0011000", "0001100", "0000100", "0000110", "0000011"],
];

function templateInput(level: number): Input {
  const t = TEMPLATES[Math.min(level - 1, TEMPLATES.length - 1)];
  return { grid: t.map((row) => row.split("").map(Number)) };
}

const mod: AlgorithmModule<GridFrame, Input> = {
  slug: "rat-in-maze",
  title: "Rat in a Maze",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "maze", "grid", "recursion"],
  summary: "Finds a path through a grid maze from the top-left to the bottom-right using recursive backtracking.",
  renderer: "grid",
  pseudocode: [
    "procedure solve(r, c)",
    "  if out of bounds or blocked or visited: return false",
    "  mark (r,c) visited",
    "  if (r,c) is the goal: return true",
    "  for each direction (down, right, up, left):",
    "    if solve(neighbor): return true",
    "  unmark (r,c)   // backtrack",
    "  return false",
  ],
  code: {
    pseudocode: `solve(r, c):
  if invalid(r,c) or blocked or visited: return false
  visited[r][c] = true
  if goal: return true
  for (dr,dc) in moves:
    if solve(r+dr, c+dc): return true
  visited[r][c] = false   # backtrack
  return false`,
    c: `bool solve(int g[N][N], bool vis[N][N], int r, int c, int n) {
    if (r<0||r>=n||c<0||c>=n||g[r][c]==0||vis[r][c]) return false;
    vis[r][c] = true;
    if (r==n-1 && c==n-1) return true;
    int dr[]={1,0,-1,0}, dc[]={0,1,0,-1};
    for (int k=0;k<4;k++)
        if (solve(g, vis, r+dr[k], c+dc[k], n)) return true;
    vis[r][c] = false;
    return false;
}`,
    cpp: `bool solve(vector<vector<int>>& g, vector<vector<bool>>& vis, int r, int c) {
    int n = g.size();
    if (r<0||r>=n||c<0||c>=n||g[r][c]==0||vis[r][c]) return false;
    vis[r][c] = true;
    if (r==n-1 && c==n-1) return true;
    int dr[]={1,0,-1,0}, dc[]={0,1,0,-1};
    for (int k=0;k<4;k++)
        if (solve(g, vis, r+dr[k], c+dc[k])) return true;
    vis[r][c] = false;
    return false;
}`,
    java: `boolean solve(int[][] g, boolean[][] vis, int r, int c) {
    int n = g.length;
    if (r<0||r>=n||c<0||c>=n||g[r][c]==0||vis[r][c]) return false;
    vis[r][c] = true;
    if (r==n-1 && c==n-1) return true;
    int[] dr={1,0,-1,0}, dc={0,1,0,-1};
    for (int k=0;k<4;k++)
        if (solve(g, vis, r+dr[k], c+dc[k])) return true;
    vis[r][c] = false;
    return false;
}`,
    python: `def solve(g, vis, r, c):
    n = len(g)
    if not (0 <= r < n and 0 <= c < n) or g[r][c] == 0 or vis[r][c]:
        return False
    vis[r][c] = True
    if r == n-1 and c == n-1:
        return True
    for dr, dc in ((1,0),(0,1),(-1,0),(0,-1)):
        if solve(g, vis, r+dr, c+dc):
            return True
    vis[r][c] = False   # backtrack
    return False`,
    javascript: `function solve(g, vis, r, c) {
  const n = g.length;
  if (r<0||r>=n||c<0||c>=n||g[r][c]===0||vis[r][c]) return false;
  vis[r][c] = true;
  if (r===n-1 && c===n-1) return true;
  for (const [dr, dc] of [[1,0],[0,1],[-1,0],[0,-1]])
    if (solve(g, vis, r+dr, c+dc)) return true;
  vis[r][c] = false;
  return false;
}`,
    typescript: `function solve(g: number[][], vis: boolean[][], r: number, c: number): boolean {
  const n = g.length;
  if (r<0||r>=n||c<0||c>=n||g[r][c]===0||vis[r][c]) return false;
  vis[r][c] = true;
  if (r===n-1 && c===n-1) return true;
  for (const [dr, dc] of [[1,0],[0,1],[-1,0],[0,-1]])
    if (solve(g, vis, r+dr, c+dc)) return true;
  vis[r][c] = false;
  return false;
}`,
    csharp: `bool Solve(int[,] g, bool[,] vis, int r, int c) {
    int n = g.GetLength(0);
    if (r<0||r>=n||c<0||c>=n||g[r,c]==0||vis[r,c]) return false;
    vis[r,c] = true;
    if (r==n-1 && c==n-1) return true;
    int[] dr={1,0,-1,0}, dc={0,1,0,-1};
    for (int k=0;k<4;k++)
        if (Solve(g, vis, r+dr[k], c+dc[k])) return true;
    vis[r,c] = false;
    return false;
}`,
    go: `func solve(g [][]int, vis [][]bool, r, c int) bool {
	n := len(g)
	if r < 0 || r >= n || c < 0 || c >= n || g[r][c] == 0 || vis[r][c] {
		return false
	}
	vis[r][c] = true
	if r == n-1 && c == n-1 { return true }
	dirs := [4][2]int{{1, 0}, {0, 1}, {-1, 0}, {0, -1}}
	for _, d := range dirs {
		if solve(g, vis, r+d[0], c+d[1]) { return true }
	}
	vis[r][c] = false
	return false
}`,
    rust: `fn solve(g: &Vec<Vec<i32>>, vis: &mut Vec<Vec<bool>>, r: i32, c: i32) -> bool {
    let n = g.len() as i32;
    if r < 0 || r >= n || c < 0 || c >= n { return false; }
    let (ur, uc) = (r as usize, c as usize);
    if g[ur][uc] == 0 || vis[ur][uc] { return false; }
    vis[ur][uc] = true;
    if r == n - 1 && c == n - 1 { return true; }
    for (dr, dc) in [(1, 0), (0, 1), (-1, 0), (0, -1)] {
        if solve(g, vis, r + dr, c + dc) { return true; }
    }
    vis[ur][uc] = false;
    false
}`,
    kotlin: `fun solve(g: Array<IntArray>, vis: Array<BooleanArray>, r: Int, c: Int): Boolean {
    val n = g.size
    if (r < 0 || r >= n || c < 0 || c >= n || g[r][c] == 0 || vis[r][c]) return false
    vis[r][c] = true
    if (r == n - 1 && c == n - 1) return true
    for ((dr, dc) in listOf(1 to 0, 0 to 1, -1 to 0, 0 to -1))
        if (solve(g, vis, r + dr, c + dc)) return true
    vis[r][c] = false
    return false
}`,
    swift: `func solve(_ g: [[Int]], _ vis: inout [[Bool]], _ r: Int, _ c: Int) -> Bool {
    let n = g.count
    if r < 0 || r >= n || c < 0 || c >= n || g[r][c] == 0 || vis[r][c] { return false }
    vis[r][c] = true
    if r == n - 1 && c == n - 1 { return true }
    for (dr, dc) in [(1, 0), (0, 1), (-1, 0), (0, -1)] {
        if solve(g, &vis, r + dr, c + dc) { return true }
    }
    vis[r][c] = false
    return false
}`,
  },
  content: {
    overview: `Rat in a Maze is a classic backtracking puzzle: given a grid where some cells are open (1) and others are walls (0), find a path for a "rat" from the top-left corner to the bottom-right corner, moving only between adjacent open cells. It is a gentle, visual introduction to the backtracking paradigm — try a move, recurse, and if it leads nowhere, undo it and try another.

The solver performs a depth-first exploration. From the current cell it attempts each direction in turn; a move is legal only if the target is inside the grid, open, and not already on the current path (to avoid cycles). It marks the cell as visited, recurses, and — crucially — if none of the onward moves reach the goal, it un-marks the cell and returns failure. That un-marking is the backtracking step: it frees the cell so a different route can use it later. The first path that reaches the goal is reported; the visited cells still marked at that moment spell out the solution.`,
    howItWorks: [
      "Start at the top-left cell; if it or the goal is a wall, there is no solution.",
      "Mark the current cell as visited (part of the tentative path).",
      "If the current cell is the bottom-right goal, a path is found.",
      "Otherwise try each direction (down, right, up, left) recursively.",
      "If every direction fails, un-mark the current cell (backtrack) and report failure to the caller.",
    ],
    complexity: {
      time: { best: "O(4^(n²)) worst case", average: "depends on maze", worst: "O(4^(n²))" },
      space: "O(n²)",
      notes: "In the worst case each of the n² cells branches up to four ways, giving exponential time, though real mazes prune quickly. Space is O(n²) for the visited grid plus O(n²) recursion depth.",
    },
    applications: [
      "pathfinding puzzles and simple game AI",
      "teaching the backtracking / DFS paradigm",
      "maze generation and solving tools",
      "constraint-satisfaction warm-up before N-Queens/Sudoku",
    ],
    advantages: [
      "Simple, intuitive recursive structure",
      "Guaranteed to find a path if one exists",
      "Naturally explores and prunes dead ends",
      "Easy to extend to count or list all paths",
    ],
    disadvantages: [
      "Exponential worst-case time",
      "Finds *a* path, not necessarily the shortest (use BFS for that)",
      "Deep recursion can overflow the stack on large grids",
      "Redundant exploration without memoization or pruning",
    ],
    commonMistakes: [
      "Forgetting to un-mark a cell on backtrack, blocking valid future paths.",
      "Not checking bounds before indexing the grid.",
      "Allowing revisits and creating infinite loops.",
      "Confusing 'a path' with 'the shortest path' (BFS is needed for shortest).",
    ],
    interviewQuestions: [
      "How would you modify this to find the shortest path instead of any path?",
      "How do you count the total number of distinct paths to the goal?",
      "Why is un-marking on backtrack essential for correctness?",
      "How does restricting moves to only down/right change the complexity?",
      "How would you print the direction sequence (D/R/U/L) of the solution?",
    ],
    summary:
      "Rat in a Maze uses recursive backtracking to find a path from a grid's top-left to bottom-right: mark a cell, recurse in each direction, and un-mark on dead ends. It is the canonical introductory backtracking problem, guaranteed to find a path if one exists.",
    quiz: [
      { question: "Rat in a Maze is solved with which paradigm?", options: ["Greedy", "Backtracking (DFS)", "Dynamic programming", "Divide and conquer"], answer: 1, explanation: "It explores moves recursively and undoes dead ends." },
      { question: "The backtracking step consists of…", options: ["Marking a cell visited", "Un-marking a cell when it leads nowhere", "Adding a wall", "Restarting"], answer: 1, explanation: "Un-marking frees the cell for alternative paths." },
      { question: "Marking cells as visited prevents…", options: ["Reaching the goal", "Infinite loops / revisiting", "Backtracking", "Using recursion"], answer: 1, explanation: "It stops the rat from cycling back onto its own path." },
      { question: "To find the SHORTEST path instead, you'd use…", options: ["The same backtracking", "Breadth-first search", "A stack of walls", "Sorting"], answer: 1, explanation: "BFS explores by distance, yielding the shortest path first." },
      { question: "The worst-case time complexity is…", options: ["O(n²)", "Exponential", "O(n log n)", "O(1)"], answer: 1, explanation: "Branching in up to four directions per cell is exponential in the worst case." },
    ],
  },
  inputFields: [
    { key: "grid", label: "Maze (rows of 0/1)", placeholder: "1100 / 1110 / 0110 / 0011", help: "Rows separated by / or newline; 1 = open, 0 = wall. Square, up to 7×7." },
  ],
  defaultInput: (level) => templateInput(level),
  parseInput: (fields) => {
    const rows = (fields.grid ?? "")
      .split(/[\/\n]+/)
      .map((r) => r.trim())
      .filter(Boolean);
    if (rows.length < 2) throw new Error("Enter at least 2 rows.");
    if (rows.length > 7) throw new Error("Maximum 7 rows.");
    const n = rows.length;
    const grid = rows.map((r) => {
      if (r.length !== n) throw new Error("The maze must be square (rows and columns equal).");
      return r.split("").map((ch) => {
        if (ch !== "0" && ch !== "1") throw new Error("Use only 0 (wall) and 1 (open).");
        return Number(ch);
      });
    });
    return { grid };
  },
  serializeInput: (input) => ({ grid: input.grid.map((r) => r.join("")).join(" / ") }),
  generate,
};

export default mod;
