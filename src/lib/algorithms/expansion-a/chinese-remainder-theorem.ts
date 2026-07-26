import type { AlgorithmModule, Step, TableFrame } from "@/lib/engine/types";
import { codeBundle, extendedGcd, gcd, modulo, standardLearning, tableFrame } from "./shared";

type Input = { residues: number[]; moduli: number[] };
const pseudocode = [
  "procedure CRT(residues, moduli)",
  "  x = residues[0]; M = moduli[0]",
  "  for each next congruence x ≡ r (mod m):",
  "    inverse = M⁻¹ mod m",
  "    t = (r-x) * inverse mod m",
  "    x = x + M*t; M = M*m; x = x mod M",
  "  return x modulo product",
];
function generate(input: Input): Step<TableFrame>[] {
  const rows: (string | number | null)[][] = [];
  const steps: Step<TableFrame>[] = [];
  let x = modulo(input.residues[0], input.moduli[0]), product = input.moduli[0], combinations = 0;
  rows.push([0, input.residues[0], input.moduli[0], "—", x, product]);
  const push = (text: string, ar: string, line: number) => steps.push({ frame: tableFrame(rows.map((_, i) => String(i)), ["i", "r", "m", "t", "x", "M"], rows, { row: rows.length - 1, col: 4 }), description: text, descriptionAr: ar, codeLine: line, counters: { combinations } });
  push(`Start with x ≡ ${x} (mod ${product}).`, `ابدأ بـ x ≡ ${x} (mod ${product}).`, 1);
  for (let i = 1; i < input.moduli.length; i++) {
    const m = input.moduli[i], r = modulo(input.residues[i], m);
    const inverse = modulo(extendedGcd(product, m).x, m);
    const t = modulo((r - x) * inverse, m);
    x = modulo(x + product * t, product * m);
    product *= m;
    combinations++;
    rows.push([i, r, m, t, x, product]);
    push(`Combine congruence ${i}: multiplier t=${t}, giving x=${x} modulo ${product}.`, `ادمج الموافقة ${i}: المضاعف t=${t} فيعطي x=${x} بترديد ${product}.`, 5);
  }
  steps.push({ frame: { ...tableFrame(rows.map((_, i) => String(i)), ["i", "r", "m", "t", "x", "M"], rows), aux: [{ label: "Solution", values: [x, product] }] }, description: `Unique solution modulo ${product}: x = ${x}.`, descriptionAr: `الحل الوحيد بترديد ${product}: x = ${x}.`, codeLine: 6, counters: { combinations } });
  return steps;
}
const learning = standardLearning({
  overview: "The Chinese Remainder Theorem combines congruences with pairwise-coprime moduli into one unique residue modulo their product.",
  overviewAr: "تجمع نظرية الباقي الصيني موافقات ذات مقاييس أولية نسبيًا في باقٍ واحد فريد بترديد حاصل ضربها.",
  how: ["Start with one congruence.", "Use a modular inverse to align the next residue.", "Grow the combined modulus by multiplication."],
  howAr: ["ابدأ بموافقة واحدة.", "استخدم معكوسًا قياسيًا لمحاذاة الباقي التالي.", "كبّر المقياس المجمع بالضرب."],
  complexity: { time: { best: "O(k log M)", average: "O(k log M)", worst: "O(k log M)" }, space: "O(1)" },
  invariant: "After row i, x satisfies every congruence through i.",
  invariantAr: "بعد الصف i تحقق x كل الموافقات حتى i.",
  summary: "Incremental CRT merges pairwise-coprime congruences into one canonical solution.",
  summaryAr: "تدمج CRT التزايدية الموافقات الأولية نسبيًا في حل معياري واحد.",
});
const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "chinese-remainder-theorem", title: "Chinese Remainder Theorem", titleAr: "نظرية الباقي الصيني", category: "mathematics", difficulty: "Advanced",
  tags: ["CRT", "congruences", "coprime", "modular inverse"], tagsAr: ["CRT", "موافقات", "أولي نسبيًا", "معكوس قياسي"],
  summary: "Combines pairwise-coprime congruences into one solution modulo the product.", summaryAr: "تجمع موافقات أولية نسبيًا في حل واحد بترديد حاصل الضرب.",
  renderer: "table", pseudocode, code: codeBundle("Chinese Remainder Theorem", pseudocode), ...learning,
  inputFields: [{ key: "residues", label: "Residues", labelAr: "البواقي", placeholder: "2, 3, 2", list: true }, { key: "moduli", label: "Moduli", labelAr: "المقاييس", placeholder: "3, 5, 7", list: true }],
  defaultInput: (level) => level <= 2 ? { residues: [2, 3, 2], moduli: [3, 5, 7] } : { residues: [1, 3, 4, 0], moduli: [2, 5, 7, 11] },
  parseInput: (fields) => {
    const residues = (fields.residues ?? "").split(/[,\s]+/).filter(Boolean).map(Number), moduli = (fields.moduli ?? "").split(/[,\s]+/).filter(Boolean).map(Number);
    if (residues.length < 2 || residues.length !== moduli.length || residues.length > 8 || [...residues, ...moduli].some((v) => !Number.isInteger(v)) || moduli.some((m) => m <= 1)) throw new Error("Enter 2..8 integer residues and matching moduli > 1.");
    for (let i = 0; i < moduli.length; i++) for (let j = i + 1; j < moduli.length; j++) if (gcd(moduli[i], moduli[j]) !== 1) throw new Error("Moduli must be pairwise coprime.");
    if (moduli.reduce((a, b) => a * b, 1) > Number.MAX_SAFE_INTEGER) throw new Error("Product of moduli is too large.");
    return { residues, moduli };
  },
  serializeInput: (input) => ({ residues: input.residues.join(", "), moduli: input.moduli.join(", ") }), generate,
};
export default mod;
