import { describe, expect, it } from "vitest";
import { buildDraftMutationSteps, buildDraftMutationTimelineSteps, canVisualizeDraft, resolveDraftMutationFrames } from "@/lib/engine/draft-steps";
import type { ArrayFrame, ListFrame, TreeFrame } from "@/lib/engine/types";
import avlTree from "@/lib/algorithms/trees/avl-tree";

describe("draft dataset visualization", () => {
  it("shows the first array insertion immediately as a reversible transition", () => {
    const steps = buildDraftMutationSteps("array", {
      before: [],
      after: ["7"],
      kind: "insert",
      detail: "inserting 7",
    });

    expect(steps).toHaveLength(2);
    expect((steps[0].frame as ArrayFrame).values).toEqual([]);
    expect((steps[1].frame as ArrayFrame).values).toEqual([7]);
    expect((steps[1].frame as ArrayFrame).states).toEqual({ 0: "active" });
    expect(steps[1].descriptionAr).toContain("مباشرة");
  });

  it("keeps existing values mounted and animates only the next insertion", () => {
    const steps = buildDraftMutationSteps("array", {
      before: ["7"],
      after: ["7", "3"],
      kind: "insert",
      detail: "inserting 3",
    });

    expect((steps[0].frame as ArrayFrame).values).toEqual([7]);
    expect((steps[1].frame as ArrayFrame).values).toEqual([7, 3]);
    expect((steps[1].frame as ArrayFrame).states).toEqual({ 1: "active" });
    expect((steps[1].frame as ArrayFrame).pointers).toEqual([{ index: 1, label: "new" }]);
  });

  it("retains every insertion on one reversible construction timeline", () => {
    const mutations = [
      { before: [], after: ["6"], kind: "insert" as const, detail: "inserting 6" },
      { before: ["6"], after: ["6", "7"], kind: "insert" as const, detail: "inserting 7" },
      { before: ["6", "7"], after: ["6", "7", "88"], kind: "insert" as const, detail: "inserting 88" },
    ];
    const steps = buildDraftMutationTimelineSteps("array", mutations);

    expect(steps).toHaveLength(6);
    expect((steps[1].frame as ArrayFrame).values).toEqual([6]);
    expect((steps[3].frame as ArrayFrame).values).toEqual([6, 7]);
    expect((steps[5].frame as ArrayFrame).values).toEqual([6, 7, 88]);
    expect(steps.map((step) => step.phase)).toEqual([
      "prepare", "insert", "prepare", "insert", "prepare", "insert",
    ]);
  });

  it("preserves list and tree structure while a below-minimum set is edited", () => {
    const list = buildDraftMutationSteps("list", {
      before: ["A", "B"],
      after: ["A", "C"],
      kind: "update",
      detail: "changing B to C",
    });
    const listFrame = list[1].frame as ListFrame;
    expect(listFrame.nodes.map((node) => node.value)).toEqual(["A", "C"]);
    expect(listFrame.links).toEqual([{ from: "draft-0", to: "draft-1", kind: "next" }]);

    const tree = buildDraftMutationSteps("tree", {
      before: [],
      after: ["10"],
      kind: "insert",
      detail: "inserting 10",
    });
    const treeFrame = tree[1].frame as TreeFrame;
    expect(treeFrame.rootId).toBe("n0");
    expect(treeFrame.nodes.n0.value).toBe(10);
  });

  it("uses the real AVL generator for repeated-insert previews", () => {
    const mutation = {
      before: ["6", "7", "88"],
      after: ["6", "7", "88", "99"],
      kind: "insert" as const,
      detail: "inserting 99",
    };
    const input = avlTree.parseInput({ values: "10, 5" });
    const resolved = resolveDraftMutationFrames(avlTree, input, "values", mutation);
    const steps = buildDraftMutationSteps("tree", mutation, resolved);
    const frame = steps[1].frame as TreeFrame;

    expect(frame.nodes[frame.rootId!].value).toBe(7);
    expect(frame.nodes[frame.rootId!].left).toBe("n0");
    expect(frame.nodes[frame.rootId!].right).toBe("n2");
    expect(frame.nodes.n0.value).toBe(6);
    expect(frame.nodes.n2.value).toBe(88);
    expect(frame.nodes.n2.right).toBe("n3");
    expect(frame.nodes.n3.value).toBe(99);
    expect(frame.states).toEqual({ n3: "active" });
  });

  it("keeps all earlier AVL insertion results available to Previous", () => {
    const mutations = [
      { before: [], after: ["6"], kind: "insert" as const, detail: "inserting 6" },
      { before: ["6"], after: ["6", "7"], kind: "insert" as const, detail: "inserting 7" },
      { before: ["6", "7"], after: ["6", "7", "88"], kind: "insert" as const, detail: "inserting 88" },
      { before: ["6", "7", "88"], after: ["6", "7", "88", "99"], kind: "insert" as const, detail: "inserting 99" },
    ];
    const input = avlTree.parseInput({ values: "10, 5" });
    const resolved = mutations.map((mutation) =>
      resolveDraftMutationFrames(avlTree, input, "values", mutation),
    );
    const steps = buildDraftMutationTimelineSteps("tree", mutations, resolved);

    expect(steps).toHaveLength(8);
    expect(Object.values((steps[1].frame as TreeFrame).nodes).map((node) => node.value)).toEqual([6]);
    expect(Object.values((steps[3].frame as TreeFrame).nodes).map((node) => node.value).sort((a, b) => Number(a) - Number(b))).toEqual([6, 7]);
    expect(Object.values((steps[5].frame as TreeFrame).nodes).map((node) => node.value).sort((a, b) => Number(a) - Number(b))).toEqual([6, 7, 88]);
    expect(Object.values((steps[7].frame as TreeFrame).nodes).map((node) => node.value).sort((a, b) => Number(a) - Number(b))).toEqual([6, 7, 88, 99]);
  });

  it("does not treat malformed numeric arrays as an in-progress valid set", () => {
    expect(canVisualizeDraft("array", ["12"])).toBe(true);
    expect(canVisualizeDraft("array", ["not-a-number"])).toBe(false);
    expect(canVisualizeDraft("list", ["not-a-number"])).toBe(true);
  });
});
