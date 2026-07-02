import { createRNG } from "@/lib/engine/random";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";
import { MAX_STEPS } from "@/lib/engine/types";

async function main() {
  let failures = 0;
  for (const meta of ALGORITHMS) {
    const mod = await loadAlgorithm(meta.slug);
    if (!mod) {
      console.log(`FAIL ${meta.slug}: not loadable`);
      failures++;
      continue;
    }
    // meta consistency
    if (mod.slug !== meta.slug || mod.renderer !== meta.renderer) {
      console.log(`FAIL ${meta.slug}: meta mismatch (slug=${mod.slug}, renderer=${mod.renderer})`);
      failures++;
    }
    if (mod.content.quiz.length < 4) {
      console.log(`WARN ${meta.slug}: only ${mod.content.quiz.length} quiz questions`);
    }
    const langs = Object.keys(mod.code).filter((k) => (mod.code as Record<string, string>)[k]?.trim());
    if (langs.length < 12) console.log(`WARN ${meta.slug}: only ${langs.length}/12 languages`);

    for (const level of [1, 2, 3, 4, 5] as const) {
      try {
        const input = mod.defaultInput(level, createRNG(level * 131 + meta.slug.length));
        const steps = mod.generate(input);
        if (steps.length < 2) {
          console.log(`FAIL ${meta.slug} L${level}: ${steps.length} steps`);
          failures++;
        }
        if (steps.length > MAX_STEPS) {
          console.log(`WARN ${meta.slug} L${level}: ${steps.length} steps exceeds MAX_STEPS`);
        }
        // round-trip serialize/parse
        const fields = mod.serializeInput(input);
        mod.parseInput(fields);
      } catch (e) {
        console.log(`FAIL ${meta.slug} L${level}: ${e instanceof Error ? e.message : e}`);
        failures++;
      }
    }
  }
  console.log(`\n${ALGORITHMS.length} algorithms checked — ${failures === 0 ? "ALL OK" : failures + " FAILURES"}`);
  if (failures > 0) process.exit(1);
}
main();
