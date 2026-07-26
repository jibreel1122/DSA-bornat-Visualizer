import type { AlgorithmMeta } from "@/lib/engine/types";
import articulationPoints from "./articulation-points";
import bidirectionalBfs from "./bidirectional-bfs";
import bipartiteCheck from "./bipartite-check";
import bridges from "./bridges";
import dinic from "./dinic";
import edmondsKarp from "./edmonds-karp";
import eulerianPath from "./eulerian-path";
import hamiltonianPath from "./hamiltonian-path";
import iterativeDeepeningDfs from "./iterative-deepening-dfs";
import johnsonAlgorithm from "./johnson-algorithm";
import spfa from "./spfa";
import { metaOf } from "./common";

export const modules = [
  bidirectionalBfs,
  iterativeDeepeningDfs,
  articulationPoints,
  bridges,
  bipartiteCheck,
  eulerianPath,
  hamiltonianPath,
  johnsonAlgorithm,
  spfa,
  edmondsKarp,
  dinic,
] as const;

export const metas: AlgorithmMeta[] = modules.map(metaOf);

export type ExpansionCModule = (typeof modules)[number];
export type ExpansionCModuleLoader = () => Promise<{ default: ExpansionCModule }>;

export const loaders: Record<string, ExpansionCModuleLoader> = {
  "bidirectional-bfs": () => import("./bidirectional-bfs"),
  "iterative-deepening-dfs": () => import("./iterative-deepening-dfs"),
  "articulation-points": () => import("./articulation-points"),
  bridges: () => import("./bridges"),
  "bipartite-check": () => import("./bipartite-check"),
  "eulerian-path": () => import("./eulerian-path"),
  "hamiltonian-path": () => import("./hamiltonian-path"),
  "johnson-algorithm": () => import("./johnson-algorithm"),
  spfa: () => import("./spfa"),
  "edmonds-karp": () => import("./edmonds-karp"),
  dinic: () => import("./dinic"),
};
