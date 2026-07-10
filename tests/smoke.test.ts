import { describe, expect, it } from "vitest";
import { ALGORITHMS, loadAlgorithm } from "@/lib/algorithms";

describe("algorithm registry", () => {
  it("exposes at least 87 algorithms with unique slugs", () => {
    expect(ALGORITHMS.length).toBeGreaterThanOrEqual(87);
    const slugs = new Set(ALGORITHMS.map((a) => a.slug));
    expect(slugs.size).toBe(ALGORITHMS.length);
  });

  it("loads a full module by slug", async () => {
    const mod = await loadAlgorithm("bubble-sort");
    expect(mod?.slug).toBe("bubble-sort");
    expect(typeof mod?.generate).toBe("function");
  });

  it("returns null for unknown slugs", async () => {
    expect(await loadAlgorithm("no-such-algorithm")).toBeNull();
  });
});
