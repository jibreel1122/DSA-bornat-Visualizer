import type { AlgorithmModule, HashFrame } from "@/lib/engine/types";
import {
  makeOpenAddressingGenerate,
  randomOAInput,
  oaParse,
  oaSerialize,
  OA_FIELDS,
  type OAInput,
} from "./linear-probing";

const generate = makeOpenAddressingGenerate(
  (k, i, m) => ((((k % m) + m) % m) + i * i) % m,
  (k, i, m) => `(${k} mod ${m} + ${i}²) mod ${m}`,
  (m) => `Quadratic probing: hᵢ(k) = (k mod ${m} + i²) mod ${m} — jumps grow quadratically: +1, +4, +9, …`,
);

const mod: AlgorithmModule<HashFrame, OAInput> = {
  slug: "quadratic-probing",
  title: "Hash Table — Quadratic Probing",
  category: "hashing",
  difficulty: "Intermediate",
  tags: ["hash table", "open addressing", "quadratic probing", "clustering"],
  summary: "Resolves collisions with quadratically growing jumps (+1, +4, +9, …), breaking up the contiguous runs that plague linear probing.",
  renderer: "hash",
  pseudocode: [
    "structure: table[0..m-1], probe hᵢ(k) = (h(k) + i²) mod m",
    "insert(k): try i = 0, 1, 2, … place k in first empty/tombstone slot",
    "  store k",
    "  (occupied slot → collision → next quadratic jump)",
    "  fail if the probe sequence is exhausted",
    "search(k): probe until k found →",
    "  found",
    "  … keep probing past mismatches AND tombstones",
    "delete(k): probe to find k …",
    "  replace with tombstone",
    "// guarantee: with m prime and α < 0.5, an empty slot IS found",
  ],
  code: {
    pseudocode: `h_i(k) = (k mod m + i*i) mod m
insert(k): for i in 0..m-1: s = h_i(k)
  if table[s] empty or tombstone: table[s] = k; return
search(k): for i in 0..m-1: s = h_i(k)
  if table[s] empty: return NOT_FOUND
  if table[s] == k: return s
delete(k): s = search(k); table[s] = TOMBSTONE`,
    c: `int probe(int k, int i, int m) { return (k % m + i * i) % m; }
int insert(int* t, int m, int k) {
    for (int i = 0; i < m; i++) {
        int s = probe(k, i, m);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return s; }
        if (t[s] == k) return s;
    }
    return -1;
}
int search(int* t, int m, int k) {
    for (int i = 0; i < m; i++) {
        int s = probe(k, i, m);
        if (t[s] == EMPTY) return -1;
        if (t[s] == k) return s;
    }
    return -1;
}`,
    cpp: `int probe(int k, int i, int m) { return (k % m + i * i) % m; }
bool insert(vector<int>& t, int k) {
    int m = t.size();
    for (int i = 0; i < m; i++) {
        int s = probe(k, i, m);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
        if (t[s] == k) return true;
    }
    return false;
}
int search(const vector<int>& t, int k) {
    int m = t.size();
    for (int i = 0; i < m; i++) {
        int s = probe(k, i, m);
        if (t[s] == EMPTY) return -1;
        if (t[s] == k) return s;
    }
    return -1;
}`,
    java: `int probe(int k, int i) { return (k % t.length + i * i) % t.length; }
boolean insert(int k) {
    for (int i = 0; i < t.length; i++) {
        int s = probe(k, i);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
        if (t[s] == k) return true;
    }
    return false;
}
int search(int k) {
    for (int i = 0; i < t.length; i++) {
        int s = probe(k, i);
        if (t[s] == EMPTY) return -1;
        if (t[s] == k) return s;
    }
    return -1;
}`,
    python: `def _probe(self, k, i):
    return (k % len(self.t) + i * i) % len(self.t)

def insert(self, k):
    for i in range(len(self.t)):
        s = self._probe(k, i)
        if self.t[s] is EMPTY or self.t[s] == TOMB:
            self.t[s] = k
            return True
        if self.t[s] == k:
            return True
    return False

def search(self, k):
    for i in range(len(self.t)):
        s = self._probe(k, i)
        if self.t[s] is EMPTY:
            return -1
        if self.t[s] == k:
            return s
    return -1`,
    javascript: `probe(k, i) { return (k % this.t.length + i * i) % this.t.length; }
insert(k) {
  for (let i = 0; i < this.t.length; i++) {
    const s = this.probe(k, i);
    if (this.t[s] === EMPTY || this.t[s] === TOMB) { this.t[s] = k; return true; }
    if (this.t[s] === k) return true;
  }
  return false;
}
search(k) {
  for (let i = 0; i < this.t.length; i++) {
    const s = this.probe(k, i);
    if (this.t[s] === EMPTY) return -1;
    if (this.t[s] === k) return s;
  }
  return -1;
}`,
    typescript: `probe(k: number, i: number): number { return (k % this.t.length + i * i) % this.t.length; }
insert(k: number): boolean {
  for (let i = 0; i < this.t.length; i++) {
    const s = this.probe(k, i);
    if (this.t[s] === undefined || this.t[s] === TOMB) { this.t[s] = k; return true; }
    if (this.t[s] === k) return true;
  }
  return false;
}
search(k: number): number {
  for (let i = 0; i < this.t.length; i++) {
    const s = this.probe(k, i);
    if (this.t[s] === undefined) return -1;
    if (this.t[s] === k) return s;
  }
  return -1;
}`,
    csharp: `int Probe(int k, int i) => (k % t.Length + i * i) % t.Length;
public bool Insert(int k) {
    for (int i = 0; i < t.Length; i++) {
        int s = Probe(k, i);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
        if (t[s] == k) return true;
    }
    return false;
}
public int Search(int k) {
    for (int i = 0; i < t.Length; i++) {
        int s = Probe(k, i);
        if (t[s] == EMPTY) return -1;
        if (t[s] == k) return s;
    }
    return -1;
}`,
    go: `func (h *Table) probe(k, i int) int { return (k%len(h.t) + i*i) % len(h.t) }
func (h *Table) Insert(k int) bool {
	for i := 0; i < len(h.t); i++ {
		s := h.probe(k, i)
		if h.t[s] == EMPTY || h.t[s] == TOMB {
			h.t[s] = k
			return true
		}
		if h.t[s] == k {
			return true
		}
	}
	return false
}
func (h *Table) Search(k int) int {
	for i := 0; i < len(h.t); i++ {
		s := h.probe(k, i)
		if h.t[s] == EMPTY {
			return -1
		}
		if h.t[s] == k {
			return s
		}
	}
	return -1
}`,
    rust: `fn probe(&self, k: u32, i: usize) -> usize {
    (k as usize % self.t.len() + i * i) % self.t.len()
}
fn insert(&mut self, k: u32) -> bool {
    for i in 0..self.t.len() {
        let s = self.probe(k, i);
        match self.t[s] {
            Slot::Empty | Slot::Tomb => { self.t[s] = Slot::Key(k); return true; }
            Slot::Key(v) if v == k => return true,
            _ => {}
        }
    }
    false
}
fn search(&self, k: u32) -> Option<usize> {
    for i in 0..self.t.len() {
        let s = self.probe(k, i);
        match self.t[s] {
            Slot::Empty => return None,
            Slot::Key(v) if v == k => return Some(s),
            _ => {}
        }
    }
    None
}`,
    kotlin: `fun probe(k: Int, i: Int) = (k % t.size + i * i) % t.size
fun insert(k: Int): Boolean {
    for (i in t.indices) {
        val s = probe(k, i)
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true }
        if (t[s] == k) return true
    }
    return false
}
fun search(k: Int): Int {
    for (i in t.indices) {
        val s = probe(k, i)
        if (t[s] == EMPTY) return -1
        if (t[s] == k) return s
    }
    return -1
}`,
    swift: `func probe(_ k: Int, _ i: Int) -> Int { (k % t.count + i * i) % t.count }
mutating func insert(_ k: Int) -> Bool {
    for i in 0..<t.count {
        let s = probe(k, i)
        switch t[s] {
        case .empty, .tomb: t[s] = .key(k); return true
        case .key(let v) where v == k: return true
        default: continue
        }
    }
    return false
}
func search(_ k: Int) -> Int? {
    for i in 0..<t.count {
        let s = probe(k, i)
        switch t[s] {
        case .empty: return nil
        case .key(let v) where v == k: return s
        default: continue
        }
    }
    return nil
}`,
  },
  content: {
    overview: `Quadratic probing keeps open addressing's flat-array layout but replaces linear probing's one-step walk with quadratically growing jumps: slot h(k), then h(k)+1, h(k)+4, h(k)+9, … (mod m). Colliding keys that share a home slot quickly scatter across the table instead of piling into one contiguous run, which eliminates linear probing's primary clustering.

The trade-offs are twofold. First, secondary clustering remains: keys with the same home slot still follow the identical probe sequence, so heavy collisions at one slot still queue behind each other. Second, quadratic jumps don't automatically visit every slot — the sequence can cycle before finding an empty cell. The classic guarantee: if the table size m is prime and the load factor stays below ½, the first ⌈m/2⌉ probes hit distinct slots, so an insert always succeeds. Real implementations enforce both conditions (prime m or specially chosen probe constants, resize at α = 0.5).`,
    howItWorks: [
      "Hash the key to its home slot h(k) = k mod m.",
      "On collision, probe h(k) + 1², h(k) + 2², h(k) + 3², … all mod m — jumps of 1, 4, 9, 16, …",
      "Search follows the same sequence: match → found; truly empty slot → absent; tombstones are skipped.",
      "Delete replaces the key with a tombstone so probe chains through it survive.",
      "Keep m prime and α < 0.5 to guarantee the probe sequence finds an empty slot.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1/(1−α))", worst: "O(n)" },
      space: "O(m)",
      notes: "Expected probes under uniform hashing ≈ 1/(1−α) without linear probing's clustering penalty. The empty-slot guarantee needs m prime and α < 0.5; beyond that, inserts can fail even with free slots.",
    },
    applications: [
      "In-memory hash maps needing better collision spread than linear probing without a second hash function",
      "Symbol tables in compilers and interpreters",
      "Fixed-size embedded tables where m can be chosen prime at compile time",
      "Teaching: the canonical middle step between linear probing and double hashing",
    ],
    advantages: [
      "Eliminates primary clustering — colliding keys disperse quadratically",
      "Still pointer-free and reasonably cache-friendly for early probes",
      "Cheaper than double hashing (no second hash computation)",
    ],
    disadvantages: [
      "Secondary clustering: same home slot ⇒ identical probe path",
      "May fail to find an empty slot unless m is prime and α < 0.5",
      "Later probes jump far apart, losing linear probing's cache locality",
    ],
    commonMistakes: [
      "Using a composite table size — the quadratic sequence can cycle through a small subset of slots and miss empty ones.",
      "Letting α exceed 0.5 and assuming inserts still can't fail.",
      "Emptying a slot on delete instead of writing a tombstone.",
      "Computing (h + i²) without reducing i² mod m first on big i (overflow in fixed-width languages).",
    ],
    interviewQuestions: [
      "How does quadratic probing eliminate primary clustering, and what clustering remains?",
      "Prove that with m prime, the first ⌈m/2⌉ quadratic probes are distinct.",
      "Why can a quadratic-probing insert fail even when the table has empty slots?",
      "Compare cache behavior of linear vs quadratic probing.",
      "When would you pick quadratic probing over double hashing?",
    ],
    summary:
      "Quadratic probing spaces collision probes at square offsets (+1, +4, +9, …), destroying the contiguous runs behind linear probing's primary clustering while staying pointer-free. It retains secondary clustering and only guarantees successful inserts when the table size is prime and the load factor stays below one half.",
    quiz: [
      { question: "Quadratic probing's i-th probe lands at…", options: ["(h(k) + i) mod m", "(h(k) + i²) mod m", "(h(k) · i) mod m", "(h(k) − i) mod m"], answer: 1, explanation: "The offsets are perfect squares: 0, 1, 4, 9, 16, …" },
      { question: "It eliminates which problem of linear probing?", options: ["Tombstones", "Primary clustering", "Hashing itself", "Resizing"], answer: 1, explanation: "Quadratic jumps break up the contiguous occupied runs that linear probing builds." },
      { question: "The clustering that remains is called…", options: ["Tertiary clustering", "Secondary clustering — same home slot ⇒ same probe path", "Primary clustering", "No clustering remains"], answer: 1, explanation: "All keys hashing to the same slot still chase the identical sequence of squares." },
      { question: "An insert is guaranteed to find an empty slot when…", options: ["Always", "m is prime and load factor < 0.5", "m is even", "The key is small"], answer: 1, explanation: "Under those conditions the first ⌈m/2⌉ probes are provably distinct slots." },
      { question: "Compared to double hashing, quadratic probing…", options: ["Needs a second hash function", "Avoids a second hash but keeps secondary clustering", "Is always slower", "Cannot delete keys"], answer: 1, explanation: "It trades double hashing's per-key probe paths for a cheaper, shared quadratic sequence." },
    ],
  },
  inputFields: OA_FIELDS,
  defaultInput: (level, rng) => randomOAInput(level, rng),
  parseInput: oaParse,
  serializeInput: oaSerialize,
  generate,
};

export default mod;
