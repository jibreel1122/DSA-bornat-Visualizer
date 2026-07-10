import type { Level, RNG } from "./types";

/** Deterministic mulberry32 PRNG — same seed, same dataset, reproducible steps. */
export function createRNG(seed: number): RNG {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle(arr) {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Suggested dataset sizes per difficulty level. */
export const LEVEL_SIZES: Record<Level, { array: number; nodes: number; grid: number; stringLen: number }> = {
  1: { array: 6, nodes: 5, grid: 5, stringLen: 8 },
  2: { array: 9, nodes: 7, grid: 7, stringLen: 12 },
  3: { array: 14, nodes: 9, grid: 9, stringLen: 18 },
  4: { array: 20, nodes: 12, grid: 12, stringLen: 26 },
  5: { array: 28, nodes: 16, grid: 15, stringLen: 36 },
};

/** Random distinct-ish integer array sized for the level. */
export function randomArray(level: Level, rng: RNG, opts?: { min?: number; max?: number; sorted?: boolean }): number[] {
  const n = LEVEL_SIZES[level].array;
  const min = opts?.min ?? 5;
  const max = opts?.max ?? 99;
  const set = new Set<number>();
  const out: number[] = [];
  while (out.length < n) {
    const v = rng.int(min, max);
    if (set.size < max - min - 1 && set.has(v)) continue;
    set.add(v);
    out.push(v);
  }
  if (opts?.sorted) out.sort((a, b) => a - b);
  return out;
}

/** Random connected graph sized for the level. Returns 1-letter node ids A, B, C… */
export function randomGraph(
  level: Level,
  rng: RNG,
  opts?: { weighted?: boolean; directed?: boolean; acyclic?: boolean },
): {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string; weight?: number }[];
} {
  const n = Math.min(LEVEL_SIZES[level].nodes, 26);
  const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const nodes = ids.map((id) => ({ id, label: id }));
  const edges: { from: string; to: string; weight?: number }[] = [];
  const has = new Set<string>();
  const addEdge = (a: string, b: string) => {
    const key = `${a}->${b}`;
    const rev = `${b}->${a}`;
    if (a === b || has.has(key) || (!opts?.directed && has.has(rev))) return;
    has.add(key);
    edges.push({ from: a, to: b, weight: opts?.weighted ? rng.int(1, 20) : undefined });
  };
  // spanning backbone keeps it connected; DAG edges always go low->high index
  for (let i = 1; i < n; i++) {
    const j = rng.int(0, i - 1);
    if (opts?.acyclic) addEdge(ids[j], ids[i]);
    else if (rng.next() < 0.5) addEdge(ids[j], ids[i]);
    else addEdge(ids[i], ids[j]);
  }
  const extra = rng.int(Math.floor(n / 3), Math.max(1, Math.floor(n * 0.8)));
  for (let k = 0; k < extra; k++) {
    let a = rng.int(0, n - 1);
    let b = rng.int(0, n - 1);
    if (opts?.acyclic && a > b) [a, b] = [b, a];
    addEdge(ids[a], ids[b]);
  }
  return { nodes, edges };
}

/** Deterministic circular layout for graphs without coordinates. */
export function circularLayout(ids: string[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const n = ids.length;
  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    out[id] = { x: 0.5 + 0.42 * Math.cos(angle), y: 0.5 + 0.42 * Math.sin(angle) };
  });
  return out;
}

const WORD_POOL = "banana ananas mississippi abracadabra algorithm structure visualize pattern matching search abcabcabc aabaaabaaa".split(" ");

/** Random lowercase string sized for the level. */
export function randomString(level: Level, rng: RNG, alphabet = "abc"): string {
  const n = LEVEL_SIZES[level].stringLen;
  if (level <= 2 && rng.next() < 0.5) return rng.pick(WORD_POOL).slice(0, n);
  return Array.from({ length: n }, () => alphabet[rng.int(0, alphabet.length - 1)]).join("");
}
