import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Input = { values: number[]; popCount: number };

function generate(input: Input): Step<CallStackFrame>[] {
  const steps: Step<CallStackFrame>[] = [];
  let pushes = 0;
  let pops = 0;

  // Each entry caches the minimum of the stack up to and including it.
  const stack: { id: string; val: number; min: number }[] = [];
  let idc = 0;

  const frame = (topState: "active" | "found" | "swap" | undefined, description: string, codeLine: number): void => {
    const items: CallStackItem[] = stack.map((e, i) => ({
      id: e.id,
      label: String(e.val),
      detail: `min ≤ here: ${e.min}`,
      state: i === stack.length - 1 ? topState : undefined,
    }));
    const curMin = stack.length ? stack[stack.length - 1].min : null;
    steps.push({
      frame: {
        stack: items,
        aux: [{ label: "getMin()", values: [curMin === null ? "—" : curMin] }],
        note: `each cell caches the minimum of everything at or below it → getMin() is O(1)`,
      },
      description,
      codeLine,
      counters: { pushes, pops },
    });
  };

  frame(undefined, `A min-stack supports push, pop, and getMin all in O(1) by storing a running minimum alongside each value.`, 0);

  for (const v of input.values) {
    const min = stack.length === 0 ? v : Math.min(v, stack[stack.length - 1].min);
    stack.push({ id: `m${idc++}`, val: v, min });
    pushes++;
    frame(
      "active",
      stack.length === 1
        ? `push(${v}): stack was empty, so min = ${v}.`
        : `push(${v}): min = min(${v}, previous min ${stack[stack.length - 2].min}) = ${min}.`,
      2,
    );
  }

  frame("found", `getMin() reads the top's cached minimum: ${stack.length ? stack[stack.length - 1].min : "—"} — no scan needed.`, 5);

  const times = Math.min(input.popCount, stack.length);
  for (let p = 0; p < times; p++) {
    const top = stack[stack.length - 1];
    frame("swap", `pop(): remove ${top.val}. The new minimum is simply the next cell's cached value.`, 3);
    stack.pop();
    pops++;
    frame(
      undefined,
      stack.length
        ? `Popped ${top.val}. getMin() is now ${stack[stack.length - 1].min} instantly.`
        : `Popped ${top.val}. The stack is empty.`,
      3,
    );
  }

  frame(undefined, `Done. Every push/pop/getMin ran in O(1) thanks to the cached minimums.`, 6);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number; shuffle: <T>(a: readonly T[]) => T[] }): Input {
  const n = Math.min(7, 3 + level);
  const values = Array.from({ length: n }, () => rng.int(1, 40));
  return { values, popCount: Math.min(2, Math.max(1, level - 1)) };
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "min-stack",
  title: "Min-Stack (O(1) minimum)",
  category: "stacks-queues",
  difficulty: "Intermediate",
  tags: ["stack", "design", "O(1)", "auxiliary"],
  summary: "A stack that also returns its minimum in O(1) by caching a running minimum with every pushed value.",
  renderer: "callstack",
  pseudocode: [
    "structure MinStack",
    "  push(v):",
    "    m = stack empty ? v : min(v, top.min)",
    "    stack.push({ val: v, min: m })",
    "  pop(): stack.pop()",
    "  top(): stack.top().val",
    "  getMin(): stack.top().min   // O(1)",
  ],
  code: {
    pseudocode: `push(v): m = empty? v : min(v, top.min); push {v, m}
pop():   stack.pop()
getMin(): return top.min`,
    c: `typedef struct { int val, min; } Entry;
Entry st[1000]; int top = 0;

void push(int v) {
    int m = (top==0) ? v : (v < st[top-1].min ? v : st[top-1].min);
    st[top].val = v; st[top].min = m; top++;
}
void pop(void) { if (top) top--; }
int getMin(void) { return st[top-1].min; }`,
    cpp: `struct MinStack {
    stack<pair<int,int>> st; // {value, min}
    void push(int v) {
        int m = st.empty() ? v : min(v, st.top().second);
        st.push({v, m});
    }
    void pop() { st.pop(); }
    int top() { return st.top().first; }
    int getMin() { return st.top().second; }
};`,
    java: `class MinStack {
    Deque<int[]> st = new ArrayDeque<>(); // {value, min}
    void push(int v) {
        int m = st.isEmpty() ? v : Math.min(v, st.peek()[1]);
        st.push(new int[]{v, m});
    }
    void pop() { st.pop(); }
    int top() { return st.peek()[0]; }
    int getMin() { return st.peek()[1]; }
}`,
    python: `class MinStack:
    def __init__(self):
        self.st = []  # (value, min)
    def push(self, v):
        m = v if not self.st else min(v, self.st[-1][1])
        self.st.append((v, m))
    def pop(self):
        self.st.pop()
    def top(self):
        return self.st[-1][0]
    def get_min(self):
        return self.st[-1][1]`,
    javascript: `class MinStack {
  constructor() { this.st = []; }         // {val, min}
  push(v) {
    const m = this.st.length ? Math.min(v, this.st[this.st.length-1].min) : v;
    this.st.push({ val: v, min: m });
  }
  pop() { this.st.pop(); }
  top() { return this.st[this.st.length-1].val; }
  getMin() { return this.st[this.st.length-1].min; }
}`,
    typescript: `class MinStack {
  private st: { val: number; min: number }[] = [];
  push(v: number): void {
    const m = this.st.length ? Math.min(v, this.st[this.st.length-1].min) : v;
    this.st.push({ val: v, min: m });
  }
  pop(): void { this.st.pop(); }
  top(): number { return this.st[this.st.length-1].val; }
  getMin(): number { return this.st[this.st.length-1].min; }
}`,
    csharp: `class MinStack {
    Stack<(int val, int min)> st = new();
    public void Push(int v) {
        int m = st.Count == 0 ? v : Math.Min(v, st.Peek().min);
        st.Push((v, m));
    }
    public void Pop() { st.Pop(); }
    public int Top() { return st.Peek().val; }
    public int GetMin() { return st.Peek().min; }
}`,
    go: `type entry struct{ val, min int }
type MinStack struct{ st []entry }

func (s *MinStack) Push(v int) {
	m := v
	if len(s.st) > 0 && s.st[len(s.st)-1].min < m { m = s.st[len(s.st)-1].min }
	s.st = append(s.st, entry{v, m})
}
func (s *MinStack) Pop()      { s.st = s.st[:len(s.st)-1] }
func (s *MinStack) Top() int  { return s.st[len(s.st)-1].val }
func (s *MinStack) GetMin() int { return s.st[len(s.st)-1].min }`,
    rust: `struct MinStack { st: Vec<(i32, i32)> } // (val, min)
impl MinStack {
    fn new() -> Self { MinStack { st: vec![] } }
    fn push(&mut self, v: i32) {
        let m = self.st.last().map_or(v, |&(_, mn)| mn.min(v));
        self.st.push((v, m));
    }
    fn pop(&mut self) { self.st.pop(); }
    fn top(&self) -> i32 { self.st.last().unwrap().0 }
    fn get_min(&self) -> i32 { self.st.last().unwrap().1 }
}`,
    kotlin: `class MinStack {
    private val st = ArrayDeque<Pair<Int,Int>>() // (val, min)
    fun push(v: Int) {
        val m = if (st.isEmpty()) v else minOf(v, st.last().second)
        st.addLast(v to m)
    }
    fun pop() { st.removeLast() }
    fun top() = st.last().first
    fun getMin() = st.last().second
}`,
    swift: `struct MinStack {
    private var st: [(val: Int, min: Int)] = []
    mutating func push(_ v: Int) {
        let m = st.isEmpty ? v : Swift.min(v, st.last!.min)
        st.append((v, m))
    }
    mutating func pop() { st.removeLast() }
    func top() -> Int { st.last!.val }
    func getMin() -> Int { st.last!.min }
}`,
  },
  content: {
    overview: `A min-stack is a stack that, in addition to the usual push, pop, and top operations, can return the smallest element currently stored — all in O(1) time. The naive approach of scanning the stack for its minimum on demand would be O(n); the trick is to precompute and cache the minimum as you go.

The key insight is that the minimum of a stack changes only at push and pop, in a perfectly nested way. So each entry stores not just its value but also the minimum of every element at or below it. On push, the new minimum is simply min(new value, previous top's minimum). On pop, the previous minimum is automatically restored — it is cached in the entry that is now on top. Because every operation reads or writes only the top, they are all constant time, at the cost of one extra integer per element.`,
    howItWorks: [
      "Store each stack entry as a pair: the value and the minimum at or below it.",
      "On push(v): compute m = v if the stack is empty, else min(v, current top's min).",
      "Push the pair {value: v, min: m}.",
      "getMin() simply returns the top entry's cached min — no scanning.",
      "On pop(), removing the top automatically exposes the correct previous minimum below it.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1)", worst: "O(1)" },
      space: "O(n)",
      notes: "Every operation (push/pop/top/getMin) is O(1). The extra cached minimum doubles the per-element storage but keeps space at O(n). An alternative keeps a separate 'min stack' that only grows on new minima.",
    },
    applications: [
      "sliding-window minimum / stock-span style problems",
      "implementing a min-queue from two min-stacks",
      "undo systems that must report a running extreme",
      "a classic data-structure design interview question",
    ],
    advantages: [
      "Constant-time minimum retrieval",
      "All other stack operations remain O(1)",
      "Simple to implement with a paired value",
      "Handles duplicates and negative values naturally",
    ],
    disadvantages: [
      "Extra O(n) memory for the cached minima",
      "Only tracks the minimum (a separate structure is needed for max)",
      "Slightly more bookkeeping than a plain stack",
    ],
    commonMistakes: [
      "Recomputing the minimum by scanning, making getMin O(n).",
      "Storing a single min variable, which breaks after popping the current minimum.",
      "Forgetting the empty-stack case on the first push.",
      "Not restoring the previous minimum correctly on pop.",
    ],
    interviewQuestions: [
      "How do you achieve O(1) getMin without scanning the stack?",
      "Why does a single running-min variable fail, and how does per-entry caching fix it?",
      "How would you also support getMax simultaneously?",
      "How can you build a min-queue using two min-stacks?",
      "Can you reduce the extra space when many pushes share the same minimum?",
    ],
    summary:
      "A min-stack caches, with each pushed value, the minimum of all elements at or below it, so push, pop, top, and getMin are all O(1). It trades one extra integer per element for constant-time minimum queries and is a staple data-structure design question.",
    quiz: [
      { question: "A min-stack returns its minimum in…", options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"], answer: 2, explanation: "The minimum is cached, so it's read in constant time." },
      { question: "On push(v), the stored minimum is…", options: ["Always v", "min(v, previous top's min)", "The global average", "v + previous min"], answer: 1, explanation: "It's the smaller of v and the minimum below it." },
      { question: "Why store a min with every entry instead of one variable?", options: ["To save space", "So popping restores the correct previous minimum", "For faster pushes", "It isn't necessary"], answer: 1, explanation: "A single variable can't recover the prior minimum after a pop." },
      { question: "The extra space used is…", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2, explanation: "Each of the n entries caches an extra minimum value." },
      { question: "getMin after popping the current minimum returns…", options: ["An error", "The cached min of the new top", "Zero", "The popped value"], answer: 1, explanation: "The new top already stores the minimum of everything below it." },
    ],
  },
  inputFields: [
    { key: "values", label: "Values to push", placeholder: "5, 2, 7, 1, 9", help: "2–18 numbers, pushed left to right." },
    { key: "popCount", label: "Pops afterward", placeholder: "2", help: "How many to pop at the end (0–8)." },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const values = (fields.values ?? "")
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const v = Number(p);
        if (!Number.isInteger(v)) throw new Error(`"${p}" is not a whole number.`);
        return v;
      });
    if (values.length < 2) throw new Error("Enter at least 2 values.");
    if (values.length > 18) throw new Error("Maximum 18 values.");
    const popCount = Number((fields.popCount ?? "0").trim());
    if (!Number.isInteger(popCount) || popCount < 0 || popCount > 8) throw new Error("Pop count must be 0–8.");
    return { values, popCount };
  },
  serializeInput: (input) => ({ values: input.values.join(", "), popCount: String(input.popCount) }),
  generate,
};

export default mod;
