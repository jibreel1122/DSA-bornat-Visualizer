import type { AlgorithmModule, TreeFrame } from "@/lib/engine/types";
import { aaTree, cartesianTree, orderStatisticTree } from "./balanced";
import { rTree, vanEmdeBoasTree } from "./indexed";
import { merkleTree, radixTree, suffixTrie } from "./lexical";
import { octree, quadtree } from "./spatial";
import {
  binaryLiftingLca,
  centroidDecomposition,
  eulerTourLca,
  heavyLightDecomposition,
  morrisTraversal,
  treeDiameter,
} from "./traversals";
import { metaOf } from "./shared";

export {
  aaTree,
  binaryLiftingLca,
  cartesianTree,
  centroidDecomposition,
  eulerTourLca,
  heavyLightDecomposition,
  merkleTree,
  morrisTraversal,
  octree,
  orderStatisticTree,
  quadtree,
  radixTree,
  rTree,
  suffixTrie,
  treeDiameter,
  vanEmdeBoasTree,
};

export const modules = [
  aaTree,
  cartesianTree,
  orderStatisticTree,
  radixTree,
  suffixTrie,
  merkleTree,
  quadtree,
  octree,
  rTree,
  vanEmdeBoasTree,
  binaryLiftingLca,
  morrisTraversal,
  treeDiameter,
  eulerTourLca,
  centroidDecomposition,
  heavyLightDecomposition,
] as const;

export const metas = modules.map((module) => metaOf(module as AlgorithmModule<TreeFrame, unknown>));

type ExpansionFModule = (typeof modules)[number];
export type ExpansionFLoader = () => Promise<{ default: ExpansionFModule }>;

export const loaders: Record<string, ExpansionFLoader> = Object.fromEntries(
  modules.map((module) => [module.slug, async () => ({ default: module })]),
);
