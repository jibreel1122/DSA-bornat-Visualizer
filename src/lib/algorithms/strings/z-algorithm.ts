import type { AlgorithmModule, CellState, Step, StringFrame } from "@/lib/engine/types";
import { randomString } from "@/lib/engine/random";

type Input = { text: string; pattern: string };

function generate(input: Input): Step<StringFrame>[] {
  const t = [...input.text];
  const p = [...input.pattern];
  const s = [...p, "$", ...t]; // concatenated code-point array; Z is computed over this
  const n = s.length;
  const m = p.length;
  const steps: Step<StringFrame>[] = [];
  let comparisons = 0;
  const matches: number[] = [];
  const z = new Array(n).fill(0);

  const frame = (
    concatStates: Record<number, CellState>,
    zStates: Record<number, CellState>,
    description: string,
    codeLine: number,
    box?: { l: number; r: number },
    descriptionAr?: string,
  ) => {
    const aux: { label: string; values: (string | number)[]; states?: Record<number, CellState> }[] = [
      { label: "Z", values: [...z], states: zStates },
      { label: "Matches", values: matches.length ? [...matches] : ["—"] },
    ];
    if (box) aux.push({ label: "Z-box [L,R]", values: [box.l, box.r] });
    steps.push({
      frame: {
        text: s.map((ch, i) => ({ ch, state: concatStates[i] })),
        pattern: p.map((ch) => ({ ch })),
        shift: 0,
        aux,
      },
      description,
      descriptionAr,
      codeLine,
      counters: { comparisons, matches: matches.length },
    });
  };

  frame({}, {}, `Concatenate pattern + "$" + text = "${s.join("")}". Z[i] = length of the longest substring starting at i that matches a prefix of this string. Z[i] = ${m} ⇒ pattern occurrence.`, 0, undefined, `اربط pattern + "$" + text = "${s.join("")}". Z[i] = طول أطول سلسلة جزئية تبدأ عند i وتطابق بادئة هذه السلسلة. Z[i] = ${m} ⇒ تكرار للنمط.`);

  let L = 0;
  let R = 0;
  for (let i = 1; i < n; i++) {
    if (i < R) {
      z[i] = Math.min(R - i, z[i - L]);
      frame(
        { [i]: "active", [L]: "special", [R - 1]: "special" },
        { [i]: "compare", [i - L]: "compare" },
        `i=${i} is inside the Z-box [${L}, ${R - 1}]: copy Z[${i - L}] = ${z[i - L]} capped at ${R - i} → start Z[${i}] at ${z[i]}.`,
        2,
        { l: L, r: R - 1 },
        `i=${i} داخل صندوق Z ‏[${L}, ${R - 1}]: انسخ Z[${i - L}] = ${z[i - L]} محدودًا بـ ${R - i} ← ابدأ Z[${i}] عند ${z[i]}.`,
      );
    } else {
      frame({ [i]: "active" }, { [i]: "compare" }, `i=${i} is outside any Z-box: match from scratch.`, 3, undefined, `i=${i} خارج أي صندوق Z: طابِق من الصفر.`);
    }
    while (i + z[i] < n) {
      comparisons++;
      if (s[z[i]] !== s[i + z[i]]) break;
      z[i]++;
    }
    if (z[i] > 0) {
      const st: Record<number, CellState> = { [i]: "active" };
      for (let k = 0; k < z[i]; k++) st[i + k] = "compare";
      frame(st, { [i]: "found" }, `Extended: Z[${i}] = ${z[i]} (matches the prefix "${s.slice(0, z[i]).join("")}").`, 4, undefined, `تمدَّد: Z[${i}] = ${z[i]} (يطابق البادئة "${s.slice(0, z[i]).join("")}").`);
    }
    if (i + z[i] > R) {
      L = i;
      R = i + z[i];
    }
    if (z[i] === m) {
      const pos = i - m - 1; // position in the original text
      matches.push(pos);
      const st: Record<number, CellState> = {};
      for (let k = 0; k < m; k++) st[i + k] = "found";
      frame(st, { [i]: "found" }, `Z[${i}] = ${m} = pattern length ⇒ match at text index ${pos}!`, 5, undefined, `Z[${i}] = ${m} = طول النمط ⇒ تطابق عند فهرس النص ${pos}!`);
    }
  }

  frame(
    {},
    {},
    matches.length
      ? `Done. ${matches.length} match(es) at text indices: ${matches.join(", ")} using ${comparisons} character comparisons.`
      : `Done. Pattern not found (${comparisons} character comparisons).`,
    6,
    undefined,
    matches.length
      ? `انتهى. ${matches.length} تطابق عند فهارس النص: ${matches.join(", ")} باستخدام ${comparisons} مقارنة حرفية.`
      : `انتهى. لم يُعثَر على النمط (${comparisons} مقارنة حرفية).`,
  );
  return steps;
}

const mod: AlgorithmModule<StringFrame, Input> = {
  slug: "z-algorithm",
  title: "Z-Algorithm",
  titleAr: "خوارزمية Z",
  category: "strings",
  difficulty: "Advanced",
  tags: ["string matching", "Z-array", "prefix matching", "linear"],
  tagsAr: ["مطابقة نصوص", "مصفوفة Z", "مطابقة البادئة", "خطي"],
  summary: "Computes for every position the longest match with the string's own prefix (Z-array) in O(n), finding all pattern occurrences.",
  summaryAr: "يحسب لكل موضع أطول تطابق مع بادئة السلسلة نفسها (مصفوفة Z) في O(n)، فيجد كل تكرارات النمط.",
  renderer: "string",
  pseudocode: [
    "procedure zSearch(text, pattern)",
    "  s = pattern + '$' + text; compute Z over s",
    "  for i = 1 .. |s|-1:",
    "    if i < R: Z[i] = min(R - i, Z[i - L])   // reuse Z-box",
    "    else: Z[i] = 0                          // fresh start",
    "    extend Z[i] by direct comparison; update [L, R] if i + Z[i] > R",
    "    if Z[i] == |pattern|: report match at i - |pattern| - 1",
    "  return matches",
  ],
  code: {
    pseudocode: `s = pattern + '$' + text
L = R = 0
for i in 1..|s|-1:
  if i < R: Z[i] = min(R - i, Z[i - L])
  while i + Z[i] < |s| and s[Z[i]] == s[i + Z[i]]: Z[i]++
  if i + Z[i] > R: L = i; R = i + Z[i]
  if Z[i] == |pattern|: report i - |pattern| - 1`,
    c: `void zArray(const char* s, int n, int* z) {
    z[0] = 0;
    int L = 0, R = 0;
    for (int i = 1; i < n; i++) {
        z[i] = (i < R) ? ((R - i < z[i - L]) ? R - i : z[i - L]) : 0;
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > R) { L = i; R = i + z[i]; }
    }
}
void zSearch(const char* t, const char* p) {
    int n = strlen(t), m = strlen(p);
    char s[n + m + 2];
    sprintf(s, "%s$%s", p, t);
    int z[n + m + 1];
    zArray(s, n + m + 1, z);
    for (int i = m + 1; i <= n + m; i++)
        if (z[i] == m) printf("%d ", i - m - 1);
}`,
    cpp: `vector<int> zArray(const string& s) {
    int n = s.size();
    vector<int> z(n, 0);
    int L = 0, R = 0;
    for (int i = 1; i < n; i++) {
        if (i < R) z[i] = min(R - i, z[i - L]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > R) { L = i; R = i + z[i]; }
    }
    return z;
}
void zSearch(const string& t, const string& p) {
    string s = p + '$' + t;
    auto z = zArray(s);
    for (int i = p.size() + 1; i < (int)s.size(); i++)
        if (z[i] == (int)p.size()) cout << i - p.size() - 1 << ' ';
}`,
    java: `static int[] zArray(String s) {
    int n = s.length();
    int[] z = new int[n];
    int L = 0, R = 0;
    for (int i = 1; i < n; i++) {
        if (i < R) z[i] = Math.min(R - i, z[i - L]);
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
        if (i + z[i] > R) { L = i; R = i + z[i]; }
    }
    return z;
}
static void zSearch(String t, String p) {
    String s = p + "$" + t;
    int[] z = zArray(s);
    for (int i = p.length() + 1; i < s.length(); i++)
        if (z[i] == p.length()) System.out.print((i - p.length() - 1) + " ");
}`,
    python: `def z_array(s):
    n = len(s)
    z = [0] * n
    l = r = 0
    for i in range(1, n):
        if i < r:
            z[i] = min(r - i, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > r:
            l, r = i, i + z[i]
    return z

def z_search(t, p):
    s = p + "$" + t
    z = z_array(s)
    return [i - len(p) - 1 for i in range(len(p) + 1, len(s)) if z[i] == len(p)]`,
    javascript: `function zArray(s) {
  const n = s.length, z = new Array(n).fill(0);
  let L = 0, R = 0;
  for (let i = 1; i < n; i++) {
    if (i < R) z[i] = Math.min(R - i, z[i - L]);
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    if (i + z[i] > R) { L = i; R = i + z[i]; }
  }
  return z;
}
function zSearch(t, p) {
  const s = p + "$" + t;
  const z = zArray(s), res = [];
  for (let i = p.length + 1; i < s.length; i++)
    if (z[i] === p.length) res.push(i - p.length - 1);
  return res;
}`,
    typescript: `function zArray(s: string): number[] {
  const n = s.length, z = new Array(n).fill(0);
  let L = 0, R = 0;
  for (let i = 1; i < n; i++) {
    if (i < R) z[i] = Math.min(R - i, z[i - L]);
    while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
    if (i + z[i] > R) { L = i; R = i + z[i]; }
  }
  return z;
}
function zSearch(t: string, p: string): number[] {
  const s = p + "$" + t;
  const z = zArray(s), res: number[] = [];
  for (let i = p.length + 1; i < s.length; i++)
    if (z[i] === p.length) res.push(i - p.length - 1);
  return res;
}`,
    csharp: `static int[] ZArray(string s) {
    int n = s.Length;
    var z = new int[n];
    int L = 0, R = 0;
    for (int i = 1; i < n; i++) {
        if (i < R) z[i] = Math.Min(R - i, z[i - L]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > R) { L = i; R = i + z[i]; }
    }
    return z;
}
static List<int> ZSearch(string t, string p) {
    string s = p + "$" + t;
    var z = ZArray(s);
    var res = new List<int>();
    for (int i = p.Length + 1; i < s.Length; i++)
        if (z[i] == p.Length) res.Add(i - p.Length - 1);
    return res;
}`,
    go: `func zArray(s string) []int {
	n := len(s)
	z := make([]int, n)
	l, r := 0, 0
	for i := 1; i < n; i++ {
		if i < r {
			z[i] = min(r-i, z[i-l])
		}
		for i+z[i] < n && s[z[i]] == s[i+z[i]] {
			z[i]++
		}
		if i+z[i] > r {
			l, r = i, i+z[i]
		}
	}
	return z
}
func zSearch(t, p string) []int {
	s := p + "$" + t
	z := zArray(s)
	res := []int{}
	for i := len(p) + 1; i < len(s); i++ {
		if z[i] == len(p) {
			res = append(res, i-len(p)-1)
		}
	}
	return res
}`,
    rust: `fn z_array(s: &[u8]) -> Vec<usize> {
    let n = s.len();
    let mut z = vec![0usize; n];
    let (mut l, mut r) = (0usize, 0usize);
    for i in 1..n {
        if i < r { z[i] = (r - i).min(z[i - l]); }
        while i + z[i] < n && s[z[i]] == s[i + z[i]] { z[i] += 1; }
        if i + z[i] > r { l = i; r = i + z[i]; }
    }
    z
}
fn z_search(t: &str, p: &str) -> Vec<usize> {
    let s = format!("{}\${}", p, t);
    let z = z_array(s.as_bytes());
    (p.len() + 1..s.len()).filter(|&i| z[i] == p.len()).map(|i| i - p.len() - 1).collect()
}`,
    kotlin: `fun zArray(s: String): IntArray {
    val n = s.length
    val z = IntArray(n)
    var l = 0; var r = 0
    for (i in 1 until n) {
        if (i < r) z[i] = minOf(r - i, z[i - l])
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++
        if (i + z[i] > r) { l = i; r = i + z[i] }
    }
    return z
}
fun zSearch(t: String, p: String): List<Int> {
    val s = p + "$" + t
    val z = zArray(s)
    return (p.length + 1 until s.length).filter { z[it] == p.length }.map { it - p.length - 1 }
}`,
    swift: `func zArray(_ s: [Character]) -> [Int] {
    let n = s.count
    var z = [Int](repeating: 0, count: n)
    var l = 0, r = 0
    for i in 1..<n {
        if i < r { z[i] = min(r - i, z[i - l]) }
        while i + z[i] < n && s[z[i]] == s[i + z[i]] { z[i] += 1 }
        if i + z[i] > r { l = i; r = i + z[i] }
    }
    return z
}
func zSearch(_ t: String, _ p: String) -> [Int] {
    let s = Array(p + "$" + t)
    let z = zArray(s)
    var res: [Int] = []
    for i in (p.count + 1)..<s.count where z[i] == p.count {
        res.append(i - p.count - 1)
    }
    return res
}`,
  },
  content: {
    overview: `The Z-algorithm computes, for every position i of a string, the length of the longest substring starting at i that matches a prefix of the string — the Z-array. For pattern matching, concatenate pattern + "$" + text with a separator that appears in neither: wherever the Z-value equals the pattern's length, the pattern occurs in the text at that spot.

The linear-time trick is the Z-box [L, R): the rightmost segment found so far that matches a prefix. When computing Z[i] for an i inside the box, the corresponding earlier position i−L already tells us a guaranteed minimum match length, so comparisons only ever extend past R — never re-examining characters inside the box. Each character of the string is compared successfully at most once, giving O(n + m) total time with a remarkably short implementation.`,
    howItWorks: [
      "Build s = pattern + '$' + text with a separator character that occurs in neither string.",
      "Maintain the rightmost Z-box [L, R): a segment starting at L that matches the string's prefix.",
      "For i inside the box, initialize Z[i] = min(R − i, Z[i − L]) — reuse previously computed structure.",
      "Extend Z[i] by direct character comparison past R; if the extension passes R, the box moves to [i, i + Z[i]).",
      "Every position where Z[i] equals the pattern length is an occurrence, at text index i − m − 1.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" },
      space: "O(n + m)",
      notes: "R only moves forward and every successful comparison advances R, so total comparisons are linear. The Z-array over the concatenated string uses O(n + m) space.",
    },
    applications: [
      "Exact pattern matching in guaranteed linear time",
      "Finding all borders/periods of a string (period = n − Z-value structure)",
      "Counting distinct substrings and string compression analyses",
      "Building block in competitive programming for many string problems",
    ],
    advantages: [
      "Guaranteed O(n + m) with a very short, index-only implementation",
      "The Z-array itself is a reusable structure (periods, borders, runs)",
      "No hashing — deterministic, no collision risk",
    ],
    disadvantages: [
      "Requires concatenation with a separator character not in either string",
      "Uses O(n + m) extra memory for the concatenated string and Z-array",
      "Less textbook-famous than KMP, so implementations are more often written from scratch (and mis-written)",
    ],
    commonMistakes: [
      "Forgetting the separator '$' — without it, matches can bleed across the pattern/text boundary.",
      "Using min(R − i, Z[i − L]) incorrectly (off-by-one on whether R is inclusive).",
      "Updating [L, R] even when i + Z[i] does not exceed R.",
      "Reporting the match position without subtracting the pattern length and separator (i − m − 1).",
    ],
    interviewQuestions: [
      "What does Z[i] represent, and why does Z[i] = m signal a pattern match in the concatenation trick?",
      "Explain why the Z-algorithm is O(n) despite the inner while loop.",
      "How does the Z-array relate to the KMP failure function?",
      "How can the Z-array be used to find the smallest period of a string?",
      "Why is the separator character required, and what property must it satisfy?",
    ],
    summary:
      "The Z-algorithm computes the Z-array — longest prefix match at every position — in linear time using the Z-box optimization that never re-compares characters. Concatenating pattern + '$' + text turns it into a clean O(n + m) exact pattern matcher, and the Z-array doubles as a tool for periods, borders, and other string structure.",
    quiz: [
      { question: "Z[i] stores…", options: ["The i-th character's frequency", "Length of the longest substring at i matching the string's prefix", "The number of matches", "The suffix array rank"], answer: 1, explanation: "That prefix-match length is exactly what makes Z[i] = m detect pattern occurrences." },
      { question: "Why concatenate pattern + '$' + text?", options: ["To save memory", "So Z-values equal to the pattern length pinpoint occurrences without cross-boundary matches", "To sort the characters", "It's optional"], answer: 1, explanation: "The separator (absent from both strings) caps every Z-value at m and prevents matches spanning the boundary." },
      { question: "The Z-box [L, R) is…", options: ["A queue of characters", "The rightmost segment found that matches the string's prefix", "The alphabet range", "A hash window"], answer: 1, explanation: "Positions inside it can reuse earlier Z-values instead of comparing from scratch." },
      { question: "The Z-algorithm's total time is O(n) because…", options: ["The inner loop never runs", "Every successful comparison pushes R forward, and R never decreases", "It uses hashing", "It skips half the string"], answer: 1, explanation: "Comparisons only extend past R, so their total across the whole run is at most n." },
      { question: "A pattern occurrence at text index j corresponds to…", options: ["Z[j] = 0", "Z[j + m + 1] = m in the concatenated string", "Z[j] = j", "R = L"], answer: 1, explanation: "Text position j sits at concatenation index j + m + 1 (after the pattern and separator)." },
    ],
  },
  contentAr: {
    overview: `تحسب خوارزمية Z، لكل موضع i من سلسلة، طول أطول سلسلة جزئية تبدأ عند i وتطابق بادئة السلسلة — وهي مصفوفة Z. لمطابقة الأنماط، اربط pattern + "$" + text بفاصل لا يظهر في أيٍّ منهما: حيثما ساوت قيمة Z طول النمط، يظهر النمط في النص عند ذلك الموضع.

حيلة الزمن الخطي هي صندوق Z ‏[L, R): أقصى مقطع يمين مكتشَف حتى الآن يطابق بادئة. عند حساب Z[i] لموضع i داخل الصندوق، فإن الموضع الأسبق المقابل i−L يخبرنا مسبقًا بحد أدنى مضمون لطول التطابق، فلا تمتد المقارنات إلا بعد R — دون إعادة فحص الحروف داخل الصندوق أبدًا. يُقارَن كل حرف من السلسلة بنجاح مرة واحدة على الأكثر، مما يعطي زمنًا كليًا O(n + m) بتنفيذ قصير للغاية.`,
    howItWorks: [
      "ابنِ s = pattern + '$' + text بحرف فاصل لا يظهر في أيٍّ من السلسلتين.",
      "احتفظ بأقصى صندوق Z يمينًا ‏[L, R): مقطع يبدأ عند L ويطابق بادئة السلسلة.",
      "لموضع i داخل الصندوق، هيّئ Z[i] = min(R − i, Z[i − L]) — أعِد استخدام البنية المحسوبة سابقًا.",
      "مدِّد Z[i] بمقارنة حرفية مباشرة بعد R؛ فإن تجاوز التمديد R، ينتقل الصندوق إلى [i, i + Z[i]).",
      "كل موضع يساوي فيه Z[i] طول النمط هو تكرار، عند فهرس النص i − m − 1.",
    ],
    complexity: {
      time: { best: "O(n + m)", average: "O(n + m)", worst: "O(n + m)" },
      space: "O(n + m)",
      notes: "لا يتحرك R إلا إلى الأمام وكل مقارنة ناجحة تدفع R، فيكون مجموع المقارنات خطيًا. مصفوفة Z فوق السلسلة المربوطة تستخدم مساحة O(n + m).",
    },
    applications: [
      "مطابقة الأنماط الدقيقة بزمن خطي مضمون",
      "إيجاد كل حدود/دورات السلسلة (الدورة = بنية n − قيمة Z)",
      "عدّ السلاسل الجزئية المتمايزة وتحليلات ضغط النصوص",
      "لبنة أساسية في البرمجة التنافسية للعديد من مسائل النصوص",
    ],
    advantages: [
      "زمن O(n + m) مضمون بتنفيذ قصير جدًا يعتمد على الفهارس فقط",
      "مصفوفة Z نفسها بنية قابلة لإعادة الاستخدام (دورات، حدود، تكرارات)",
      "لا تجزئة — حتمية وبلا خطر تصادم",
    ],
    disadvantages: [
      "تتطلب ربطًا بحرف فاصل غير موجود في أيٍّ من السلسلتين",
      "تستخدم ذاكرة إضافية O(n + m) للسلسلة المربوطة ومصفوفة Z",
      "أقل شهرة في الكتب من KMP، فتُكتب تنفيذاتها من الصفر أكثر (وتُكتب خطأً أكثر)",
    ],
    commonMistakes: [
      "نسيان الفاصل '$' — دونه قد تتسرب التطابقات عبر حدود النمط/النص.",
      "استخدام min(R − i, Z[i − L]) بشكل خاطئ (انزياح بمقدار واحد حول ما إذا كان R شاملًا).",
      "تحديث [L, R] حتى عندما لا يتجاوز i + Z[i] القيمة R.",
      "الإبلاغ عن موضع التطابق دون طرح طول النمط والفاصل (i − m − 1).",
    ],
    interviewQuestions: [
      "ماذا يمثل Z[i]، ولماذا تشير Z[i] = m إلى تطابق نمط في حيلة الربط؟",
      "اشرح لماذا خوارزمية Z بزمن O(n) رغم حلقة while الداخلية.",
      "كيف ترتبط مصفوفة Z بدالة فشل KMP؟",
      "كيف يمكن استخدام مصفوفة Z لإيجاد أصغر دورة لسلسلة؟",
      "لماذا يُشترط حرف الفاصل، وأي خاصية يجب أن يحققها؟",
    ],
    summary:
      "تحسب خوارزمية Z مصفوفة Z — أطول تطابق بادئة عند كل موضع — بزمن خطي باستخدام تحسين صندوق Z الذي لا يعيد أبدًا مقارنة الحروف. ربط pattern + '$' + text يحوّلها إلى مطابِق أنماط دقيق أنيق بتكلفة O(n + m)، وتعمل مصفوفة Z أيضًا أداةً للدورات والحدود وبنى النصوص الأخرى.",
    quiz: [
      { question: "تخزّن Z[i]…", options: ["تكرار الحرف رقم i", "طول أطول سلسلة جزئية عند i تطابق بادئة السلسلة", "عدد التطابقات", "رتبة مصفوفة اللواحق"], answer: 1, explanation: "طول تطابق البادئة هذا هو بالضبط ما يجعل Z[i] = m يكشف تكرارات النمط." },
      { question: "لماذا نربط pattern + '$' + text؟", options: ["لتوفير الذاكرة", "كي تحدد قيم Z المساوية لطول النمط التكرارات دون تطابقات عابرة للحدود", "لترتيب الحروف", "إنه اختياري"], answer: 1, explanation: "الفاصل (الغائب عن السلسلتين) يحد كل قيمة Z عند m ويمنع تطابقات تمتد عبر الحد." },
      { question: "صندوق Z ‏[L, R) هو…", options: ["طابور من الحروف", "أقصى مقطع يمين مكتشَف يطابق بادئة السلسلة", "مجال الأبجدية", "نافذة تجزئة"], answer: 1, explanation: "يمكن للمواضع داخله إعادة استخدام قيم Z الأسبق بدلًا من المقارنة من الصفر." },
      { question: "زمن خوارزمية Z الكلي O(n) لأن…", options: ["الحلقة الداخلية لا تعمل أبدًا", "كل مقارنة ناجحة تدفع R إلى الأمام، وR لا يتناقص أبدًا", "تستخدم التجزئة", "تتخطى نصف السلسلة"], answer: 1, explanation: "لا تمتد المقارنات إلا بعد R، فمجموعها عبر التشغيل كله لا يتجاوز n." },
      { question: "تكرار نمط عند فهرس النص j يقابل…", options: ["Z[j] = 0", "Z[j + m + 1] = m في السلسلة المربوطة", "Z[j] = j", "R = L"], answer: 1, explanation: "موضع النص j يقع عند فهرس الربط j + m + 1 (بعد النمط والفاصل)." },
    ],
  },
  inputFields: [
    { key: "text", label: "Text", placeholder: "aabxaabxcaabxaabxay", help: "The string to search in." },
    { key: "pattern", label: "Pattern", placeholder: "aabx", help: "The substring to find." },
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
    if ([...pattern].length > [...text].length) throw new Error("Pattern must not be longer than the text.");
    if ([...text].length > 55) throw new Error("Keep the text at most 55 characters (the concatenation is drawn).");
    if (text.includes("$") || pattern.includes("$")) throw new Error("'$' is reserved as the separator character.");
    return { text, pattern };
  },
  serializeInput: (input) => ({ text: input.text, pattern: input.pattern }),
  generate,
};

export default mod;
