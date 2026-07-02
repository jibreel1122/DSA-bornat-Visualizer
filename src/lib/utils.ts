import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Rough memory footprint of a plain-data object, in bytes. */
export function roughSizeOf(obj: unknown): number {
  const seen = new Set<object>();
  const walk = (v: unknown): number => {
    if (v === null || v === undefined) return 4;
    switch (typeof v) {
      case "number":
        return 8;
      case "boolean":
        return 4;
      case "string":
        return 8 + v.length * 2;
      case "object": {
        const o = v as object;
        if (seen.has(o)) return 8;
        seen.add(o);
        if (Array.isArray(o)) return 16 + o.reduce((s: number, x) => s + walk(x), 0);
        return (
          16 +
          Object.entries(o).reduce((s, [k, val]) => s + k.length * 2 + walk(val), 0)
        );
      }
      default:
        return 8;
    }
  };
  return walk(obj);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Parse a comma/space separated list of numbers. Throws a friendly error. */
export function parseNumberList(text: string, opts?: { min?: number; max?: number; maxLen?: number }): number[] {
  const parts = text
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new Error("Enter at least one number.");
  const maxLen = opts?.maxLen ?? 64;
  if (parts.length > maxLen) throw new Error(`Too many values — maximum is ${maxLen}.`);
  return parts.map((p) => {
    const n = Number(p);
    if (!Number.isFinite(n)) throw new Error(`"${p}" is not a valid number.`);
    if (opts?.min !== undefined && n < opts.min) throw new Error(`Values must be ≥ ${opts.min}.`);
    if (opts?.max !== undefined && n > opts.max) throw new Error(`Values must be ≤ ${opts.max}.`);
    return n;
  });
}
