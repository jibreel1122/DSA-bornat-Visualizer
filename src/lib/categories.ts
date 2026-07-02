import type { CategoryId } from "@/lib/engine/types";
import {
  ArrowUpDown,
  Search,
  Link2,
  Layers,
  Hash,
  Network,
  Share2,
  Table2,
  Coins,
  Grid3x3,
  Repeat2,
  Type,
  Sigma,
  type LucideIcon,
} from "lucide-react";

export interface CategoryInfo {
  id: CategoryId;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** true → listed under "Data Structures"; false → "Algorithms" */
  isStructure: boolean;
  accent: string; // tailwind gradient classes for card headers
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "sorting",
    title: "Sorting Algorithms",
    short: "Sorting",
    description: "Watch arrays get ordered — comparisons, swaps, and partitions animated step by step.",
    icon: ArrowUpDown,
    isStructure: false,
    accent: "from-indigo-500 to-violet-500",
  },
  {
    id: "searching",
    title: "Searching Algorithms",
    short: "Searching",
    description: "Linear scans to logarithmic jumps — see exactly how each search narrows the field.",
    icon: Search,
    isStructure: false,
    accent: "from-sky-500 to-indigo-500",
  },
  {
    id: "linked-lists",
    title: "Linked Lists",
    short: "Linked Lists",
    description: "Pointers in motion: insertion, deletion, reversal, and cycle detection on every list variant.",
    icon: Link2,
    isStructure: true,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "stacks-queues",
    title: "Stacks & Queues",
    short: "Stacks & Queues",
    description: "LIFO and FIFO structures with pushes, pops, and wrap-around circular buffers.",
    icon: Layers,
    isStructure: true,
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "hashing",
    title: "Hashing",
    short: "Hashing",
    description: "Hash tables, collision strategies, and probabilistic filters — visualized bucket by bucket.",
    icon: Hash,
    isStructure: true,
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "trees",
    title: "Trees & Heaps",
    short: "Trees",
    description: "BSTs, AVL rotations, red-black recoloring, heaps, tries, and segment trees — live.",
    icon: Network,
    isStructure: true,
    accent: "from-green-500 to-emerald-500",
  },
  {
    id: "graphs",
    title: "Graph Algorithms",
    short: "Graphs",
    description: "Traversals, shortest paths, spanning trees, and connectivity on interactive graphs.",
    icon: Share2,
    isStructure: false,
    accent: "from-blue-500 to-cyan-500",
  },
  {
    id: "dynamic-programming",
    title: "Dynamic Programming",
    short: "DP",
    description: "Memoization tables and optimal substructure — watch subproblems fill in real time.",
    icon: Table2,
    isStructure: false,
    accent: "from-violet-500 to-purple-500",
  },
  {
    id: "greedy",
    title: "Greedy Algorithms",
    short: "Greedy",
    description: "Locally optimal choices building global solutions — scheduling, Huffman codes, and more.",
    icon: Coins,
    isStructure: false,
    accent: "from-yellow-500 to-amber-500",
  },
  {
    id: "backtracking",
    title: "Backtracking",
    short: "Backtracking",
    description: "Explore, fail, undo, retry — N-Queens, Sudoku, and maze solving with visible backtracks.",
    icon: Grid3x3,
    isStructure: false,
    accent: "from-rose-500 to-red-500",
  },
  {
    id: "recursion",
    title: "Recursion",
    short: "Recursion",
    description: "Call stacks that grow and unwind before your eyes — Hanoi, factorial, and beyond.",
    icon: Repeat2,
    isStructure: false,
    accent: "from-cyan-500 to-sky-500",
  },
  {
    id: "strings",
    title: "String Algorithms",
    short: "Strings",
    description: "Pattern matching from naive scans to KMP failure functions and rolling hashes.",
    icon: Type,
    isStructure: false,
    accent: "from-teal-500 to-green-500",
  },
  {
    id: "mathematics",
    title: "Mathematics",
    short: "Math",
    description: "GCD, sieves, fast exponentiation — number theory with every intermediate value shown.",
    icon: Sigma,
    isStructure: false,
    accent: "from-orange-500 to-rose-500",
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryInfo>;
