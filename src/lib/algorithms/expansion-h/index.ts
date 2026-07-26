import type { AlgorithmMeta, AlgorithmModule } from "@/lib/engine/types";
import {
  bitmaskAssignment,
  digitDp,
  heldKarpTsp,
  maximumProductSubarray,
  optimalBst,
  regexMatchingDp,
  weightedIntervalScheduling,
} from "./dynamic-programming";
import {
  alphameticSolver,
  dancingLinksExactCover,
  gasStation,
  jumpGame,
  kakuroSolver,
  taskScheduler,
} from "./greedy-backtracking";
import {
  fermatPrimality,
  lfuCache,
  lruCache,
  lucasTheorem,
  matrixExponentiation,
  pollardRho,
} from "./mathematics-hashing";
import { metaOf } from "./shared";

// Runtime registry entries intentionally erase each module's private input/frame
// types so the common loader can parse and generate every registered module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExpansionHModule = AlgorithmModule<any, any>;

const modules = [
  heldKarpTsp,
  digitDp,
  bitmaskAssignment,
  weightedIntervalScheduling,
  optimalBst,
  regexMatchingDp,
  maximumProductSubarray,
  gasStation,
  jumpGame,
  taskScheduler,
  alphameticSolver,
  dancingLinksExactCover,
  kakuroSolver,
  pollardRho,
  fermatPrimality,
  lucasTheorem,
  matrixExponentiation,
  lruCache,
  lfuCache,
] satisfies ExpansionHModule[];

export type ExpansionHLoader = () => Promise<{ default: ExpansionHModule }>;

export const metas: AlgorithmMeta[] = modules.map(metaOf);

export const loaders: Record<string, ExpansionHLoader> = Object.fromEntries(
  modules.map((module) => [module.slug, async () => ({ default: module })]),
);

export async function loadExpansionH(slug: string): Promise<ExpansionHModule | null> {
  const loader = loaders[slug];
  return loader ? (await loader()).default : null;
}
