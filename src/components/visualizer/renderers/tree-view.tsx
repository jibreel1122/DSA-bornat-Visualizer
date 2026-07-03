"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { TreeFrame, TreeNodeF } from "@/lib/engine/types";
import { AuxRows, FrameNote, isEmphasized, vizFill } from "../viz-utils";

const X_GAP = 56;
const Y_GAP = 74;
const R = 19;

interface Layout {
  pos: Map<string, { x: number; y: number }>;
  maxX: number;
  maxDepth: number;
}

/**
 * Binary trees: in-order x positioning (left subtree left of parent, right
 * subtree right). N-ary trees (children[]): parents centered over children.
 */
function layoutTree(frame: TreeFrame): Layout {
  const pos = new Map<string, { x: number; y: number }>();
  let cursor = 0;
  let maxDepth = 0;

  const walk = (id: string | null | undefined, depth: number): number | null => {
    if (!id) return null;
    const node = frame.nodes[id];
    if (!node) return null;
    maxDepth = Math.max(maxDepth, depth);

    let x: number;
    if (node.children) {
      const xs = node.children
        .map((c) => walk(c, depth + 1))
        .filter((v): v is number => v !== null);
      x = xs.length === 0 ? cursor++ : (Math.min(...xs) + Math.max(...xs)) / 2;
    } else {
      walk(node.left, depth + 1);
      const leftMax = cursor;
      x = leftMax;
      cursor++;
      walk(node.right, depth + 1);
    }
    pos.set(id, { x, y: depth });
    return x;
  };

  walk(frame.rootId, 0);
  return { pos, maxX: Math.max(0, cursor - 1), maxDepth };
}

function childrenOf(node: TreeNodeF): (string | null)[] {
  if (node.children) return node.children;
  return [node.left ?? null, node.right ?? null];
}

export function TreeView({ frame }: { frame: TreeFrame }) {
  const { pos, maxX, maxDepth } = layoutTree(frame);
  const width = Math.max(320, (maxX + 1) * X_GAP + X_GAP);
  const height = Math.max(200, (maxDepth + 1) * Y_GAP + 40);

  const px = (x: number) => X_GAP / 2 + x * X_GAP + X_GAP / 2;
  const py = (y: number) => 30 + y * Y_GAP;

  const fillOf = (node: TreeNodeF) => {
    const state = frame.states?.[node.id];
    if (state && state !== "default") return vizFill(state);
    if (node.color === "red") return "oklch(0.6 0.21 20)";
    if (node.color === "black") return "oklch(0.28 0.02 264)";
    return vizFill(state);
  };

  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        {frame.rootId === null ? (
          <span className="text-sm text-muted-foreground">empty tree</span>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="max-w-full">
            {/* edges */}
            {[...pos.keys()].map((id) => {
              const node = frame.nodes[id];
              const p = pos.get(id)!;
              return childrenOf(node).map((cid, i) =>
                cid && pos.has(cid) ? (
                  <motion.line
                    key={`${id}-${cid}-${i}`}
                    initial={false}
                    animate={{
                      x1: px(p.x),
                      y1: py(p.y),
                      x2: px(pos.get(cid)!.x),
                      y2: py(pos.get(cid)!.y),
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    stroke="var(--border)"
                    strokeWidth={1.5}
                  />
                ) : null,
              );
            })}
            {/* nodes */}
            <AnimatePresence>
              {[...pos.keys()].map((id) => {
                const node = frame.nodes[id];
                const p = pos.get(id)!;
                const emphasized = isEmphasized(frame.states?.[node.id]);
                return (
                  <motion.g
                    key={id}
                    initial={{ opacity: 0, scale: 0.5, x: px(p.x), y: py(p.y) }}
                    animate={{ opacity: 1, scale: 1, x: px(p.x), y: py(p.y) }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <motion.circle
                      r={R}
                      style={{ fill: fillOf(node) }}
                      className="transition-colors duration-200"
                      stroke={node.color ? "var(--border)" : "none"}
                      strokeWidth={node.color ? 1.5 : 0}
                      animate={{ scale: emphasized ? 1.18 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    />
                    <text
                      textAnchor="middle"
                      dy={4.5}
                      className="fill-white font-mono text-[12px] font-semibold"
                    >
                      {String(node.value)}
                    </text>
                    {node.extra && (
                      <text
                        x={R + 3}
                        y={-R + 6}
                        className="fill-[var(--muted-foreground)] text-[10px]"
                      >
                        {node.extra}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </svg>
        )}
      </div>
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
