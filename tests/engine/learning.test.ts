import { describe, expect, it } from "vitest";
import { bridgeIncrementalSteps, enrichSteps, recommendedNext } from "@/lib/engine/learning";

describe("learning frame helpers", () => {
  it("marks structural transformations without mutating the original frame", () => {
    const source = [{ frame: { values: [1, 2] }, description: "Right-rotate the unbalanced subtree." }];
    const steps = enrichSteps(source);
    expect(steps[0].phase).toBe("transform");
    expect(steps[0].transformation?.kind).toBe("balance");
    expect(source[0]).not.toHaveProperty("phase");
  });

  it("keeps a live edit anchored to the visible frame", () => {
    const current = { frame: { values: [3, 1] }, description: "Inspect current values." };
    const generated = [{ frame: { values: [3, 1, 2] }, description: "Start sorting." }];
    const result = bridgeIncrementalSteps(current, generated, "insert 2");
    expect(result).toHaveLength(2);
    expect(result[0].frame).toEqual(current.frame);
    expect(result[1].frame).toEqual(generated[0].frame);
    expect(result[1].phase).toBe("edit");
  });

  it("prioritizes unseen or weak algorithms", () => {
    const picks = recommendedNext({ byCategory: {}, byAlgorithm: { strong: { attempts: 10, correct: 10, mistakes: 0, lastSeen: Date.now() } } }, [
      { slug: "strong", title: "Strong", category: "sorting", difficulty: "Beginner", tags: [], summary: "", renderer: "array" },
      { slug: "new", title: "New", category: "sorting", difficulty: "Beginner", tags: [], summary: "", renderer: "array" },
    ]);
    expect(picks[0].slug).toBe("new");
  });
});
