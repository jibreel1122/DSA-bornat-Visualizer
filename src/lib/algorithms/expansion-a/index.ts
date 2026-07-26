import type { AlgorithmMeta } from "@/lib/engine/types";
import ahoCorasick from "./aho-corasick";
import binarySearchFirstLast from "./binary-search-first-last";
import bitonicSort from "./bitonic-sort";
import chineseRemainderTheorem from "./chinese-remainder-theorem";
import cycleSort from "./cycle-sort";
import eulerTotient from "./euler-totient";
import fibonacciSearch from "./fibonacci-search";
import gnomeSort from "./gnome-sort";
import introsort from "./introsort";
import manacher from "./manacher";
import millerRabin from "./miller-rabin";
import modularInverse from "./modular-inverse";
import oddEvenSort from "./odd-even-sort";
import quickselect from "./quickselect";
import recursiveBinarySearch from "./recursive-binary-search";
import rollingHash from "./rolling-hash";
import sentinelSearch from "./sentinel-search";
import suffixArray from "./suffix-array";
import treeSort from "./tree-sort";
import { metaOf } from "./shared";

export type ExpansionALoader = () => Promise<{ default: unknown }>;

export const metas: AlgorithmMeta[] = [
  metaOf(cycleSort),
  metaOf(gnomeSort),
  metaOf(oddEvenSort),
  metaOf(bitonicSort),
  metaOf(introsort),
  metaOf(treeSort),
  metaOf(fibonacciSearch),
  metaOf(sentinelSearch),
  metaOf(quickselect),
  metaOf(binarySearchFirstLast),
  metaOf(manacher),
  metaOf(ahoCorasick),
  metaOf(suffixArray),
  metaOf(rollingHash),
  metaOf(modularInverse),
  metaOf(chineseRemainderTheorem),
  metaOf(eulerTotient),
  metaOf(millerRabin),
  metaOf(recursiveBinarySearch),
];

export const loaders: Record<string, ExpansionALoader> = {
  "cycle-sort": () => import("./cycle-sort"),
  "gnome-sort": () => import("./gnome-sort"),
  "odd-even-sort": () => import("./odd-even-sort"),
  "bitonic-sort": () => import("./bitonic-sort"),
  introsort: () => import("./introsort"),
  "tree-sort": () => import("./tree-sort"),
  "fibonacci-search": () => import("./fibonacci-search"),
  "sentinel-search": () => import("./sentinel-search"),
  quickselect: () => import("./quickselect"),
  "binary-search-first-last": () => import("./binary-search-first-last"),
  manacher: () => import("./manacher"),
  "aho-corasick": () => import("./aho-corasick"),
  "suffix-array": () => import("./suffix-array"),
  "rolling-hash": () => import("./rolling-hash"),
  "modular-inverse": () => import("./modular-inverse"),
  "chinese-remainder-theorem": () => import("./chinese-remainder-theorem"),
  "euler-totient": () => import("./euler-totient"),
  "miller-rabin": () => import("./miller-rabin"),
  "recursive-binary-search": () => import("./recursive-binary-search"),
};
