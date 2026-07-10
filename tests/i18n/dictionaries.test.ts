import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import ar from "@/lib/i18n/ar.json";

const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();

describe("i18n dictionaries", () => {
  it("en and ar have identical key sets", () => {
    expect(arKeys).toEqual(enKeys);
  });

  it("no key has an empty or whitespace-only value in either locale", () => {
    const emptyEn = enKeys.filter((k) => (en as Record<string, string>)[k].trim() === "");
    const emptyAr = arKeys.filter((k) => (ar as Record<string, string>)[k].trim() === "");
    expect(emptyEn).toEqual([]);
    expect(emptyAr).toEqual([]);
  });

  it("placeholders match between locales for every key", () => {
    const placeholders = (s: string) => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
    const mismatched = enKeys.filter(
      (k) =>
        JSON.stringify(placeholders((en as Record<string, string>)[k])) !==
        JSON.stringify(placeholders((ar as Record<string, string>)[k])),
    );
    expect(mismatched).toEqual([]);
  });
});
