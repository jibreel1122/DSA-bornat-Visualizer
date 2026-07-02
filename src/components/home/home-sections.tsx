"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Accessibility,
  ArrowRight,
  Code2,
  FlaskConical,
  Gauge,
  GraduationCap,
  MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { MiniSortDemo } from "./mini-sort-demo";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export function Hero({ algoCount }: { algoCount: number }) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hero-grid" />
      <div className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -right-24 top-32 size-96 rounded-full bg-fuchsia-500/15 blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {algoCount}+ interactive visualizations
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Bornat <span className="gradient-text">Data Structure</span> Visualizer
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Learn, Visualize, Experiment, and Master Data Structures &amp; Algorithms — with
            fully interactive, step-by-step animations built for real understanding.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/algorithms">
                Explore Algorithms <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/playground">
                <FlaskConical /> Try the Playground
              </Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="h-72 sm:h-80 lg:h-96"
        >
          <MiniSortDemo />
        </motion.div>
      </div>
    </section>
  );
}

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: MousePointerClick, title: "Step-by-step execution", desc: "Play, pause, scrub, and step through every operation. Watch comparisons, swaps, and pointer moves unfold." },
  { icon: Code2, title: "Code in 12 languages", desc: "Read idiomatic implementations in C, C++, Java, Python, Rust, Go, and more — with copy and download." },
  { icon: Gauge, title: "Editable & scalable", desc: "Build custom inputs, generate random data, and dial difficulty from Very Easy to Expert." },
  { icon: GraduationCap, title: "Learn deeply", desc: "Theory, complexity, applications, interview questions, and quizzes on every algorithm." },
  { icon: FlaskConical, title: "Playground", desc: "Draw your own graphs and arrays, then run any compatible algorithm on them instantly." },
  { icon: Accessibility, title: "Accessible by design", desc: "Light, dark, and system themes with reduced-motion, high-contrast, and large-text options." },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Everything you need to master DSA</h2>
        <p className="mt-3 text-muted-foreground">
          A modern, polished learning environment — not just animations, but a complete study tool.
        </p>
      </motion.div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <Card className="h-full p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Stats({ algoCount, categoryCount }: { algoCount: number; categoryCount: number }) {
  const stats = [
    { value: `${algoCount}+`, label: "Algorithms" },
    { value: String(categoryCount), label: "Categories" },
    { value: "12", label: "Languages" },
    { value: "5", label: "Difficulty levels" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card/40 p-8 sm:grid-cols-4"
      >
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold gradient-text sm:text-4xl">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

export function CategoryShowcase() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Explore by category</h2>
        <p className="mt-3 text-muted-foreground">From sorting to string matching — thirteen rich topic areas.</p>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c, i) => (
          <motion.div key={c.id} {...fadeUp} transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}>
            <Link href={`/${c.id}`}>
              <Card className="group relative h-full overflow-hidden p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", c.accent)} />
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", c.accent)}>
                    <c.icon className="size-5" />
                  </span>
                  <h3 className="font-semibold transition-colors group-hover:text-primary">{c.short}</h3>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <Card className="relative overflow-hidden p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 hero-grid opacity-60" />
          <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to see algorithms come alive?</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Pick a topic, hit play, and watch the theory turn into motion. No signup, no setup.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/algorithms">
                  Start exploring <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/practice">Practice mode</Link>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
