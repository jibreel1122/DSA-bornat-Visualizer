import { describe, expect, it } from "vitest";
import { isValidSnapshot } from "@/lib/server/sync-validation";

describe("account synchronization validation", () => {
  it("accepts normal millisecond timestamps while keeping counters bounded", () => {
    expect(isValidSnapshot({
      progress: [{ algorithmSlug: "bubble-sort", categoryId: "sorting", attempts: 1, correct: 1, lastSeen: 1_784_196_000_000 }],
      events: [{ id: "event-1", type: "attempt", slug: "bubble-sort", category: "sorting", correct: true, createdAt: 1_784_196_000_000 }],
    })).toBe(true);
  });

  it("rejects implausibly distant timestamps", () => {
    expect(isValidSnapshot({ events: [{ id: "event-1", type: "study", slug: "bubble-sort", category: "sorting", createdAt: 4_102_444_800_001 }] })).toBe(false);
  });
});
