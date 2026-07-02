"use client";

import { motion } from "framer-motion";
import type { ListFrame } from "@/lib/engine/types";
import { AuxRows, FrameNote, vizFill } from "../viz-utils";

const NODE_W = 64;
const NODE_H = 44;
const GAP = 44;

/**
 * Linked-list renderer: boxes with next/prev arrows, pointer labels,
 * optional circular wrap-around arc.
 */
export function ListView({ frame }: { frame: ListFrame }) {
  const n = frame.nodes.length;
  const width = Math.max(320, n * (NODE_W + GAP) + GAP);
  const height = 240;
  const y = height / 2 - NODE_H / 2;

  const posOf = new Map(frame.nodes.map((node, i) => [node.id, GAP / 2 + i * (NODE_W + GAP)]));

  const pointerByNode = new Map<string, string[]>();
  const nullPointers: string[] = [];
  for (const p of frame.pointers ?? []) {
    if (p.nodeId === null) {
      nullPointers.push(p.label);
    } else {
      if (!pointerByNode.has(p.nodeId)) pointerByNode.set(p.nodeId, []);
      pointerByNode.get(p.nodeId)!.push(p.label);
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height="100%"
          className="mx-auto max-h-[260px]"
        >
          <defs>
            <marker id="ll-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--muted-foreground)" />
            </marker>
          </defs>

          {frame.links.map((link, i) => {
            const fx = posOf.get(link.from);
            const tx = posOf.get(link.to);
            if (fx === undefined || tx === undefined) return null;
            const isLoop = link.kind === "loop" || (frame.circular && tx < fx);
            if (isLoop) {
              const x1 = fx + NODE_W / 2;
              const x2 = tx + NODE_W / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y + NODE_H} C ${x1} ${y + NODE_H + 70}, ${x2} ${y + NODE_H + 70}, ${x2} ${y + NODE_H + 6}`}
                  fill="none"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  markerEnd="url(#ll-arrow)"
                />
              );
            }
            const forward = tx > fx;
            const yOff = link.kind === "prev" ? 12 : -4;
            const x1 = forward ? fx + NODE_W : fx;
            const x2 = forward ? tx : tx + NODE_W;
            return (
              <line
                key={i}
                x1={x1}
                y1={y + NODE_H / 2 + yOff}
                x2={x2 + (forward ? -3 : 3)}
                y2={y + NODE_H / 2 + yOff}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                markerEnd="url(#ll-arrow)"
              />
            );
          })}

          {frame.nodes.map((node) => {
            const x = posOf.get(node.id)!;
            const labels = pointerByNode.get(node.id);
            return (
              <motion.g
                key={node.id}
                initial={false}
                animate={{ x }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <rect
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  style={{ fill: vizFill(frame.states?.[node.id]) }}
                  className="transition-colors duration-300"
                />
                <text
                  x={NODE_W / 2}
                  y={y + NODE_H / 2 + 4}
                  textAnchor="middle"
                  className="fill-white font-mono text-[13px] font-semibold"
                >
                  {node.value}
                </text>
                {labels && (
                  <text
                    x={NODE_W / 2}
                    y={y - 10}
                    textAnchor="middle"
                    className="fill-[var(--primary)] text-[11px] font-bold"
                  >
                    ↓ {labels.join(", ")}
                  </text>
                )}
              </motion.g>
            );
          })}

          {n === 0 && (
            <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-[var(--muted-foreground)] text-sm">
              empty list
            </text>
          )}
        </svg>
      </div>
      {nullPointers.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {nullPointers.join(", ")} → null
        </div>
      )}
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
