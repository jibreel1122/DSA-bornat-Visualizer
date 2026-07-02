import type { AlgorithmModule, CellState, ListFrame, Step } from "@/lib/engine/types";

type Op = { kind: "enqueue" | "dequeue" | "front"; value?: number };
type Input = { ops: Op[] };

function generate(input: Input): Step<ListFrame>[] {
  const steps: Step<ListFrame>[] = [];
  const items: { id: string; value: number }[] = [];
  const output: (string | number)[] = [];
  let enqueues = 0;
  let dequeues = 0;
  let uid = 0;

  const frame = (states: Record<string, CellState>, description: string, codeLine: number): void => {
    const nodes = items.map((it) => ({ id: it.id, value: it.value }));
    const links = items.slice(1).map((it, i) => ({ from: items[i].id, to: it.id, kind: "next" as const }));
    const pointers: { nodeId: string | null; label: string }[] = [];
    if (items.length) {
      pointers.push({ nodeId: items[0].id, label: "front" });
      pointers.push({ nodeId: items[items.length - 1].id, label: "rear" });
    }
    steps.push({
      frame: { nodes, links, pointers, states: { ...states }, aux: [{ label: "Dequeued", values: [...output] }] },
      description,
      codeLine,
      counters: { size: items.length, enqueues, dequeues },
    });
  };

  frame({}, `A queue is FIFO: items leave from the front in the order they arrived at the rear.`, 0);

  for (const op of input.ops) {
    if (op.kind === "enqueue") {
      const node = { id: `q${uid++}`, value: op.value! };
      items.push(node);
      enqueues++;
      frame({ [node.id]: "active" }, `enqueue(${op.value}) — added at the rear.`, 1);
    } else if (op.kind === "dequeue") {
      if (items.length === 0) {
        frame({}, `dequeue() on empty queue — underflow!`, 2);
      } else {
        const removed = items[0];
        frame({ [removed.id]: "swap" }, `dequeue() removes the front item ${removed.value}.`, 2);
        items.shift();
        dequeues++;
        output.push(removed.value);
        frame({}, `Removed ${removed.value}; the next item is now at the front.`, 3);
      }
    } else {
      if (items.length === 0) frame({}, `front() on empty queue — nothing there.`, 4);
      else frame({ [items[0].id]: "found" }, `front() reads ${items[0].value} without removing it.`, 4);
    }
  }
  frame({}, `Done. Queue holds ${items.length} item(s).`, 5);
  return steps;
}

function randomOps(level: number, rng: { int: (a: number, b: number) => number; next: () => number }): Op[] {
  const count = Math.min(14, 5 + level * 2);
  const ops: Op[] = [];
  let size = 0;
  for (let i = 0; i < count; i++) {
    const r = rng.next();
    if (size === 0 || r < 0.55) {
      ops.push({ kind: "enqueue", value: rng.int(1, 99) });
      size++;
    } else if (r < 0.85) {
      ops.push({ kind: "dequeue" });
      size--;
    } else {
      ops.push({ kind: "front" });
    }
  }
  return ops;
}

const mod: AlgorithmModule<ListFrame, Input> = {
  slug: "queue-operations",
  title: "Queue (FIFO)",
  category: "stacks-queues",
  difficulty: "Beginner",
  tags: ["queue", "FIFO", "O(1) operations"],
  summary: "A first-in-first-out structure supporting enqueue at the rear and dequeue from the front in O(1).",
  renderer: "list",
  pseudocode: [
    "structure Queue (FIFO)",
    "  enqueue(x): add x at the rear",
    "  dequeue():  remove & return the front",
    "  front():    read the front element",
    "  isEmpty():  size == 0",
    "// front and rear are the two ends",
  ],
  code: {
    pseudocode: `enqueue(x): rear++; data[rear] = x
dequeue():  x = data[front]; front++; return x
front():    return data[front]
isEmpty():  return front > rear`,
    c: `#define MAX 100
int q[MAX], front = 0, rear = 0;
void enqueue(int x){ q[rear++] = x; }
int dequeue(){ return q[front++]; }
int peek_front(){ return q[front]; }
int is_empty(){ return front == rear; }`,
    cpp: `#include <queue>
std::queue<int> q;
q.push(x);            // enqueue
int f = q.front();    // front
q.pop();              // dequeue
bool e = q.empty();`,
    java: `Queue<Integer> q = new LinkedList<>();
q.add(x);              // enqueue
int f = q.peek();      // front
q.poll();              // dequeue
boolean e = q.isEmpty();`,
    python: `from collections import deque
q = deque()
q.append(x)     # enqueue
f = q[0]        # front
q.popleft()     # dequeue
empty = not q`,
    javascript: `const q = [];
q.push(x);            // enqueue
const f = q[0];       // front
q.shift();            // dequeue (O(n) with array; use a deque for O(1))
const empty = q.length === 0;`,
    typescript: `const q: number[] = [];
q.push(x);            // enqueue
const f = q[0];       // front
q.shift();            // dequeue
const empty = q.length === 0;`,
    csharp: `var q = new Queue<int>();
q.Enqueue(x);          // enqueue
int f = q.Peek();      // front
q.Dequeue();           // dequeue
bool e = q.Count == 0;`,
    go: `q := []int{}
q = append(q, x)   // enqueue
f := q[0]          // front
q = q[1:]          // dequeue
empty := len(q) == 0`,
    rust: `use std::collections::VecDeque;
let mut q: VecDeque<i32> = VecDeque::new();
q.push_back(x);            // enqueue
let f = *q.front().unwrap(); // front
q.pop_front();             // dequeue
let empty = q.is_empty();`,
    kotlin: `val q = ArrayDeque<Int>()
q.addLast(x)          // enqueue
val f = q.first()     // front
q.removeFirst()       // dequeue
val empty = q.isEmpty()`,
    swift: `var q: [Int] = []
q.append(x)        // enqueue
let f = q.first    // front
q.removeFirst()    // dequeue
let empty = q.isEmpty`,
  },
  content: {
    overview: `A queue is a linear structure with first-in, first-out (FIFO) access: items are added at one end (the rear) and removed from the other (the front), so they leave in the same order they arrived. Think of a line at a checkout — the first person to join is the first served.

Its core operations — enqueue (add at rear), dequeue (remove from front), and front (peek) — are all O(1) when backed by a linked list or a circular buffer. Queues model any situation where order of arrival must be preserved, from task scheduling to breadth-first search.`,
    howItWorks: [
      "enqueue(x) appends x at the rear of the queue.",
      "dequeue() removes and returns the item at the front.",
      "front() returns the front item without removing it.",
      "Because additions and removals happen at opposite ends, arrival order is preserved.",
      "A circular buffer or linked list keeps both ends O(1).",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1)", worst: "O(1)" },
      space: "O(n)",
      notes: "enqueue, dequeue, and front are O(1) with a linked list or circular array. (A naive array where dequeue shifts elements is O(n) per dequeue.)",
    },
    applications: [
      "Breadth-first search and level-order traversal",
      "CPU/task scheduling and job queues",
      "Buffering in streams, printers, and I/O",
      "Producer–consumer pipelines and message queues",
    ],
    advantages: [
      "O(1) enqueue and dequeue with the right backing store",
      "Preserves arrival order (fairness)",
      "Simple, well-understood semantics",
      "Foundation for BFS and scheduling",
    ],
    disadvantages: [
      "Only the front and rear are accessible — no random access",
      "Naive array implementation gives O(n) dequeue",
      "Fixed-size circular buffers can overflow",
    ],
    commonMistakes: [
      "Dequeuing an empty queue (underflow) without checking.",
      "Using array shift for dequeue, making it O(n) instead of O(1).",
      "Confusing front/rear ends (FIFO) with a stack's single top (LIFO).",
      "Off-by-one wrap-around bugs in a circular-buffer implementation.",
    ],
    interviewQuestions: [
      "How would you implement a queue using two stacks?",
      "Why does BFS require a queue rather than a stack?",
      "How does a circular buffer achieve O(1) enqueue and dequeue?",
      "Implement a queue with O(1) operations using a singly linked list.",
      "What is the difference between a queue and a deque?",
    ],
    summary:
      "A queue is a FIFO structure with O(1) enqueue at the rear and dequeue from the front, preserving arrival order. Backed by a linked list or circular buffer, it drives BFS, scheduling, and buffering wherever order matters.",
    quiz: [
      { question: "A queue follows which ordering discipline?", options: ["LIFO", "FIFO", "Priority", "Random"], answer: 1, explanation: "First-in, first-out: items leave in arrival order." },
      { question: "enqueue and dequeue operate on…", options: ["The same end", "Opposite ends (rear and front)", "The middle", "Random positions"], answer: 1, explanation: "Additions happen at the rear, removals at the front." },
      { question: "Which algorithm relies on a queue?", options: ["Depth-first search", "Breadth-first search", "Quicksort", "Binary search"], answer: 1, explanation: "BFS uses a FIFO queue to visit nodes in increasing distance order." },
      { question: "A naive array-based dequeue that shifts elements is…", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2, explanation: "Shifting all remaining elements left costs O(n); a circular buffer avoids this." },
      { question: "Which structure gives O(1) enqueue and dequeue?", options: ["Sorted array", "Circular buffer or linked list", "Binary tree", "Hash table"], answer: 1, explanation: "Both maintain front/rear pointers for constant-time ends." },
    ],
  },
  inputFields: [
    { key: "ops", label: "Operations", placeholder: "enqueue 3, enqueue 7, front, dequeue", help: "Comma-separated: enqueue N, dequeue, front." },
  ],
  defaultInput: (level, rng) => ({ ops: randomOps(level, rng) }),
  parseInput: (fields) => {
    const parts = (fields.ops ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("Enter at least one operation, e.g. enqueue 5.");
    if (parts.length > 24) throw new Error("Maximum 24 operations.");
    const ops: Op[] = parts.map((p) => {
      const en = p.match(/^enqueue\s+(-?\d+)$/i);
      if (en) return { kind: "enqueue", value: Number(en[1]) };
      if (/^dequeue$/i.test(p)) return { kind: "dequeue" };
      if (/^front$/i.test(p)) return { kind: "front" };
      throw new Error(`"${p}" is invalid. Use: enqueue N, dequeue, or front.`);
    });
    return { ops };
  },
  serializeInput: (input) => ({ ops: input.ops.map((o) => (o.kind === "enqueue" ? `enqueue ${o.value}` : o.kind)).join(", ") }),
  generate,
};

export default mod;
