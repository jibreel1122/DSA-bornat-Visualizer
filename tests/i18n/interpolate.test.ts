import { describe, expect, it } from "vitest";
import { interpolate } from "@/lib/i18n/interpolate";

describe("interpolate", () => {
  it("replaces a single placeholder", () => {
    expect(interpolate("Inserted {value}.", { value: 42 })).toBe("Inserted 42.");
  });

  it("replaces multiple distinct placeholders", () => {
    expect(interpolate("Changed {old} to {new}.", { old: 3, new: "7" })).toBe("Changed 3 to 7.");
  });

  it("replaces repeated placeholders everywhere", () => {
    expect(interpolate("{x} and {x}", { x: "a" })).toBe("a and a");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });

  it("returns the template unchanged when vars is omitted", () => {
    expect(interpolate("Plain text")).toBe("Plain text");
  });

  it("works with RTL text around placeholders", () => {
    expect(interpolate("تمت إضافة {value}.", { value: 5 })).toBe("تمت إضافة 5.");
  });
});
