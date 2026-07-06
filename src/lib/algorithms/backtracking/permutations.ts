import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { items: (string | number)[] };

function generate(input: Input): Step<CallStackFrame>[] {
  const items = input.items;
  const n = items.length;
  const used = new Array(n).fill(false);
  const current: (string | number)[] = [];
  const output: string[] = [];
  const stack: CallStackItem[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let pid = 0;
  let placements = 0;
  let backtracks = 0;
  let truncated = false;

  const snap = (topState: "active" | "found" | "swap" | undefined, description: string, codeLine: number): void => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    const shown = stack.map((it, i) => ({ ...it, state: i === stack.length - 1 ? topState ?? it.state : it.state }));
    steps.push({
      frame: {
        stack: shown,
        output: output.map((o) => o),
        aux: [{ label: "current", values: current.length ? current.map((x) => x) : ["(empty)"] }],
        note: `permute [${items.join(", ")}] — place one unused element at each depth, backtrack after`,
      },
      description,
      codeLine,
      counters: { placements, permutations: output.length, backtracks },
    });
  };

  snap(undefined, `Generate all ${n}! = ${factorial(n)} permutations of [${items.join(", ")}] by choosing an unused element at each level.`, 0);

  const recurse = (depth: number): void => {
    if (truncated) return;
    if (depth === n) {
      output.push(current.join(""));
      snap("found", `Depth ${depth}: all elements placed → permutation "${current.join("")}" recorded.`, 2);
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(items[i]);
      const id = `p${pid++}`;
      stack.push({ id, label: `place ${items[i]}`, detail: `[${current.join(" ")}]`, state: "active" });
      placements++;
      snap("active", `Depth ${depth}: place ${items[i]} → current = [${current.join(" ")}].`, 4);
      recurse(depth + 1);
      // backtrack
      current.pop();
      used[i] = false;
      stack.pop();
      backtracks++;
      snap("swap", `Backtrack: remove ${items[i]}, try the next unused element.`, 6);
    }
  };

  recurse(0);
  stack.length = 0;
  snap(undefined, `Done. All ${output.length} permutations: ${output.join(", ")}.`, 7);
  return steps;
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function randomInput(level: number, rng: { shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const size = Math.min(4, 3 + Math.floor((level - 1) / 2)); // 3 or 4
  const pool = ["A", "B", "C", "D"].slice(0, size);
  return { items: rng.shuffle(pool) };
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "permutations",
  title: "Permutations (Backtracking)",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "recursion", "permutations", "combinatorics"],
  summary: "Generates every ordering of a set by placing each unused element at the next position and backtracking.",
  renderer: "callstack",
  pseudocode: [
    "procedure permute(current)",
    "  if current.length == n:",
    "    output current; return",
    "  for each element e not yet used:",
    "    choose e (mark used, append)",
    "    permute(current)",
    "    un-choose e (mark unused, remove)  // backtrack",
  ],
  code: {
    pseudocode: `permute(current):
  if len(current) == n: output(current); return
  for e in items where not used[e]:
    used[e]=true; current.push(e)
    permute(current)
    current.pop(); used[e]=false   # backtrack`,
    c: `void permute(int* a, int n, bool* used, int* cur, int depth) {
    if (depth == n) { printArr(cur, n); return; }
    for (int i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = true; cur[depth] = a[i];
        permute(a, n, used, cur, depth + 1);
        used[i] = false;
    }
}`,
    cpp: `void permute(vector<int>& a, vector<bool>& used, vector<int>& cur, vector<vector<int>>& out) {
    if (cur.size() == a.size()) { out.push_back(cur); return; }
    for (int i = 0; i < (int)a.size(); i++) {
        if (used[i]) continue;
        used[i] = true; cur.push_back(a[i]);
        permute(a, used, cur, out);
        cur.pop_back(); used[i] = false;
    }
}`,
    java: `void permute(int[] a, boolean[] used, List<Integer> cur, List<List<Integer>> out) {
    if (cur.size() == a.length) { out.add(new ArrayList<>(cur)); return; }
    for (int i = 0; i < a.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.add(a[i]);
        permute(a, used, cur, out);
        cur.remove(cur.size() - 1); used[i] = false;
    }
}`,
    python: `def permute(items):
    out, used, cur = [], [False] * len(items), []
    def backtrack():
        if len(cur) == len(items):
            out.append(cur[:]); return
        for i, e in enumerate(items):
            if used[i]: continue
            used[i] = True; cur.append(e)
            backtrack()
            cur.pop(); used[i] = False
    backtrack()
    return out`,
    javascript: `function permute(items) {
  const out = [], used = Array(items.length).fill(false), cur = [];
  (function backtrack() {
    if (cur.length === items.length) { out.push([...cur]); return; }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(items[i]);
      backtrack();
      cur.pop(); used[i] = false;
    }
  })();
  return out;
}`,
    typescript: `function permute<T>(items: T[]): T[][] {
  const out: T[][] = [], used = Array(items.length).fill(false), cur: T[] = [];
  (function backtrack() {
    if (cur.length === items.length) { out.push([...cur]); return; }
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(items[i]);
      backtrack();
      cur.pop(); used[i] = false;
    }
  })();
  return out;
}`,
    csharp: `void Permute(int[] a, bool[] used, List<int> cur, List<List<int>> outp) {
    if (cur.Count == a.Length) { outp.Add(new List<int>(cur)); return; }
    for (int i = 0; i < a.Length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.Add(a[i]);
        Permute(a, used, cur, outp);
        cur.RemoveAt(cur.Count - 1); used[i] = false;
    }
}`,
    go: `func permute(a []int, used []bool, cur []int, out *[][]int) {
	if len(cur) == len(a) {
		cp := make([]int, len(cur)); copy(cp, cur)
		*out = append(*out, cp); return
	}
	for i := range a {
		if used[i] { continue }
		used[i] = true
		permute(a, used, append(cur, a[i]), out)
		used[i] = false
	}
}`,
    rust: `fn permute(items: &[i32], used: &mut Vec<bool>, cur: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    if cur.len() == items.len() { out.push(cur.clone()); return; }
    for i in 0..items.len() {
        if used[i] { continue; }
        used[i] = true; cur.push(items[i]);
        permute(items, used, cur, out);
        cur.pop(); used[i] = false;
    }
}`,
    kotlin: `fun permute(a: IntArray, used: BooleanArray, cur: MutableList<Int>, out: MutableList<List<Int>>) {
    if (cur.size == a.size) { out.add(ArrayList(cur)); return }
    for (i in a.indices) {
        if (used[i]) continue
        used[i] = true; cur.add(a[i])
        permute(a, used, cur, out)
        cur.removeAt(cur.size - 1); used[i] = false
    }
}`,
    swift: `func permute(_ a: [Int], _ used: inout [Bool], _ cur: inout [Int], _ out: inout [[Int]]) {
    if cur.count == a.count { out.append(cur); return }
    for i in a.indices {
        if used[i] { continue }
        used[i] = true; cur.append(a[i])
        permute(a, &used, &cur, &out)
        cur.removeLast(); used[i] = false
    }
}`,
  },
  content: {
    overview: `Generating all permutations of a set means listing every possible ordering of its elements. A set of n distinct items has n! permutations — 6 for three items, 24 for four, 120 for five — so the output grows explosively. Backtracking is the natural way to enumerate them all without repetition.

The algorithm builds a permutation one position at a time. At each level of recursion it picks an element that has not yet been used, appends it to the current sequence, and recurses to fill the next position. When the sequence reaches length n, it is a complete permutation and gets recorded. The crucial move happens on the way back up: after recursing, the algorithm removes the element and marks it unused again — backtracking — so that the same position can be filled with a different choice. This "choose → explore → un-choose" rhythm is the essence of backtracking and reappears in N-Queens, subsets, and Sudoku.`,
    howItWorks: [
      "Keep a 'used' flag per element and a growing 'current' sequence.",
      "If current has length n, it is a full permutation — record it and return.",
      "Otherwise loop over all elements; skip any already used.",
      "Choose an unused element: mark it used and append it, then recurse.",
      "After recursing, un-choose it (unmark, remove) so the next choice can be tried — this is the backtrack.",
    ],
    complexity: {
      time: { best: "O(n·n!)", average: "O(n·n!)", worst: "O(n·n!)" },
      space: "O(n)",
      notes: "There are n! permutations and copying each of length n costs O(n), giving O(n·n!) total. Recursion depth and the used/current arrays use O(n) auxiliary space (excluding the output).",
    },
    applications: [
      "brute-force search over all orderings (e.g. small TSP)",
      "generating test cases and exhaustive schedules",
      "anagram and word-arrangement problems",
      "teaching the choose/explore/un-choose backtracking template",
    ],
    advantages: [
      "Enumerates every ordering exactly once",
      "Simple, uniform recursive template",
      "Uses only O(n) extra space beyond the output",
      "Easily adapted to permutations with constraints or duplicates",
    ],
    disadvantages: [
      "Output size n! is unavoidably exponential-plus",
      "Impractical beyond ~10–11 elements",
      "Naive version mishandles duplicate elements (repeats)",
      "Deep recursion for large n",
    ],
    commonMistakes: [
      "Forgetting to un-mark the element on backtrack, producing missing/incorrect permutations.",
      "Storing references to 'current' instead of copies, so all outputs alias the same list.",
      "Not skipping used elements, generating invalid sequences.",
      "Ignoring duplicate handling when the input has repeats.",
    ],
    interviewQuestions: [
      "How do you generate permutations when the input contains duplicates?",
      "How would you produce the next permutation in lexicographic order in place?",
      "Why must you copy the current sequence when recording it?",
      "What is the time complexity, and why the extra factor of n?",
      "How does the choose/explore/un-choose pattern generalize to other backtracking problems?",
    ],
    summary:
      "Permutation generation via backtracking places each unused element at the next position, recurses, and un-chooses on the way back, enumerating all n! orderings in O(n·n!) time. It is the archetypal choose/explore/un-choose backtracking template.",
    quiz: [
      { question: "How many permutations does a set of n distinct items have?", options: ["n²", "2^n", "n!", "n log n"], answer: 2, explanation: "Each ordering is counted once, giving n factorial." },
      { question: "The backtracking step in permutation generation is…", options: ["Recording the permutation", "Un-choosing an element after recursing", "Sorting the array", "Skipping the first element"], answer: 1, explanation: "Removing and unmarking the element lets other choices fill that slot." },
      { question: "Why copy 'current' when recording a permutation?", options: ["For speed", "Otherwise every stored result aliases the same mutating list", "To sort it", "It isn't necessary"], answer: 1, explanation: "Without a copy, later mutations corrupt previously stored results." },
      { question: "The time complexity is…", options: ["O(n!)", "O(n·n!)", "O(2^n)", "O(n²)"], answer: 1, explanation: "n! permutations each cost O(n) to build/copy." },
      { question: "The 'used' flags exist to…", options: ["Count permutations", "Avoid reusing an element within one permutation", "Sort elements", "Save memory"], answer: 1, explanation: "They ensure each element appears exactly once per ordering." },
    ],
  },
  inputFields: [
    { key: "items", label: "Elements (distinct)", placeholder: "A, B, C", help: "2–5 distinct symbols or numbers.", list: true },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const items = (fields.items ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (items.length < 2) throw new Error("Enter at least 2 elements.");
    if (items.length > 5) throw new Error("Maximum 5 elements (5! = 120 permutations) to keep the step-by-step trace bounded.");
    if (new Set(items).size !== items.length) throw new Error("Elements must be distinct.");
    return { items };
  },
  serializeInput: (input) => ({ items: input.items.join(", ") }),
  generate,
};

export default mod;
