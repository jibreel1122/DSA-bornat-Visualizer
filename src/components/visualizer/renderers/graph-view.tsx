"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { GraphFrame } from "@/lib/engine/types";
import { circularLayout } from "@/lib/engine/random";
import { AuxRows, FrameNote, isEmphasized, vizFill } from "../viz-utils";

const W = 760;
const H = 440;
const R = 20;

/**
 * Graph renderer. Nodes carry normalized [0,1] coords (or fall back to a
 * circular layout). Nodes are draggable — user repositioning persists for
 * the session via a local override map.
 */
export function GraphView({ frame }: { frame: GraphFrame }) {
  const fallback = React.useMemo(
    () => circularLayout(frame.nodes.map((n) => n.id)),
    // re-layout only when the node id set changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame.nodes.map((n) => n.id).join(",")],
  );
  const [drag, setDrag] = React.useState<Record<string, { x: number; y: number }>>({});
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragging = React.useRef<string | null>(null);

  const posOf = (id: string): { x: number; y: number } => {
    if (drag[id]) return drag[id];
    const n = frame.nodes.find((nd) => nd.id === id);
    const base = n?.x !== undefined && n?.y !== undefined ? { x: n.x, y: n.y } : fallback[id];
    return { x: (base?.x ?? 0.5) * W, y: (base?.y ?? 0.5) * H };
  };

  const clientToSvg = (e: React.PointerEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const p = clientToSvg(e);
    setDrag((d) => ({
      ...d,
      [dragging.current!]: {
        x: Math.max(R, Math.min(W - R, p.x)),
        y: Math.max(R, Math.min(H - R, p.y)),
      },
    }));
  };

  const undirectedSeen = new Set<string>();

  return (
    <div className="relative flex h-full w-full flex-col p-4">
      <FrameNote note={frame.note} />
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="max-h-full w-full max-w-[820px] touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragging.current = null)}
          onPointerLeave={() => (dragging.current = null)}
        >
          <defs>
            <marker id="g-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--muted-foreground)" />
            </marker>
            <marker id="g-arrow-hl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--viz-active)" />
            </marker>
          </defs>

          {frame.edges.map((e, i) => {
            // draw one line per undirected pair
            if (!frame.directed) {
              const k = [e.from, e.to].sort().join("|");
              if (undirectedSeen.has(k)) return null;
              undirectedSeen.add(k);
            }
            const a = posOf(e.from);
            const b = posOf(e.to);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const x1 = a.x + ux * R;
            const y1 = a.y + uy * R;
            const x2 = b.x - ux * (R + (frame.directed ? 4 : 0));
            const y2 = b.y - uy * (R + (frame.directed ? 4 : 0));
            const state =
              frame.edgeStates?.[`${e.from}->${e.to}`] ??
              (!frame.directed ? frame.edgeStates?.[`${e.to}->${e.from}`] : undefined);
            const highlighted = state && state !== "default" && state !== "discarded";
            const stroke = highlighted
              ? vizFill(state)
              : state === "discarded"
                ? "var(--border)"
                : "var(--muted-foreground)";
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={highlighted ? 3 : 1.5}
                  strokeOpacity={state === "discarded" ? 0.5 : 0.85}
                  markerEnd={frame.directed ? (highlighted ? "url(#g-arrow-hl)" : "url(#g-arrow)") : undefined}
                  className="transition-all duration-200"
                />
                {frame.weighted && e.weight !== undefined && (
                  <g>
                    <rect
                      x={(x1 + x2) / 2 - 11}
                      y={(y1 + y2) / 2 - 9}
                      width={22}
                      height={16}
                      rx={5}
                      fill="var(--card)"
                      stroke="var(--border)"
                      strokeWidth={0.75}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 3.5}
                      textAnchor="middle"
                      className="fill-[var(--foreground)] font-mono text-[10px]"
                    >
                      {e.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {frame.nodes.map((n) => {
            const p = posOf(n.id);
            const annotation = frame.nodeAnnotations?.[n.id];
            return (
              <motion.g
                key={n.id}
                initial={false}
                animate={{ x: p.x, y: p.y }}
                transition={
                  dragging.current === n.id
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 300, damping: 30 }
                }
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.((e as unknown as React.PointerEvent).pointerId);
                  dragging.current = n.id;
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <motion.circle
                  r={R}
                  style={{ fill: vizFill(frame.nodeStates?.[n.id]) }}
                  className="transition-colors duration-200"
                  stroke="var(--background)"
                  strokeWidth={2}
                  animate={{ scale: isEmphasized(frame.nodeStates?.[n.id]) ? 1.18 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                />
                <text textAnchor="middle" dy={4.5} className="pointer-events-none fill-white font-mono text-[12px] font-bold">
                  {n.label}
                </text>
                {annotation && (
                  <text textAnchor="middle" dy={R + 14} className="pointer-events-none fill-[var(--muted-foreground)] font-mono text-[10px]">
                    {annotation}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
      <AuxRows rows={frame.aux} className="mt-2" />
    </div>
  );
}
