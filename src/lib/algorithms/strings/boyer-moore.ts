import type { AlgorithmModule, CellState, Step, StringFrame } from "@/lib/engine/types";
import { randomString } from "@/lib/engine/random";

type Input = { text: string; pattern: string };

function generate(input: Input): Step<StringFrame>[] {
  const t = input.text;
  const p = input.pattern;
  const n = t.length;
  const m = p.length;
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0;
  let shifts = 0;
  const matches: number[] = [];

  // bad-character table: last index of each character in the pattern
  const last: Record<string, number> = {};
  for (let i = 0; i < m; i++) last[p[i]] = i;

  const frame = (
    shift: number,
    textStates: Record<number, CellState>,
    patStates: Record<number, CellState>,
    description: string,
    codeLine: number,
  ) => {
    steps.push({
      frame: {
        text: [...t].map((ch, i) => ({ ch, state: textStates[i] })),
        pattern: [...p].map((ch, i) => ({ ch, state: patStates[i] })),
        shift,
        aux: [
          {
            label: "Last occurrence",
            values: Object.entries(last).map(([ch, idx]) => `${ch}:${idx}`),
          },
          { label: "Matches", values: matches.length ? [...matches] : ["—"] },
        ],
      },
      description,
      codeLine,
      counters: { comparisons, shifts, matches: matches.length },
    });
  };

  frame(
    0,
    {},
    {},
    `Bad-character rule: precompute each character's last position in the pattern (${Object.entries(last)
      .map(([c, i]) => `${c}→${i}`)
      .join(", ")}). Compare right-to-left; on mismatch, jump the pattern forward.`,
    0,
  );

  let s = 0;
  while (s + m <= n) {
    let j = m - 1;
    // compare right to left
    while (j >= 0) {
      comparisons++;
      const match = t[s + j] === p[j];
      const ts: Record<number, CellState> = {};
      const ps: Record<number, CellState> = {};
      for (let k = j + 1; k < m; k++) {
        ts[s + k] = "sorted";
        ps[k] = "sorted";
      }
      ts[s + j] = match ? "compare" : "swap";
      ps[j] = match ? "compare" : "swap";
      frame(
        s,
        ts,
        ps,
        `Alignment ${s}: compare text[${s + j}]='${t[s + j]}' with pattern[${j}]='${p[j]}' (right-to-left) → ${match ? "match" : "mismatch"}.`,
        2,
      );
      if (!match) break;
      j--;
    }

    if (j < 0) {
      matches.push(s);
      const ts: Record<number, CellState> = {};
      for (let k = 0; k < m; k++) ts[s + k] = "found";
      const ps: Record<number, CellState> = {};
      for (let k = 0; k < m; k++) ps[k] = "found";
      frame(s, ts, ps, `Full match at index ${s}!`, 3);
      s += 1;
      shifts++;
    } else {
      const bad = t[s + j];
      const lastIdx = last[bad] ?? -1;
      const jump = Math.max(1, j - lastIdx);
      frame(
        s,
        { [s + j]: "swap" },
        { [j]: "swap" },
        lastIdx === -1
          ? `'${bad}' does not occur in the pattern — shift the whole pattern past it (by ${jump}).`
          : `Bad character '${bad}' last occurs at pattern index ${lastIdx} — shift by max(1, ${j} − ${lastIdx}) = ${jump} to align it.`,
        4,
      );
      s += jump;
      shifts++;
    }
  }

  frame(
    0,
    {},
    {},
    matches.length
      ? `Done. ${matches.length} match(es) at: ${matches.join(", ")} — ${comparisons} comparisons over ${shifts} alignment shifts (naive would try ${n - m + 1} alignments).`
      : `Done. Pattern not found — ${comparisons} comparisons over ${shifts} shifts.`,
    5,
  );
  return steps;
}

const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "boyer-moore",
  title: "Boyer-Moore (Bad Character Rule)",
  category: "strings",
  difficulty: "Advanced",
  tags: ["string matching", "bad character rule", "right-to-left", "sublinear"],
  summary: "Compares the pattern right-to-left and uses the bad-character rule to skip large chunks of text — often sublinear in practice.",
  renderer: "string",
  pseudocode: [
    "procedure boyerMoore(text, pattern)",
    "  last[c] = last index of c in pattern (−1 if absent)",
    "  s = 0",
    "  while s + m <= n:",
    "    compare pattern to text[s..s+m-1] from RIGHT to LEFT",
    "    if all match: report s; s += 1",
    "    else at mismatch position j with text char c:",
    "      s += max(1, j − last[c])",
  ],
  code: {
    pseudocode: `last[c] = last index of c in pattern
s = 0
while s + m <= n:
  j = m - 1
  while j >= 0 and pattern[j] == text[s + j]: j--
  if j < 0: report s; s += 1
  else: s += max(1, j - last[text[s + j]])`,
    c: `void boyerMoore(const char* t, const char* p) {
    int n = strlen(t), m = strlen(p);
    int last[256];
    for (int i = 0; i < 256; i++) last[i] = -1;
    for (int i = 0; i < m; i++) last[(unsigned char)p[i]] = i;
    int s = 0;
    while (s + m <= n) {
        int j = m - 1;
        while (j >= 0 && p[j] == t[s + j]) j--;
        if (j < 0) { printf("%d ", s); s += 1; }
        else {
            int shift = j - last[(unsigned char)t[s + j]];
            s += shift > 1 ? shift : 1;
        }
    }
}`,
    cpp: `void boyerMoore(const string& t, const string& p) {
    int n = t.size(), m = p.size();
    array<int, 256> last;
    last.fill(-1);
    for (int i = 0; i < m; i++) last[(unsigned char)p[i]] = i;
    int s = 0;
    while (s + m <= n) {
        int j = m - 1;
        while (j >= 0 && p[j] == t[s + j]) j--;
        if (j < 0) { cout << s << ' '; s += 1; }
        else s += max(1, j - last[(unsigned char)t[s + j]]);
    }
}`,
    java: `static void boyerMoore(String t, String p) {
    int n = t.length(), m = p.length();
    int[] last = new int[256];
    Arrays.fill(last, -1);
    for (int i = 0; i < m; i++) last[p.charAt(i)] = i;
    int s = 0;
    while (s + m <= n) {
        int j = m - 1;
        while (j >= 0 && p.charAt(j) == t.charAt(s + j)) j--;
        if (j < 0) { System.out.print(s + " "); s += 1; }
        else s += Math.max(1, j - last[t.charAt(s + j)]);
    }
}`,
    python: `def boyer_moore(t, p):
    n, m = len(t), len(p)
    last = {c: i for i, c in enumerate(p)}
    res = []
    s = 0
    while s + m <= n:
        j = m - 1
        while j >= 0 and p[j] == t[s + j]:
            j -= 1
        if j < 0:
            res.append(s)
            s += 1
        else:
            s += max(1, j - last.get(t[s + j], -1))
    return res`,
    javascript: `function boyerMoore(t, p) {
  const n = t.length, m = p.length;
  const last = {};
  for (let i = 0; i < m; i++) last[p[i]] = i;
  const res = [];
  let s = 0;
  while (s + m <= n) {
    let j = m - 1;
    while (j >= 0 && p[j] === t[s + j]) j--;
    if (j < 0) { res.push(s); s += 1; }
    else s += Math.max(1, j - (last[t[s + j]] ?? -1));
  }
  return res;
}`,
    typescript: `function boyerMoore(t: string, p: string): number[] {
  const n = t.length, m = p.length;
  const last: Record<string, number> = {};
  for (let i = 0; i < m; i++) last[p[i]] = i;
  const res: number[] = [];
  let s = 0;
  while (s + m <= n) {
    let j = m - 1;
    while (j >= 0 && p[j] === t[s + j]) j--;
    if (j < 0) { res.push(s); s += 1; }
    else s += Math.max(1, j - (last[t[s + j]] ?? -1));
  }
  return res;
}`,
    csharp: `static List<int> BoyerMoore(string t, string p) {
    int n = t.Length, m = p.Length;
    var last = new int[256];
    Array.Fill(last, -1);
    for (int i = 0; i < m; i++) last[p[i]] = i;
    var res = new List<int>();
    int s = 0;
    while (s + m <= n) {
        int j = m - 1;
        while (j >= 0 && p[j] == t[s + j]) j--;
        if (j < 0) { res.Add(s); s += 1; }
        else s += Math.Max(1, j - last[t[s + j]]);
    }
    return res;
}`,
    go: `func boyerMoore(t, p string) []int {
	n, m := len(t), len(p)
	last := map[byte]int{}
	for i := 0; i < m; i++ {
		last[p[i]] = i
	}
	res := []int{}
	s := 0
	for s+m <= n {
		j := m - 1
		for j >= 0 && p[j] == t[s+j] {
			j--
		}
		if j < 0 {
			res = append(res, s)
			s++
		} else {
			li, ok := last[t[s+j]]
			if !ok {
				li = -1
			}
			shift := j - li
			if shift < 1 {
				shift = 1
			}
			s += shift
		}
	}
	return res
}`,
    rust: `fn boyer_moore(t: &[u8], p: &[u8]) -> Vec<usize> {
    let (n, m) = (t.len(), p.len());
    let mut last = [-1i32; 256];
    for (i, &c) in p.iter().enumerate() { last[c as usize] = i as i32; }
    let mut res = Vec::new();
    let mut s = 0usize;
    while s + m <= n {
        let mut j = m as i32 - 1;
        while j >= 0 && p[j as usize] == t[s + j as usize] { j -= 1; }
        if j < 0 {
            res.push(s);
            s += 1;
        } else {
            let shift = j - last[t[s + j as usize] as usize];
            s += shift.max(1) as usize;
        }
    }
    res
}`,
    kotlin: `fun boyerMoore(t: String, p: String): List<Int> {
    val n = t.length; val m = p.length
    val last = HashMap<Char, Int>()
    for (i in 0 until m) last[p[i]] = i
    val res = mutableListOf<Int>()
    var s = 0
    while (s + m <= n) {
        var j = m - 1
        while (j >= 0 && p[j] == t[s + j]) j--
        if (j < 0) { res.add(s); s += 1 }
        else s += maxOf(1, j - (last[t[s + j]] ?: -1))
    }
    return res
}`,
    swift: `func boyerMoore(_ t: [Character], _ p: [Character]) -> [Int] {
    let n = t.count, m = p.count
    var last: [Character: Int] = [:]
    for i in 0..<m { last[p[i]] = i }
    var res: [Int] = []
    var s = 0
    while s + m <= n {
        var j = m - 1
        while j >= 0 && p[j] == t[s + j] { j -= 1 }
        if j < 0 {
            res.append(s)
            s += 1
        } else {
            s += max(1, j - (last[t[s + j]] ?? -1))
        }
    }
    return res
}`,
  },
  content: {
    overview: `Boyer-Moore is the classic "skip ahead" string matcher and the basis of many real-world search implementations (including grep variants). Its two counter-intuitive ideas: compare the pattern to the text from right to left, and on a mismatch, use knowledge about the pattern to jump the alignment forward by more than one position — often skipping most of the text entirely.

This module visualizes the bad-character rule: when text character c mismatches at pattern position j, slide the pattern so its last occurrence of c lines up with the text's c (or fully past c if the pattern doesn't contain it). The full algorithm also adds the good-suffix rule, but the bad-character rule alone captures the signature skipping behavior: on large alphabets (e.g., English text), most mismatches happen on the first comparison of an alignment and skip nearly m characters at once, making Boyer-Moore sublinear on average — it doesn't even look at most of the text.`,
    howItWorks: [
      "Precompute the last-occurrence table: for each character, its rightmost index in the pattern (−1 if absent).",
      "Align the pattern at text position s and compare characters right to left, starting from the pattern's end.",
      "If all m characters match, report an occurrence at s and shift by 1 (or by a good-suffix amount in the full algorithm).",
      "On a mismatch at pattern index j against text character c, shift by max(1, j − last[c]) — aligning the pattern's last c under the text's c, or jumping fully past c if absent.",
      "Repeat until the pattern window slides past the end of the text.",
    ],
    complexity: {
      time: { best: "O(n/m)", average: "~O(n)", worst: "O(nm)" },
      space: "O(alphabet + m)",
      notes: "Best case skips m characters per mismatch (sublinear — most text never examined). The bad-character rule alone is O(nm) worst case; adding the good-suffix rule bounds non-periodic searches to O(n + m).",
    },
    applications: [
      "Text editors and 'find in files' features (fast literal search)",
      "grep-family tools and network intrusion detection (searching long payloads)",
      "Large-alphabet searches (natural language) where skips are big",
      "Any search where the pattern is long and the text is huge",
    ],
    advantages: [
      "Often sublinear: skips large chunks of text without examining them",
      "Gets faster with longer patterns (bigger skips)",
      "Bad-character table is trivial to build (one pass over the pattern)",
    ],
    disadvantages: [
      "Bad-character rule alone degrades to O(nm) on small alphabets (e.g., DNA, binary)",
      "The full algorithm (with good-suffix rule) is significantly trickier to implement correctly",
      "Poor skips on short patterns or highly repetitive text — KMP can win there",
    ],
    commonMistakes: [
      "Forgetting max(1, …): a negative or zero shift when last[c] > j would move the pattern backward or loop forever.",
      "Comparing left-to-right — the skip logic only works scanning right-to-left.",
      "Building the last-occurrence table with the first occurrence instead of the last.",
      "Assuming worst-case linearity with only the bad-character rule (that needs the good-suffix rule too).",
    ],
    interviewQuestions: [
      "Why does Boyer-Moore compare right-to-left, and why does that enable big skips?",
      "Walk through the bad-character shift formula max(1, j − last[c]) — why the max?",
      "When does the bad-character rule alone degrade to O(nm)?",
      "What does the good-suffix rule add, and when does it beat the bad-character rule?",
      "Why is Boyer-Moore often faster than KMP on English text but not on DNA?",
    ],
    summary:
      "Boyer-Moore scans the pattern right-to-left and uses the bad-character rule to slide the pattern forward by up to m positions per mismatch, often skipping most of the text — sublinear on average for large alphabets. The simple last-occurrence table drives the skips; the full algorithm adds the good-suffix rule for a worst-case linear bound.",
    quiz: [
      { question: "Boyer-Moore compares the pattern to the text…", options: ["Left to right", "Right to left", "From the middle out", "In random order"], answer: 1, explanation: "Right-to-left comparison means a first-character mismatch can justify skipping almost the whole pattern length." },
      { question: "On a mismatch with text character c at pattern index j, the bad-character shift is…", options: ["1 always", "j + 1", "max(1, j − last[c])", "m − j"], answer: 2, explanation: "It aligns the pattern's last occurrence of c under the text's c; the max(1,…) prevents zero or backward shifts." },
      { question: "If the mismatched text character doesn't occur in the pattern at all…", options: ["The search fails", "The pattern shifts fully past that character", "Shift by 1", "The pattern reverses"], answer: 1, explanation: "last[c] = −1 gives a shift of j + 1, jumping the whole window past the offending character." },
      { question: "Boyer-Moore performs best when…", options: ["The alphabet is tiny (like binary)", "The alphabet is large and the pattern is long", "The pattern is one character", "The text is very short"], answer: 1, explanation: "Large alphabets make mismatches frequent and skips close to the full pattern length." },
      { question: "With only the bad-character rule, the worst-case time is…", options: ["O(n + m)", "O(n/m)", "O(nm)", "O(log n)"], answer: 2, explanation: "Repetitive small-alphabet inputs (e.g. aaaa… / baaa) force near-full comparisons at every alignment; the good-suffix rule is needed for a linear worst case." },
    ],
  },
  inputFields: [
    { key: "text", label: "Text", placeholder: "HERE IS A SIMPLE EXAMPLE", help: "The string to search in." },
    { key: "pattern", label: "Pattern", placeholder: "EXAMPLE", help: "The substring to find." },
  ],
  defaultInput: (level, rng) => {
    const text = randomString(level, rng, "abc");
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
