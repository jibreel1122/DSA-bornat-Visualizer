import type { AlgorithmModule, CellState, Step, StringFrame } from "@/lib/engine/types";
import { randomString } from "@/lib/engine/random";

type Input = { text: string; pattern: string };

const BASE = 31;
const MOD = 1_000_000_007;

function generate(input: Input): Step<StringFrame>[] {
  const t = input.text;
  const p = input.pattern;
  const n = t.length;
  const m = p.length;
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0;
  let hashHits = 0;
  const matches: number[] = [];

  const frame = (
    textStates: Record<number, CellState>,
    patStates: Record<number, CellState>,
    description: string,
    codeLine: number,
    extraAux: { label: string; values: (string | number)[] }[] = [],
  ) => {
    steps.push({
      frame: {
        text: [...t].map((ch, i) => ({ ch, state: textStates[i] })),
        pattern: [...p].map((ch, i) => ({ ch, state: patStates[i] })),
        shift: 0,
        aux: [
          { label: "Matches", values: matches.length ? [...matches] : ["—"] },
          ...extraAux,
        ],
      },
      description,
      codeLine,
      counters: { comparisons, hashHits, matches: matches.length },
    });
  };

  // precompute h = BASE^(m-1) mod MOD
  let h = 1;
  for (let i = 0; i < m - 1; i++) h = (h * BASE) % MOD;

  let patHash = 0;
  for (let i = 0; i < m; i++) patHash = (patHash * BASE + p.charCodeAt(i)) % MOD;
  frame({}, {}, `Compute the pattern's rolling hash once: hash("${p}") = ${patHash} (mod ${MOD}).`, 0, [
    { label: "pattern hash", values: [patHash] },
  ]);

  let textHash = 0;
  for (let i = 0; i < m && i < n; i++) textHash = (textHash * BASE + t.charCodeAt(i)) % MOD;

  for (let s = 0; s + m <= n; s++) {
    const windowStates: Record<number, CellState> = {};
    for (let k = 0; k < m; k++) windowStates[s + k] = "active";
    frame(windowStates, {}, `Window [${s}, ${s + m - 1}]: hash = ${textHash}.`, 2, [
      { label: "pattern hash", values: [patHash] },
      { label: "window hash", values: [textHash] },
    ]);

    if (textHash === patHash) {
      hashHits++;
      // verify character by character to guard against hash collisions
      let ok = true;
      const cmpStates: Record<number, CellState> = {};
      const patCmpStates: Record<number, CellState> = {};
      for (let k = 0; k < m; k++) {
        comparisons++;
        if (t[s + k] !== p[k]) {
          ok = false;
          cmpStates[s + k] = "swap";
          patCmpStates[k] = "swap";
          break;
        }
        cmpStates[s + k] = "compare";
        patCmpStates[k] = "compare";
      }
      frame(
        cmpStates,
        patCmpStates,
        ok
          ? `Hashes match — verified character-by-character: real match at index ${s}.`
          : `Hashes match but characters differ (collision) — not a real match at index ${s}.`,
        3,
        [{ label: "pattern hash", values: [patHash] }, { label: "window hash", values: [textHash] }],
      );
      if (ok) {
        matches.push(s);
        const found: Record<number, CellState> = {};
        for (let k = 0; k < m; k++) found[s + k] = "found";
        frame(found, {}, `Confirmed match at index ${s}.`, 4);
      }
    }

    // roll the hash forward
    if (s + m < n) {
      textHash = ((textHash - t.charCodeAt(s) * h) % MOD + MOD) % MOD;
      textHash = (textHash * BASE + t.charCodeAt(s + m)) % MOD;
    }
  }

  frame(
    {},
    {},
    matches.length
      ? `Done. ${matches.length} match(es) at: ${matches.join(", ")}. ${hashHits} hash hit(s) checked, ${comparisons} character comparison(s).`
      : `Done. Pattern not found. ${hashHits} hash hit(s) checked, ${comparisons} character comparison(s).`,
    5,
  );
  return steps;
}

const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "rabin-karp",
  title: "Rabin-Karp String Matching",
  category: "strings",
  difficulty: "Intermediate",
  tags: ["string matching", "rolling hash", "hashing", "average O(n+m)"],
  summary: "Hashes each text window and only compares characters when hashes collide — average O(n + m).",
  renderer: "string",
  pseudocode: [
    "procedure rabinKarp(text, pattern)",
    "  patHash = hash(pattern)",
    "  windowHash = hash(text[0..m-1])",
    "  for s = 0 .. n-m:",
    "    if windowHash == patHash:",
    "      verify text[s..s+m-1] == pattern character by character",
    "      if equal: report match at s",
    "    roll windowHash forward by one position",
  ],
  code: {
    pseudocode: `patHash = hash(pattern)
windowHash = hash(text[0..m-1])
for s in 0..n-m:
  if windowHash == patHash and text[s..s+m-1] == pattern:
    report s
  windowHash = roll(windowHash, text[s], text[s+m])`,
    c: `#define BASE 31
#define MOD 1000000007
void rabinKarp(const char* t, const char* p) {
    int n = strlen(t), m = strlen(p);
    long h = 1;
    for (int i = 0; i < m - 1; i++) h = (h * BASE) % MOD;
    long ph = 0, th = 0;
    for (int i = 0; i < m; i++) { ph = (ph * BASE + p[i]) % MOD; th = (th * BASE + t[i]) % MOD; }
    for (int s = 0; s + m <= n; s++) {
        if (ph == th && strncmp(t + s, p, m) == 0) printf("%d ", s);
        if (s + m < n) { th = ((th - t[s] * h) % MOD + MOD) % MOD; th = (th * BASE + t[s + m]) % MOD; }
    }
}`,
    cpp: `void rabinKarp(const string& t, const string& p) {
    const long BASE = 31, MOD = 1'000'000'007;
    int n = t.size(), m = p.size();
    long h = 1;
    for (int i = 0; i < m - 1; i++) h = (h * BASE) % MOD;
    long ph = 0, th = 0;
    for (int i = 0; i < m; i++) { ph = (ph * BASE + p[i]) % MOD; th = (th * BASE + t[i]) % MOD; }
    for (int s = 0; s + m <= n; s++) {
        if (ph == th && t.compare(s, m, p) == 0) cout << s << ' ';
        if (s + m < n) { th = ((th - t[s] * h) % MOD + MOD) % MOD; th = (th * BASE + t[s + m]) % MOD; }
    }
}`,
    java: `static void rabinKarp(String t, String p) {
    final long BASE = 31, MOD = 1_000_000_007L;
    int n = t.length(), m = p.length();
    long h = 1;
    for (int i = 0; i < m - 1; i++) h = (h * BASE) % MOD;
    long ph = 0, th = 0;
    for (int i = 0; i < m; i++) { ph = (ph * BASE + p.charAt(i)) % MOD; th = (th * BASE + t.charAt(i)) % MOD; }
    for (int s = 0; s + m <= n; s++) {
        if (ph == th && t.regionMatches(s, p, 0, m)) System.out.print(s + " ");
        if (s + m < n) { th = ((th - t.charAt(s) * h) % MOD + MOD) % MOD; th = (th * BASE + t.charAt(s + m)) % MOD; }
    }
}`,
    python: `def rabin_karp(t, p):
    BASE, MOD = 31, 1_000_000_007
    n, m = len(t), len(p)
    h = pow(BASE, m - 1, MOD)
    ph = th = 0
    for i in range(m):
        ph = (ph * BASE + ord(p[i])) % MOD
        th = (th * BASE + ord(t[i])) % MOD
    res = []
    for s in range(n - m + 1):
        if ph == th and t[s:s+m] == p:
            res.append(s)
        if s + m < n:
            th = (th - ord(t[s]) * h) % MOD
            th = (th * BASE + ord(t[s + m])) % MOD
    return res`,
    javascript: `function rabinKarp(t, p) {
  const BASE = 31, MOD = 1_000_000_007;
  const n = t.length, m = p.length;
  let h = 1;
  for (let i = 0; i < m - 1; i++) h = (h * BASE) % MOD;
  let ph = 0, th = 0;
  for (let i = 0; i < m; i++) { ph = (ph * BASE + t.charCodeAt ? p.charCodeAt(i) : 0) % MOD; th = (th * BASE + t.charCodeAt(i)) % MOD; }
  const res = [];
  for (let s = 0; s + m <= n; s++) {
    if (ph === th && t.slice(s, s + m) === p) res.push(s);
    if (s + m < n) {
      th = ((th - t.charCodeAt(s) * h) % MOD + MOD) % MOD;
      th = (th * BASE + t.charCodeAt(s + m)) % MOD;
    }
  }
  return res;
}`,
    typescript: `function rabinKarp(t: string, p: string): number[] {
  const BASE = 31, MOD = 1_000_000_007;
  const n = t.length, m = p.length;
  let h = 1;
  for (let i = 0; i < m - 1; i++) h = (h * BASE) % MOD;
  let ph = 0, th = 0;
  for (let i = 0; i < m; i++) { ph = (ph * BASE + p.charCodeAt(i)) % MOD; th = (th * BASE + t.charCodeAt(i)) % MOD; }
  const res: number[] = [];
  for (let s = 0; s + m <= n; s++) {
    if (ph === th && t.slice(s, s + m) === p) res.push(s);
    if (s + m < n) {
      th = ((th - t.charCodeAt(s) * h) % MOD + MOD) % MOD;
      th = (th * BASE + t.charCodeAt(s + m)) % MOD;
    }
  }
  return res;
}`,
    csharp: `static List<int> RabinKarp(string t, string p) {
    const long BASE = 31, MOD = 1_000_000_007;
    int n = t.Length, m = p.Length;
    long h = 1;
    for (int i = 0; i < m - 1; i++) h = (h * BASE) % MOD;
    long ph = 0, th = 0;
    for (int i = 0; i < m; i++) { ph = (ph * BASE + p[i]) % MOD; th = (th * BASE + t[i]) % MOD; }
    var res = new List<int>();
    for (int s = 0; s + m <= n; s++) {
        if (ph == th && string.CompareOrdinal(t, s, p, 0, m) == 0) res.Add(s);
        if (s + m < n) { th = ((th - t[s] * h) % MOD + MOD) % MOD; th = (th * BASE + t[s + m]) % MOD; }
    }
    return res;
}`,
    go: `func rabinKarp(t, p string) []int {
	const BASE, MOD = 31, 1000000007
	n, m := len(t), len(p)
	h := int64(1)
	for i := 0; i < m-1; i++ { h = (h * BASE) % MOD }
	var ph, th int64
	for i := 0; i < m; i++ {
		ph = (ph*BASE + int64(p[i])) % MOD
		th = (th*BASE + int64(t[i])) % MOD
	}
	res := []int{}
	for s := 0; s+m <= n; s++ {
		if ph == th && t[s:s+m] == p { res = append(res, s) }
		if s+m < n {
			th = ((th-int64(t[s])*h)%MOD + MOD) % MOD
			th = (th*BASE + int64(t[s+m])) % MOD
		}
	}
	return res
}`,
    rust: `fn rabin_karp(t: &[u8], p: &[u8]) -> Vec<usize> {
    const BASE: i64 = 31; const MODULO: i64 = 1_000_000_007;
    let (n, m) = (t.len(), p.len());
    let mut h = 1i64;
    for _ in 0..m.saturating_sub(1) { h = (h * BASE) % MODULO; }
    let (mut ph, mut th) = (0i64, 0i64);
    for i in 0..m { ph = (ph * BASE + p[i] as i64) % MODULO; th = (th * BASE + t[i] as i64) % MODULO; }
    let mut res = Vec::new();
    for s in 0..=(n - m) {
        if ph == th && &t[s..s + m] == p { res.push(s); }
        if s + m < n {
            th = ((th - t[s] as i64 * h) % MODULO + MODULO) % MODULO;
            th = (th * BASE + t[s + m] as i64) % MODULO;
        }
    }
    res
}`,
    kotlin: `fun rabinKarp(t: String, p: String): List<Int> {
    val BASE = 31L; val MOD = 1_000_000_007L
    val n = t.length; val m = p.length
    var h = 1L
    repeat(m - 1) { h = (h * BASE) % MOD }
    var ph = 0L; var th = 0L
    for (i in 0 until m) { ph = (ph * BASE + p[i].code) % MOD; th = (th * BASE + t[i].code) % MOD }
    val res = mutableListOf<Int>()
    for (s in 0..(n - m)) {
        if (ph == th && t.substring(s, s + m) == p) res.add(s)
        if (s + m < n) {
            th = ((th - t[s].code * h) % MOD + MOD) % MOD
            th = (th * BASE + t[s + m].code) % MOD
        }
    }
    return res
}`,
    swift: `func rabinKarp(_ t: [Character], _ p: [Character]) -> [Int] {
    let BASE = 31, MOD = 1_000_000_007
    let n = t.count, m = p.count
    var h = 1
    for _ in 0..<max(0, m - 1) { h = (h * BASE) % MOD }
    var ph = 0, th = 0
    for i in 0..<m {
        ph = (ph * BASE + Int(p[i].asciiValue ?? 0)) % MOD
        th = (th * BASE + Int(t[i].asciiValue ?? 0)) % MOD
    }
    var res: [Int] = []
    for s in 0...(n - m) {
        if ph == th && Array(t[s..<s+m]) == p { res.append(s) }
        if s + m < n {
            th = ((th - Int(t[s].asciiValue ?? 0) * h) % MOD + MOD) % MOD
            th = (th * BASE + Int(t[s + m].asciiValue ?? 0)) % MOD
        }
    }
    return res
}`,
  },
  content: {
    overview: `Rabin-Karp finds a pattern in a text by comparing hashes of fixed-length windows instead of characters directly. It computes the pattern's hash once, then slides a window of the same length across the text, checking whether the window's hash equals the pattern's hash. A rolling-hash update lets each window's hash be derived from the previous one in O(1), avoiding recomputation from scratch.

A hash match doesn't guarantee a real match — different strings can collide to the same hash — so Rabin-Karp always verifies a hash hit with a direct character comparison. On random text this makes it average O(n + m); worst case (adversarial input causing many collisions) degrades to O(nm), same as the naive approach. Its real strength is generalizing efficiently to multi-pattern search (searching for many patterns' hashes in one pass).`,
    howItWorks: [
      "Compute a polynomial rolling hash of the pattern once.",
      "Compute the hash of the text's first window of the same length.",
      "Slide the window one position at a time; at each position, compare the window hash to the pattern hash.",
      "On a hash match, verify with a direct character-by-character comparison (hashes can collide).",
      "Roll the hash forward in O(1): remove the outgoing character's contribution, shift, and add the incoming character.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(nm)" },
      space: "O(1)",
      notes: "Average case is linear thanks to O(1) rolling hash updates and rare collisions with a good hash/modulus. Worst case degrades if many spurious hash collisions force full verification at every window.",
    },
    applications: [
      "Plagiarism detection (hashing chunks of documents)",
      "Multi-pattern search (search for a set of patterns simultaneously)",
      "Detecting duplicate substrings or file fingerprinting",
      "DNA sequence search where average-case speed matters more than worst case",
    ],
    advantages: [
      "Simple rolling-hash idea, easy to extend to 2D patterns or multiple patterns",
      "Average O(n + m), fast in practice",
      "Only O(1) extra space per window (excluding hash table for multi-pattern variants)",
    ],
    disadvantages: [
      "Worst-case O(nm) if the hash function collides often",
      "Requires careful modular arithmetic to avoid overflow",
      "KMP/Z-algorithm guarantee linear time unconditionally, Rabin-Karp does not",
    ],
    commonMistakes: [
      "Skipping the character-by-character verification after a hash match (accepting false positives).",
      "Incorrect rolling-hash update (forgetting to remove the outgoing character's weighted contribution).",
      "Integer overflow from not taking modulus at each multiplication step.",
      "Using a modulus/base pair prone to frequent collisions on the input alphabet.",
    ],
    interviewQuestions: [
      "Why must a hash match still be verified character by character?",
      "Derive the O(1) rolling-hash update formula.",
      "What is Rabin-Karp's worst-case time complexity, and when does it occur?",
      "How would you extend Rabin-Karp to search for many patterns at once?",
      "Compare Rabin-Karp's guarantees to KMP's.",
    ],
    summary:
      "Rabin-Karp compares rolling hashes of text windows to a pattern hash, verifying hash matches with direct comparison. It achieves average O(n + m) time via O(1) rolling updates, though it can degrade to O(nm) under adversarial hash collisions — its real advantage is easy extension to multi-pattern search.",
    quiz: [
      { question: "Why does Rabin-Karp verify a hash match character by character?", options: ["To improve speed", "Because different strings can hash to the same value (collision)", "It's not necessary", "To compute the next hash"], answer: 1, explanation: "A hash match is necessary but not sufficient for a true match, since collisions are possible." },
      { question: "The rolling hash update runs in…", options: ["O(m)", "O(1)", "O(n)", "O(log m)"], answer: 1, explanation: "Removing the outgoing character and adding the incoming one is constant-time arithmetic." },
      { question: "Rabin-Karp's worst-case time complexity is…", options: ["O(n + m)", "O(n log m)", "O(nm)", "O(m log n)"], answer: 2, explanation: "Adversarial inputs causing many hash collisions force full character verification at every window." },
      { question: "Rabin-Karp's main practical advantage over KMP is…", options: ["Always faster", "Easy extension to searching for multiple patterns at once", "No preprocessing needed", "Uses less memory"], answer: 1, explanation: "Hashing generalizes naturally to checking a set of pattern hashes per window." },
      { question: "The pattern's hash is computed…", options: ["Once, before scanning", "At every window", "Only if a match is found", "Never — hashes are for the text only"], answer: 0, explanation: "It's fixed throughout the scan, computed a single time up front." },
    ],
  },
  inputFields: [
    { key: "text", label: "Text", placeholder: "abracadabra", help: "The string to search in." },
    { key: "pattern", label: "Pattern", placeholder: "abra", help: "The substring to find." },
  ],
  defaultInput: (level, rng) => {
    const text = randomString(level, rng, "ab");
    const start = rng.int(0, Math.max(0, text.length - 3));
    const len = Math.min(4, text.length - start);
    const pattern = text.slice(start, start + len) || "ab";
    return { text, pattern };
  },
  parseInput: (fields) => {
    const text = (fields.text ?? "").trim();
    const pattern = (fields.pattern ?? "").trim();
    if (text.length < 1) throw new Error("Enter a text string.");
    if (pattern.length < 1) throw new Error("Enter a pattern.");
    if (pattern.length > text.length) throw new Error("Pattern must not be longer than the text.");
    if (text.length > 70) throw new Error("Keep the text at most 70 characters.");
    return { text, pattern };
  },
  serializeInput: (input) => ({ text: input.text, pattern: input.pattern }),
  generate,
};

export default mod;
