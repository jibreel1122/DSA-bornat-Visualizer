"use client";

import * as React from "react";
import type { ForwardPass, Network } from "@/lib/nn/network";

/** Color for a weight edge: teal for positive, rose for negative, width/opacity by magnitude. */
function weightStroke(w: number): { color: string; width: number; opacity: number } {
  const mag = Math.min(Math.abs(w), 3);
  const color = w >= 0 ? "oklch(0.7 0.15 175)" : "oklch(0.65 0.2 15)";
  return { color, width: 0.5 + mag * 1.3, opacity: 0.25 + Math.min(mag / 3, 1) * 0.6 };
}

/** Fill for a neuron by activation value in ~[0,1] (or squashed for unbounded). */
function neuronFill(v: number): string {
  const t = 1 / (1 + Math.exp(-4 * (v - 0.5))); // emphasize around 0.5
  return `color-mix(in oklch, var(--viz-active) ${Math.round(t * 100)}%, var(--muted) )`;
}

export function NetworkDiagram({
  net,
  pass,
  selectedNeuron,
  onSelectNeuron,
}: {
  net: Network;
  pass: ForwardPass | null;
  selectedNeuron: { layer: number; index: number } | null;
  onSelectNeuron: (n: { layer: number; index: number } | null) => void;
}) {
  const W = 720;
  const H = 420;
  const padX = 70;
  const padY = 40;
  const L = net.layerSizes.length;
  const layerX = (l: number) => padX + (l * (W - 2 * padX)) / Math.max(1, L - 1);
  const neuronY = (l: number, i: number) => {
    const count = net.layerSizes[l];
    const gap = (H - 2 * padY) / Math.max(1, count);
    return padY + gap * (i + 0.5);
  };
  const R = Math.min(20, Math.max(10, 150 / Math.max(...net.layerSizes)));

  const layerLabel = (l: number) => (l === 0 ? "Input" : l === L - 1 ? "Output" : `Hidden ${l}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 460 }}>
      {/* edges */}
      {net.weights.map((Wmat, i) =>
        Wmat.map((row, r) =>
          row.map((w, c) => {
            const s = weightStroke(w);
            return (
              <line
                key={`e-${i}-${r}-${c}`}
                x1={layerX(i)}
                y1={neuronY(i, c)}
                x2={layerX(i + 1)}
                y2={neuronY(i + 1, r)}
                stroke={s.color}
                strokeWidth={s.width}
                strokeOpacity={s.opacity}
              />
            );
          }),
        ),
      )}

      {/* layer labels */}
      {net.layerSizes.map((_, l) => (
        <text key={`lbl-${l}`} x={layerX(l)} y={20} textAnchor="middle" className="fill-[var(--muted-foreground)] text-[11px] font-medium">
          {layerLabel(l)}
        </text>
      ))}

      {/* neurons */}
      {net.layerSizes.map((count, l) =>
        Array.from({ length: count }, (_, i) => {
          const val = pass?.a[l]?.[i];
          const isSel = selectedNeuron?.layer === l && selectedNeuron?.index === i;
          return (
            <g
              key={`n-${l}-${i}`}
              className="cursor-pointer"
              data-viz-interactive
              onClick={() => onSelectNeuron(isSel ? null : { layer: l, index: i })}
            >
              <circle
                cx={layerX(l)}
                cy={neuronY(l, i)}
                r={R}
                fill={val === undefined ? "var(--muted)" : neuronFill(val)}
                stroke={isSel ? "var(--primary)" : "var(--border)"}
                strokeWidth={isSel ? 3 : 1.5}
                className="transition-colors duration-300"
              />
              <text x={layerX(l)} y={neuronY(l, i) + 4} textAnchor="middle" className="pointer-events-none fill-foreground font-mono text-[10px] font-semibold">
                {val === undefined ? "" : val.toFixed(2)}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
