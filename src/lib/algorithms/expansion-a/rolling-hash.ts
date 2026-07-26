import type { AlgorithmModule, Step, StringFrame } from "@/lib/engine/types";
import { codeBundle, defaultTextPattern, parseTextPattern, serializeTextPattern, standardLearning, stringFrame, type TextPatternInput } from "./shared";

const pseudocode = [
  "procedure rollingHash(text, pattern)",
  "  compute pattern hash and first window hash",
  "  for shift = 0 to n-m:",
  "    if hashes equal: verify characters and report match",
  "    remove outgoing character contribution",
  "    multiply by base and add incoming character",
  "  return matches",
];
function generate(input: TextPatternInput): Step<StringFrame>[] {
  const text = [...input.text], pattern = [...input.pattern];
  const base = 257, modulus = 1_000_003, m = pattern.length;
  const steps: Step<StringFrame>[] = [], matches: number[] = [];
  let hashes = 0, verifications = 0, high = 1;
  for (let i = 1; i < m; i++) high = (high * base) % modulus;
  const value = (ch: string) => (ch.codePointAt(0) ?? 0) + 1;
  let patternHash = 0, windowHash = 0;
  for (let i = 0; i < m; i++) {
    patternHash = (patternHash * base + value(pattern[i])) % modulus;
    windowHash = (windowHash * base + value(text[i] ?? "")) % modulus;
    hashes += 2;
  }
  const snap = (description: string, ar: string, line: number, shift: number, found = false) => {
    const ts: Record<number, "active" | "found"> = {};
    const ps: Record<number, "active" | "found"> = {};
    for (let i = 0; i < m && shift + i < text.length; i++) {
      ts[shift + i] = found ? "found" : "active";
      ps[i] = found ? "found" : "active";
    }
    steps.push({ frame: stringFrame(text, ts, pattern, ps, shift, [{ label: "Pattern / window hash", values: [patternHash, windowHash] }, { label: "Matches", values: matches.length ? matches : ["—"] }]), description, descriptionAr: ar, codeLine: line, counters: { hashes, verifications, matches: matches.length } });
  };
  snap(`Pattern hash is ${patternHash}; first window hash is ${windowHash}.`, `تجزئة النمط ${patternHash} وتجزئة النافذة الأولى ${windowHash}.`, 1, 0);
  for (let shift = 0; shift + m <= text.length; shift++) {
    snap(`Window ${shift}: compare hashes ${windowHash} and ${patternHash}.`, `النافذة ${shift}: قارن التجزئتين ${windowHash} و${patternHash}.`, 2, shift);
    if (windowHash === patternHash) {
      let equal = true;
      for (let j = 0; j < m; j++) {
        verifications++;
        if (text[shift + j] !== pattern[j]) { equal = false; break; }
      }
      if (equal) {
        matches.push(shift);
        snap(`Verified match at index ${shift}.`, `تأكد التطابق عند الفهرس ${shift}.`, 3, shift, true);
      } else snap("Hash collision: character verification rejected this window.", "تصادم تجزئة: رفض فحص الأحرف هذه النافذة.", 3, shift);
    }
    if (shift + m < text.length) {
      const outgoing = value(text[shift]), incoming = value(text[shift + m]);
      windowHash = ((windowHash - outgoing * high) % modulus + modulus) % modulus;
      windowHash = (windowHash * base + incoming) % modulus;
      hashes++;
      snap(`Roll: remove '${text[shift]}' and add '${text[shift + m]}', producing hash ${windowHash}.`, `حرّك التجزئة: احذف '${text[shift]}' وأضف '${text[shift + m]}' لتحصل على ${windowHash}.`, 4, shift + 1);
    }
  }
  snap(matches.length ? `Matches: ${matches.join(", ")}.` : "Pattern not found.", matches.length ? `التطابقات: ${matches.join("، ")}.` : "لم يوجد النمط.", 6, 0);
  return steps;
}
const learning = standardLearning({
  overview: "A polynomial rolling hash updates a window in constant time by removing the outgoing character and appending the incoming character.",
  overviewAr: "تحدّث التجزئة المتحركة متعددة الحدود نافذة بزمن ثابت بحذف الحرف الخارج وإضافة الحرف الداخل.",
  how: ["Hash the pattern and first window.", "Compare hashes and verify equal hashes.", "Roll the hash to the next window."],
  howAr: ["جزّئ النمط والنافذة الأولى.", "قارن التجزئات وتحقق من المتساوية.", "حرّك التجزئة إلى النافذة التالية."],
  complexity: { time: { best: "O(n+m)", average: "O(n+m)", worst: "O(nm)" }, space: "O(1)" },
  invariant: "Before each comparison, windowHash equals the polynomial hash of the visible window.",
  invariantAr: "قبل كل مقارنة تساوي تجزئة النافذة تجزئة متعدد الحدود للنافذة المرئية.",
  summary: "Rolling hash scans fixed-length windows efficiently and verifies collisions safely.",
  summaryAr: "تمسح التجزئة المتحركة نوافذ ثابتة الطول بكفاءة وتتحقق من التصادمات بأمان.",
});
const mod: AlgorithmModule<StringFrame, TextPatternInput> = {
  slug: "rolling-hash", title: "Rolling Hash", titleAr: "التجزئة المتحركة", category: "strings", difficulty: "Intermediate",
  tags: ["polynomial hash", "sliding window", "string matching", "collision"], tagsAr: ["تجزئة متعددة الحدود", "نافذة منزلقة", "مطابقة نصوص", "تصادم"],
  summary: "Updates a polynomial window hash in O(1) and verifies equal-hash matches.",
  summaryAr: "تحدّث تجزئة نافذة متعددة الحدود في O(1) وتتحقق من التطابقات ذات التجزئة المتساوية.",
  renderer: "string", pseudocode, code: codeBundle("Rolling Hash", pseudocode), ...learning,
  inputFields: [{ key: "text", label: "Text", labelAr: "النص", placeholder: "abracadabra" }, { key: "pattern", label: "Pattern", labelAr: "النمط", placeholder: "abra" }],
  defaultInput: defaultTextPattern, parseInput: (fields) => {
    const parsed = parseTextPattern(fields);
    if ([...parsed.pattern].length > [...parsed.text].length) throw new Error("Pattern cannot be longer than text.");
    return parsed;
  }, serializeInput: serializeTextPattern, generate,
};
export default mod;
