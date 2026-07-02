"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dices, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrayView } from "@/components/visualizer/renderers/array-view";
import { ALGORITHMS } from "@/lib/algorithms";
import type { ArrayFrame } from "@/lib/engine/types";
import { parseNumberList } from "@/lib/utils";
import { createRNG, randomArray, randomSeed } from "@/lib/engine/random";

// array algorithms that take a target need a second field
const TARGET_SLUGS = new Set([
  "linear-search",
  "binary-search",
  "jump-search",
  "interpolation-search",
  "exponential-search",
  "ternary-search",
  "fibonacci-search",
]);

export function ArrayLab() {
  const router = useRouter();
  const arrayMetas = React.useMemo(() => ALGORITHMS.filter((m) => m.renderer === "array"), []);
  const [text, setText] = React.useState("34, 7, 23, 32, 5, 62, 18, 45");
  const [target, setTarget] = React.useState("23");
  const [slug, setSlug] = React.useState(arrayMetas[0]?.slug ?? "");

  const parsed = React.useMemo(() => {
    try {
      return parseNumberList(text, { min: -999, max: 999, maxLen: 40 });
    } catch {
      return null;
    }
  }, [text]);

  const frame: ArrayFrame | null = parsed ? { values: parsed } : null;
  const needsTarget = TARGET_SLUGS.has(slug);

  const run = () => {
    if (!parsed || parsed.length < 2) {
      toast.error("Enter at least 2 valid numbers.");
      return;
    }
    if (!slug) {
      toast.error("Pick an algorithm.");
      return;
    }
    const fields: Record<string, string> = { values: parsed.join(", ") };
    if (needsTarget) fields.target = target.trim() || String(parsed[0]);
    router.push(`/visualizer/${slug}?input=${encodeURIComponent(JSON.stringify(fields))}`);
  };

  const randomize = () => {
    const arr = randomArray(3, createRNG(randomSeed()));
    setText(arr.join(", "));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 h-56 overflow-hidden rounded-xl border border-border bg-background/40">
            {frame ? (
              <ArrayView frame={frame} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Enter valid numbers to preview
              </div>
            )}
          </div>
          <Label htmlFor="array-input">Array values</Label>
          <Input
            id="array-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="34, 7, 23, 32, 5"
            className="mt-1.5"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={randomize}>
              <Dices /> Random
            </Button>
            <span className="text-xs text-muted-foreground">
              {parsed ? `${parsed.length} values` : "invalid input"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-4">
          <div>
            <Label>Algorithm</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Choose an algorithm" />
              </SelectTrigger>
              <SelectContent>
                {arrayMetas.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsTarget && (
            <div>
              <Label htmlFor="target-input">Search target</Label>
              <Input
                id="target-input"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="23"
                className="mt-1.5"
              />
            </div>
          )}

          <Button onClick={run} disabled={!parsed || !slug}>
            <Play /> Run in Visualizer
          </Button>
          <p className="text-xs text-muted-foreground">
            Opens the full visualizer with your custom array pre-loaded.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
