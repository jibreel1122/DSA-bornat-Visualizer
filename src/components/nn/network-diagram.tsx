"use client";

import * as React from "react";
import type { ForwardPass, Network } from "@/lib/nn/network";
import { useSettings } from "@/components/providers/settings-provider";
import { useLocale } from "@/lib/i18n";

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

/**
 * Tracks the OS-level `prefers-reduced-motion` media query. SVG SMIL
 * animations (<animateMotion>) aren't CSS, so the app's `.reduced-motion`
 * class (which only forces `animation-duration`/`transition-duration` to
 * ~0) can't touch them — this component must gate them itself in JS.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
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
  const { settings } = useSettings();
  const { t } = useLocale();
  const prefersReducedMotionOS = usePrefersReducedMotion();
  const motionEnabled = !settings.reducedMotion && !prefersReducedMotionOS;

  const L = net.layerSizes.length;
  const maxCount = Math.max(...net.layerSizes);

  // Node radius shrinks gracefully as layers get denser, but never so small
  // that the number label becomes unreadable.
  const R = Math.min(20, Math.max(7, 150 / maxCount));
  // Vertical gap between neuron centers must always exceed 2R (plus a little
  // breathing room) — so height grows with the tallest layer instead of the
  // fixed canvas squeezing nodes into overlap.
  const minGap = R * 2 + 6;
  const padX = 70;
  const padY = 40;
  const H = Math.max(420, padY * 2 + minGap * maxCount);
  // Width grows modestly with layer count so deep networks don't crush the
  // horizontal spacing between columns (labels + edges need room too).
  const W = Math.max(720, padX * 2 + Math.max(0, L - 1) * 100);

  const layerX = (l: number) => padX + (l * (W - 2 * padX)) / Math.max(1, L - 1);
  const neuronY = (l: number, i: number) => {
    const count = net.layerSizes[l];
    const gap = Math.max(minGap, (H - 2 * padY) / Math.max(1, count));
    const blockH = gap * count;
    const offset = (H - blockH) / 2; // center the column vertically
    return offset + gap * (i + 0.5);
  };

  const layerLabel = (l: number) =>
    l === 0 ? t("nn.layerInput") : l === L - 1 ? t("nn.layerOutput") : t("nn.layerHidden", { n: l });
  const showValueLabel = R >= 11; // avoid unreadable overlapping text on dense layers

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: 460 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-none">
        <style>{`
          @keyframes nn-node-in {
            from { opacity: 0; transform: scale(0.4); }
            to { opacity: 1; transform: scale(1); }
          }
          .nn-node { transform-box: fill-box; transform-origin: center; animation: nn-node-in 260ms ease-out; }
          @media (prefers-reduced-motion: reduce) {
            .nn-node { animation: none; }
          }
          @media (prefers-reduced-motion: reduce) {
            /* Belt-and-suspenders: JS already skips rendering .nn-flow-dot
               when prefers-reduced-motion or the in-app reduced-motion
               setting is active; this covers any pre-hydration flash. */
            .nn-flow-dot { display: none; }
          }
        `}</style>
        {/* edges */}
        {net.weights.map((Wmat, i) =>
          Wmat.map((row, r) =>
            row.map((w, c) => {
              const s = weightStroke(w);
              // An edge is "active" (data flowing) when it feeds into the
              // currently selected neuron: layer i -> (i+1, r) === selectedNeuron.
              const isActive =
                selectedNeuron !== null && selectedNeuron.layer === i + 1 && selectedNeuron.index === r;
              return (
                <line
                  key={`e-${i}-${r}-${c}`}
                  x1={layerX(i)}
                  y1={neuronY(i, c)}
                  x2={layerX(i + 1)}
                  y2={neuronY(i + 1, r)}
                  stroke={isActive ? "var(--viz-active)" : s.color}
                  strokeWidth={isActive ? s.width + 2 : s.width}
                  strokeOpacity={isActive ? 1 : s.opacity}
                  className="transition-all duration-300"
                />
              );
            }),
          ),
        )}

        {/* data-flow dots: only the edges feeding the selected neuron, bounded by that layer's fan-in */}
        {motionEnabled &&
          selectedNeuron !== null &&
          selectedNeuron.layer > 0 &&
          net.weights[selectedNeuron.layer - 1]?.[selectedNeuron.index]?.map((_, c) => {
            const i = selectedNeuron.layer - 1;
            const r = selectedNeuron.index;
            const x1 = layerX(i);
            const y1 = neuronY(i, c);
            const x2 = layerX(i + 1);
            const y2 = neuronY(i + 1, r);
            return (
              <circle key={`flow-${i}-${r}-${c}`} r={3} fill="var(--viz-active)" className="nn-flow-dot">
                <animateMotion
                  path={`M${x1},${y1} L${x2},${y2}`}
                  dur="0.8s"
                  begin={`${c * 0.05}s`}
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}

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
                className="nn-node cursor-pointer"
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
                  className="transition-all duration-300"
                />
                {showValueLabel && (
                  <text x={layerX(l)} y={neuronY(l, i) + 4} textAnchor="middle" className="pointer-events-none fill-foreground font-mono text-[10px] font-semibold">
                    {val === undefined ? "" : val.toFixed(2)}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
