import { describe, expect, it } from "vitest";
import { loadAlgorithm } from "@/lib/algorithms";
import type { AlgorithmModule, Step, TreeFrame } from "@/lib/engine/types";
import { validateFrame } from "../helpers/validate-frame";

function checkedDescriptions(steps: Step<TreeFrame>[]): string {
  steps.forEach((step, index) => expect(validateFrame("tree", step.frame), `frame ${index}`).toEqual([]));
  return steps.map((step) => step.description).join("\n");
}

describe("tree structural-operation frames", () => {
  it("shows each heap swap as compare, transfer, and completed snapshots", async () => {
    const heap = (await loadAlgorithm("min-heap")) as AlgorithmModule<
      TreeFrame,
      { values: number[]; extractCount: number }
    >;
    const text = checkedDescriptions(heap.generate({ values: [8, 3, 1, 4, 2], extractCount: 1 }));

    expect(text).toContain("the child is smaller, so it must move up");
    expect(text).toContain("Lift 3 toward index 0");
    expect(text).toContain("Complete the upward transfer");
    expect(text).toContain("Lift the last element");
    expect(text).toContain("into the root slot before restoring heap order");
    expect(text).toContain("Complete the downward transfer");
  });

  it("shows BST deletion discovery, successor replacement, and reconnection", async () => {
    const bst = (await loadAlgorithm("binary-search-tree")) as AlgorithmModule<
      TreeFrame,
      { ops: { kind: "insert" | "search" | "delete"; value: number }[] }
    >;
    const steps = bst.generate({
      ops: [
        ...[50, 30, 70, 20, 40, 60, 80].map((value) => ({ kind: "insert" as const, value })),
        { kind: "delete" as const, value: 50 },
      ],
    });
    const text = checkedDescriptions(steps);

    expect(text).toContain("Inspect its children before reconnecting");
    expect(text).toContain("find the in-order successor");
    expect(text).toContain("Copy it into 50's position");
    expect(text).toContain("Reconnect complete");
    expect(steps.at(-1)!.frame.nodes[steps.at(-1)!.frame.rootId!].value).toBe(60);
  });

  it("shows trie child-slot reservation, edge attachment, and arrival separately", async () => {
    const trie = (await loadAlgorithm("trie")) as AlgorithmModule<TreeFrame, { words: string[]; search: string }>;
    const text = checkedDescriptions(trie.generate({ words: ["cat", "car"], search: "car" }));

    expect(text).toContain("Reserve a new child slot");
    expect(text).toContain("Create the 'c' edge and attach its new node");
    expect(text).toContain("The new 'c' node is now part of the trie");
    expect(text).toContain("Trace that edge before descending");
    expect(text).toContain("trace its edge before descending");
  });

  it("shows red-black pivot preparation and movement before a rotation completes", async () => {
    const redBlack = (await loadAlgorithm("red-black-tree")) as AlgorithmModule<TreeFrame, { values: number[] }>;
    const steps = redBlack.generate({ values: [10, 20, 30] });
    const text = checkedDescriptions(steps);

    const leaf = text.indexOf("Insert 30 as a RED leaf");
    const prepare = text.indexOf("Prepare left rotation");
    const lift = text.indexOf("Move pivot 20 into 10's parent position");
    const complete = text.indexOf("Complete the left rotation");
    expect(leaf).toBeGreaterThanOrEqual(0);
    expect(prepare).toBeGreaterThan(leaf);
    expect(lift).toBeGreaterThan(prepare);
    expect(complete).toBeGreaterThan(lift);
  });

  it("shows the individual B-tree split movements before median promotion", async () => {
    const bTree = (await loadAlgorithm("b-tree")) as AlgorithmModule<TreeFrame, { values: number[] }>;
    const text = checkedDescriptions(bTree.generate({ values: [10, 20, 30, 40] }));

    const detect = text.indexOf("is full. Pause before splitting it");
    const sibling = text.indexOf("Create an empty right sibling");
    const keys = text.indexOf("Move keys right of 20");
    const promote = text.indexOf("Promote median 20");
    expect(detect).toBeGreaterThanOrEqual(0);
    expect(sibling).toBeGreaterThan(detect);
    expect(keys).toBeGreaterThan(sibling);
    expect(promote).toBeGreaterThan(keys);
  });
});
