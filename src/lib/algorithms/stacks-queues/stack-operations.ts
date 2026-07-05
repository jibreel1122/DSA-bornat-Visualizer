import type { AlgorithmModule, CallStackFrame, CallStackItem, Step } from "@/lib/engine/types";

type Op = { kind: "push" | "pop" | "peek"; value?: number };
type Input = { ops: Op[] };

function generate(input: Input): Step<CallStackFrame>[] {
  const steps: Step<CallStackFrame>[] = [];
  const stack: CallStackItem[] = [];
  const output: (string | number)[] = [];
  let pushes = 0;
  let pops = 0;
  let uid = 0;

  const snap = (description: string, codeLine: number, topState?: CallStackItem["state"]) => {
    const shown = stack.map((s, i) => ({ ...s, state: i === stack.length - 1 ? topState ?? s.state : s.state }));
    steps.push({ frame: { stack: shown, output: [...output] }, description, codeLine, counters: { size: stack.length, pushes, pops } });
  };

  snap(`A stack is LIFO: the last item pushed is the first popped.`, 0);

  for (const op of input.ops) {
    if (op.kind === "push") {
      stack.push({ id: `s${uid++}`, label: String(op.value), state: "active" });
      pushes++;
      snap(`push(${op.value}) — new item goes on top.`, 1, "active");
    } else if (op.kind === "pop") {
      if (stack.length === 0) {
        snap(`pop() on empty stack — underflow!`, 2, "special");
      } else {
        const top = stack[stack.length - 1];
        top.state = "swap";
        snap(`pop() removes the top item ${top.label}.`, 2, "swap");
        stack.pop();
        pops++;
        output.push(top.label);
        snap(`Removed ${top.label}. It is now the most recent output.`, 3);
      }
    } else {
      if (stack.length === 0) {
        snap(`peek() on empty stack — nothing to see.`, 4, "special");
      } else {
        snap(`peek() reads the top item ${stack[stack.length - 1].label} without removing it.`, 4, "found");
      }
    }
  }
  snap(`All operations complete. Stack holds ${stack.length} item(s).`, 5);
  return steps;
}

function randomOps(level: number, rng: { int: (a: number, b: number) => number; next: () => number }): Op[] {
  const count = Math.min(14, 5 + level * 2);
  const ops: Op[] = [];
  let size = 0;
  for (let i = 0; i < count; i++) {
    const r = rng.next();
    if (size === 0 || r < 0.55) {
      ops.push({ kind: "push", value: rng.int(1, 99) });
      size++;
    } else if (r < 0.85) {
      ops.push({ kind: "pop" });
      size--;
    } else {
      ops.push({ kind: "peek" });
    }
  }
  return ops;
}

const mod: AlgorithmModule<CallStackFrame, Input> = {
  slug: "stack-operations",
  title: "Stack (LIFO)",
  category: "stacks-queues",
  difficulty: "Beginner",
  tags: ["stack", "LIFO", "O(1) operations"],
  summary: "A last-in-first-out structure supporting push, pop, and peek — each in O(1).",
  renderer: "callstack",
  pseudocode: [
    "structure Stack (LIFO)",
    "  push(x): put x on top",
    "  pop():   remove & return top",
    "  peek():  read top without removing",
    "  isEmpty(): size == 0",
    "// top is the only accessible end",
  ],
  code: {
    pseudocode: `push(x): data[top++] = x
pop():   return data[--top]
peek():  return data[top-1]
isEmpty(): return top == 0`,
    c: `#define MAX 100
int stack[MAX], top = 0;
void push(int x){ stack[top++] = x; }
int pop(){ return stack[--top]; }
int peek(){ return stack[top-1]; }
int is_empty(){ return top == 0; }`,
    cpp: `#include <stack>
std::stack<int> s;
s.push(x);        // push
int t = s.top();  // peek
s.pop();          // pop (removes top)
bool e = s.empty();`,
    java: `Deque<Integer> stack = new ArrayDeque<>();
stack.push(x);          // push
int top = stack.peek(); // peek
stack.pop();            // pop
boolean e = stack.isEmpty();`,
    python: `stack = []
stack.append(x)   # push
top = stack[-1]   # peek
stack.pop()       # pop
empty = not stack`,
    javascript: `const stack = [];
stack.push(x);              // push
const top = stack.at(-1);   // peek
stack.pop();                // pop
const empty = stack.length === 0;`,
    typescript: `const stack: number[] = [];
stack.push(x);              // push
const top = stack.at(-1);   // peek
stack.pop();                // pop
const empty = stack.length === 0;`,
    csharp: `var stack = new Stack<int>();
stack.Push(x);          // push
int top = stack.Peek(); // peek
stack.Pop();            // pop
bool e = stack.Count == 0;`,
    go: `stack := []int{}
stack = append(stack, x)          // push
top := stack[len(stack)-1]        // peek
stack = stack[:len(stack)-1]      // pop
empty := len(stack) == 0`,
    rust: `let mut stack: Vec<i32> = Vec::new();
stack.push(x);                 // push
let top = *stack.last().unwrap(); // peek
stack.pop();                   // pop
let empty = stack.is_empty();`,
    kotlin: `val stack = ArrayDeque<Int>()
stack.addLast(x)          // push
val top = stack.last()    // peek
stack.removeLast()        // pop
val empty = stack.isEmpty()`,
    swift: `var stack: [Int] = []
stack.append(x)      // push
let top = stack.last // peek
stack.removeLast()   // pop
let empty = stack.isEmpty`,
  },
  content: {
    overview: `A stack is a linear data structure with last-in, first-out (LIFO) access: you can only add or remove items at one end, called the top. Think of a stack of plates — you put a new plate on top and take the top one off; you never pull from the middle.

Its three core operations — push (add to top), pop (remove from top), and peek (read the top) — are all O(1). This restricted access is exactly what makes stacks so useful for reversing order, tracking nested structure, and implementing recursion via the call stack.`,
    howItWorks: [
      "push(x) places x on top of the stack, becoming the new top.",
      "pop() removes and returns the current top item.",
      "peek() returns the top item without removing it.",
      "isEmpty() reports whether the stack has any items.",
      "Because only the top is accessible, the most recently added item is always the first removed.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1)", worst: "O(1)" },
      space: "O(n)",
      notes: "push, pop, and peek are all O(1) (amortized O(1) for a dynamic-array backing). Space is O(n) for n stored elements.",
    },
    applications: [
      "Function call management (the call stack) and recursion",
      "Undo/redo history in editors",
      "Expression evaluation and matching parentheses/brackets",
      "Backtracking, DFS, and browser back-navigation",
    ],
    advantages: [
      "All core operations are O(1)",
      "Simple to implement with an array or linked list",
      "Natural fit for nested/recursive and LIFO problems",
      "Low, predictable overhead",
    ],
    disadvantages: [
      "Only the top element is accessible — no random access",
      "Searching requires popping everything (O(n))",
      "Fixed-size array backing can overflow; dynamic arrays add resize cost",
    ],
    commonMistakes: [
      "Popping or peeking an empty stack (underflow) without a guard.",
      "Confusing stack (LIFO) with queue (FIFO) semantics.",
      "Assuming random access to middle elements.",
      "Forgetting to update the top pointer/index on push or pop.",
    ],
    interviewQuestions: [
      "How would you implement a queue using two stacks?",
      "Use a stack to check balanced parentheses in an expression.",
      "How does the call stack implement function recursion?",
      "Design a stack that also returns its minimum in O(1) (min-stack).",
      "Evaluate a postfix (RPN) expression using a stack.",
    ],
    summary:
      "A stack is a LIFO structure with O(1) push, pop, and peek, exposing only its top. It powers recursion (the call stack), undo history, expression parsing, and backtracking — anywhere the most recent item must be handled first.",
    quiz: [
      { question: "A stack follows which ordering discipline?", options: ["FIFO", "LIFO", "Priority", "Random"], answer: 1, explanation: "Last-in, first-out: the most recently pushed item pops first." },
      { question: "What is the time complexity of push and pop?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 0, explanation: "Both operate only at the top, in constant time." },
      { question: "Which operation reads the top without removing it?", options: ["pop", "peek", "push", "poll"], answer: 1, explanation: "peek (or top) inspects the top element in place." },
      { question: "Which problem is a natural fit for a stack?", options: ["Level-order tree traversal", "Matching nested parentheses", "Shortest path", "Round-robin scheduling"], answer: 1, explanation: "Nested/balanced structure maps directly onto LIFO push/pop." },
      { question: "Popping an empty stack causes…", options: ["An overflow", "An underflow", "A resize", "Nothing"], answer: 1, explanation: "Removing from an empty stack is an underflow condition to guard against." },
    ],
  },
  inputFields: [
    { key: "ops", label: "Operations", placeholder: "push 3, push 7, peek, pop, push 5", help: "Comma-separated: push N, pop, peek.", list: true },
  ],
  defaultInput: (level, rng) => ({ ops: randomOps(level, rng) }),
  parseInput: (fields) => {
    const parts = (fields.ops ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("Enter at least one operation, e.g. push 5.");
    if (parts.length > 50) throw new Error("Maximum 50 operations.");
    const ops: Op[] = parts.map((p) => {
      const push = p.match(/^push\s+(-?\d+)$/i);
      if (push) return { kind: "push", value: Number(push[1]) };
      if (/^pop$/i.test(p)) return { kind: "pop" };
      if (/^peek$/i.test(p)) return { kind: "peek" };
      throw new Error(`"${p}" is invalid. Use: push N, pop, or peek.`);
    });
    return { ops };
  },
  serializeInput: (input) => ({ ops: input.ops.map((o) => (o.kind === "push" ? `push ${o.value}` : o.kind)).join(", ") }),
  generate,
};

export default mod;
