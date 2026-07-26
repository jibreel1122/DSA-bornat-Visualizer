import type { AlgorithmModule, Step, TableFrame } from "@/lib/engine/types";
import { codeBundle, modulo, standardLearning, tableFrame } from "./shared";

type Input = { a: number; modulus: number };
const pseudocode = [
  "procedure modularInverse(a, m)",
  "  run extended Euclid on (a, m)",
  "  maintain r = oldR-q*r and x = oldX-q*x",
  "  if gcd(a,m) != 1: no inverse",
  "  return oldX mod m",
];
function generate(input: Input): Step<TableFrame>[] {
  const rows: (string | number | null)[][] = [];
  const steps: Step<TableFrame>[] = [];
  let oldR = input.a, r = input.modulus, oldX = 1, x = 0, iterations = 0;
  const push = (description: string, ar: string, line: number) => {
    steps.push({ frame: tableFrame(rows.map((_, i) => String(i)), ["q", "oldR", "r", "oldX", "x"], rows, rows.length ? { row: rows.length - 1, col: 0 } : undefined), description, descriptionAr: ar, codeLine: line, counters: { iterations } });
  };
  rows.push(["—", oldR, r, oldX, x]);
  push(`Start extended Euclid for ${input.a} modulo ${input.modulus}.`, `ابدأ إقليدس الموسعة لـ ${input.a} بترديد ${input.modulus}.`, 1);
  while (r !== 0) {
    const q = Math.trunc(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldX, x] = [x, oldX - q * x];
    iterations++;
    rows.push([q, oldR, r, oldX, x]);
    push(`Quotient ${q}: update remainder and Bézout coefficient.`, `خارج القسمة ${q}: حدّث الباقي ومعامل بيزو.`, 2);
  }
  const exists = Math.abs(oldR) === 1;
  const inverse = exists ? modulo(oldX, input.modulus) : -1;
  steps.push({ frame: { ...tableFrame(rows.map((_, i) => String(i)), ["q", "oldR", "r", "oldX", "x"], rows), aux: [{ label: "Inverse", values: [inverse] }] }, description: exists ? `gcd=1, so ${input.a}⁻¹ mod ${input.modulus} = ${inverse}.` : `gcd=${Math.abs(oldR)}, so no modular inverse exists.`, descriptionAr: exists ? `القاسم المشترك 1، لذا معكوس ${input.a} بترديد ${input.modulus} هو ${inverse}.` : `القاسم المشترك ${Math.abs(oldR)}، لذلك لا يوجد معكوس قياسي.`, codeLine: exists ? 4 : 3, counters: { iterations } });
  return steps;
}
const learning = standardLearning({
  overview: "The modular inverse of a modulo m is the Bézout coefficient x when a·x + m·y = 1.",
  overviewAr: "المعكوس القياسي لـ a بترديد m هو معامل بيزو x عندما a·x + m·y = 1.",
  how: ["Run extended Euclid.", "Track the coefficient of a.", "Normalize it modulo m when the gcd is one."],
  howAr: ["شغّل إقليدس الموسعة.", "تتبع معامل a.", "طبّعه بترديد m عندما يكون القاسم المشترك واحدًا."],
  complexity: { time: { best: "O(1)", average: "O(log m)", worst: "O(log m)" }, space: "O(1)" },
  invariant: "Each remainder is represented as a linear combination of a and m.",
  invariantAr: "يُمثل كل باقٍ تركيبة خطية من a وm.",
  summary: "Extended Euclid computes an inverse exactly when a and m are coprime.",
  summaryAr: "تحسب إقليدس الموسعة المعكوس بالضبط عندما يكون a وm أوليين نسبيًا.",
});
const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "modular-inverse", title: "Modular Inverse", titleAr: "المعكوس القياسي", category: "mathematics", difficulty: "Intermediate",
  tags: ["number theory", "extended Euclid", "Bézout", "modular arithmetic"], tagsAr: ["نظرية الأعداد", "إقليدس الموسعة", "بيزو", "حساب قياسي"],
  summary: "Uses extended Euclid to find x such that a·x ≡ 1 (mod m).", summaryAr: "يستخدم إقليدس الموسعة لإيجاد x بحيث a·x ≡ 1 (mod m).",
  renderer: "table", pseudocode, code: codeBundle("Modular Inverse", pseudocode), ...learning,
  inputFields: [{ key: "a", label: "a", labelAr: "a", placeholder: "3" }, { key: "modulus", label: "Modulus", labelAr: "المقياس", placeholder: "11" }],
  defaultInput: (level, rng) => rng.pick([{ a: 3, modulus: 11 }, { a: 5, modulus: 17 }, { a: 17, modulus: 43 }, { a: 37, modulus: 101 }, { a: 257, modulus: 1009 }].slice(0, level)),
  parseInput: (fields) => { const a = Number(fields.a), modulus = Number(fields.modulus); if (!Number.isInteger(a) || !Number.isInteger(modulus) || modulus <= 1 || modulus > 1_000_000) throw new Error("Use integer a and modulus 2..1,000,000."); return { a, modulus }; },
  serializeInput: (input) => ({ a: String(input.a), modulus: String(input.modulus) }), generate,
};
export default mod;
