"use client";

import { GraduationCap, Heart, Layers, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/catalog/page-header";
import { useLocale, type DictKey } from "@/lib/i18n";

const STACK = [
  "Next.js", "React", "TypeScript", "Tailwind CSS",
  "Framer Motion", "React Flow", "Radix UI", "Lucide Icons",
];

const PHILOSOPHY: { titleKey: DictKey; descKey: DictKey }[] = [
  {
    titleKey: "about.philosophyStepsAsDataTitle",
    descKey: "about.philosophyStepsAsDataDesc",
  },
  {
    titleKey: "about.philosophyOneShellTitle",
    descKey: "about.philosophyOneShellDesc",
  },
  {
    titleKey: "about.philosophyUnderstandingTitle",
    descKey: "about.philosophyUnderstandingDesc",
  },
];

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        icon={Sparkles}
        title={t("about.pageTitle")}
        description={t("about.pageDescription")}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" /> {t("about.missionTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-relaxed text-foreground/90">
            <p>{t("about.missionBody1")}</p>
            <p>{t("about.missionBody2")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-5 fill-rose-500 text-rose-500" /> {t("about.creatorTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground/90">
            <p>
              {t("about.creatorBodyPrefix")} <strong>Jibreel Bornat</strong>. {t("about.creatorAffiliation")}{" "}
              <strong>Birzeit University</strong>. {t("about.creatorBodySuffix")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="size-5 text-primary" /> {t("about.builtWithTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {STACK.map((s) => (
                <span key={s} className="rounded-lg border border-border bg-card/50 px-3 py-1.5 text-sm">
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("about.philosophyTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {PHILOSOPHY.map((p) => (
              <div key={p.titleKey}>
                <h3 className="text-sm font-semibold text-primary">{t(p.titleKey)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(p.descKey)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
