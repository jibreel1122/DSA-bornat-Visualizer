import { bloomFilter, cuckooHashing, robinHoodHashing } from "./hash-engines";
import { circularLinkedList, singlyLinkedListOperations } from "./list-engines";
import { dequeOperations, monotonicStack, priorityQueue, queueUsingStacks } from "./queue-engines";
import { maxHeap, splayTree, treap, twoThreeTree } from "./tree-balanced-engines";
import { expressionTree, intervalTree, kdTree, threadedBinaryTree } from "./tree-specialized-engines";
import { metaOf } from "./shared";

export {
  bloomFilter,
  circularLinkedList,
  cuckooHashing,
  dequeOperations,
  expressionTree,
  intervalTree,
  kdTree,
  maxHeap,
  monotonicStack,
  priorityQueue,
  queueUsingStacks,
  robinHoodHashing,
  singlyLinkedListOperations,
  splayTree,
  threadedBinaryTree,
  treap,
  twoThreeTree,
};

export const modules = [
  singlyLinkedListOperations,
  circularLinkedList,
  dequeOperations,
  priorityQueue,
  monotonicStack,
  queueUsingStacks,
  cuckooHashing,
  robinHoodHashing,
  bloomFilter,
  splayTree,
  treap,
  maxHeap,
  twoThreeTree,
  kdTree,
  intervalTree,
  expressionTree,
  threadedBinaryTree,
] as const;

export const metas = modules.map(metaOf);

type ExpansionBModule = (typeof modules)[number];
export type ExpansionBLoader = () => Promise<{ default: ExpansionBModule }>;

export const loaders: Record<string, ExpansionBLoader> = Object.fromEntries(
  modules.map((module) => [module.slug, async () => ({ default: module })]),
);
