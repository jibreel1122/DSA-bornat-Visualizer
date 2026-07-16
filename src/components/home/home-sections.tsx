"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Accessibility,
  ArrowLeft,
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
import { useLocale, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MiniSortDemo } from "./mini-sort-demo";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export function Hero({ algoCount }: { algoCount: number }) {
  const { t, locale } = useLocale();
  const ForwardArrow = locale === "ar" ? ArrowLeft : ArrowRight;
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hero-grid" />
      <div className="pointer-events-none absolute -start-24 top-0 size-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -end-24 top-32 size-96 rounded-full bg-fuchsia-500/15 blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {algoCount}+ {t("home.heroBadgeSuffix")}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Bornat <span className="gradient-text">{t("home.heroTitleHighlight")}</span> Visualizer
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/algorithms">
                {t("home.heroExploreAlgorithms")} <ForwardArrow />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/playground">
                <FlaskConical /> {t("home.heroTryPlayground")}
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

const FEATURES: { icon: LucideIcon; titleKey: DictKey; descKey: DictKey }[] = [
  { icon: MousePointerClick, titleKey: "home.featureStepByStepTitle", descKey: "home.featureStepByStepDesc" },
  { icon: Code2, titleKey: "home.featureCodeTitle", descKey: "home.featureCodeDesc" },
  { icon: Gauge, titleKey: "home.featureEditableTitle", descKey: "home.featureEditableDesc" },
  { icon: GraduationCap, titleKey: "home.featureLearnTitle", descKey: "home.featureLearnDesc" },
  { icon: FlaskConical, titleKey: "home.featurePlaygroundTitle", descKey: "home.featurePlaygroundDesc" },
  { icon: Accessibility, titleKey: "home.featureAccessibleTitle", descKey: "home.featureAccessibleDesc" },
];

export function Features() {
  const { t } = useLocale();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("home.featuresTitle")}</h2>
        <p className="mt-3 text-muted-foreground">
          {t("home.featuresSubtitle")}
        </p>
      </motion.div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.titleKey} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <Card className="h-full p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{t(f.titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(f.descKey)}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Stats({ algoCount, categoryCount }: { algoCount: number; categoryCount: number }) {
  const { t } = useLocale();
  const stats: { value: string; labelKey: DictKey }[] = [
    { value: `${algoCount}+`, labelKey: "home.statAlgorithms" },
    { value: String(categoryCount), labelKey: "home.statCategories" },
    { value: "12", labelKey: "home.statLanguages" },
    { value: "5", labelKey: "home.statDifficultyLevels" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card/40 p-8 sm:grid-cols-4"
      >
        {stats.map((s) => (
          <div key={s.labelKey} className="text-center">
            <div className="text-3xl font-bold gradient-text sm:text-4xl">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t(s.labelKey)}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

export function CategoryShowcase() {
  const { t, locale } = useLocale();
  const ForwardArrow = locale === "ar" ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("home.categoryShowcaseTitle")}</h2>
        <p className="mt-3 text-muted-foreground">{t("home.categoryShowcaseSubtitle")}</p>
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
                  <ForwardArrow className="ms-auto size-4 text-muted-foreground transition-transform group-hover:text-primary" />
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
  const { t, locale } = useLocale();
  const ForwardArrow = locale === "ar" ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
        <Card className="relative overflow-hidden p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 hero-grid opacity-60" />
          {/* physical: left-1/2 + -translate-x-1/2 is a centering pair; translate-x doesn't flip under RTL so start-1/2 would miscenter this blob */}
          <div className="pointer-events-none absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("home.ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              {t("home.ctaSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/algorithms">
                  {t("home.ctaStartExploring")} <ForwardArrow />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/practice">{t("home.ctaPracticeMode")}</Link>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </section>
  );
}
