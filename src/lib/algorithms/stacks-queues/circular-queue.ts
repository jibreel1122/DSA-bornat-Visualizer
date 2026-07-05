import type { AlgorithmModule, ArrayFrame, CellState, Step } from "@/lib/engine/types";

type Op = { kind: "enqueue"; value: number } | { kind: "dequeue" };
type Input = { capacity: number; ops: Op[] };

function generate(input: Input): Step<ArrayFrame>[] {
  const cap = input.capacity;
  const buf = new Array(cap).fill(0);
  let front = 0;
  let rear = 0; // next write position
  let size = 0;
  const steps: Step<ArrayFrame>[] = [];
  let enq = 0;
  let deq = 0;

  const occupied = (): Set<number> => {
    const s = new Set<number>();
    for (let k = 0; k < size; k++) s.add((front + k) % cap);
    return s;
  };

  const frame = (changed: number | null, changeState: CellState, description: string, codeLine: number): void => {
    const occ = occupied();
    const states: Record<number, CellState> = {};
    for (let i = 0; i < cap; i++) states[i] = occ.has(i) ? "sorted" : "discarded";
    if (changed !== null) states[changed] = changeState;
    const pointers = [
      { index: front, label: "front" },
      { index: rear, label: "rear" },
    ];
    steps.push({
      frame: {
        values: buf.map((v, i) => (occ.has(i) ? v : 0)),
        states,
        pointers,
        aux: [
          { label: "size / capacity", values: [`${size} / ${cap}`] },
          { label: "front idx", values: [front] },
          { label: "rear idx", values: [rear] },
        ],
        note: `circular queue — indices wrap with modulo ${cap}`,
      },
      description,
      codeLine,
      counters: { enqueues: enq, dequeues: deq },
    });
  };

  frame(null, "active", `A circular queue reuses a fixed array of ${cap} slots; front and rear wrap around with modulo arithmetic.`, 0);

  for (const op of input.ops) {
    if (op.kind === "enqueue") {
      if (size === cap) {
        frame(rear % cap, "swap", `enqueue(${op.value}): the queue is FULL (size ${size} = capacity ${cap}) — rejected.`, 3);
        continue;
      }
      buf[rear] = op.value;
      const writeAt = rear;
      rear = (rear + 1) % cap;
      size++;
      enq++;
      frame(writeAt, "found", `enqueue(${op.value}): write at index ${writeAt}, then rear = (${writeAt} + 1) mod ${cap} = ${rear}.`, 2);
    } else {
      if (size === 0) {
        frame(null, "swap", `dequeue(): the queue is EMPTY — nothing to remove.`, 6);
        continue;
      }
      const removed = buf[front];
      const readAt = front;
      front = (front + 1) % cap;
      size--;
      deq++;
      frame(readAt, "compare", `dequeue(): read ${removed} from index ${readAt}, then front = (${readAt} + 1) mod ${cap} = ${front}.`, 5);
    }
  }

  const contents: number[] = [];
  for (let k = 0; k < size; k++) contents.push(buf[(front + k) % cap]);
  frame(null, "active", `Done. Queue holds ${size} item(s) front→rear: [${contents.join(", ") || "empty"}].`, 7);
  return steps;
}

function randomInput(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const cap = Math.min(6, 3 + Math.floor(level / 2));
  const ops: Op[] = [];
  // Fill most of it, dequeue a couple, then enqueue more to force a wrap-around.
  const firstFill = cap - 1;
  for (let i = 0; i < firstFill; i++) ops.push({ kind: "enqueue", value: rng.int(1, 60) });
  ops.push({ kind: "dequeue" });
  ops.push({ kind: "dequeue" });
  ops.push({ kind: "enqueue", value: rng.int(1, 60) });
  ops.push({ kind: "enqueue", value: rng.int(1, 60) });
  return { capacity: cap, ops };
}

const mod: AlgorithmModule<ArrayFrame, Input> = {
  slug: "circular-queue",
  title: "Circular Queue (Ring Buffer)",
  category: "stacks-queues",
  difficulty: "Intermediate",
  tags: ["queue", "ring buffer", "modulo", "fixed capacity"],
  summary: "A fixed-size queue whose front and rear indices wrap around with modulo arithmetic, reusing freed slots.",
  renderer: "array",
  pseudocode: [
    "structure CircularQueue(capacity)",
    "  buf[capacity], front = rear = size = 0",
    "  enqueue(v):",
    "    if size == capacity: reject (full)",
    "    buf[rear] = v; rear = (rear+1) % capacity; size++",
    "  dequeue():",
    "    if size == 0: reject (empty)",
    "    v = buf[front]; front = (front+1) % capacity; size--; return v",
    "  isFull: size == capacity   isEmpty: size == 0",
  ],
  code: {
    pseudocode: `enqueue(v):
  if size == cap: return FULL
  buf[rear] = v; rear = (rear+1) % cap; size++
dequeue():
  if size == 0: return EMPTY
  v = buf[front]; front = (front+1) % cap; size--; return v`,
    c: `typedef struct { int buf[64], cap, front, rear, size; } CQ;
void init(CQ* q, int cap){ q->cap=cap; q->front=q->rear=q->size=0; }
int enqueue(CQ* q, int v){
    if (q->size == q->cap) return 0;      // full
    q->buf[q->rear] = v;
    q->rear = (q->rear + 1) % q->cap; q->size++;
    return 1;
}
int dequeue(CQ* q, int* out){
    if (q->size == 0) return 0;           // empty
    *out = q->buf[q->front];
    q->front = (q->front + 1) % q->cap; q->size--;
    return 1;
}`,
    cpp: `struct CircularQueue {
    vector<int> buf; int cap, front = 0, rear = 0, size = 0;
    CircularQueue(int c): buf(c), cap(c) {}
    bool enqueue(int v) {
        if (size == cap) return false;
        buf[rear] = v; rear = (rear + 1) % cap; size++;
        return true;
    }
    bool dequeue(int& out) {
        if (size == 0) return false;
        out = buf[front]; front = (front + 1) % cap; size--;
        return true;
    }
};`,
    java: `class CircularQueue {
    int[] buf; int cap, front = 0, rear = 0, size = 0;
    CircularQueue(int c) { buf = new int[c]; cap = c; }
    boolean enqueue(int v) {
        if (size == cap) return false;
        buf[rear] = v; rear = (rear + 1) % cap; size++;
        return true;
    }
    Integer dequeue() {
        if (size == 0) return null;
        int v = buf[front]; front = (front + 1) % cap; size--;
        return v;
    }
}`,
    python: `class CircularQueue:
    def __init__(self, cap):
        self.buf = [None] * cap
        self.cap, self.front, self.rear, self.size = cap, 0, 0, 0
    def enqueue(self, v):
        if self.size == self.cap: return False
        self.buf[self.rear] = v
        self.rear = (self.rear + 1) % self.cap
        self.size += 1
        return True
    def dequeue(self):
        if self.size == 0: return None
        v = self.buf[self.front]
        self.front = (self.front + 1) % self.cap
        self.size -= 1
        return v`,
    javascript: `class CircularQueue {
  constructor(cap) {
    this.buf = new Array(cap); this.cap = cap;
    this.front = 0; this.rear = 0; this.size = 0;
  }
  enqueue(v) {
    if (this.size === this.cap) return false;
    this.buf[this.rear] = v;
    this.rear = (this.rear + 1) % this.cap; this.size++;
    return true;
  }
  dequeue() {
    if (this.size === 0) return undefined;
    const v = this.buf[this.front];
    this.front = (this.front + 1) % this.cap; this.size--;
    return v;
  }
}`,
    typescript: `class CircularQueue {
  private buf: number[]; private cap: number;
  private front = 0; private rear = 0; private size = 0;
  constructor(cap: number) { this.buf = new Array(cap); this.cap = cap; }
  enqueue(v: number): boolean {
    if (this.size === this.cap) return false;
    this.buf[this.rear] = v;
    this.rear = (this.rear + 1) % this.cap; this.size++;
    return true;
  }
  dequeue(): number | undefined {
    if (this.size === 0) return undefined;
    const v = this.buf[this.front];
    this.front = (this.front + 1) % this.cap; this.size--;
    return v;
  }
}`,
    csharp: `class CircularQueue {
    int[] buf; int cap, front = 0, rear = 0, size = 0;
    public CircularQueue(int c) { buf = new int[c]; cap = c; }
    public bool Enqueue(int v) {
        if (size == cap) return false;
        buf[rear] = v; rear = (rear + 1) % cap; size++;
        return true;
    }
    public int? Dequeue() {
        if (size == 0) return null;
        int v = buf[front]; front = (front + 1) % cap; size--;
        return v;
    }
}`,
    go: `type CircularQueue struct {
	buf                     []int
	cap, front, rear, size  int
}
func NewCQ(c int) *CircularQueue { return &CircularQueue{buf: make([]int, c), cap: c} }
func (q *CircularQueue) Enqueue(v int) bool {
	if q.size == q.cap { return false }
	q.buf[q.rear] = v
	q.rear = (q.rear + 1) % q.cap
	q.size++
	return true
}
func (q *CircularQueue) Dequeue() (int, bool) {
	if q.size == 0 { return 0, false }
	v := q.buf[q.front]
	q.front = (q.front + 1) % q.cap
	q.size--
	return v, true
}`,
    rust: `struct CircularQueue { buf: Vec<i32>, cap: usize, front: usize, rear: usize, size: usize }
impl CircularQueue {
    fn new(cap: usize) -> Self { Self { buf: vec![0; cap], cap, front: 0, rear: 0, size: 0 } }
    fn enqueue(&mut self, v: i32) -> bool {
        if self.size == self.cap { return false; }
        self.buf[self.rear] = v;
        self.rear = (self.rear + 1) % self.cap;
        self.size += 1;
        true
    }
    fn dequeue(&mut self) -> Option<i32> {
        if self.size == 0 { return None; }
        let v = self.buf[self.front];
        self.front = (self.front + 1) % self.cap;
        self.size -= 1;
        Some(v)
    }
}`,
    kotlin: `class CircularQueue(val cap: Int) {
    private val buf = IntArray(cap)
    private var front = 0; private var rear = 0; private var size = 0
    fun enqueue(v: Int): Boolean {
        if (size == cap) return false
        buf[rear] = v; rear = (rear + 1) % cap; size++
        return true
    }
    fun dequeue(): Int? {
        if (size == 0) return null
        val v = buf[front]; front = (front + 1) % cap; size--
        return v
    }
}`,
    swift: `struct CircularQueue {
    private var buf: [Int]; private let cap: Int
    private var front = 0, rear = 0, size = 0
    init(_ cap: Int) { self.cap = cap; buf = Array(repeating: 0, count: cap) }
    mutating func enqueue(_ v: Int) -> Bool {
        if size == cap { return false }
        buf[rear] = v; rear = (rear + 1) % cap; size += 1
        return true
    }
    mutating func dequeue() -> Int? {
        if size == 0 { return nil }
        let v = buf[front]; front = (front + 1) % cap; size -= 1
        return v
    }
}`,
  },
  content: {
    overview: `A circular queue (or ring buffer) is a fixed-capacity FIFO queue that reuses its storage by treating the underlying array as if its ends were joined into a circle. A naive array queue wastes space: after several dequeues the front creeps forward and the front slots become permanently unusable even though they are empty. A circular queue solves this by wrapping the front and rear indices back to 0 with modulo arithmetic once they reach the end.

Two indices drive it: front points at the next element to remove, and rear at the next free slot to write. Enqueue writes at rear and advances rear = (rear + 1) mod capacity; dequeue reads at front and advances front similarly. A size counter (or a spare empty slot) distinguishes the full state from the empty state, since front == rear can mean either. All operations are O(1), which is why ring buffers back streaming I/O, audio buffers, and bounded producer–consumer queues.`,
    howItWorks: [
      "Allocate a fixed array of `capacity` slots and set front = rear = size = 0.",
      "enqueue(v): if size equals capacity the queue is full — reject; otherwise write buf[rear] = v.",
      "Advance rear = (rear + 1) mod capacity and increment size.",
      "dequeue(): if size is 0 the queue is empty — reject; otherwise read buf[front].",
      "Advance front = (front + 1) mod capacity and decrement size; the freed slot is reused on later enqueues.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1)", worst: "O(1)" },
      space: "O(capacity)",
      notes: "Enqueue and dequeue are constant time — no shifting of elements. Space is fixed at the chosen capacity. A size counter (or one sacrificed slot) is needed to tell full from empty.",
    },
    applications: [
      "streaming and I/O buffers (audio, video, network packets)",
      "bounded producer–consumer / task queues",
      "keyboard and event buffers in operating systems",
      "sliding-window and round-robin scheduling",
    ],
    advantages: [
      "O(1) enqueue and dequeue with no element shifting",
      "Reuses freed slots — no wasted space at the front",
      "Fixed, predictable memory footprint",
      "Ideal for bounded streaming workloads",
    ],
    disadvantages: [
      "Fixed capacity — cannot grow without reallocation",
      "Full vs. empty ambiguity needs a size counter or spare slot",
      "Index arithmetic (modulo, wrap) is easy to get wrong",
      "Overwriting or blocking policy must be decided when full",
    ],
    commonMistakes: [
      "Confusing the full and empty conditions when front == rear.",
      "Forgetting the modulo, so indices run off the end of the array.",
      "Not rejecting (or handling) enqueue on a full queue / dequeue on empty.",
      "Miscounting size after wrap-around.",
    ],
    interviewQuestions: [
      "How do you distinguish a full circular queue from an empty one?",
      "Why is a circular queue better than shifting elements in an array queue?",
      "How would you implement it without a size field (using a spare slot)?",
      "How do ring buffers support lock-free single-producer/single-consumer queues?",
      "What policy options exist when enqueuing into a full buffer?",
    ],
    summary:
      "A circular queue is a fixed-size FIFO that wraps its front and rear indices with modulo arithmetic to reuse freed slots, giving O(1) enqueue and dequeue with no shifting. A size counter resolves the full-vs-empty ambiguity, making it perfect for bounded streaming buffers.",
    quiz: [
      { question: "A circular queue advances its indices using…", options: ["Random jumps", "Modulo the capacity", "Doubling", "Binary search"], answer: 1, explanation: "(index + 1) mod capacity wraps back to the start." },
      { question: "Enqueue and dequeue on a circular queue are…", options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"], answer: 2, explanation: "No elements are shifted; only indices move." },
      { question: "The main problem it solves versus a naive array queue is…", options: ["Sorting elements", "Reusing freed front slots instead of wasting them", "Growing without limit", "Finding the minimum"], answer: 1, explanation: "Wrap-around reclaims the slots vacated by dequeues." },
      { question: "When front == rear, the queue could be…", options: ["Only full", "Only empty", "Either full or empty (needs a size/flag)", "Corrupted"], answer: 2, explanation: "A size counter or a spare slot disambiguates the two states." },
      { question: "A circular queue's capacity is…", options: ["Unbounded", "Fixed at creation", "Always 2", "Equal to the number of dequeues"], answer: 1, explanation: "Ring buffers use a fixed, pre-allocated array." },
    ],
  },
  inputFields: [
    { key: "capacity", label: "Capacity", placeholder: "5", help: "Number of slots (2–16)." },
    { key: "ops", label: "Operations", placeholder: "E 5, E 3, E 8, D, D, E 1, E 9", help: "Comma-separated: 'E n' to enqueue n, 'D' to dequeue (max 40).", list: true },
  ],
  defaultInput: (level, rng) => randomInput(level, rng),
  parseInput: (fields) => {
    const capacity = Number((fields.capacity ?? "").trim());
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 16) throw new Error("Capacity must be a whole number from 2 to 16.");
    const tokens = (fields.ops ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (tokens.length < 1) throw new Error("Enter at least one operation, e.g. 'E 5' or 'D'.");
    if (tokens.length > 40) throw new Error("Maximum 40 operations.");
    const ops: Op[] = tokens.map((t) => {
      const dm = t.match(/^[dD]$/);
      if (dm) return { kind: "dequeue" } as Op;
      const em = t.match(/^[eE]\s*(-?\d+)$/);
      if (em) {
        const v = Number(em[1]);
        if (v < 1 || v > 99) throw new Error(`Enqueue values must be 1–99 (got ${v}).`);
        return { kind: "enqueue", value: v } as Op;
      }
      throw new Error(`"${t}" is invalid. Use 'E n' to enqueue or 'D' to dequeue.`);
    });
    return { capacity, ops };
  },
  serializeInput: (input) => ({
    capacity: String(input.capacity),
    ops: input.ops.map((o) => (o.kind === "enqueue" ? `E ${o.value}` : "D")).join(", "),
  }),
  generate,
};

export default mod;
