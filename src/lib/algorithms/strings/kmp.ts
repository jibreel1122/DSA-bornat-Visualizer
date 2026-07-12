import type { AlgorithmModule, CellState, Step, StringFrame } from "@/lib/engine/types";
import { randomString } from "@/lib/engine/random";

type Input = { text: string; pattern: string };

function generate(input: Input): Step<StringFrame>[] {
  const t = input.text;
  const p = input.pattern;
  const m = p.length;
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0;
  const matches: number[] = [];
  const lps = new Array(m).fill(0);

  const frame = (
    shift: number,
    textStates: Record<number, CellState>,
    patStates: Record<number, CellState>,
    lpsStates: Record<number, CellState>,
    description: string,
    codeLine: number,
    descriptionAr?: string,
  ) => {
    steps.push({
      frame: {
        text: [...t].map((ch, i) => ({ ch, state: textStates[i] })),
        pattern: [...p].map((ch, i) => ({ ch, state: patStates[i] })),
        shift,
        aux: [
          { label: "LPS", values: [...lps], states: lpsStates },
          { label: "Matches", values: matches.length ? [...matches] : ["—"] },
        ],
      },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons, matches: matches.length },
    });
  };

  // Phase 1: build LPS (longest proper prefix that is also suffix)
  frame(0, {}, {}, {}, `Phase 1: build the LPS (failure) array so we never re-compare text characters.`, 0, `المرحلة 1: ابنِ مصفوفة LPS (دالة الفشل) كي لا نعيد أبدًا مقارنة حروف النص.`);
  let len = 0;
  let i = 1;
  frame(0, {}, { 0: "sorted" }, { 0: "sorted" }, `lps[0] = 0 by definition.`, 1, `lps[0] = 0 بحكم التعريف.`);
  while (i < m) {
    comparisons++;
    if (p[i] === p[len]) {
      len++;
      lps[i] = len;
      frame(0, {}, { [i]: "sorted", [len - 1]: "compare" }, { [i]: "found" }, `p[${i}]='${p[i]}' matches p[${len - 1}]; lps[${i}] = ${len}.`, 2, `p[${i}]='${p[i]}' يطابق p[${len - 1}]؛ إذن lps[${i}] = ${len}.`);
      i++;
    } else if (len > 0) {
      frame(0, {}, { [i]: "swap", [len]: "swap" }, { [len - 1]: "compare" }, `Mismatch; fall back to lps[${len - 1}] = ${lps[len - 1]}.`, 3, `عدم تطابق؛ تراجَع إلى lps[${len - 1}] = ${lps[len - 1]}.`);
      len = lps[len - 1];
    } else {
      lps[i] = 0;
      frame(0, {}, { [i]: "swap" }, { [i]: "found" }, `p[${i}] mismatches and len=0; lps[${i}] = 0.`, 4, `p[${i}] لا يطابق وlen=0؛ إذن lps[${i}] = 0.`);
      i++;
    }
  }

  // Phase 2: scan
  frame(0, {}, {}, {}, `Phase 2: scan the text, using LPS to skip on mismatch.`, 5, `المرحلة 2: امسح النص، مستخدمًا LPS للتخطي عند عدم التطابق.`);
  let ti = 0;
  let pj = 0;
  while (ti < t.length) {
    comparisons++;
    const match = t[ti] === p[pj];
    frame(ti - pj, { [ti]: match ? "sorted" : "swap" }, { [pj]: match ? "sorted" : "swap" }, {}, `Compare text[${ti}]='${t[ti]}' with pattern[${pj}]='${p[pj]}' → ${match ? "match" : "mismatch"}.`, 6, `قارن text[${ti}]='${t[ti]}' مع pattern[${pj}]='${p[pj]}' ← ${match ? "تطابق" : "عدم تطابق"}.`);
    if (match) {
      ti++;
      pj++;
      if (pj === m) {
        const s = ti - m;
        matches.push(s);
        const ts: Record<number, CellState> = {};
        for (let k = 0; k < m; k++) ts[s + k] = "found";
        const ps: Record<number, CellState> = {};
        for (let k = 0; k < m; k++) ps[k] = "found";
        frame(s, ts, ps, {}, `Full match at index ${s}! Jump using lps[${m - 1}] = ${lps[m - 1]}.`, 7, `تطابق كامل عند الفهرس ${s}! اقفز باستخدام lps[${m - 1}] = ${lps[m - 1]}.`);
        pj = lps[pj - 1];
      }
    } else if (pj > 0) {
      frame(ti - pj, {}, { [pj]: "swap" }, { [pj - 1]: "compare" }, `Mismatch: shift pattern using lps[${pj - 1}] = ${lps[pj - 1]} (no text rewind).`, 8, `عدم تطابق: أزِح النمط باستخدام lps[${pj - 1}] = ${lps[pj - 1]} (دون إرجاع النص).`);
      pj = lps[pj - 1];
    } else {
      ti++;
    }
  }
  frame(0, {}, {}, {}, matches.length ? `Done. ${matches.length} match(es) at: ${matches.join(", ")}.` : `Done. Pattern not found.`, 9, matches.length ? `انتهى. ${matches.length} تطابق عند: ${matches.join(", ")}.` : `انتهى. لم يُعثَر على النمط.`);
  return steps;
}

const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "kmp",
  title: "Knuth–Morris–Pratt (KMP)",
  titleAr: "خوارزمية كنوث-موريس-برات (KMP)",
  category: "strings",
  difficulty: "Advanced",
  tags: ["string matching", "failure function", "O(n+m)", "linear"],
  tagsAr: ["مطابقة نصوص", "دالة الفشل", "O(n+m)", "خطي"],
  summary: "Precomputes a failure function so mismatches skip ahead without ever re-scanning text — O(n + m).",
  summaryAr: "يحسب مسبقًا دالة فشل بحيث يتخطى عدم التطابق إلى الأمام دون إعادة مسح النص أبدًا — O(n + m).",
  renderer: "string",
  pseudocode: [
    "procedure KMP(text, pattern)",
    "  // build LPS array",
    "  lps[0] = 0; compute lps[i] for i = 1..m-1",
    "    on match: extend prefix length",
    "    on mismatch: fall back to lps[len-1]",
    "  // scan phase",
    "  i over text, j over pattern:",
    "    on match: advance both; report when j == m",
    "    on mismatch: j = lps[j-1] (never move i back)",
    "  return matches",
  ],
  code: {
    pseudocode: `function buildLPS(p):
  lps[0] = 0; len = 0; i = 1
  while i < m:
    if p[i] == p[len]: len++; lps[i] = len; i++
    elif len > 0: len = lps[len-1]
    else: lps[i] = 0; i++

function KMP(t, p):
  lps = buildLPS(p); i = j = 0
  while i < n:
    if t[i] == p[j]: i++; j++
      if j == m: report i-m; j = lps[j-1]
    elif j > 0: j = lps[j-1]
    else: i++`,
    c: `void build_lps(const char* p, int m, int* lps) {
    lps[0] = 0; int len = 0, i = 1;
    while (i < m) {
        if (p[i] == p[len]) lps[i++] = ++len;
        else if (len) len = lps[len - 1];
        else lps[i++] = 0;
    }
}
void kmp(const char* t, const char* p) {
    int n = strlen(t), m = strlen(p), lps[m];
    build_lps(p, m, lps);
    int i = 0, j = 0;
    while (i < n) {
        if (t[i] == p[j]) { i++; j++; if (j == m) { printf("%d ", i - m); j = lps[j - 1]; } }
        else if (j) j = lps[j - 1];
        else i++;
    }
}`,
    cpp: `vector<int> buildLPS(const string& p) {
    int m = p.size(); vector<int> lps(m, 0);
    int len = 0, i = 1;
    while (i < m) {
        if (p[i] == p[len]) lps[i++] = ++len;
        else if (len) len = lps[len - 1];
        else lps[i++] = 0;
    }
    return lps;
}
void kmp(const string& t, const string& p) {
    auto lps = buildLPS(p);
    int i = 0, j = 0, n = t.size(), m = p.size();
    while (i < n) {
        if (t[i] == p[j]) { i++; j++; if (j == m) { cout << i - m << ' '; j = lps[j - 1]; } }
        else if (j) j = lps[j - 1];
        else i++;
    }
}`,
    java: `static int[] buildLPS(String p) {
    int m = p.length(); int[] lps = new int[m];
    int len = 0, i = 1;
    while (i < m) {
        if (p.charAt(i) == p.charAt(len)) lps[i++] = ++len;
        else if (len > 0) len = lps[len - 1];
        else lps[i++] = 0;
    }
    return lps;
}
static void kmp(String t, String p) {
    int[] lps = buildLPS(p);
    int i = 0, j = 0, n = t.length(), m = p.length();
    while (i < n) {
        if (t.charAt(i) == p.charAt(j)) { i++; j++; if (j == m) { System.out.print((i - m) + " "); j = lps[j - 1]; } }
        else if (j > 0) j = lps[j - 1];
        else i++;
    }
}`,
    python: `def build_lps(p):
    m = len(p); lps = [0] * m
    length, i = 0, 1
    while i < m:
        if p[i] == p[length]:
            length += 1; lps[i] = length; i += 1
        elif length:
            length = lps[length - 1]
        else:
            lps[i] = 0; i += 1
    return lps

def kmp(t, p):
    lps = build_lps(p); res = []
    i = j = 0
    while i < len(t):
        if t[i] == p[j]:
            i += 1; j += 1
            if j == len(p):
                res.append(i - j); j = lps[j - 1]
        elif j:
            j = lps[j - 1]
        else:
            i += 1
    return res`,
    javascript: `function buildLPS(p) {
  const m = p.length, lps = new Array(m).fill(0);
  let len = 0, i = 1;
  while (i < m) {
    if (p[i] === p[len]) lps[i++] = ++len;
    else if (len) len = lps[len - 1];
    else lps[i++] = 0;
  }
  return lps;
}
function kmp(t, p) {
  const lps = buildLPS(p), res = [];
  let i = 0, j = 0;
  while (i < t.length) {
    if (t[i] === p[j]) { i++; j++; if (j === p.length) { res.push(i - j); j = lps[j - 1]; } }
    else if (j) j = lps[j - 1];
    else i++;
  }
  return res;
}`,
    typescript: `function buildLPS(p: string): number[] {
  const m = p.length, lps = new Array(m).fill(0);
  let len = 0, i = 1;
  while (i < m) {
    if (p[i] === p[len]) lps[i++] = ++len;
    else if (len) len = lps[len - 1];
    else lps[i++] = 0;
  }
  return lps;
}
function kmp(t: string, p: string): number[] {
  const lps = buildLPS(p), res: number[] = [];
  let i = 0, j = 0;
  while (i < t.length) {
    if (t[i] === p[j]) { i++; j++; if (j === p.length) { res.push(i - j); j = lps[j - 1]; } }
    else if (j) j = lps[j - 1];
    else i++;
  }
  return res;
}`,
    csharp: `static int[] BuildLPS(string p) {
    int m = p.Length; var lps = new int[m];
    int len = 0, i = 1;
    while (i < m) {
        if (p[i] == p[len]) lps[i++] = ++len;
        else if (len > 0) len = lps[len - 1];
        else lps[i++] = 0;
    }
    return lps;
}
static List<int> Kmp(string t, string p) {
    var lps = BuildLPS(p); var res = new List<int>();
    int i = 0, j = 0;
    while (i < t.Length) {
        if (t[i] == p[j]) { i++; j++; if (j == p.Length) { res.Add(i - j); j = lps[j - 1]; } }
        else if (j > 0) j = lps[j - 1];
        else i++;
    }
    return res;
}`,
    go: `func buildLPS(p string) []int {
	m := len(p); lps := make([]int, m)
	length, i := 0, 1
	for i < m {
		if p[i] == p[length] {
			length++; lps[i] = length; i++
		} else if length > 0 {
			length = lps[length-1]
		} else {
			lps[i] = 0; i++
		}
	}
	return lps
}
func kmp(t, p string) []int {
	lps := buildLPS(p); res := []int{}
	i, j := 0, 0
	for i < len(t) {
		if t[i] == p[j] {
			i++; j++
			if j == len(p) { res = append(res, i-j); j = lps[j-1] }
		} else if j > 0 { j = lps[j-1] } else { i++ }
	}
	return res
}`,
    rust: `fn build_lps(p: &[u8]) -> Vec<usize> {
    let m = p.len(); let mut lps = vec![0; m];
    let (mut len, mut i) = (0, 1);
    while i < m {
        if p[i] == p[len] { len += 1; lps[i] = len; i += 1; }
        else if len > 0 { len = lps[len - 1]; }
        else { lps[i] = 0; i += 1; }
    }
    lps
}
fn kmp(t: &[u8], p: &[u8]) -> Vec<usize> {
    let lps = build_lps(p); let mut res = Vec::new();
    let (mut i, mut j) = (0, 0);
    while i < t.len() {
        if t[i] == p[j] { i += 1; j += 1; if j == p.len() { res.push(i - j); j = lps[j - 1]; } }
        else if j > 0 { j = lps[j - 1]; } else { i += 1; }
    }
    res
}`,
    kotlin: `fun buildLPS(p: String): IntArray {
    val m = p.length; val lps = IntArray(m)
    var len = 0; var i = 1
    while (i < m) {
        if (p[i] == p[len]) { len++; lps[i] = len; i++ }
        else if (len > 0) len = lps[len - 1]
        else { lps[i] = 0; i++ }
    }
    return lps
}
fun kmp(t: String, p: String): List<Int> {
    val lps = buildLPS(p); val res = mutableListOf<Int>()
    var i = 0; var j = 0
    while (i < t.length) {
        if (t[i] == p[j]) { i++; j++; if (j == p.length) { res.add(i - j); j = lps[j - 1] } }
        else if (j > 0) j = lps[j - 1] else i++
    }
    return res
}`,
    swift: `func buildLPS(_ p: [Character]) -> [Int] {
    let m = p.count; var lps = [Int](repeating: 0, count: m)
    var len = 0, i = 1
    while i < m {
        if p[i] == p[len] { len += 1; lps[i] = len; i += 1 }
        else if len > 0 { len = lps[len - 1] }
        else { lps[i] = 0; i += 1 }
    }
    return lps
}
func kmp(_ t: [Character], _ p: [Character]) -> [Int] {
    let lps = buildLPS(p); var res: [Int] = []
    var i = 0, j = 0
    while i < t.count {
        if t[i] == p[j] { i += 1; j += 1; if j == p.count { res.append(i - j); j = lps[j - 1] } }
        else if j > 0 { j = lps[j - 1] } else { i += 1 }
    }
    return res
}`,
  },
  content: {
    overview: `The Knuth–Morris–Pratt algorithm finds a pattern in a text in linear O(n + m) time by never re-examining a text character. Its insight: when a mismatch happens after some characters have matched, the pattern itself tells us how far we can safely shift without missing a match.

That knowledge is captured in the LPS ("longest proper prefix which is also a suffix") array, computed from the pattern alone in a preprocessing phase. During scanning, on a mismatch at pattern position j, KMP jumps j to lps[j−1] instead of restarting — reusing the characters it already knows match.`,
    howItWorks: [
      "Preprocess the pattern into an LPS array: lps[i] is the length of the longest proper prefix of pattern[0..i] that is also a suffix.",
      "Scan the text with two indices: i over the text, j over the pattern.",
      "On a match, advance both i and j; a full pattern match occurs when j reaches m.",
      "On a mismatch with j > 0, set j = lps[j−1] — shift the pattern using known structure, without moving i back.",
      "On a mismatch with j = 0, simply advance i. The text index i never decreases.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" },
      space: "O(m)",
      notes: "Building the LPS is O(m); scanning is O(n) because i never moves backward and j decreases at most as many times as it increases. Extra space is the O(m) LPS array.",
    },
    applications: [
      "Fast substring search in text editors and search tools",
      "DNA/protein sequence matching in bioinformatics",
      "Intrusion detection and log scanning for known patterns",
      "Any repeated single-pattern search over large text",
    ],
    advantages: [
      "Guaranteed linear O(n + m) time — no worst-case blowup",
      "Never rescans text characters",
      "Deterministic (no hashing, no false positives)",
      "Preprocessing depends only on the pattern",
    ],
    disadvantages: [
      "The LPS/failure function is subtle and error-prone to implement",
      "Boyer-Moore is often faster in practice on large alphabets",
      "Only handles a single pattern (Aho-Corasick generalizes to many)",
    ],
    commonMistakes: [
      "Building the LPS incorrectly (mishandling the len = lps[len−1] fallback).",
      "Advancing the text index i on a mismatch when j > 0 — you must only change j.",
      "Confusing lps[j−1] with lps[j] on the mismatch jump.",
      "Off-by-one when reporting the match position (i − m).",
    ],
    interviewQuestions: [
      "What does lps[i] represent, and how is it computed in O(m)?",
      "Why does the text index in KMP never move backward?",
      "Prove KMP's overall scan is O(n) despite the inner fallback loop.",
      "How does KMP relate to building a DFA for the pattern?",
      "How would you extend KMP ideas to match many patterns at once?",
    ],
    summary:
      "KMP achieves linear-time single-pattern matching by precomputing an LPS failure array from the pattern, then scanning the text without ever rewinding — on a mismatch it shifts the pattern using lps[j−1]. O(n + m) time, O(m) space, and no false positives.",
    quiz: [
      { question: "What does lps[i] store?", options: ["The i-th character", "Length of the longest proper prefix that is also a suffix of pattern[0..i]", "The number of matches so far", "The next text index"], answer: 1, explanation: "That length tells KMP how far it can shift while preserving matched context." },
      { question: "KMP's overall time complexity is…", options: ["O(nm)", "O(n + m)", "O(n log m)", "O(m²)"], answer: 1, explanation: "Linear because the text pointer never moves backward and preprocessing is O(m)." },
      { question: "On a mismatch with j > 0, KMP sets j to…", options: ["0", "j − 1", "lps[j − 1]", "m"], answer: 2, explanation: "It falls back to the longest usable prefix length recorded in the LPS array." },
      { question: "During the scan phase, the text index i…", options: ["Can move backward", "Never moves backward", "Resets each shift", "Is unused"], answer: 1, explanation: "This non-rewinding property is what guarantees O(n) scanning." },
      { question: "Compared to naive matching, KMP eliminates…", options: ["All comparisons", "Redundant re-comparison of already-matched text", "The need for the pattern", "Memory usage"], answer: 1, explanation: "The failure function reuses known matches instead of rescanning the text." },
    ],
  },
  contentAr: {
    overview: `تجد خوارزمية كنوث-موريس-برات النمط في النص بزمن خطي O(n + m) دون إعادة فحص أي حرف من النص. فكرتها الجوهرية: عندما يحدث عدم تطابق بعد تطابق بعض الحروف، يخبرنا النمط نفسه كم يمكننا الإزاحة بأمان دون تفويت أي تطابق.

تُختزَن هذه المعرفة في مصفوفة LPS ("أطول بادئة فعلية هي أيضًا لاحقة")، وتُحسب من النمط وحده في مرحلة معالجة مسبقة. أثناء المسح، عند عدم تطابق في موضع النمط j، تقفز KMP بـ j إلى lps[j−1] بدلًا من البدء من جديد — مُعيدة استخدام الحروف التي تعرف مسبقًا أنها متطابقة.`,
    howItWorks: [
      "عالِج النمط مسبقًا إلى مصفوفة LPS: lps[i] هو طول أطول بادئة فعلية من pattern[0..i] هي أيضًا لاحقة.",
      "امسح النص بفهرسين: i على النص، وj على النمط.",
      "عند التطابق، تقدّم بكلٍّ من i وj؛ ويحدث تطابق كامل للنمط عندما يبلغ j القيمة m.",
      "عند عدم تطابق مع j > 0، اجعل j = lps[j−1] — أزِح النمط بالبنية المعروفة دون إرجاع i للوراء.",
      "عند عدم تطابق مع j = 0، تقدّم بـ i فقط. فهرس النص i لا يتناقص أبدًا.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" },
      space: "O(m)",
      notes: "بناء LPS يكلّف O(m)؛ والمسح O(n) لأن i لا يتحرك للوراء وj يتناقص بعدد مرات لا يتجاوز عدد مرات تزايده. المساحة الإضافية هي مصفوفة LPS بحجم O(m).",
    },
    applications: [
      "بحث سريع عن سلاسل جزئية في محررات النصوص وأدوات البحث",
      "مطابقة تسلسلات الحمض النووي/البروتين في المعلوماتية الحيوية",
      "كشف التسلل وفحص السجلات بحثًا عن أنماط معروفة",
      "أي بحث متكرر عن نمط واحد فوق نص كبير",
    ],
    advantages: [
      "زمن خطي مضمون O(n + m) — دون انفجار في أسوأ حالة",
      "لا يعيد أبدًا مسح حروف النص",
      "حتمية (لا تجزئة ولا نتائج إيجابية كاذبة)",
      "المعالجة المسبقة تعتمد على النمط فقط",
    ],
    disadvantages: [
      "دالة LPS/الفشل دقيقة وعرضة للأخطاء في التنفيذ",
      "غالبًا ما تكون Boyer-Moore أسرع عمليًا على الأبجديات الكبيرة",
      "تعالج نمطًا واحدًا فقط (تُعمِّم Aho-Corasick إلى أنماط متعددة)",
    ],
    commonMistakes: [
      "بناء LPS بشكل خاطئ (سوء التعامل مع التراجع len = lps[len−1]).",
      "تقديم فهرس النص i عند عدم تطابق حين j > 0 — يجب تغيير j فقط.",
      "الخلط بين lps[j−1] وlps[j] في قفزة عدم التطابق.",
      "خطأ انزياح بمقدار واحد عند الإبلاغ عن موضع التطابق (i − m).",
    ],
    interviewQuestions: [
      "ماذا يمثل lps[i]، وكيف يُحسب في O(m)؟",
      "لماذا لا يتحرك فهرس النص في KMP للوراء أبدًا؟",
      "أثبت أن مسح KMP الكلي O(n) رغم حلقة التراجع الداخلية.",
      "كيف ترتبط KMP ببناء آلة حالة منتهية (DFA) للنمط؟",
      "كيف توسّع أفكار KMP لمطابقة أنماط كثيرة دفعة واحدة؟",
    ],
    summary:
      "تحقق KMP مطابقة نمط واحد بزمن خطي عبر حساب مصفوفة فشل LPS مسبقًا من النمط، ثم مسح النص دون أي إرجاع — وعند عدم التطابق تزيح النمط باستخدام lps[j−1]. زمن O(n + m) ومساحة O(m) وبلا نتائج إيجابية كاذبة.",
    quiz: [
      { question: "ماذا تخزّن lps[i]؟", options: ["الحرف رقم i", "طول أطول بادئة فعلية هي أيضًا لاحقة من pattern[0..i]", "عدد التطابقات حتى الآن", "فهرس النص التالي"], answer: 1, explanation: "هذا الطول يخبر KMP كم يمكنها الإزاحة مع الحفاظ على السياق المتطابق." },
      { question: "تعقيد زمن KMP الكلي هو…", options: ["O(nm)", "O(n + m)", "O(n log m)", "O(m²)"], answer: 1, explanation: "خطي لأن مؤشر النص لا يتحرك للوراء والمعالجة المسبقة O(m)." },
      { question: "عند عدم تطابق مع j > 0، تجعل KMP قيمة j…", options: ["0", "j − 1", "lps[j − 1]", "m"], answer: 2, explanation: "تتراجع إلى أطول طول بادئة قابل للاستخدام مسجَّل في مصفوفة LPS." },
      { question: "أثناء مرحلة المسح، فهرس النص i…", options: ["قد يتحرك للوراء", "لا يتحرك للوراء أبدًا", "يُعاد ضبطه كل إزاحة", "غير مستخدَم"], answer: 1, explanation: "خاصية عدم الإرجاع هذه هي ما يضمن مسحًا بزمن O(n)." },
      { question: "مقارنةً بالمطابقة الساذجة، تلغي KMP…", options: ["كل المقارنات", "إعادة المقارنة الزائدة للنص المتطابق سلفًا", "الحاجة إلى النمط", "استخدام الذاكرة"], answer: 1, explanation: "تعيد دالة الفشل استخدام التطابقات المعروفة بدلًا من إعادة مسح النص." },
    ],
  },
  inputFields: [
    { key: "text", label: "Text", placeholder: "abxabcabcaby", help: "The string to search in." },
    { key: "pattern", label: "Pattern", placeholder: "abcaby", help: "The substring to find." },
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
