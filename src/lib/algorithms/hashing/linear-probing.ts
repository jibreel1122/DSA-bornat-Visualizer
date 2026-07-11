import type { AlgorithmModule, CellState, HashFrame, Step } from "@/lib/engine/types";

export type OAOp = { kind: "insert" | "search" | "delete"; key: number };
export type OAInput = { ops: OAOp[]; size: number };

export const TOMBSTONE = -1;

/** Parse "insert 21, search 14, delete 21" into ops. */
export function parseOps(text: string): OAOp[] {
  const parts = text.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one operation, e.g. insert 21.");
  if (parts.length > 40) throw new Error("Maximum 40 operations.");
  return parts.map((part) => {
    const m = part.match(/^(insert|search|delete)\s+(\d+)$/i);
    if (!m) throw new Error(`"${part}" is invalid. Use: insert N, search N, or delete N.`);
    return { kind: m[1].toLowerCase() as OAOp["kind"], key: Number(m[2]) };
  });
}

export function parseSize(text: string): number {
  const size = Number((text ?? "").trim());
  if (!Number.isInteger(size) || size < 5 || size > 31) throw new Error("Table size must be an integer between 5 and 31 (prime recommended).");
  return size;
}

/**
 * Shared open-addressing step generator. The probe function returns the i-th
 * slot to try for key k; its description is woven into the narration.
 */
export function makeOpenAddressingGenerate(
  probe: (k: number, i: number, m: number) => number,
  probeLabel: (k: number, i: number, m: number) => string,
  introNote: (m: number) => string,
) {
  return function generate(input: OAInput): Step<HashFrame>[] {
    const m = input.size;
    const table: (number | null)[] = new Array(m).fill(null);
    const steps: Step<HashFrame>[] = [];
    let collisions = 0;
    let probes = 0;

    const live = () => table.filter((v) => v !== null && v !== TOMBSTONE).length;

    const frame = (states: Record<number, CellState>, description: string, codeLine: number, descriptionAr?: string): void => {
      steps.push({
        frame: {
          chained: false,
          buckets: table.map((v, index) => ({
            index,
            state: states[index],
            items:
              v === null
                ? []
                : v === TOMBSTONE
                  ? [{ key: "×", state: states[index] ?? "discarded" }]
                  : [{ key: String(v), state: states[index] ?? "active" }],
          })),
          aux: [{ label: "Load α", values: [`${live()}/${m} = ${(live() / m).toFixed(2)}`] }],
          note: introNote(m),
        },
        description,
        descriptionAr,
        codeLine,
        counters: { items: live(), collisions, probes },
      });
    };

    frame(
      {},
      `Open addressing: all keys live in the table itself. On collision, follow the probe sequence to the next slot. "×" marks a tombstone (deleted slot).`,
      0,
      `العنونة المفتوحة: تُخزَّن كل المفاتيح داخل الجدول نفسه. عند التصادم، اتبع تسلسل السبر إلى الخانة التالية. الرمز "×" يمثل شاهد قبر (خانة محذوفة).`,
    );

    for (const op of input.ops) {
      if (op.kind === "insert") {
        let placed = false;
        let firstTomb = -1;
        for (let i = 0; i < m; i++) {
          probes++;
          const s = probe(op.key, i, m);
          const v = table[s];
          if (v !== null && v !== TOMBSTONE && v === op.key) {
            frame(
              { [s]: "found" },
              `insert(${op.key}): probe ${i} → slot ${s} already holds ${op.key} — no duplicates, done.`,
              1,
              `insert(${op.key}): السبر ${i} ← الخانة ${s} تحتوي بالفعل على ${op.key} — لا تكرار، انتهى.`,
            );
            placed = true;
            break;
          }
          if (v === null) {
            const target = firstTomb >= 0 ? firstTomb : s;
            frame(
              { [s]: "active" },
              `insert(${op.key}): probe ${i} → ${probeLabel(op.key, i, m)} = ${s} is empty.`,
              1,
              `insert(${op.key}): السبر ${i} ← ${probeLabel(op.key, i, m)} = ${s} فارغة.`,
            );
            table[target] = op.key;
            frame(
              { [target]: "found" },
              firstTomb >= 0
                ? `Reuse the earlier tombstone at slot ${target} — store ${op.key} there.`
                : `Store ${op.key} at slot ${s}.`,
              2,
              firstTomb >= 0
                ? `أعِد استخدام شاهد القبر السابق في الخانة ${target} — خزّن ${op.key} هناك.`
                : `خزّن ${op.key} في الخانة ${s}.`,
            );
            placed = true;
            break;
          }
          if (v === TOMBSTONE) {
            if (firstTomb < 0) firstTomb = s;
            frame(
              { [s]: "compare" },
              `insert(${op.key}): probe ${i} → slot ${s} is a tombstone — remember it, but keep probing (the key might exist further along).`,
              3,
              `insert(${op.key}): السبر ${i} ← الخانة ${s} شاهد قبر — تذكّرها، لكن واصل السبر (فقد يوجد المفتاح لاحقًا).`,
            );
            continue;
          }
          collisions++;
          frame(
            { [s]: "swap" },
            `insert(${op.key}): probe ${i} → ${probeLabel(op.key, i, m)} = ${s} holds ${v} — collision, try the next probe.`,
            3,
            `insert(${op.key}): السبر ${i} ← ${probeLabel(op.key, i, m)} = ${s} تحتوي على ${v} — تصادم، جرّب السبر التالي.`,
          );
        }
        if (!placed) {
          if (firstTomb >= 0) {
            table[firstTomb] = op.key;
            frame(
              { [firstTomb]: "found" },
              `Probe sequence exhausted — store ${op.key} in the remembered tombstone at slot ${firstTomb}.`,
              2,
              `انتهى تسلسل السبر — خزّن ${op.key} في شاهد القبر الذي تم تذكّره عند الخانة ${firstTomb}.`,
            );
          } else {
            frame(
              {},
              `insert(${op.key}) FAILED: probe sequence exhausted (${m} probes) — table effectively full for this key.`,
              4,
              `فشل insert(${op.key}): انتهى تسلسل السبر (${m} عملية سبر) — الجدول ممتلئ فعليًا بالنسبة لهذا المفتاح.`,
            );
          }
        }
      } else if (op.kind === "search") {
        let outcome = "";
        for (let i = 0; i < m; i++) {
          probes++;
          const s = probe(op.key, i, m);
          const v = table[s];
          if (v === null) {
            frame(
              { [s]: "discarded" },
              `search(${op.key}): probe ${i} → slot ${s} is empty — ${op.key} cannot be further along. Not found.`,
              5,
              `search(${op.key}): السبر ${i} ← الخانة ${s} فارغة — لا يمكن أن يكون ${op.key} أبعد من ذلك. غير موجود.`,
            );
            outcome = "missing";
            break;
          }
          if (v === op.key) {
            frame(
              { [s]: "found" },
              `search(${op.key}): probe ${i} → slot ${s} holds ${op.key}. Found!`,
              6,
              `search(${op.key}): السبر ${i} ← الخانة ${s} تحتوي على ${op.key}. تم العثور عليه!`,
            );
            outcome = "found";
            break;
          }
          frame(
            { [s]: "compare" },
            v === TOMBSTONE
              ? `search(${op.key}): probe ${i} → slot ${s} is a tombstone — must keep probing past it.`
              : `search(${op.key}): probe ${i} → slot ${s} holds ${v} ≠ ${op.key} — keep probing.`,
            7,
            v === TOMBSTONE
              ? `search(${op.key}): السبر ${i} ← الخانة ${s} شاهد قبر — يجب مواصلة السبر متجاوزًا إياها.`
              : `search(${op.key}): السبر ${i} ← الخانة ${s} تحتوي على ${v} ≠ ${op.key} — واصل السبر.`,
          );
        }
        if (!outcome)
          frame(
            {},
            `search(${op.key}): all ${m} probes used — not found.`,
            5,
            `search(${op.key}): استُخدمت جميع عمليات السبر الـ${m} — غير موجود.`,
          );
      } else {
        let done = false;
        for (let i = 0; i < m; i++) {
          probes++;
          const s = probe(op.key, i, m);
          const v = table[s];
          if (v === null) {
            frame(
              { [s]: "discarded" },
              `delete(${op.key}): probe ${i} → slot ${s} is empty — ${op.key} is not in the table.`,
              8,
              `delete(${op.key}): السبر ${i} ← الخانة ${s} فارغة — ${op.key} غير موجود في الجدول.`,
            );
            done = true;
            break;
          }
          if (v === op.key) {
            table[s] = TOMBSTONE;
            frame(
              { [s]: "swap" },
              `delete(${op.key}): found at slot ${s} — replace with a tombstone (NOT empty, or later probe chains would break).`,
              9,
              `delete(${op.key}): وُجد في الخانة ${s} — استبدله بشاهد قبر (وليس بخانة فارغة، وإلا لانكسرت سلاسل السبر اللاحقة).`,
            );
            done = true;
            break;
          }
          frame(
            { [s]: "compare" },
            `delete(${op.key}): probe ${i} → slot ${s} ${v === TOMBSTONE ? "is a tombstone" : `holds ${v}`} — keep probing.`,
            8,
            `delete(${op.key}): السبر ${i} ← الخانة ${s} ${v === TOMBSTONE ? "شاهد قبر" : `تحتوي على ${v}`} — واصل السبر.`,
          );
        }
        if (!done)
          frame(
            {},
            `delete(${op.key}): all ${m} probes used — not found.`,
            8,
            `delete(${op.key}): استُخدمت جميع عمليات السبر الـ${m} — غير موجود.`,
          );
      }
    }

    frame(
      {},
      `Done. ${live()} live keys in ${m} slots (α = ${(live() / m).toFixed(2)}), ${collisions} collisions, ${probes} probes total.`,
      10,
      `انتهى. ${live()} مفتاحًا حيًّا في ${m} خانة (α = ${(live() / m).toFixed(2)})، ${collisions} تصادمًا، ${probes} عملية سبر إجمالًا.`,
    );
    return steps;
  };
}

const generate = makeOpenAddressingGenerate(
  (k, i, m) => (((k % m) + m) % m + i) % m,
  (k, i, m) => `(${k} mod ${m} + ${i}) mod ${m}`,
  (m) => `Linear probing: hᵢ(k) = (k mod ${m} + i) mod ${m} — step one slot at a time.`,
);

export function randomOAInput(level: number, rng: { int: (a: number, b: number) => number; next: () => number; pick: <T>(arr: readonly T[]) => T }): OAInput {
  const size = [0, 7, 7, 11, 11, 13][level] ?? 11;
  const count = Math.min(12, 4 + level * 2);
  const inserted: number[] = [];
  const ops: OAOp[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng.next();
    if (inserted.length === 0 || r < 0.65) {
      const key = rng.int(1, 99);
      if (!inserted.includes(key)) inserted.push(key);
      ops.push({ kind: "insert", key });
    } else if (r < 0.85) {
      ops.push({ kind: "search", key: rng.next() < 0.7 ? rng.pick(inserted) : rng.int(1, 99) });
    } else {
      const key = rng.pick(inserted);
      inserted.splice(inserted.indexOf(key), 1);
      ops.push({ kind: "delete", key });
    }
  }
  return { ops, size };
}

export const oaSerialize = (input: OAInput) => ({
  ops: input.ops.map((o) => `${o.kind} ${o.key}`).join(", "),
  size: String(input.size),
});

export const oaParse = (fields: Record<string, string>): OAInput => ({
  ops: parseOps(fields.ops ?? ""),
  size: parseSize(fields.size ?? ""),
});

export const OA_FIELDS = [
  { key: "ops", label: "Operations", placeholder: "insert 21, insert 32, search 32, delete 21", help: "Comma-separated: insert N, search N, delete N (max 40).", list: true },
  { key: "size", label: "Table size m", placeholder: "11", help: "5–31 (prime recommended)." },
];

const mod: AlgorithmModule<HashFrame, OAInput> = {
  slug: "linear-probing",
  title: "Hash Table — Linear Probing",
  titleAr: "جدول التجزئة — السبر الخطي",
  category: "hashing",
  difficulty: "Intermediate",
  tags: ["hash table", "open addressing", "linear probing", "tombstones"],
  tagsAr: ["جدول تجزئة", "عنونة مفتوحة", "سبر خطي", "شواهد قبور"],
  summary: "Resolves collisions by scanning forward one slot at a time until a free cell is found — simple and cache-friendly, but prone to clustering.",
  summaryAr: "يحل التصادمات بالمسح إلى الأمام خانة واحدة في كل مرة حتى يُعثر على خانة حرة — أسلوب بسيط وودود مع ذاكرة التخزين المؤقت، لكنه عرضة للتكتل.",
  renderer: "hash",
  pseudocode: [
    "structure: table[0..m-1], probe hᵢ(k) = (h(k) + i) mod m",
    "insert(k): try i = 0, 1, 2, … place k in first empty/tombstone slot",
    "  store k",
    "  (occupied slot → collision → next probe)",
    "  fail if all m probes are occupied",
    "search(k): probe until k found →",
    "  found",
    "  … keep probing past mismatches AND tombstones",
    "delete(k): probe to find k …",
    "  replace with tombstone (never plain empty!)",
    "// empty slot during search ⇒ key absent (stop)",
  ],
  code: {
    pseudocode: `h_i(k) = (k mod m + i) mod m
insert(k): for i in 0..m-1: s = h_i(k)
  if table[s] empty or tombstone: table[s] = k; return
search(k): for i in 0..m-1: s = h_i(k)
  if table[s] empty: return NOT_FOUND
  if table[s] == k: return s
delete(k): s = search(k); table[s] = TOMBSTONE`,
    c: `#define EMPTY -2
#define TOMB  -1
int insert(int* t, int m, int k) {
    for (int i = 0; i < m; i++) {
        int s = (k % m + i) % m;
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return s; }
        if (t[s] == k) return s;
    }
    return -1; /* full */
}
int search(int* t, int m, int k) {
    for (int i = 0; i < m; i++) {
        int s = (k % m + i) % m;
        if (t[s] == EMPTY) return -1;
        if (t[s] == k) return s;
    }
    return -1;
}`,
    cpp: `struct OpenTable {
    static constexpr int EMPTY = -2, TOMB = -1;
    vector<int> t;
    OpenTable(int m) : t(m, EMPTY) {}
    int probe(int k, int i) const { return (k % (int)t.size() + i) % t.size(); }
    bool insert(int k) {
        for (int i = 0; i < (int)t.size(); i++) {
            int s = probe(k, i);
            if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
            if (t[s] == k) return true;
        }
        return false;
    }
    int search(int k) const {
        for (int i = 0; i < (int)t.size(); i++) {
            int s = probe(k, i);
            if (t[s] == EMPTY) return -1;
            if (t[s] == k) return s;
        }
        return -1;
    }
    void erase(int k) { int s = search(k); if (s >= 0) t[s] = TOMB; }
};`,
    java: `class LinearProbing {
    static final int EMPTY = Integer.MIN_VALUE, TOMB = Integer.MIN_VALUE + 1;
    int[] t;
    LinearProbing(int m) { t = new int[m]; Arrays.fill(t, EMPTY); }
    int probe(int k, int i) { return (k % t.length + i) % t.length; }
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
    }
    void delete(int k) { int s = search(k); if (s >= 0) t[s] = TOMB; }
}`,
    python: `EMPTY, TOMB = None, "TOMB"

class LinearProbing:
    def __init__(self, m):
        self.t = [EMPTY] * m

    def _probe(self, k, i):
        return (k % len(self.t) + i) % len(self.t)

    def insert(self, k):
        for i in range(len(self.t)):
            s = self._probe(k, i)
            if self.t[s] is EMPTY or self.t[s] == TOMB:
                self.t[s] = k
                return True
            if self.t[s] == k:
                return True
        return False  # full

    def search(self, k):
        for i in range(len(self.t)):
            s = self._probe(k, i)
            if self.t[s] is EMPTY:
                return -1
            if self.t[s] == k:
                return s
        return -1

    def delete(self, k):
        s = self.search(k)
        if s >= 0:
            self.t[s] = TOMB`,
    javascript: `const EMPTY = undefined, TOMB = Symbol("tomb");
class LinearProbing {
  constructor(m) { this.t = new Array(m).fill(EMPTY); }
  probe(k, i) { return (k % this.t.length + i) % this.t.length; }
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
  }
  delete(k) { const s = this.search(k); if (s >= 0) this.t[s] = TOMB; }
}`,
    typescript: `const TOMB = Symbol("tomb");
type Slot = number | typeof TOMB | undefined;
class LinearProbing {
  t: Slot[];
  constructor(m: number) { this.t = new Array(m).fill(undefined); }
  probe(k: number, i: number): number { return (k % this.t.length + i) % this.t.length; }
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
  }
  delete(k: number): void { const s = this.search(k); if (s >= 0) this.t[s] = TOMB; }
}`,
    csharp: `class LinearProbing {
    const int EMPTY = int.MinValue, TOMB = int.MinValue + 1;
    int[] t;
    public LinearProbing(int m) { t = new int[m]; Array.Fill(t, EMPTY); }
    int Probe(int k, int i) => (k % t.Length + i) % t.Length;
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
    }
    public void Delete(int k) { int s = Search(k); if (s >= 0) t[s] = TOMB; }
}`,
    go: `const (
	EMPTY = -2
	TOMB  = -1
)

type LinearProbing struct{ t []int }

func New(m int) *LinearProbing {
	t := make([]int, m)
	for i := range t {
		t[i] = EMPTY
	}
	return &LinearProbing{t}
}
func (h *LinearProbing) probe(k, i int) int { return (k%len(h.t) + i) % len(h.t) }
func (h *LinearProbing) Insert(k int) bool {
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
func (h *LinearProbing) Search(k int) int {
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
    rust: `#[derive(Clone, PartialEq)]
enum Slot { Empty, Tomb, Key(u32) }

struct LinearProbing { t: Vec<Slot> }

impl LinearProbing {
    fn new(m: usize) -> Self { Self { t: vec![Slot::Empty; m] } }
    fn probe(&self, k: u32, i: usize) -> usize { (k as usize % self.t.len() + i) % self.t.len() }
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
    }
}`,
    kotlin: `class LinearProbing(m: Int) {
    companion object { const val EMPTY = Int.MIN_VALUE; const val TOMB = Int.MIN_VALUE + 1 }
    val t = IntArray(m) { EMPTY }
    fun probe(k: Int, i: Int) = (k % t.size + i) % t.size
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
    }
    fun delete(k: Int) { val s = search(k); if (s >= 0) t[s] = TOMB }
}`,
    swift: `enum Slot: Equatable { case empty, tomb, key(Int) }

struct LinearProbing {
    var t: [Slot]
    init(_ m: Int) { t = Array(repeating: .empty, count: m) }
    func probe(_ k: Int, _ i: Int) -> Int { (k % t.count + i) % t.count }
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
    }
}`,
  },
  content: {
    overview: `Open addressing stores every key directly in the table array — no linked lists. When two keys hash to the same slot, the table resolves the collision by probing: trying a deterministic sequence of alternative slots until a free one appears. Linear probing is the simplest sequence: just step forward one slot at a time, wrapping around, i.e. hᵢ(k) = (h(k) + i) mod m.

Linear probing is beloved in practice for its cache behavior — consecutive slots share cache lines, so probing is nearly free on modern hardware. Its weakness is primary clustering: occupied slots form contiguous runs, and any key hashing anywhere into a run must traverse to its end, making runs grow ever faster the longer they get. Performance degrades sharply as the load factor approaches 1, so real implementations resize around α = 0.5–0.7. Deletion needs care too: emptying a slot would break probe chains passing through it, so deleted slots become tombstones that searches must skip over.`,
    howItWorks: [
      "Hash the key to a home slot h(k) = k mod m.",
      "Insert: probe h(k), h(k)+1, h(k)+2, … (mod m) until an empty or tombstone slot appears; store the key there.",
      "Search: follow the same sequence — a match is found; a truly empty slot proves the key is absent; tombstones must be skipped, not treated as empty.",
      "Delete: find the key, then replace it with a tombstone marker rather than emptying the slot.",
      "Resize (rehash everything into a bigger table) when the load factor α gets high — typically above ~0.7.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1/(1−α))", worst: "O(n)" },
      space: "O(m)",
      notes: "Average probes ≈ ½(1 + 1/(1−α)) for successful search under uniform hashing — excellent below α ≈ 0.7, catastrophic near α = 1. Worst case is one giant cluster: O(n) per operation.",
    },
    applications: [
      "CPU-cache-friendly hash maps (Rust's hashbrown/SwissTable lineage, Python's dict uses open addressing)",
      "Memory-constrained systems that can't afford per-node pointers",
      "Hardware and embedded tables where allocation is forbidden",
      "High-performance joins and aggregation in databases",
    ],
    advantages: [
      "Excellent cache locality — consecutive probes touch adjacent memory",
      "No pointer/allocation overhead per key (everything in one flat array)",
      "Simple to implement; trivially serializable",
    ],
    disadvantages: [
      "Primary clustering: long runs of occupied slots snowball as α grows",
      "Deletions leave tombstones that degrade searches until a rehash",
      "Performance collapses as the table nears full — must resize proactively",
    ],
    commonMistakes: [
      "Deleting by emptying the slot — this breaks every probe chain that passed through it; use a tombstone.",
      "Stopping a search at a tombstone as if it were empty (missing keys stored beyond it).",
      "Letting the load factor reach 1 — inserts loop forever or fail; resize around α ≈ 0.7.",
      "During insert, placing the key at the first tombstone without first finishing the probe to check the key isn't already stored further along (creates duplicates).",
    ],
    interviewQuestions: [
      "What is primary clustering and why does linear probing suffer from it?",
      "Why are tombstones necessary for deletion in open addressing?",
      "Derive the expected probe count as a function of load factor α.",
      "Why is linear probing often faster than chaining in practice despite clustering?",
      "When should the table resize, and what happens to tombstones during a rehash?",
    ],
    summary:
      "Linear probing resolves collisions by scanning forward one slot at a time — cache-friendly and pointer-free, at the cost of primary clustering as the load factor grows. Deletions must leave tombstones so probe chains stay intact, and resizing around α ≈ 0.7 keeps expected probes O(1).",
    quiz: [
      { question: "Linear probing's probe sequence is…", options: ["h(k), h(k)·2, h(k)·4, …", "(h(k) + i) mod m for i = 0, 1, 2, …", "Random slots", "(h(k) + i²) mod m"], answer: 1, explanation: "It simply steps forward one slot at a time, wrapping around the table." },
      { question: "Primary clustering means…", options: ["Keys cluster by value", "Contiguous runs of occupied slots grow and merge, lengthening probes", "The first slot is always full", "Hash values repeat"], answer: 1, explanation: "Any key landing inside a run must walk to its end — so longer runs catch more keys and grow even faster." },
      { question: "Deleting a key must leave a tombstone because…", options: ["It looks nicer", "An empty slot would falsely terminate searches for keys stored beyond it", "Memory can't be freed", "Tombstones speed up inserts"], answer: 1, explanation: "Searches stop at truly empty slots, so emptying a mid-chain slot would hide later keys." },
      { question: "A search can safely stop when it hits…", options: ["A tombstone", "Any occupied slot", "A truly empty slot", "Slot 0"], answer: 2, explanation: "An empty slot proves the key was never placed further along its probe sequence; tombstones must be skipped." },
      { question: "As load factor α → 1, expected probes for linear probing…", options: ["Stay constant", "Grow roughly like 1/(1−α) — they explode", "Decrease", "Equal exactly 2"], answer: 1, explanation: "Clustering makes performance collapse near a full table, which is why implementations resize early." },
    ],
  },
  contentAr: {
    overview: `تخزّن العنونة المفتوحة كل مفتاح مباشرة داخل مصفوفة الجدول — بلا قوائم مترابطة. عندما يتجزأ مفتاحان إلى نفس الخانة، يحل الجدول التصادم بالسبر: تجربة تسلسل محدد من الخانات البديلة حتى تظهر خانة حرة. السبر الخطي هو أبسط تسلسل: تقدّم خانة واحدة فقط في كل مرة، مع الالتفاف عند نهاية الجدول، أي hᵢ(k) = (h(k) + i) mod m.

يحظى السبر الخطي بشعبية عملية بفضل سلوكه مع ذاكرة التخزين المؤقت — الخانات المتتالية تتشارك أسطر ذاكرة التخزين المؤقت (Cache Lines)، فيصبح السبر شبه مجاني على العتاد الحديث. ونقطة ضعفه هي التكتل الأولي: تُشكّل الخانات المشغولة سلاسل متتالية، وأي مفتاح يتجزأ إلى أي مكان داخل سلسلة يجب أن يعبرها حتى نهايتها، ما يجعل السلاسل تنمو أسرع كلما طالت. يتدهور الأداء بشدة مع اقتراب معامل التحميل من 1، لذا تُعيد التطبيقات الحقيقية التحجيم عند α يقارب 0.5–0.7. يحتاج الحذف أيضًا إلى عناية: إفراغ خانة قد يكسر سلاسل السبر المارة عبرها، لذا تصبح الخانات المحذوفة شواهد قبور يجب على عمليات البحث تجاوزها.`,
    howItWorks: [
      "تجزّأ المفتاح إلى خانة أصلية h(k) = k mod m.",
      "الإدراج: اسبر h(k)، h(k)+1، h(k)+2، … (mod m) حتى تظهر خانة فارغة أو شاهد قبر؛ خزّن المفتاح هناك.",
      "البحث: اتبع التسلسل نفسه — تطابق يعني العثور عليه؛ خانة فارغة حقًا تثبت غياب المفتاح؛ يجب تجاوز شواهد القبور لا معاملتها كخانات فارغة.",
      "الحذف: اعثر على المفتاح، ثم استبدله بعلامة شاهد قبر بدلًا من إفراغ الخانة.",
      "أعد التحجيم (أعد تجزئة كل شيء في جدول أكبر) عندما يرتفع معامل التحميل α — عادة فوق ~0.7.",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1/(1−α))", worst: "O(n)" },
      space: "O(m)",
      notes: "متوسط عمليات السبر ≈ ½(1 + 1/(1−α)) للبحث الناجح تحت التجزئة المنتظمة — ممتاز عند α أقل من نحو 0.7، وكارثي بالقرب من α = 1. أسوأ حالة هي تكتل عملاق واحد: O(n) لكل عملية.",
    },
    applications: [
      "خرائط تجزئة ودودة مع ذاكرة التخزين المؤقت للمعالج (مثل عائلة hashbrown/SwissTable في Rust، وقاموس Python الذي يستخدم العنونة المفتوحة)",
      "الأنظمة محدودة الذاكرة التي لا تحتمل مؤشرات لكل عقدة",
      "جداول العتاد والأنظمة المدمجة حيث يُمنع التخصيص الديناميكي",
      "عمليات الربط (Joins) والتجميع عالية الأداء في قواعد البيانات",
    ],
    advantages: [
      "محلية ذاكرة تخزين مؤقت ممتازة — عمليات السبر المتتالية تلامس ذاكرة متجاورة",
      "بلا عبء مؤشرات أو تخصيص لكل مفتاح (كل شيء في مصفوفة مسطحة واحدة)",
      "سهل التنفيذ، وقابل للتسلسل (Serialization) بلا تعقيد",
    ],
    disadvantages: [
      "التكتل الأولي: تتضخم سلاسل الخانات المشغولة الطويلة مع نمو α",
      "تترك عمليات الحذف شواهد قبور تُضعف عمليات البحث حتى إعادة التجزئة",
      "ينهار الأداء عندما يقترب الجدول من الامتلاء — يجب إعادة التحجيم استباقيًا",
    ],
    commonMistakes: [
      "الحذف بإفراغ الخانة — هذا يكسر كل سلسلة سبر مرت عبرها؛ استخدم شاهد قبر بدلًا من ذلك.",
      "إيقاف البحث عند شاهد قبر كأنه خانة فارغة (ما يفوّت مفاتيح مخزنة بعده).",
      "ترك معامل التحميل يصل إلى 1 — تدخل عمليات الإدراج في حلقة لا نهائية أو تفشل؛ أعد التحجيم عند α ≈ 0.7.",
      "أثناء الإدراج، وضع المفتاح في أول شاهد قبر دون إتمام السبر أولًا للتحقق من عدم تخزين المفتاح مسبقًا لاحقًا (ما يُنشئ تكرارات).",
    ],
    interviewQuestions: [
      "ما هو التكتل الأولي، ولماذا يعاني منه السبر الخطي؟",
      "لماذا تُعد شواهد القبور ضرورية للحذف في العنونة المفتوحة؟",
      "اشتق العدد المتوقع لعمليات السبر كدالة في معامل التحميل α.",
      "لماذا يكون السبر الخطي أسرع غالبًا من السلاسل المنفصلة عمليًا رغم التكتل؟",
      "متى ينبغي أن يُعاد تحجيم الجدول، وماذا يحدث لشواهد القبور أثناء إعادة التجزئة؟",
    ],
    summary:
      "يحل السبر الخطي التصادمات بالمسح إلى الأمام خانة واحدة في كل مرة — ودود مع ذاكرة التخزين المؤقت وخالٍ من المؤشرات، مقابل تكتل أولي مع نمو معامل التحميل. يجب أن تترك عمليات الحذف شواهد قبور حتى تبقى سلاسل السبر سليمة، وإعادة التحجيم عند α ≈ 0.7 تُبقي العدد المتوقع لعمليات السبر عند O(1).",
    quiz: [
      { question: "تسلسل السبر في السبر الخطي هو…", options: ["h(k)، h(k)·2، h(k)·4، …", "(h(k) + i) mod m لـ i = 0, 1, 2, …", "خانات عشوائية", "(h(k) + i²) mod m"], answer: 1, explanation: "يتقدم ببساطة خانة واحدة في كل مرة، مع الالتفاف حول الجدول." },
      { question: "التكتل الأولي يعني…", options: ["تتكتل المفاتيح حسب القيمة", "تنمو سلاسل الخانات المشغولة المتتالية وتندمج، ما يطيل عمليات السبر", "الخانة الأولى ممتلئة دائمًا", "تتكرر قيم التجزئة"], answer: 1, explanation: "أي مفتاح يهبط داخل سلسلة يجب أن يسير حتى نهايتها — فالسلاسل الأطول تلتقط مفاتيح أكثر وتنمو أسرع." },
      { question: "يجب أن يترك حذف المفتاح شاهد قبر لأن…", options: ["ذلك يبدو أجمل", "الخانة الفارغة ستُنهي البحث زورًا عن مفاتيح مخزنة بعدها", "لا يمكن تحرير الذاكرة", "شواهد القبور تُسرّع الإدراج"], answer: 1, explanation: "يتوقف البحث عند الخانات الفارغة حقًا، فإفراغ خانة في منتصف السلسلة سيُخفي مفاتيح لاحقة." },
      { question: "يمكن للبحث أن يتوقف بأمان عندما يصادف…", options: ["شاهد قبر", "أي خانة مشغولة", "خانة فارغة حقًا", "الخانة رقم 0"], answer: 2, explanation: "الخانة الفارغة تثبت أن المفتاح لم يُوضع أبدًا في موضع لاحق من تسلسل سبره؛ يجب تجاوز شواهد القبور." },
      { question: "مع اقتراب معامل التحميل α من 1، فإن عدد عمليات السبر المتوقع في السبر الخطي…", options: ["يبقى ثابتًا", "ينمو تقريبًا كـ 1/(1−α) — أي ينفجر", "يتناقص", "يساوي 2 بالضبط"], answer: 1, explanation: "يتسبب التكتل في انهيار الأداء بالقرب من امتلاء الجدول، لهذا تُعيد التطبيقات التحجيم مبكرًا." },
    ],
  },
  inputFields: OA_FIELDS,
  defaultInput: (level, rng) => randomOAInput(level, rng),
  parseInput: oaParse,
  serializeInput: oaSerialize,
  generate,
};

export default mod;
