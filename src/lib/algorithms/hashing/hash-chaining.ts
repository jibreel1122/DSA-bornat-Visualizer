import type { AlgorithmModule, CellState, HashFrame, Step } from "@/lib/engine/types";

type Op = { kind: "insert" | "search" | "delete"; key: number };
type Input = { ops: Op[]; size: number };

function generate(input: Input): Step<HashFrame>[] {
  const m = input.size;
  const buckets: number[][] = Array.from({ length: m }, () => []);
  const steps: Step<HashFrame>[] = [];
  let collisions = 0;
  let comparisons = 0;

  const count = () => buckets.reduce((s, b) => s + b.length, 0);

  const frame = (
    bucketStates: Record<number, CellState>,
    itemStates: Record<string, CellState>,
    description: string,
    codeLine: number,
  ): void => {
    steps.push({
      frame: {
        chained: true,
        buckets: buckets.map((items, index) => ({
          index,
          state: bucketStates[index],
          items: items.map((k) => ({ key: String(k), state: itemStates[`${index}:${k}`] })),
        })),
        aux: [{ label: "Load α", values: [`${count()}/${m} = ${(count() / m).toFixed(2)}`] }],
      },
      description,
      codeLine,
      counters: { items: count(), collisions, comparisons },
    });
  };

  frame({}, {}, `Separate chaining: each bucket holds a list. h(k) = k mod ${m}.`, 0);

  for (const op of input.ops) {
    const h = ((op.key % m) + m) % m;
    if (op.kind === "insert") {
      frame({ [h]: "active" }, {}, `insert(${op.key}): h(${op.key}) = ${op.key} mod ${m} = ${h}.`, 1);
      if (buckets[h].length > 0) {
        collisions++;
        frame({ [h]: "compare" }, {}, `Bucket ${h} is occupied — collision. Append to its chain.`, 2);
      }
      if (!buckets[h].includes(op.key)) buckets[h].push(op.key);
      frame({ [h]: "active" }, { [`${h}:${op.key}`]: "found" }, `Added ${op.key} to bucket ${h}.`, 3);
    } else if (op.kind === "search") {
      frame({ [h]: "active" }, {}, `search(${op.key}): look in bucket ${h}.`, 4);
      let found = false;
      for (const k of buckets[h]) {
        comparisons++;
        if (k === op.key) {
          found = true;
          frame({ [h]: "active" }, { [`${h}:${k}`]: "found" }, `Found ${op.key} in bucket ${h}.`, 5);
          break;
        }
        frame({ [h]: "active" }, { [`${h}:${k}`]: "compare" }, `${k} ≠ ${op.key}, keep scanning the chain.`, 5);
      }
      if (!found) frame({ [h]: "discarded" }, {}, `${op.key} is not in bucket ${h} — not found.`, 6);
    } else {
      frame({ [h]: "active" }, {}, `delete(${op.key}): find it in bucket ${h}.`, 7);
      const idx = buckets[h].indexOf(op.key);
      if (idx >= 0) {
        frame({ [h]: "active" }, { [`${h}:${op.key}`]: "swap" }, `Remove ${op.key} from bucket ${h}.`, 8);
        buckets[h].splice(idx, 1);
        frame({ [h]: "active" }, {}, `Deleted ${op.key}.`, 8);
      } else {
        frame({ [h]: "discarded" }, {}, `${op.key} not present — nothing to delete.`, 9);
      }
    }
  }
  frame({}, {}, `Done. ${count()} keys stored across ${m} buckets (load factor ${(count() / m).toFixed(2)}).`, 10);
  return steps;
}

function randomOps(level: number, rng: { int: (a: number, b: number) => number; next: () => number; pick: <T>(a: readonly T[]) => T }): Input {
  const size = [0, 5, 7, 7, 11, 13][level] ?? 7;
  const count = Math.min(14, 5 + level * 2);
  const inserted: number[] = [];
  const ops: Op[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng.next();
    if (inserted.length === 0 || r < 0.7) {
      const key = rng.int(1, 99);
      inserted.push(key);
      ops.push({ kind: "insert", key });
    } else if (r < 0.9) {
      ops.push({ kind: "search", key: rng.pick(inserted) });
    } else {
      ops.push({ kind: "delete", key: rng.pick(inserted) });
    }
  }
  return { ops, size };
}

const mod: AlgorithmModule<HashFrame, Input> = {
  slug: "hash-chaining",
  title: "Hash Table — Separate Chaining",
  category: "hashing",
  difficulty: "Intermediate",
  tags: ["hash table", "chaining", "collision resolution", "O(1) average"],
  summary: "Resolves hash collisions by storing colliding keys in a per-bucket linked list.",
  renderer: "hash",
  pseudocode: [
    "structure HashTable with buckets[0..m-1]",
    "insert(k): h = k mod m; append k to buckets[h]",
    "  (collision if bucket already non-empty)",
    "  key stored in the chain",
    "search(k): h = k mod m; scan buckets[h]",
    "  return true if k found in the chain",
    "  else not found",
    "delete(k): h = k mod m; remove k from buckets[h]",
    "  if present, splice out of the chain",
    "  else nothing to remove",
    "// load factor α = n / m",
  ],
  code: {
    pseudocode: `insert(k): buckets[k mod m].append(k)
search(k): return k in buckets[k mod m]
delete(k): buckets[k mod m].remove(k)`,
    c: `typedef struct Node { int key; struct Node* next; } Node;
Node* table[M];
void insert(int k){
    int h = k % M;
    Node* n = malloc(sizeof(Node));
    n->key = k; n->next = table[h]; table[h] = n;
}
int search(int k){
    for (Node* n = table[k % M]; n; n = n->next)
        if (n->key == k) return 1;
    return 0;
}`,
    cpp: `#include <list>
#include <vector>
struct HashTable {
    int m;
    std::vector<std::list<int>> buckets;
    HashTable(int m): m(m), buckets(m) {}
    void insert(int k){ buckets[k % m].push_back(k); }
    bool search(int k){
        for (int x : buckets[k % m]) if (x == k) return true;
        return false;
    }
    void erase(int k){ buckets[k % m].remove(k); }
};`,
    java: `class HashTable {
    List<Integer>[] buckets; int m;
    HashTable(int m){ this.m = m; buckets = new List[m];
        for (int i = 0; i < m; i++) buckets[i] = new LinkedList<>(); }
    void insert(int k){ buckets[k % m].add(k); }
    boolean search(int k){ return buckets[k % m].contains(k); }
    void delete(int k){ buckets[k % m].remove((Integer) k); }
}`,
    python: `class HashTable:
    def __init__(self, m):
        self.m = m
        self.buckets = [[] for _ in range(m)]
    def insert(self, k):
        self.buckets[k % self.m].append(k)
    def search(self, k):
        return k in self.buckets[k % self.m]
    def delete(self, k):
        b = self.buckets[k % self.m]
        if k in b:
            b.remove(k)`,
    javascript: `class HashTable {
  constructor(m) { this.m = m; this.buckets = Array.from({ length: m }, () => []); }
  insert(k) { this.buckets[k % this.m].push(k); }
  search(k) { return this.buckets[k % this.m].includes(k); }
  delete(k) {
    const b = this.buckets[k % this.m];
    const i = b.indexOf(k);
    if (i >= 0) b.splice(i, 1);
  }
}`,
    typescript: `class HashTable {
  m: number;
  buckets: number[][];
  constructor(m: number) { this.m = m; this.buckets = Array.from({ length: m }, () => []); }
  insert(k: number) { this.buckets[k % this.m].push(k); }
  search(k: number) { return this.buckets[k % this.m].includes(k); }
  delete(k: number) {
    const b = this.buckets[k % this.m];
    const i = b.indexOf(k);
    if (i >= 0) b.splice(i, 1);
  }
}`,
    csharp: `class HashTable {
    int m; List<int>[] buckets;
    public HashTable(int m){ this.m = m; buckets = new List<int>[m];
        for (int i = 0; i < m; i++) buckets[i] = new List<int>(); }
    public void Insert(int k) => buckets[k % m].Add(k);
    public bool Search(int k) => buckets[k % m].Contains(k);
    public void Delete(int k) => buckets[k % m].Remove(k);
}`,
    go: `type HashTable struct {
	m       int
	buckets [][]int
}
func NewHashTable(m int) *HashTable { return &HashTable{m, make([][]int, m)} }
func (h *HashTable) Insert(k int) { i := k % h.m; h.buckets[i] = append(h.buckets[i], k) }
func (h *HashTable) Search(k int) bool {
	for _, x := range h.buckets[k%h.m] {
		if x == k { return true }
	}
	return false
}`,
    rust: `struct HashTable { m: usize, buckets: Vec<Vec<i32>> }
impl HashTable {
    fn new(m: usize) -> Self { Self { m, buckets: vec![Vec::new(); m] } }
    fn insert(&mut self, k: i32) { let i = (k as usize) % self.m; self.buckets[i].push(k); }
    fn search(&self, k: i32) -> bool { self.buckets[(k as usize) % self.m].contains(&k) }
    fn delete(&mut self, k: i32) { let i = (k as usize) % self.m; self.buckets[i].retain(|&x| x != k); }
}`,
    kotlin: `class HashTable(val m: Int) {
    val buckets = Array(m) { mutableListOf<Int>() }
    fun insert(k: Int) { buckets[k % m].add(k) }
    fun search(k: Int) = k in buckets[k % m]
    fun delete(k: Int) { buckets[k % m].remove(k) }
}`,
    swift: `class HashTable {
    let m: Int
    var buckets: [[Int]]
    init(_ m: Int) { self.m = m; buckets = Array(repeating: [], count: m) }
    func insert(_ k: Int) { buckets[k % m].append(k) }
    func search(_ k: Int) -> Bool { buckets[k % m].contains(k) }
    func delete(_ k: Int) { buckets[k % m].removeAll { $0 == k } }
}`,
  },
  content: {
    overview: `A hash table stores keys in an array of buckets, using a hash function to map each key to a bucket index — here, the simple h(k) = k mod m. The promise is average O(1) lookup, but two different keys can hash to the same bucket, a collision. Separate chaining resolves this by making each bucket a list: colliding keys simply coexist in the same bucket's chain.

Performance hinges on the load factor α = n/m (keys per bucket). With a good hash function and α kept small (near 1), chains stay short and insert, search, and delete are all O(1) on average. As α grows, chains lengthen and operations degrade toward O(n).`,
    howItWorks: [
      "Compute the bucket index h = k mod m.",
      "Insert: append the key to bucket h's chain (a collision if the bucket was non-empty).",
      "Search: hash to bucket h, then scan its chain for the key.",
      "Delete: hash to bucket h and splice the key out of the chain.",
      "Keep the load factor α = n/m small (resize when it grows) so chains stay short.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1 + α)", worst: "O(n)" },
      space: "O(n + m)",
      notes: "Average operations are O(1 + α) with load factor α = n/m. Worst case O(n) when all keys collide into one bucket. Space is O(n) for keys plus O(m) for the bucket array.",
    },
    applications: [
      "Implementing dictionaries, maps, and sets",
      "Database indexing and caches",
      "De-duplication and frequency counting",
      "Symbol tables in compilers and interpreters",
    ],
    advantages: [
      "Simple, robust collision handling",
      "Degrades gracefully as the load factor rises (no clustering)",
      "The table never 'fills up' — chains just grow",
      "Deletion is straightforward (no tombstones)",
    ],
    disadvantages: [
      "Extra memory for list nodes/pointers",
      "Poor cache locality compared to open addressing",
      "Performance collapses to O(n) with a bad hash function",
      "Requires resizing to keep the load factor bounded",
    ],
    commonMistakes: [
      "Using a poor hash function that clusters keys into few buckets.",
      "Letting the load factor grow unbounded without resizing.",
      "Choosing a table size m that shares factors with keys (prefer a prime).",
      "Forgetting to handle duplicate-key policy on insert.",
    ],
    interviewQuestions: [
      "How does the load factor affect the running time of chaining?",
      "Compare separate chaining with open addressing.",
      "Why are prime table sizes often preferred?",
      "How and when should a hash table resize?",
      "What makes a good hash function?",
    ],
    summary:
      "Separate chaining resolves hash collisions by storing colliding keys in a per-bucket list, giving average O(1 + α) operations where α = n/m is the load factor. It degrades gracefully and deletes cleanly, at the cost of pointer memory and weaker cache locality than open addressing.",
    quiz: [
      { question: "In separate chaining, a collision is resolved by…", options: ["Rehashing everything", "Storing colliding keys in the same bucket's list", "Probing the next slot", "Discarding the key"], answer: 1, explanation: "Each bucket is a chain that holds all keys hashing there." },
      { question: "The load factor α equals…", options: ["m / n", "n / m", "n · m", "n − m"], answer: 1, explanation: "α is the number of keys n divided by the number of buckets m." },
      { question: "Average-case time for search with chaining is…", options: ["O(1 + α)", "O(log n)", "O(n)", "O(n²)"], answer: 0, explanation: "You hash to a bucket (O(1)) then scan its chain of expected length α." },
      { question: "The worst-case time for search occurs when…", options: ["The table is empty", "All keys hash to one bucket", "α is small", "m is prime"], answer: 1, explanation: "A single long chain forces an O(n) scan." },
      { question: "An advantage of chaining over open addressing is…", options: ["Better cache locality", "The table can't overflow and deletion is simple", "Less memory", "No hash function needed"], answer: 1, explanation: "Chains grow freely and removing a key just unlinks it — no tombstones." },
    ],
  },
  inputFields: [
    { key: "ops", label: "Operations", placeholder: "insert 21, insert 14, insert 28, search 14, delete 21", help: "Comma-separated: insert N, search N, delete N (max 50)." },
    { key: "size", label: "Table size m", placeholder: "7", help: "3–20 (prime recommended)." },
  ],
  defaultInput: (level, rng) => randomOps(level, rng),
  parseInput: (fields) => {
    const parts = (fields.ops ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) throw new Error("Enter at least one operation, e.g. insert 21.");
    if (parts.length > 50) throw new Error("Maximum 50 operations.");
    const ops: Op[] = parts.map((p) => {
      const m = p.match(/^(insert|search|delete)\s+(\d+)$/i);
      if (!m) throw new Error(`"${p}" is invalid. Use: insert 21, search 14, or delete 7.`);
      return { kind: m[1].toLowerCase() as Op["kind"], key: Number(m[2]) };
    });
    const size = Number((fields.size ?? "7").trim());
    if (!Number.isInteger(size) || size < 3 || size > 20) throw new Error("Table size must be a whole number from 3 to 20.");
    return { ops, size };
  },
  serializeInput: (input) => ({ ops: input.ops.map((o) => `${o.kind} ${o.key}`).join(", "), size: String(input.size) }),
  generate,
};

export default mod;
