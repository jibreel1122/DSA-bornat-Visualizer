import type { AlgorithmModule, HashFrame } from "@/lib/engine/types";
import {
  makeOpenAddressingGenerate,
  randomOAInput,
  oaParse,
  oaSerialize,
  OA_FIELDS,
  type OAInput,
} from "./linear-probing";

// secondary hash: must never return 0 (or probing would stall on collision)
function h2(k: number, m: number): number {
  const prime = m > 2 ? m - 1 : 1; // any value coprime to m works; m-1 is a safe classic choice
  return 1 + (((k % prime) + prime) % prime);
}

const generate = makeOpenAddressingGenerate(
  (k, i, m) => ((((k % m) + m) % m) + i * h2(k, m)) % m,
  (k, i, m) => `(${k} mod ${m} + ${i}·h₂(${k})) mod ${m}`,
  (m) => `Double hashing: hᵢ(k) = (h₁(k) + i·h₂(k)) mod ${m}, where h₁(k) = k mod ${m} and h₂(k) = 1 + (k mod ${m - 1}) is a per-key step size.`,
);

const mod: AlgorithmModule<HashFrame, OAInput> = {
  slug: "double-hashing",
  title: "Hash Table — Double Hashing",
  titleAr: "جدول التجزئة — التجزئة المزدوجة",
  category: "hashing",
  difficulty: "Advanced",
  tags: ["hash table", "open addressing", "double hashing", "collision resolution"],
  tagsAr: ["جدول تجزئة", "عنونة مفتوحة", "تجزئة مزدوجة", "حل التصادمات"],
  summary: "Uses a second hash function as the step size, so different keys sharing a home slot follow completely different probe paths — no clustering.",
  summaryAr: "يستخدم دالة تجزئة ثانية كحجم خطوة، بحيث تتبع المفاتيح المختلفة التي تتشارك خانة أصلية مسارات سبر مختلفة تمامًا — بلا تكتل.",
  renderer: "hash",
  pseudocode: [
    "structure: table[0..m-1], h1(k)=k mod m, h2(k)=1+(k mod (m-1)), hᵢ(k) = (h1(k) + i·h2(k)) mod m",
    "insert(k): try i = 0, 1, 2, … place k in first empty/tombstone slot",
    "  store k",
    "  (occupied slot → collision → next probe)",
    "  fail if all m probes are occupied",
    "search(k): probe until k found →",
    "  found",
    "  … keep probing past mismatches AND tombstones",
    "delete(k): probe to find k …",
    "  replace with tombstone (never plain empty!)",
    "// each key's step size is different ⇒ no shared probe paths",
  ],
  code: {
    pseudocode: `h1(k) = k mod m
h2(k) = 1 + (k mod (m - 1))
h_i(k) = (h1(k) + i * h2(k)) mod m
insert(k): for i in 0..m-1: s = h_i(k)
  if table[s] empty or tombstone: table[s] = k; return
search(k): for i in 0..m-1: s = h_i(k)
  if table[s] empty: return NOT_FOUND
  if table[s] == k: return s`,
    c: `int h1(int k, int m) { return k % m; }
int h2(int k, int m) { return 1 + (k % (m - 1)); }
int probe(int k, int i, int m) { return (h1(k, m) + i * h2(k, m)) % m; }
int insert(int* t, int m, int k) {
    for (int i = 0; i < m; i++) {
        int s = probe(k, i, m);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return s; }
        if (t[s] == k) return s;
    }
    return -1;
}`,
    cpp: `int h1(int k, int m) { return k % m; }
int h2(int k, int m) { return 1 + (k % (m - 1)); }
int probe(int k, int i, int m) { return (h1(k, m) + i * h2(k, m)) % m; }
bool insert(vector<int>& t, int k) {
    int m = t.size();
    for (int i = 0; i < m; i++) {
        int s = probe(k, i, m);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
        if (t[s] == k) return true;
    }
    return false;
}`,
    java: `int h1(int k) { return k % t.length; }
int h2(int k) { return 1 + (k % (t.length - 1)); }
int probe(int k, int i) { return (h1(k) + i * h2(k)) % t.length; }
boolean insert(int k) {
    for (int i = 0; i < t.length; i++) {
        int s = probe(k, i);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
        if (t[s] == k) return true;
    }
    return false;
}`,
    python: `def _h1(self, k):
    return k % len(self.t)

def _h2(self, k):
    return 1 + (k % (len(self.t) - 1))

def _probe(self, k, i):
    return (self._h1(k) + i * self._h2(k)) % len(self.t)

def insert(self, k):
    for i in range(len(self.t)):
        s = self._probe(k, i)
        if self.t[s] is EMPTY or self.t[s] == TOMB:
            self.t[s] = k
            return True
        if self.t[s] == k:
            return True
    return False`,
    javascript: `h1(k) { return k % this.t.length; }
h2(k) { return 1 + (k % (this.t.length - 1)); }
probe(k, i) { return (this.h1(k) + i * this.h2(k)) % this.t.length; }
insert(k) {
  for (let i = 0; i < this.t.length; i++) {
    const s = this.probe(k, i);
    if (this.t[s] === EMPTY || this.t[s] === TOMB) { this.t[s] = k; return true; }
    if (this.t[s] === k) return true;
  }
  return false;
}`,
    typescript: `h1(k: number): number { return k % this.t.length; }
h2(k: number): number { return 1 + (k % (this.t.length - 1)); }
probe(k: number, i: number): number { return (this.h1(k) + i * this.h2(k)) % this.t.length; }
insert(k: number): boolean {
  for (let i = 0; i < this.t.length; i++) {
    const s = this.probe(k, i);
    if (this.t[s] === undefined || this.t[s] === TOMB) { this.t[s] = k; return true; }
    if (this.t[s] === k) return true;
  }
  return false;
}`,
    csharp: `int H1(int k) => k % t.Length;
int H2(int k) => 1 + (k % (t.Length - 1));
int Probe(int k, int i) => (H1(k) + i * H2(k)) % t.Length;
public bool Insert(int k) {
    for (int i = 0; i < t.Length; i++) {
        int s = Probe(k, i);
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true; }
        if (t[s] == k) return true;
    }
    return false;
}`,
    go: `func h1(k, m int) int { return k % m }
func h2(k, m int) int { return 1 + k%(m-1) }
func (h *Table) probe(k, i int) int {
	m := len(h.t)
	return (h1(k, m) + i*h2(k, m)) % m
}
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
}`,
    rust: `fn h1(k: u32, m: usize) -> usize { k as usize % m }
fn h2(k: u32, m: usize) -> usize { 1 + (k as usize % (m - 1)) }
fn probe(&self, k: u32, i: usize) -> usize {
    let m = self.t.len();
    (h1(k, m) + i * h2(k, m)) % m
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
}`,
    kotlin: `fun h1(k: Int) = k % t.size
fun h2(k: Int) = 1 + (k % (t.size - 1))
fun probe(k: Int, i: Int) = (h1(k) + i * h2(k)) % t.size
fun insert(k: Int): Boolean {
    for (i in t.indices) {
        val s = probe(k, i)
        if (t[s] == EMPTY || t[s] == TOMB) { t[s] = k; return true }
        if (t[s] == k) return true
    }
    return false
}`,
    swift: `func h1(_ k: Int) -> Int { k % t.count }
func h2(_ k: Int) -> Int { 1 + (k % (t.count - 1)) }
func probe(_ k: Int, _ i: Int) -> Int { (h1(k) + i * h2(k)) % t.count }
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
}`,
  },
  content: {
    overview: `Double hashing is the most collision-resistant of the classic open-addressing schemes. Instead of a fixed step (linear probing) or a fixed formula shared by all keys (quadratic probing), it computes the step size itself from the key using a second hash function: hᵢ(k) = (h₁(k) + i·h₂(k)) mod m. Two different keys landing on the same home slot almost always get different step sizes, so their probe sequences diverge immediately — eliminating secondary clustering along with linear probing's primary clustering.

The one hard requirement is that h₂(k) must never be 0 and must be coprime to m (guaranteed automatically when m is prime and h₂(k) ∈ [1, m−1]), otherwise the probe sequence would revisit the same slot forever without covering the table. This module uses h₂(k) = 1 + (k mod (m−1)), a standard choice that stays in [1, m−1] and works cleanly whenever m is prime.`,
    howItWorks: [
      "Compute the home slot h₁(k) = k mod m.",
      "Compute a per-key step size h₂(k) = 1 + (k mod (m−1)), guaranteed nonzero.",
      "Probe sequence: hᵢ(k) = (h₁(k) + i·h₂(k)) mod m for i = 0, 1, 2, …",
      "Insert/search/delete all use this same sequence; a truly empty slot ends a search, tombstones are skipped, and deletions plant tombstones.",
      "With m prime, every key's sequence is guaranteed to eventually visit all m slots (since h₂(k) is coprime to m).",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1/(1−α))", worst: "O(n)" },
      space: "O(m)",
      notes: "Double hashing most closely approximates the theoretical ideal of uniform hashing, giving the best average probe counts of the open-addressing family for a given load factor α.",
    },
    applications: [
      "High-performance hash tables where clustering must be minimized without chaining's pointer overhead",
      "Cryptographic and hash-based data structures needing near-uniform probe distributions",
      "Database index structures and in-memory caches under high load factors",
      "Competitive programming hash sets where guaranteed low clustering matters",
    ],
    advantages: [
      "Eliminates both primary and secondary clustering — closest to ideal uniform hashing",
      "Still pointer-free, single flat array",
      "Best average-case probe counts among open-addressing schemes at a given α",
    ],
    disadvantages: [
      "Requires a well-designed second hash function (must be nonzero and coprime to m)",
      "More arithmetic per probe than linear or quadratic probing",
      "Loses cache locality entirely — each probe can jump anywhere in the table",
    ],
    commonMistakes: [
      "Letting h₂(k) evaluate to 0 for some key — that key would probe the same slot forever.",
      "Choosing h₂ and m so they aren't coprime (e.g., both even) — the probe sequence then only visits a subset of slots.",
      "Reusing the same formula/constant for h₁ and h₂ (they must be independent for probes to diverge).",
      "Forgetting tombstones on delete, same pitfall as linear/quadratic probing.",
    ],
    interviewQuestions: [
      "Why must h₂(k) never be zero, and what happens if it is?",
      "Why does m being prime matter for double hashing's coverage guarantee?",
      "Compare clustering behavior of linear, quadratic, and double hashing.",
      "Why does double hashing lose the cache-locality advantage of linear probing?",
      "Design a valid h₂(k) for a table of size m and justify why it works.",
    ],
    summary:
      "Double hashing computes each key's own probe step size via a second hash function, hᵢ(k) = (h₁(k) + i·h₂(k)) mod m, so different keys diverge immediately instead of sharing a probe path — eliminating both primary and secondary clustering. It needs h₂(k) ≠ 0 and coprime to m (guaranteed by prime m), and gives the best average-case probe counts of the open-addressing family, at the cost of cache locality.",
    quiz: [
      { question: "Double hashing's probe sequence is…", options: ["(h(k) + i) mod m", "(h(k) + i²) mod m", "(h1(k) + i·h2(k)) mod m", "Random"], answer: 2, explanation: "The step size h2(k) depends on the key itself, unlike linear or quadratic probing's shared formulas." },
      { question: "What must be true of h2(k)?", options: ["It must equal h1(k)", "It must never be 0 and should be coprime to m", "It must be negative", "It must equal m"], answer: 1, explanation: "A zero step would probe the same slot forever; non-coprime steps might never reach some slots." },
      { question: "Compared to quadratic probing, double hashing…", options: ["Has worse clustering", "Eliminates secondary clustering because different keys get different step sizes", "Doesn't need tombstones", "Is always slower to compute"], answer: 1, explanation: "Quadratic probing shares one formula for all keys; double hashing personalizes the step per key." },
      { question: "A common trade-off of double hashing is…", options: ["It cannot delete keys", "Loss of cache locality since probes can jump far each step", "It requires chaining", "It only works for strings"], answer: 1, explanation: "Unlike linear probing's adjacent-slot walk, double-hashing steps can be scattered across the table." },
      { question: "Why is m typically chosen to be prime for double hashing?", options: ["Aesthetic reasons", "It guarantees h2(k) is coprime to m, so all m slots are eventually reachable", "Prime tables are faster to allocate", "It's required by the hash function syntax"], answer: 1, explanation: "Coprimality between the step size and table size guarantees the probe sequence is a full permutation of all slots." },
    ],
  },
  contentAr: {
    overview: `التجزئة المزدوجة هي الأكثر مقاومة للتصادمات بين مخططات العنونة المفتوحة الكلاسيكية. فبدلًا من خطوة ثابتة (السبر الخطي) أو صيغة ثابتة مشتركة بين كل المفاتيح (السبر التربيعي)، تحسب حجم الخطوة نفسه من المفتاح باستخدام دالة تجزئة ثانية: hᵢ(k) = (h₁(k) + i·h₂(k)) mod m. مفتاحان مختلفان يهبطان في الخانة الأصلية نفسها يحصلان غالبًا على حجمي خطوة مختلفين، فيتباعد مساراهما في السبر فورًا — ما يُلغي التكتل الثانوي إلى جانب التكتل الأولي الخاص بالسبر الخطي.

الشرط الصارم الوحيد هو ألا تساوي h₂(k) صفرًا أبدًا وأن تكون أولية نسبيًا (Coprime) مع m (وهو مضمون تلقائيًا عندما يكون m عددًا أوليًا وh₂(k) ∈ [1, m−1])، وإلا فإن تسلسل السبر سيعود إلى الخانة نفسها إلى الأبد دون تغطية الجدول. تستخدم هذه الوحدة h₂(k) = 1 + (k mod (m−1))، وهو خيار قياسي يبقى ضمن [1, m−1] ويعمل بسلاسة كلما كان m عددًا أوليًا.`,
    howItWorks: [
      "احسب الخانة الأصلية h₁(k) = k mod m.",
      "احسب حجم خطوة خاصًا بكل مفتاح h₂(k) = 1 + (k mod (m−1))، وهو مضمون ألا يساوي صفرًا.",
      "تسلسل السبر: hᵢ(k) = (h₁(k) + i·h₂(k)) mod m لـ i = 0, 1, 2, …",
      "تستخدم كل من الإدراج والبحث والحذف التسلسل نفسه؛ تنهي الخانة الفارغة حقًا عملية البحث، وتُتجاوز شواهد القبور، وتزرع عمليات الحذف شواهد قبور جديدة.",
      "مع m أولي، يُضمن أن يزور تسلسل كل مفتاح جميع الخانات الـm في النهاية (لأن h₂(k) أولية نسبيًا مع m).",
    ],
    complexity: {
      time: { best: "O(1)", average: "O(1/(1−α))", worst: "O(n)" },
      space: "O(m)",
      notes: "تقترب التجزئة المزدوجة أكثر من غيرها من المثال النظري للتجزئة المنتظمة، فتمنح أفضل متوسط لعدد عمليات السبر بين عائلة العنونة المفتوحة عند معامل تحميل α معطى.",
    },
    applications: [
      "جداول تجزئة عالية الأداء يجب فيها تقليل التكتل دون عبء المؤشرات الخاص بالسلاسل المنفصلة",
      "هياكل بيانات تشفيرية وقائمة على التجزئة تحتاج توزيعات سبر شبه منتظمة",
      "هياكل فهرسة قواعد البيانات والذاكرة المؤقتة في الذاكرة عند معاملات تحميل مرتفعة",
      "مجموعات التجزئة (Hash Sets) في البرمجة التنافسية حيث يهم ضمان تكتل منخفض",
    ],
    advantages: [
      "يُلغي كلًا من التكتل الأولي والثانوي — الأقرب إلى التجزئة المنتظمة المثالية",
      "لا يزال خاليًا من المؤشرات، مصفوفة مسطحة واحدة",
      "أفضل متوسط لعدد عمليات السبر بين مخططات العنونة المفتوحة عند α معطى",
    ],
    disadvantages: [
      "يتطلب دالة تجزئة ثانية مصممة جيدًا (يجب ألا تساوي صفرًا وأن تكون أولية نسبيًا مع m)",
      "عمليات حسابية أكثر لكل سبر مقارنة بالسبر الخطي أو التربيعي",
      "يفقد محلية ذاكرة التخزين المؤقت تمامًا — يمكن لكل عملية سبر أن تقفز إلى أي مكان في الجدول",
    ],
    commonMistakes: [
      "ترك h₂(k) تُقيَّم إلى صفر لبعض المفاتيح — فسيسبر ذلك المفتاح الخانة نفسها إلى الأبد.",
      "اختيار h₂ وm بحيث لا يكونان أوليين نسبيًا (كأن يكونا زوجيين معًا) — عندها لا يزور تسلسل السبر سوى مجموعة فرعية من الخانات.",
      "إعادة استخدام الصيغة أو الثابت نفسه لكل من h₁ وh₂ (يجب أن يكونا مستقلين حتى تتباعد عمليات السبر).",
      "نسيان شواهد القبور عند الحذف، وهو نفس الخطأ الشائع في السبر الخطي والتربيعي.",
    ],
    interviewQuestions: [
      "لماذا يجب ألا تساوي h₂(k) صفرًا أبدًا، وماذا يحدث إن كانت كذلك؟",
      "لماذا يهم أن يكون m عددًا أوليًا لضمان تغطية التجزئة المزدوجة؟",
      "قارن سلوك التكتل بين السبر الخطي والتربيعي والتجزئة المزدوجة.",
      "لماذا تفقد التجزئة المزدوجة ميزة محلية ذاكرة التخزين المؤقت التي يتمتع بها السبر الخطي؟",
      "صمّم دالة h₂(k) صالحة لجدول بحجم m وبرّر سبب نجاحها.",
    ],
    summary:
      "تحسب التجزئة المزدوجة حجم خطوة السبر الخاص بكل مفتاح عبر دالة تجزئة ثانية، hᵢ(k) = (h₁(k) + i·h₂(k)) mod m، بحيث تتباعد المفاتيح المختلفة فورًا بدلًا من تشارك مسار سبر واحد — ما يُلغي التكتل الأولي والثانوي معًا. تحتاج إلى h₂(k) ≠ 0 وأولية نسبيًا مع m (وهو مضمون عندما يكون m عددًا أوليًا)، وتمنح أفضل متوسط لعدد عمليات السبر بين عائلة العنونة المفتوحة، مقابل فقدان محلية ذاكرة التخزين المؤقت.",
    quiz: [
      { question: "تسلسل السبر في التجزئة المزدوجة هو…", options: ["(h(k) + i) mod m", "(h(k) + i²) mod m", "(h1(k) + i·h2(k)) mod m", "عشوائي"], answer: 2, explanation: "يعتمد حجم الخطوة h2(k) على المفتاح نفسه، على عكس الصيغ المشتركة في السبر الخطي أو التربيعي." },
      { question: "ما الذي يجب أن يكون صحيحًا بشأن h2(k)؟", options: ["يجب أن تساوي h1(k)", "يجب ألا تساوي 0 أبدًا وأن تكون أولية نسبيًا مع m", "يجب أن تكون سالبة", "يجب أن تساوي m"], answer: 1, explanation: "خطوة تساوي صفرًا ستسبر الخانة نفسها إلى الأبد؛ والخطوات غير الأولية نسبيًا قد لا تصل أبدًا إلى بعض الخانات." },
      { question: "مقارنة بالسبر التربيعي، التجزئة المزدوجة…", options: ["لديها تكتل أسوأ", "تُلغي التكتل الثانوي لأن المفاتيح المختلفة تحصل على أحجام خطوات مختلفة", "لا تحتاج إلى شواهد قبور", "أبطأ دائمًا في الحساب"], answer: 1, explanation: "يشترك السبر التربيعي في صيغة واحدة لكل المفاتيح؛ بينما تُخصص التجزئة المزدوجة الخطوة لكل مفتاح." },
      { question: "من المقايضات الشائعة للتجزئة المزدوجة…", options: ["لا يمكنها حذف المفاتيح", "فقدان محلية ذاكرة التخزين المؤقت لأن عمليات السبر قد تقفز بعيدًا في كل خطوة", "تتطلب السلاسل المنفصلة", "تعمل فقط مع النصوص"], answer: 1, explanation: "على عكس مسير السبر الخطي عبر خانات متجاورة، يمكن أن تتناثر خطوات التجزئة المزدوجة عبر الجدول." },
      { question: "لماذا يُختار m عادة ليكون عددًا أوليًا في التجزئة المزدوجة؟", options: ["لأسباب جمالية", "لأن ذلك يضمن أن h2(k) أولية نسبيًا مع m، فتصبح كل الخانات الـm قابلة للوصول في النهاية", "الجداول الأولية أسرع في التخصيص", "تفرضه صياغة دالة التجزئة"], answer: 1, explanation: "الأولية النسبية بين حجم الخطوة وحجم الجدول تضمن أن تسلسل السبر تبديلة كاملة لجميع الخانات." },
    ],
  },
  inputFields: OA_FIELDS,
  defaultInput: (level, rng) => randomOAInput(level, rng),
  parseInput: oaParse,
  serializeInput: oaSerialize,
  generate,
};

export default mod;
