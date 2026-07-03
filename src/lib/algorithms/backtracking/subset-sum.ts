import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";
import { MAX_STEPS } from "@/lib/engine/types";

type Input = { items: number[]; target: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const items = input.items;
  const target = input.target;
  const n = items.length;
  const chosen: number[] = [];
  const stack: CallStackItem[] = [];
  const steps: Step<CallStackFrame>[] = [];
  let pid = 0;
  let decisions = 0;
  let prunes = 0;
  let truncated = false;
  let found = false;

  // suffix sums for pruning
  const suffix = new Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + items[i];

  const snap = (topState: "active" | "found" | "swap" | "discarded" | undefined, sum: number, description: string, codeLine: number): void => {
    if (steps.length >= MAX_STEPS - 2) {
      truncated = true;
      return;
    }
    const shown = stack.map((it, i) => ({ ...it, state: i === stack.length - 1 ? topState ?? it.state : it.state }));
    steps.push({
      frame: {
        stack: shown,
        output: chosen.length ? chosen.map((x) => x) : [],
        aux: [
          { label: "current sum", values: [sum] },
          { label: "target", values: [target] },
        ],
        note: `subset-sum of [${items.join(", ")}] → ${target} · include or exclude each element, prune impossible branches`,
      },
      description,
      codeLine,
      counters: { decisions, prunes },
    });
  };

  snap(undefined, 0, `Does any subset of [${items.join(", ")}] sum to ${target}? Try include/exclude for each element with pruning.`, 0);

  const solve = (i: number, sum: number): boolean => {
    if (truncated) return false;
    if (sum === target) {
      found = true;
      snap("found", sum, `Sum ${sum} equals the target ${target} — found a subset: {${chosen.join(", ")}}!`, 1);
      return true;
    }
    if (i >= n || sum > target || sum + suffix[i] < target) {
      // prune this branch
      prunes++;
      const reason = sum > target ? `sum ${sum} > ${target}` : i >= n ? `no elements left` : `even taking all remaining can't reach ${target}`;
      snap("discarded", sum, `Dead end: ${reason}. Backtrack.`, 5);
      return false;
    }

    // Branch 1: include items[i]
    chosen.push(items[i]);
    stack.push({ id: `s${pid++}`, label: `include ${items[i]}`, detail: `sum = ${sum + items[i]}`, state: "active" });
    decisions++;
    snap("active", sum + items[i], `Include ${items[i]} → sum becomes ${sum + items[i]}.`, 3);
    if (solve(i + 1, sum + items[i])) return true;
    chosen.pop();
    stack.pop();
    snap("swap", sum, `Backtrack: exclude ${items[i]} instead.`, 4);

    // Branch 2: exclude items[i]
    stack.push({ id: `s${pid++}`, label: `exclude ${items[i]}`, detail: `sum = ${sum}`, state: "active" });
    decisions++;
    snap("active", sum, `Exclude ${items[i]} → sum stays ${sum}.`, 4);
    if (solve(i + 1, sum)) return true;
    stack.pop();
    snap("swap", sum, `Backtrack from excluding ${items[i]}.`, 5);
    return false;
  };

  solve(0, 0);
  stack.length = 0;
  if (found) {
    snap("found", target, `Success: the subset {${chosen.join(", ")}} sums to ${target}.`, 6);
  } else if (!truncated) {
    snap(undefined, 0, `Exhausted all include/exclude choices — no subset sums to ${target}.`, 6);
  }
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(6, 3 + level);
  const items = Array.from({ length: n }, () => rng.int(2, 12));
  // Make the target the sum of a random sub-selection so a solution usually exists.
  const shuffled = rng.shuffle(items.map((_, i) => i));
  const pick = shuffled.slice(0, Math.max(1, Math.floor(n / 2)));
  const target = pick.reduce((s, i) => s + items[i], 0);
  return { items, target };
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "subset-sum",
  title: "Subset Sum (Backtracking)",
  category: "backtracking",
  difficulty: "Intermediate",
  tags: ["backtracking", "recursion", "subset", "pruning"],
  summary: "Decides whether any subset of numbers adds up to a target, exploring include/exclude choices with pruning.",
  renderer: "callstack",
  pseudocode: [
    "procedure solve(i, sum)",
    "  if sum == target: return true (found)",
    "  if i == n or sum > target or sum + rest < target: prune",
    "  // include items[i]",
    "  if solve(i+1, sum + items[i]): return true",
    "  // exclude items[i]",
    "  if solve(i+1, sum): return true",
    "  return false",
  ],
  code: {
    pseudocode: `solve(i, sum):
  if sum == target: return true
  if i==n or sum>target or sum+suffix[i]<target: return false
  if solve(i+1, sum+items[i]): return true   # include
  return solve(i+1, sum)                       # exclude`,
    c: `bool solve(int* a, int n, int i, int sum, int target) {
    if (sum == target) return true;
    if (i == n || sum > target) return false;
    if (solve(a, n, i + 1, sum + a[i], target)) return true;
    return solve(a, n, i + 1, sum, target);
}`,
    cpp: `bool solve(vector<int>& a, int i, int sum, int target) {
    if (sum == target) return true;
    if (i == (int)a.size() || sum > target) return false;
    if (solve(a, i + 1, sum + a[i], target)) return true;
    return solve(a, i + 1, sum, target);
}`,
    java: `boolean solve(int[] a, int i, int sum, int target) {
    if (sum == target) return true;
    if (i == a.length || sum > target) return false;
    if (solve(a, i + 1, sum + a[i], target)) return true;
    return solve(a, i + 1, sum, target);
}`,
    python: `def subset_sum(a, target, i=0, sum_=0):
    if sum_ == target:
        return True
    if i == len(a) or sum_ > target:
        return False
    if subset_sum(a, target, i + 1, sum_ + a[i]):  # include
        return True
    return subset_sum(a, target, i + 1, sum_)       # exclude`,
    javascript: `function subsetSum(a, target, i = 0, sum = 0) {
  if (sum === target) return true;
  if (i === a.length || sum > target) return false;
  if (subsetSum(a, target, i + 1, sum + a[i])) return true;
  return subsetSum(a, target, i + 1, sum);
}`,
    typescript: `function subsetSum(a: number[], target: number, i = 0, sum = 0): boolean {
  if (sum === target) return true;
  if (i === a.length || sum > target) return false;
  if (subsetSum(a, target, i + 1, sum + a[i])) return true;
  return subsetSum(a, target, i + 1, sum);
}`,
    csharp: `bool SubsetSum(int[] a, int target, int i = 0, int sum = 0) {
    if (sum == target) return true;
    if (i == a.Length || sum > target) return false;
    if (SubsetSum(a, target, i + 1, sum + a[i])) return true;
    return SubsetSum(a, target, i + 1, sum);
}`,
    go: `func subsetSum(a []int, target, i, sum int) bool {
	if sum == target { return true }
	if i == len(a) || sum > target { return false }
	if subsetSum(a, target, i+1, sum+a[i]) { return true }
	return subsetSum(a, target, i+1, sum)
}`,
    rust: `fn subset_sum(a: &[i32], target: i32, i: usize, sum: i32) -> bool {
    if sum == target { return true; }
    if i == a.len() || sum > target { return false; }
    if subset_sum(a, target, i + 1, sum + a[i]) { return true; }
    subset_sum(a, target, i + 1, sum)
}`,
    kotlin: `fun subsetSum(a: IntArray, target: Int, i: Int = 0, sum: Int = 0): Boolean {
    if (sum == target) return true
    if (i == a.size || sum > target) return false
    if (subsetSum(a, target, i + 1, sum + a[i])) return true
    return subsetSum(a, target, i + 1, sum)
}`,
    swift: `func subsetSum(_ a: [Int], _ target: Int, _ i: Int = 0, _ sum: Int = 0) -> Bool {
    if sum == target { return true }
    if i == a.count || sum > target { return false }
    if subsetSum(a, target, i + 1, sum + a[i]) { return true }
    return subsetSum(a, target, i + 1, sum)
}`,
  },
  content: {
    overview: `The subset-sum problem asks a simple yes/no question with surprising depth: given a collection of numbers and a target, does some subset add up exactly to that target? For [3, 34, 4, 12, 5, 2] and target 9, the answer is yes (4 + 5). Subset-sum is a classic NP-complete problem — no known algorithm solves it in polynomial time in general — but backtracking with pruning handles small instances well and shows the decision structure clearly.

The backtracking solution walks the elements one by one, and for each makes a binary decision: include it in the running sum, or exclude it. This produces a binary decision tree of depth n. Two pruning rules keep the search tight: if the running sum already exceeds the target, abandon the branch (assuming non-negative numbers); and if even adding all remaining elements cannot reach the target, abandon it too. When the running sum hits the target exactly, a valid subset has been found. Without pruning, the search explores up to 2ⁿ leaves; pruning cuts away large hopeless regions.`,
    howItWorks: [
      "Process elements left to right, tracking the current running sum.",
      "If the running sum equals the target, a qualifying subset has been found.",
      "Prune if the sum exceeds the target, the elements run out, or the remaining total can't reach the target.",
      "Otherwise branch two ways: include the current element (add it) then recurse.",
      "If that fails, exclude the current element and recurse — backtracking between the two choices.",
    ],
    complexity: {
      time: { best: "O(n) with lucky pruning", average: "exponential", worst: "O(2ⁿ)" },
      space: "O(n)",
      notes: "The decision tree has up to 2ⁿ leaves, so the worst case is exponential (subset-sum is NP-complete). Pruning dramatically helps in practice. Recursion depth is O(n). A pseudo-polynomial O(n·target) dynamic program exists for bounded targets.",
    },
    applications: [
      "resource allocation and load balancing to exact capacities",
      "cryptography (knapsack-based schemes) and coin/change problems",
      "partitioning a set into equal-sum groups",
      "verifying combinations sum to a required total",
    ],
    advantages: [
      "Simple binary include/exclude structure",
      "Pruning eliminates large hopeless subtrees",
      "Uses only O(n) extra space",
      "Easily extended to list all qualifying subsets",
    ],
    disadvantages: [
      "Exponential worst-case time (NP-complete problem)",
      "Pruning relies on non-negative numbers",
      "Not viable for large n without the DP alternative",
      "Only answers existence unless extended to collect subsets",
    ],
    commonMistakes: [
      "Applying the sum > target prune when negative numbers are allowed.",
      "Forgetting a base case, causing infinite recursion or index errors.",
      "Not exploring the exclude branch, missing valid subsets.",
      "Confusing subset-sum (any subset) with contiguous subarray sum.",
    ],
    interviewQuestions: [
      "How does the pseudo-polynomial DP for subset-sum work, and when is it preferable?",
      "Why do the pruning rules require non-negative numbers?",
      "How would you list every subset that reaches the target, not just decide existence?",
      "How is subset-sum related to the partition and knapsack problems?",
      "Why is subset-sum NP-complete despite the simple recurrence?",
    ],
    summary:
      "Subset-sum decides whether any subset reaches a target by branching include/exclude on each element with pruning. It is NP-complete (worst-case O(2ⁿ)) but pruning makes small instances fast, and a pseudo-polynomial O(n·target) DP exists for bounded targets.",
    quiz: [
      { question: "At each element, subset-sum backtracking chooses to…", options: ["Sort or not", "Include or exclude it", "Double or halve it", "Reverse the list"], answer: 1, explanation: "Each element is either added to the running sum or skipped." },
      { question: "Subset-sum is classified as…", options: ["O(n log n)", "NP-complete", "Always linear", "Constant time"], answer: 1, explanation: "No known polynomial-time general algorithm exists." },
      { question: "A valid pruning rule (non-negative numbers) is…", options: ["Stop when sum > target", "Stop when sum is even", "Never prune", "Stop at the first element"], answer: 0, explanation: "Exceeding the target can never be undone with non-negative numbers." },
      { question: "The worst-case number of leaves explored is about…", options: ["n", "n²", "2ⁿ", "n!"], answer: 2, explanation: "Each element doubles the branches, giving up to 2ⁿ." },
      { question: "A pseudo-polynomial alternative runs in…", options: ["O(n·target)", "O(2ⁿ)", "O(n log n)", "O(target²)"], answer: 0, explanation: "The DP over sums up to target costs O(n·target)." },
    ],
  },
  inputFields: [
    { key: "items", label: "Numbers", placeholder: "3, 34, 4, 12, 5, 2", help: "2–6 positive integers." },
    { key: "target", label: "Target sum", placeholder: "9", help: "The sum to reach." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const items = (fields.items ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v) || v < 1) throw new Error(`"${p}" must be a positive whole number.`);
        return v;
      });
    if (items.length < 2) throw new Error("Enter at least 2 numbers.");
    if (items.length > 6) throw new Error("Maximum 6 numbers.");
    const target = Number((fields.target ?? "").trim());
    if (!Number.isInteger(target) || target < 1) throw new Error("Target must be a positive whole number.");
    return { items, target };
  },
  serializeInput: (input) => ({ items: input.items.join(", "), target: String(input.target) }),
  generate,
};

export default mod;
