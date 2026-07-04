import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { items: (string | number)[]; k: number };

function nCk(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

function generate(input: Input): Step<CallStackFrame>[] {
  const { items, k } = input;
  const n = items.length;
  const current: (string | number)[] = [];
  const output: string[] = [];
  const stack: CallStackItem[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let pid = 0;
  let calls = 0;
  let truncated = false;

  const snap = (topState: CallStackItem["state"], description: string, codeLine: number): void => {
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
        note: `C(${n}, ${k}) — choose ${k} of [${items.join(", ")}] with start-index pruning to avoid duplicates.`,
      },
      description,
      codeLine,
      counters: { calls, combinations: output.length },
    });
  };

  snap(undefined, `Generate all C(${n}, ${k}) = ${nCk(n, k)} combinations of [${items.join(", ")}] taken ${k} at a time — order doesn't matter, so we only ever move the start index forward.`, 0);

  const recurse = (start: number): void => {
    if (truncated) return;
    calls++;
    if (current.length === k) {
      output.push(`{${current.join(", ")}}`);
      snap("found", `${k} elements chosen → record combination {${current.join(", ")}}.`, 1);
      return;
    }
    if (n - start < k - current.length) {
      snap("discarded", `Only ${n - start} elements remain but ${k - current.length} more are needed — prune this branch.`, 2);
      return;
    }
    for (let i = start; i < n; i++) {
      if (truncated) return;
      current.push(items[i]);
      const id = `c${pid++}`;
      stack.push({ id, label: `choose ${items[i]}`, detail: `{${current.join(", ")}}`, state: "active" });
      snap("active", `Choose items[${i}] = ${items[i]} → current = {${current.join(", ")}}.`, 3);
      recurse(i + 1);
      current.pop();
      stack.pop();
      snap("swap", `Backtrack: remove ${items[i]}, try the next candidate after index ${i}.`, 4);
    }
  };

  recurse(0);
  stack.length = 0;
  snap(undefined, `Done. All ${output.length} combinations: ${output.join(", ")}.`, 5);
  return steps;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "combinations",
  title: "Combinations (C(n,k) by Backtracking)",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "combinatorics", "pruning", "C(n,k)"],
  summary: "Generates every k-element subset of n items using a start-index that only moves forward, so each combination is produced exactly once.",
  renderer: "callstack",
  pseudocode: [
    "procedure combine(start, current)",
    "  call combine(start)",
    "  if |current| == k: record current; return       // base case",
    "  if remaining items < needed: return              // prune",
    "  for i = start .. n-1:",
    "    current.push(items[i]); combine(i+1)",
    "    current.pop()                                  // backtrack",
  ],
  code: {
    pseudocode: `procedure combine(start, current):
  if len(current) == k: output.append(copy of current); return
  if n - start < k - len(current): return   // prune: not enough left
  for i = start to n-1:
    current.push(items[i])
    combine(i + 1, current)
    current.pop()`,
    c: `void combine(int* items, int n, int k, int start, int* cur, int depth) {
    if (depth == k) { printSet(cur, depth); return; }
    if (n - start < k - depth) return;
    for (int i = start; i < n; i++) {
        cur[depth] = items[i];
        combine(items, n, k, i + 1, cur, depth + 1);
    }
}`,
    cpp: `void combine(const vector<int>& items, int k, int start, vector<int>& cur, vector<vector<int>>& out) {
    if ((int)cur.size() == k) { out.push_back(cur); return; }
    int n = items.size();
    if (n - start < k - (int)cur.size()) return;
    for (int i = start; i < n; i++) {
        cur.push_back(items[i]);
        combine(items, k, i + 1, cur, out);
        cur.pop_back();
    }
}`,
    java: `static void combine(int[] items, int k, int start, List<Integer> cur, List<List<Integer>> out) {
    if (cur.size() == k) { out.add(new ArrayList<>(cur)); return; }
    int n = items.length;
    if (n - start < k - cur.size()) return;
    for (int i = start; i < n; i++) {
        cur.add(items[i]);
        combine(items, k, i + 1, cur, out);
        cur.remove(cur.size() - 1);
    }
}`,
    python: `def combinations(items: list, k: int) -> list[list]:
    out = []
    n = len(items)
    def combine(start, current):
        if len(current) == k:
            out.append(current[:])
            return
        if n - start < k - len(current):
            return
        for i in range(start, n):
            current.append(items[i])
            combine(i + 1, current)
            current.pop()
    combine(0, [])
    return out`,
    javascript: `function combinations(items, k) {
  const out = [];
  const n = items.length;
  const current = [];
  function combine(start) {
    if (current.length === k) { out.push([...current]); return; }
    if (n - start < k - current.length) return;
    for (let i = start; i < n; i++) {
      current.push(items[i]);
      combine(i + 1);
      current.pop();
    }
  }
  combine(0);
  return out;
}`,
    typescript: `function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const n = items.length;
  const current: T[] = [];
  function combine(start: number): void {
    if (current.length === k) { out.push([...current]); return; }
    if (n - start < k - current.length) return;
    for (let i = start; i < n; i++) {
      current.push(items[i]);
      combine(i + 1);
      current.pop();
    }
  }
  combine(0);
  return out;
}`,
    csharp: `static void Combine(int[] items, int k, int start, List<int> cur, List<List<int>> outp) {
    if (cur.Count == k) { outp.Add(new List<int>(cur)); return; }
    int n = items.Length;
    if (n - start < k - cur.Count) return;
    for (int i = start; i < n; i++) {
        cur.Add(items[i]);
        Combine(items, k, i + 1, cur, outp);
        cur.RemoveAt(cur.Count - 1);
    }
}`,
    go: `func combine(items []int, k, start int, cur []int, out *[][]int) {
	if len(cur) == k {
		cp := append([]int{}, cur...)
		*out = append(*out, cp)
		return
	}
	n := len(items)
	if n-start < k-len(cur) {
		return
	}
	for i := start; i < n; i++ {
		combine(items, k, i+1, append(cur, items[i]), out)
	}
}`,
    rust: `fn combine(items: &[i32], k: usize, start: usize, current: &mut Vec<i32>, out: &mut Vec<Vec<i32>>) {
    if current.len() == k {
        out.push(current.clone());
        return;
    }
    let n = items.len();
    if n - start < k - current.len() {
        return;
    }
    for i in start..n {
        current.push(items[i]);
        combine(items, k, i + 1, current, out);
        current.pop();
    }
}`,
    kotlin: `fun combine(items: List<Int>, k: Int, start: Int, current: MutableList<Int>, out: MutableList<List<Int>>) {
    if (current.size == k) { out.add(current.toList()); return }
    val n = items.size
    if (n - start < k - current.size) return
    for (i in start until n) {
        current.add(items[i])
        combine(items, k, i + 1, current, out)
        current.removeAt(current.size - 1)
    }
}`,
    swift: `func combine(_ items: [Int], _ k: Int, _ start: Int, _ current: inout [Int], _ out: inout [[Int]]) {
    if current.count == k { out.append(current); return }
    let n = items.count
    if n - start < k - current.count { return }
    for i in start..<n {
        current.append(items[i])
        combine(items, k, i + 1, &current, &out)
        current.removeLast()
    }
}`,
  },
  content: {
    overview: `Generating all k-element combinations of n items is superficially similar to permutations, but with one crucial difference: order doesn't matter, so {A, B} and {B, A} are the same combination and must only be produced once. The clean way to enforce that is a start index that only ever moves forward — at each recursive call, only consider elements at or after the previous choice, so every combination is built with its elements in a single canonical (increasing-index) order.

This also enables a natural pruning rule: if the number of remaining candidates (n − start) is smaller than the number of elements still needed (k − |current|), that branch can never reach a valid combination, so it's cut immediately rather than explored to a dead end. The result is a clean backtracking search that visits exactly the C(n, k) valid combinations, plus a bounded number of pruned dead branches.`,
    howItWorks: [
      "Recurse with a start index and a partially built current combination.",
      "Base case: when current has k elements, record a copy of it as one complete combination.",
      "Pruning: if fewer than k − |current| candidates remain (n − start too small), abandon this branch immediately.",
      "Otherwise, for each index i from start to n−1: add items[i] to current, recurse with start = i + 1 (never revisiting earlier indices), then remove items[i] (backtrack) before trying the next i.",
      "Because the start index only advances, no combination is ever generated in more than one relative order — each of the C(n, k) results appears exactly once.",
    ],
    complexity: {
      time: { best: "O(C(n,k))", average: "O(C(n,k) · k)", worst: "O(C(n,k) · k)" },
      space: "O(k)",
      notes: "There are exactly C(n, k) = n!/(k!(n−k)!) combinations; each takes O(k) to copy into the output, giving O(C(n,k)·k) total work. The pruning rule discards dead branches without full exploration, keeping the search close to output-sensitive.",
    },
    applications: [
      "Choosing committees, teams, or lottery number sets",
      "Feature/subset selection when only combinations of a fixed size matter",
      "Enumerating candidate solutions in combinatorial optimization (before scoring/filtering)",
      "Generating test cases that cover all k-way parameter combinations",
    ],
    advantages: [
      "The start-index trick avoids ever generating a duplicate combination — no post-hoc deduplication needed",
      "Simple pruning rule cuts hopeless branches early",
      "Directly generalizes to combinations with repetition or constrained variants",
    ],
    disadvantages: [
      "C(n, k) can be enormous (peaks at k = n/2), making the full enumeration infeasible for large n",
      "Storing all combinations uses O(C(n,k) · k) memory if not processed lazily",
      "Choosing k close to n/2 maximizes both the count and the work — no way around the combinatorial explosion",
    ],
    commonMistakes: [
      "Recursing with start = 0 instead of i + 1 — this regenerates permutations of the same combination instead of unique combinations.",
      "Forgetting the prune check, wasting time exploring branches that can never reach size k.",
      "Off-by-one in the prune condition (n − start < k − |current|) — get this backwards and correct branches get cut.",
      "Confusing combinations (order doesn't matter) with permutations (order matters) when deciding which recursion template to use.",
    ],
    interviewQuestions: [
      "Why does using a start index (rather than a used[] array) prevent duplicate combinations?",
      "Derive the pruning condition and explain why it's safe to cut those branches.",
      "How would this change to generate combinations with repetition allowed?",
      "Compare the recursion structure here to the permutations algorithm — what's different and why?",
      "How many total recursive calls does this make in terms of n and k?",
    ],
    summary:
      "Combinations are generated by recursing with a forward-only start index — each call only considers items at or after the last chosen one — so every C(n, k) combination is produced exactly once with no duplicates. A simple 'not enough elements remain' pruning rule cuts dead branches early, keeping the search efficient relative to the output size.",
    quiz: [
      { question: "Why does the recursion pass i + 1 (not 0) as the next start index?", options: ["To make it faster", "So each combination is only generated once, in increasing-index order", "It's required for the base case", "To handle duplicates in input"], answer: 1, explanation: "Restricting future choices to indices after the current one prevents {A,B} and {B,A} from both being generated." },
      { question: "The pruning condition checks whether…", options: ["current is empty", "n − start < k − |current| (not enough elements remain)", "k equals n", "items are sorted"], answer: 1, explanation: "If fewer candidates remain than slots still needed, this branch can never produce a valid combination." },
      { question: "How many combinations does C(n, k) backtracking ultimately produce?", options: ["n!", "2ⁿ", "C(n, k) = n! / (k!(n−k)!)", "n·k"], answer: 2, explanation: "That's the exact count of k-element subsets of an n-element set, with no duplicates and no omissions." },
      { question: "Combinations differ from permutations in that…", options: ["Combinations use more memory always", "Order doesn't matter for combinations, but does for permutations", "Combinations don't use recursion", "There's no difference"], answer: 1, explanation: "{A,B} and {B,A} are the same combination but two different permutations." },
      { question: "What must happen after the recursive call inside the for-loop?", options: ["Nothing", "Pop the just-added element off current (backtrack)", "Sort current", "Return immediately"], answer: 1, explanation: "Without popping, the next iteration's current would incorrectly include the previous element too." },
    ],
  },
  inputFields: [
    { key: "items", label: "Elements (distinct)", placeholder: "A, B, C, D", help: "3–6 distinct symbols or numbers." },
    { key: "k", label: "Choose k", placeholder: "2", help: "1 to the number of elements." },
  ],
  defaultInput: (level, rng) => {
    const pools: (string | number)[][] = [
      ["A", "B", "C"],
      ["A", "B", "C", "D"],
      [1, 2, 3, 4, 5],
      ["A", "B", "C", "D", "E"],
      ["A", "B", "C", "D", "E", "F"],
    ];
    const items = pools[Math.min(level, 5) - 1] ?? pools[1];
    const k = rng.int(2, Math.max(2, items.length - 1));
    return { items, k };
  },
  parseInput: (fields) => {
    const raw = (fields.items ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (raw.length < 3 || raw.length > 6) throw new Error("Enter 3 to 6 distinct elements.");
    if (new Set(raw).size !== raw.length) throw new Error("Elements must be distinct.");
    const items = raw.map((s) => (/^-?\d+$/.test(s) ? Number(s) : s));
    const k = Number((fields.k ?? "").trim());
    if (!Number.isInteger(k) || k < 1 || k > items.length) throw new Error(`k must be an integer between 1 and ${items.length}.`);
    return { items, k };
  },
  serializeInput: (input) => ({ items: input.items.join(", "), k: String(input.k) }),
  generate,
};

export default mod;
