import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/catalog/page-header";
import { LEVELS } from "@/lib/engine/types";
import { STATE_LEGEND, vizFill } from "@/components/visualizer/viz-utils";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How to use the Bornat Data Structure Visualizer — controls, shortcuts, difficulty levels, and FAQ.",
};

const TOC = [
  ["getting-started", "Getting started"],
  ["controls", "The control surface"],
  ["shortcuts", "Keyboard shortcuts"],
  ["legend", "Color legend"],
  ["levels", "Difficulty levels"],
  ["practice", "Practice & mastery"],
  ["playground", "Playground"],
  ["faq", "FAQ"],
];

const CONTROLS: [string, string][] = [
  ["Play / Pause", "Auto-advance through steps, or hold still."],
  ["Step forward / back", "Move exactly one step at a time in either direction."],
  ["Scrubber", "Drag to jump to any step instantly."],
  ["Speed", "Animation speed from 0.25× to 4×."],
  ["Reset", "Return to the first step."],
  ["Difficulty", "Choose Very Easy → Expert to scale the dataset size."],
  ["Random / Custom input", "Generate fresh data, or type your own."],
  ["Undo / Redo", "Step backward and forward through your input edits."],
  ["Save / Load", "Persist a dataset on this device and restore it later."],
  ["Export / Import JSON", "Share or back up an exact visualization state as a file."],
  ["Screenshot (PNG) / SVG", "Capture the canvas as an image."],
  ["Zoom / Pan / Fullscreen", "Scroll or use the controls to zoom; drag to pan; press F for fullscreen."],
];

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / Pause"],
  ["→ / ←", "Next / Previous step"],
  ["R", "Reset to start"],
  ["F", "Toggle fullscreen"],
  ["+ / −", "Increase / decrease speed"],
  ["Ctrl / ⌘ + K", "Open global search"],
];

const FAQ: [string, string][] = [
  ["Is my data private?", "Yes. Everything — favorites, notes, saved states, quiz progress — lives in your browser's localStorage. Nothing is uploaded to a server."],
  ["Does it work offline?", "Once loaded, visualizations run entirely in your browser with no network calls, so they keep working offline."],
  ["Can I use my own input?", "Absolutely. Every visualizer has a Custom Input option with validation, plus JSON import for exact states."],
  ["How do I share a specific example?", "Use Export JSON to save the state, or the Playground's deep links which encode your structure directly in the URL."],
  ["Which browsers are supported?", "Any modern evergreen browser (Chrome, Edge, Firefox, Safari). A recent version is recommended for the smoothest animations."],
  ["How are new algorithms added?", "Each algorithm is a single self-contained module — metadata, a step generator, and content — so the catalog grows without touching the core engine."],
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader icon={BookOpen} title="Documentation" description="Everything you need to get the most out of the visualizer." />

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 grid gap-1 text-sm">
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="grid gap-6">
          <Section id="getting-started" title="Getting started">
            <p>
              Pick any algorithm from the catalog to open its visualizer page. At the top you&apos;ll
              find the interactive canvas with a playback bar and a toolbar; below it, tabs with the
              full theory, code in twelve languages, applications, interview questions, a quiz, and a
              personal notes area. Hit <strong>Play</strong> and watch the algorithm run, or step
              through it manually to study each operation.
            </p>
          </Section>

          <Section id="controls" title="The control surface">
            <div className="grid gap-2">
              {CONTROLS.map(([name, desc]) => (
                <div key={name} className="grid gap-0.5 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[220px_1fr] sm:gap-4">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="shortcuts" title="Keyboard shortcuts">
            <div className="grid gap-2 sm:grid-cols-2">
              {SHORTCUTS.map(([key, action]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm text-muted-foreground">{action}</span>
                  <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
                </div>
              ))}
            </div>
          </Section>

          <Section id="legend" title="Color legend">
            <p className="mb-3">Colors are consistent across every visualization:</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {STATE_LEGEND.map((l) => (
                <span key={l.state} className="flex items-center gap-2 text-sm">
                  <span className="size-3 rounded-full" style={{ background: vizFill(l.state) }} />
                  {l.label}
                </span>
              ))}
            </div>
          </Section>

          <Section id="levels" title="Difficulty levels">
            <p className="mb-3">Five presets scale the size and complexity of generated datasets:</p>
            <div className="grid gap-2 sm:grid-cols-5">
              {LEVELS.map((l) => (
                <div key={l.level} className="rounded-xl border border-border p-3 text-center">
                  <div className="text-2xl font-bold gradient-text">{l.level}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{l.label}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="practice" title="Practice & mastery">
            <p>
              <strong>Practice mode</strong> turns the catalog into an active study session. Take
              quiz sprints drawn from any category, or predict the next step of a running algorithm.
              Your accuracy is tracked per category and rolls up into a mastery level — from Novice to
              Master — so you can see exactly where you&apos;re strong and where to focus.
            </p>
          </Section>

          <Section id="playground" title="Playground">
            <p>
              The <strong>Playground</strong> is a free-form editor. Draw your own graph node by node
              and edge by edge, or type a custom array, then run any compatible algorithm on your
              creation. Structures are encoded directly in a shareable deep link, so you can hand
              someone a URL that reproduces your exact setup.
            </p>
          </Section>

          <Section id="faq" title="Frequently asked questions">
            <div className="grid gap-4">
              {FAQ.map(([q, a]) => (
                <div key={q}>
                  <h3 className="text-sm font-semibold">{q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-foreground/90">{children}</CardContent>
    </Card>
  );
}
