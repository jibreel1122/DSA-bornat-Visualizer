import type { Metadata } from "next";
import { GraduationCap, Heart, Layers, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/catalog/page-header";

export const metadata: Metadata = {
  title: "About",
  description: "About the Bornat Data Structure Visualizer and its creator, Jibreel Bornat.",
};

const STACK = [
  "Next.js", "React", "TypeScript", "Tailwind CSS",
  "Framer Motion", "React Flow", "Radix UI", "Lucide Icons",
];

const PHILOSOPHY = [
  {
    title: "Steps as data",
    desc: "Every algorithm is a pure function that emits an immutable list of snapshots. That makes scrubbing, stepping backward, and exporting state correct by construction.",
  },
  {
    title: "One shell, many structures",
    desc: "A single universal player provides playback, editing, export, and accessibility for every algorithm — so the experience is identical whether you're sorting an array or balancing an AVL tree.",
  },
  {
    title: "Understanding over spectacle",
    desc: "Animations exist to explain, not to dazzle. Each step is narrated, each color has meaning, and the theory sits right beside the motion.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Sparkles}
        title="About the project"
        description="A modern, interactive home for learning data structures and algorithms — built to make the invisible visible."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" /> The mission
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-relaxed text-foreground/90">
            <p>
              Classic algorithm visualizers proved how powerful it is to <em>see</em> an algorithm
              run. This project reimagines that idea for today: a single, cohesive, beautiful
              application where every visualization shares the same controls, the same design
              language, and the same depth of educational material.
            </p>
            <p>
              The goal is a tool that serves everyone from a first-year student meeting recursion
              for the first time, to an instructor projecting a live demo, to an engineer brushing
              up before an interview — all in one polished place.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-5 fill-rose-500 text-rose-500" /> The creator
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground/90">
            <p>
              Built with care by <strong>Jibreel Bornat</strong>, a Computer Engineering student at{" "}
              <strong>Birzeit University</strong>. This visualizer grew out of a simple conviction:
              that the elegant ideas behind data structures and algorithms deserve to be
              experienced, not just read about.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" /> Built with
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {STACK.map((t) => (
                <span key={t} className="rounded-lg border border-border bg-card/50 px-3 py-1.5 text-sm">
                  {t}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design philosophy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {PHILOSOPHY.map((p) => (
              <div key={p.title}>
                <h3 className="text-sm font-semibold text-primary">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
