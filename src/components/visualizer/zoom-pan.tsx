"use client";

import * as React from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/lib/i18n";
import { clamp } from "@/lib/utils";

export interface ZoomPanHandle {
  reset: () => void;
}

/**
 * Zoom (wheel / buttons) + pan (drag background) container for the canvas.
 * Transform is CSS-only so renderer animations stay GPU-composited.
 */
export const ZoomPan = React.forwardRef<
  ZoomPanHandle,
  { children: React.ReactNode; onFullscreen?: () => void }
>(function ZoomPan({ children, onFullscreen }, ref) {
  const { t } = useLocale();
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const panning = React.useRef<{ x: number; y: number } | null>(null);
  const moved = React.useRef(false);

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      setScale(1);
      setTx(0);
      setTy(0);
    },
  }));

  const zoom = (delta: number) => setScale((s) => clamp(s + delta, 0.4, 3));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onWheel={(e) => {
        if (e.ctrlKey) return; // let browser-level pinch zoom be
        zoom(e.deltaY < 0 ? 0.12 : -0.12);
      }}
      onPointerDown={(e) => {
        // pan only from the background, not interactive children (graph nodes)
        if ((e.target as Element).closest("[data-viz-interactive]")) return;
        panning.current = { x: e.clientX - tx, y: e.clientY - ty };
        moved.current = false;
      }}
      onPointerMove={(e) => {
        if (!panning.current) return;
        moved.current = true;
        setTx(e.clientX - panning.current.x);
        setTy(e.clientY - panning.current.y);
      }}
      onPointerUp={() => (panning.current = null)}
      onPointerLeave={() => (panning.current = null)}
    >
      <div
        className="h-full w-full origin-center"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
      >
        {children}
      </div>

      <div className="absolute bottom-3 end-3 z-10 flex items-center gap-1 rounded-xl border border-border bg-popover/85 p-1 shadow-sm backdrop-blur">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => zoom(-0.25)} aria-label={t("shell.zoomOut")}>
              <Minus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("shell.zoomOut")}</TooltipContent>
        </Tooltip>
        <span className="min-w-10 text-center font-mono text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => zoom(0.25)} aria-label={t("shell.zoomIn")}>
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("shell.zoomIn")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setScale(1);
                setTx(0);
                setTy(0);
              }}
              aria-label={t("shell.resetView")}
            >
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("shell.resetView")}</TooltipContent>
        </Tooltip>
        {onFullscreen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onFullscreen} aria-label={t("shell.fullscreen")}>
                <Maximize2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("shell.fullscreenTooltip")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});
