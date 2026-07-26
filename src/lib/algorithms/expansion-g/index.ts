import type { AlgorithmMeta, AlgorithmModule, GraphFrame } from "@/lib/engine/types";
import { metaOf, type GraphInput } from "./common";
import { modules } from "./algorithms";

export { modules };
export const metas: AlgorithmMeta[] = modules.map(metaOf);

export type ExpansionGModule = AlgorithmModule<GraphFrame, GraphInput>;
export type ExpansionGModuleLoader = () => Promise<{ default: ExpansionGModule }>;

export const loaders: Record<string, ExpansionGModuleLoader> = Object.fromEntries(
  modules.map((module) => [module.slug, async () => ({ default: module })]),
);
