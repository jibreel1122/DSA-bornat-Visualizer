import type { AlgorithmModule, CellState, Step, StringFrame } from "@/lib/engine/types";
import { randomString } from "@/lib/engine/random";

type Input = { text: string; pattern: string };

function generate(input: Input): Step<StringFrame>[] {
  const t = input.text;
  const p = input.pattern;
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0;
  const matches: number[] = [];

  const frame = (shift: number, textStates: Record<number, CellState>, patStates: Record<number, CellState>, description: string, codeLine: number, note?: string) => {
    steps.push({
      frame: {
        text: [...t].map((ch, i) => ({ ch, state: textStates[i] })),
        pattern: [...p].map((ch, i) => ({ ch, state: patStates[i] })),
        shift,
        aux: [{ label: "Matches at", values: matches.length ? [...matches] : ["—"] }],
        note,
      },
      description,
      codeLine,
      counters: { comparisons, matches: matches.length },
    });
  };

  frame(0, {}, {}, `Naive search: try the pattern at every possible shift of the text.`, 0);

  for (let s = 0; s + p.length <= t.length; s++) {
    frame(s, {}, {}, `Align pattern at shift ${s}.`, 1);
    let j = 0;
    for (; j < p.length; j++) {
      comparisons++;
      const match = t[s + j] === p[j];
      const ts: Record<number, CellState> = { [s + j]: match ? "sorted" : "swap" };
      const ps: Record<number, CellState> = { [j]: match ? "sorted" : "swap" };
      frame(s, ts, ps, `Compare text[${s + j}]='${t[s + j]}' with pattern[${j}]='${p[j]}' → ${match ? "match" : "mismatch"}.`, 2);
      if (!match) break;
    }
    if (j === p.length) {
      matches.push(s);
      const ts: Record<number, CellState> = {};
      for (let k = 0; k < p.length; k++) ts[s + k] = "found";
      const ps: Record<number, CellState> = {};
      for (let k = 0; k < p.length; k++) ps[k] = "found";
      frame(s, ts, ps, `Full match at shift ${s}!`, 3);
    }
  }
  frame(0, {}, {}, matches.length ? `Found ${matches.length} occurrence(s) at: ${matches.join(", ")}.` : `Pattern not found.`, 4);
  return steps;
}

const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "naive-pattern-matching",
  title: "Naive Pattern Matching",
  category: "strings",
  difficulty: "Beginner",
  tags: ["string matching", "brute force", "O(nm)"],
  summary: "Tries the pattern at every text position, comparing character by character — simple but O(nm).",
  renderer: "string",
  pseudocode: [
    "procedure naiveSearch(text, pattern)",
    "  for shift = 0 to n-m:",
    "    compare pattern with text[shift..]",
    "      stop at first mismatch",
    "    if all m chars matched: report shift",
    "  return matches",
  ],
  code: {
    pseudocode: `procedure naiveSearch(text, pattern)
  n = len(text); m = len(pattern)
  for s = 0 to n - m:
    j = 0
    while j < m and text[s+j] == pattern[j]: j++
    if j == m: report match at s`,
    c: `void naive_search(const char* t, const char* p) {
    int n = strlen(t), m = strlen(p);
    for (int s = 0; s <= n - m; s++) {
        int j = 0;
        while (j < m && t[s + j] == p[j]) j++;
        if (j == m) printf("match at %d\\n", s);
    }
}`,
    cpp: `void naiveSearch(const string& t, const string& p) {
    int n = t.size(), m = p.size();
    for (int s = 0; s <= n - m; ++s) {
        int j = 0;
        while (j < m && t[s + j] == p[j]) ++j;
        if (j == m) cout << "match at " << s << "\\n";
    }
}`,
    java: `static void naiveSearch(String t, String p) {
    int n = t.length(), m = p.length();
    for (int s = 0; s <= n - m; s++) {
        int j = 0;
        while (j < m && t.charAt(s + j) == p.charAt(j)) j++;
        if (j == m) System.out.println("match at " + s);
    }
}`,
    python: `def naive_search(t: str, p: str) -> list[int]:
    n, m = len(t), len(p)
    res = []
    for s in range(n - m + 1):
        j = 0
        while j < m and t[s + j] == p[j]:
            j += 1
        if j == m:
            res.append(s)
    return res`,
    javascript: `function naiveSearch(t, p) {
  const n = t.length, m = p.length, res = [];
  for (let s = 0; s <= n - m; s++) {
    let j = 0;
    while (j < m && t[s + j] === p[j]) j++;
    if (j === m) res.push(s);
  }
  return res;
}`,
    typescript: `function naiveSearch(t: string, p: string): number[] {
  const n = t.length, m = p.length, res: number[] = [];
  for (let s = 0; s <= n - m; s++) {
    let j = 0;
    while (j < m && t[s + j] === p[j]) j++;
    if (j === m) res.push(s);
  }
  return res;
}`,
    csharp: `static List<int> NaiveSearch(string t, string p) {
    int n = t.Length, m = p.Length; var res = new List<int>();
    for (int s = 0; s <= n - m; s++) {
        int j = 0;
        while (j < m && t[s + j] == p[j]) j++;
        if (j == m) res.Add(s);
    }
    return res;
}`,
    go: `func naiveSearch(t, p string) []int {
	n, m := len(t), len(p)
	res := []int{}
	for s := 0; s <= n-m; s++ {
		j := 0
		for j < m && t[s+j] == p[j] {
			j++
		}
		if j == m {
			res = append(res, s)
		}
	}
	return res
}`,
    rust: `fn naive_search(t: &[u8], p: &[u8]) -> Vec<usize> {
    let (n, m) = (t.len(), p.len());
    let mut res = Vec::new();
    for s in 0..=n.saturating_sub(m) {
        let mut j = 0;
        while j < m && t[s + j] == p[j] { j += 1; }
        if j == m { res.push(s); }
    }
    res
}`,
    kotlin: `fun naiveSearch(t: String, p: String): List<Int> {
    val n = t.length; val m = p.length; val res = mutableListOf<Int>()
    for (s in 0..n - m) {
        var j = 0
        while (j < m && t[s + j] == p[j]) j++
        if (j == m) res.add(s)
    }
    return res
}`,
    swift: `func naiveSearch(_ t: [Character], _ p: [Character]) -> [Int] {
    let n = t.count, m = p.count
    var res: [Int] = []
    if m > n { return res }
    for s in 0...(n - m) {
        var j = 0
        while j < m && t[s + j] == p[j] { j += 1 }
        if j == m { res.append(s) }
    }
    return res
}`,
  },
  content: {
    overview: `Naive (brute-force) pattern matching is the most direct way to find every occurrence of a pattern in a text. It slides the pattern across the text one position at a time and, at each alignment, compares characters left to right until it either matches the whole pattern or hits a mismatch.

It requires no preprocessing and is easy to implement, but it can re-examine the same text characters many times. In the worst case — think searching "aaaaab" in "aaaaaaaaaa" — it does O(nm) character comparisons, which is why smarter algorithms like KMP and Boyer-Moore exist.`,
    howItWorks: [
      "For each shift s from 0 to n − m, align the pattern's start with text[s].",
      "Compare pattern characters against the text left to right.",
      "Stop early at the first mismatch and slide to the next shift.",
      "If all m characters match, record an occurrence at s.",
      "Continue until the pattern would run past the end of the text.",
    ],
    complexity: {
      time: { best: "O(n)", average: "O(n·m)", worst: "O(n·m)" },
      space: "O(1)",
      notes: "Best case O(n) when mismatches happen at the first character each time. Worst case O(nm) on highly repetitive text/pattern. No extra memory beyond indices.",
    },
    applications: [
      "Searching in short texts or with short patterns",
      "A baseline to compare smarter matchers against",
      "One-off searches where preprocessing isn't worthwhile",
      "Teaching the string-matching problem before KMP/Boyer-Moore",
    ],
    advantages: [
      "Trivial to implement and understand",
      "No preprocessing or extra memory",
      "Fine for small inputs or rare, short patterns",
    ],
    disadvantages: [
      "O(nm) worst case — slow on repetitive data",
      "Re-compares text characters it has already seen",
      "Outclassed by KMP, Boyer-Moore, and Rabin-Karp on large inputs",
    ],
    commonMistakes: [
      "Looping shift s past n − m, causing out-of-bounds reads.",
      "Not stopping the inner comparison at the first mismatch.",
      "Confusing 0-based shift with 1-based reported positions.",
      "Assuming it's fast enough for large texts with repetitive structure.",
    ],
    interviewQuestions: [
      "What input makes naive matching hit its O(nm) worst case?",
      "How does KMP avoid re-comparing text characters?",
      "When is naive matching actually the right choice?",
      "How would you extend it to count overlapping occurrences?",
    ],
    summary:
      "Naive pattern matching slides the pattern across the text and compares characters at each shift, using O(1) space but up to O(nm) time. It's the simplest matcher and the baseline that KMP, Boyer-Moore, and Rabin-Karp improve upon.",
    quiz: [
      { question: "What is the worst-case time complexity of naive pattern matching?", options: ["O(n)", "O(n + m)", "O(n·m)", "O(n log m)"], answer: 2, explanation: "Each of the ~n shifts may compare up to m characters." },
      { question: "How much extra memory does naive matching use?", options: ["O(1)", "O(m)", "O(n)", "O(nm)"], answer: 0, explanation: "It needs only a couple of index variables." },
      { question: "Which input pattern triggers the worst case?", options: ["Random text", "Highly repetitive text and pattern", "Very short text", "Distinct characters"], answer: 1, explanation: "Repetition causes long partial matches that fail at the last character each shift." },
      { question: "After a mismatch at position j, naive matching shifts the pattern by…", options: ["j positions", "exactly 1 position", "m positions", "to the next match"], answer: 1, explanation: "It advances the alignment by a single position and restarts comparison." },
      { question: "Which algorithm removes the redundant re-comparisons of naive matching?", options: ["Bubble sort", "KMP", "Dijkstra", "Binary search"], answer: 1, explanation: "KMP uses a failure function to skip re-checking already-matched characters." },
    ],
  },
  inputFields: [
    { key: "text", label: "Text", placeholder: "abracadabra", help: "The string to search in." },
    { key: "pattern", label: "Pattern", placeholder: "abra", help: "The substring to find." },
  ],
  defaultInput: (level, rng) => {
    const text = randomString(level, rng, "ab");
    const start = rng.int(0, Math.max(0, text.length - 3));
    const len = Math.min(3, text.length - start);
    const pattern = text.slice(start, start + len) || "ab";
    return { text, pattern };
  },
  parseInput: (fields) => {
    const text = (fields.text ?? "").trim();
    const pattern = (fields.pattern ?? "").trim();
    if (text.length < 1) throw new Error("Enter a text string.");
    if (pattern.length < 1) throw new Error("Enter a pattern.");
    if (pattern.length > text.length) throw new Error("Pattern must not be longer than the text.");
    if (text.length > 90) throw new Error("Keep the text at most 90 characters.");
    return { text, pattern };
  },
  serializeInput: (input) => ({ text: input.text, pattern: input.pattern }),
  generate,
};

export default mod;
