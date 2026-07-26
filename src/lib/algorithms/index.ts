/**
 * Central algorithm registry.
 *
 * Each category folder exports:
 *   - `metas`: lightweight AlgorithmMeta[] (statically bundled — drives nav,
 *     search, category pages)
 *   - `loaders`: slug -> dynamic import of the full module (code-split — the
 *     heavy content/code/generator loads only on the algorithm's page)
 */
import type { AlgorithmMeta, AlgorithmModule, CategoryId } from "@/lib/engine/types";

import * as sorting from "./sorting";
import * as searching from "./searching";
import * as linkedLists from "./linked-lists";
import * as stacksQueues from "./stacks-queues";
import * as hashing from "./hashing";
import * as trees from "./trees";
import * as graphs from "./graphs";
import * as dynamicProgramming from "./dynamic-programming";
import * as greedy from "./greedy";
import * as backtracking from "./backtracking";
import * as recursion from "./recursion";
import * as strings from "./strings";
import * as mathematics from "./mathematics";
import * as expansionA from "./expansion-a";
import * as expansionB from "./expansion-b";
import * as expansionC from "./expansion-c";
import * as expansionD from "./expansion-d";
import * as expansionE from "./expansion-e";
import * as expansionF from "./expansion-f";
import * as expansionG from "./expansion-g";
import * as expansionH from "./expansion-h";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModuleLoader = () => Promise<{ default: AlgorithmModule<any, any> }>;

const CATS = [
  sorting,
  searching,
  linkedLists,
  stacksQueues,
  hashing,
  trees,
  graphs,
  dynamicProgramming,
  greedy,
  backtracking,
  recursion,
  strings,
  mathematics,
  expansionA,
  expansionB,
  expansionC,
  expansionD,
  expansionE,
  expansionF,
  expansionG,
  expansionH,
];

export const ALGORITHMS: AlgorithmMeta[] = CATS.flatMap((c) => c.metas);

const LOADERS: Record<string, ModuleLoader> = Object.assign(
  {},
  ...CATS.map((c) => c.loaders),
);

export function getMeta(slug: string): AlgorithmMeta | undefined {
  return ALGORITHMS.find((a) => a.slug === slug);
}

export function byCategory(category: CategoryId): AlgorithmMeta[] {
  return ALGORITHMS.filter((a) => a.category === category);
}

export async function loadAlgorithm(slug: string): Promise<AlgorithmModule | null> {
  const loader = LOADERS[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.default as AlgorithmModule;
}
