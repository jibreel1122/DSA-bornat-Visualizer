import type { AlgorithmMeta } from "@/lib/engine/types";
import {
  americanFlagSort,
  beadSort,
  binaryInsertionSort,
  blockSort,
  librarySort,
  patienceSort,
  pigeonholeSort,
  smoothsort,
  spreadsort,
  stoogeSort,
  strandSort,
  tournamentSort,
} from "./sorting";
import {
  lowerUpperBound,
  matrixSearch,
  peakFinding,
  rotatedArraySearch,
} from "./searching";
import {
  boothMinimumRotation,
  eertree,
  longestCommonSubstring,
  suffixAutomaton,
  wildcardMatching,
} from "./strings";

export type ExpansionELoader = () => Promise<{ default: unknown }>;

export const modules = [
  binaryInsertionSort,
  stoogeSort,
  strandSort,
  patienceSort,
  tournamentSort,
  smoothsort,
  blockSort,
  pigeonholeSort,
  americanFlagSort,
  beadSort,
  librarySort,
  spreadsort,
  rotatedArraySearch,
  peakFinding,
  matrixSearch,
  lowerUpperBound,
  suffixAutomaton,
  eertree,
  longestCommonSubstring,
  wildcardMatching,
  boothMinimumRotation,
] as const;

export const metas: AlgorithmMeta[] = modules.map((algorithm) => ({
  slug: algorithm.slug,
  title: algorithm.title,
  titleAr: algorithm.titleAr,
  category: algorithm.category,
  difficulty: algorithm.difficulty,
  tags: algorithm.tags,
  tagsAr: algorithm.tagsAr,
  summary: algorithm.summary,
  summaryAr: algorithm.summaryAr,
  renderer: algorithm.renderer,
}));

export const loaders: Record<string, ExpansionELoader> = Object.fromEntries(
  modules.map((algorithm) => [
    algorithm.slug,
    async () => ({ default: algorithm }),
  ]),
);
