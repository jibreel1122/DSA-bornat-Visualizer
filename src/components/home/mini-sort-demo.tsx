"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/providers/settings-provider";

/** Self-playing looping bubble-sort teaser built from plain divs + framer-motion. */
export function MiniSortDemo() {
  const { settings } = useSettings();
  const [bars, setBars] = React.useState<{ id: number; v: number }[]>(() =>
    [45, 22, 78, 34, 61, 12, 53, 29].map((v, id) => ({ id, v })),
  );
  const [active, setActive] = React.useState<[number, number] | null>(null);
  const [sortedFrom, setSortedFrom] = React.useState(8);

  React.useEffect(() => {
    if (settings.reducedMotion) return;
    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      while (!cancelled) {
        const arr = [45, 22, 78, 34, 61, 12, 53, 29].map((v, id) => ({ id, v }));
        setBars(arr);
        setSortedFrom(arr.length);
        await sleep(600);
        const n = arr.length;
        for (let i = 0; i < n - 1 && !cancelled; i++) {
          for (let j = 0; j < n - i - 1 && !cancelled; j++) {
            setActive([j, j + 1]);
            await sleep(230);
            if (arr[j].v > arr[j + 1].v) {
              [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
              setBars([...arr]);
              await sleep(150);
            }
          }
          setSortedFrom(n - i - 1);
        }
        setActive(null);
        setSortedFrom(0);
        await sleep(1400);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [settings.reducedMotion]);

  const max = 78;

  return (
    <div className="glass flex h-full items-end justify-center gap-2 rounded-2xl p-6">
      {bars.map((bar, i) => {
        const isActive = active?.includes(i);
        const isSorted = i >= sortedFrom;
        return (
          <motion.div
            key={bar.id}
            layout
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-7 rounded-t-md sm:w-9"
            style={{
              height: `${18 + (bar.v / max) * 78}%`,
              background: isActive
                ? "var(--viz-compare)"
                : isSorted
                  ? "var(--viz-sorted)"
                  : "var(--viz-default)",
            }}
          />
        );
      })}
    </div>
  );
}
