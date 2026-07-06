"use client";

import { BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/catalog/page-header";
import { LEVELS } from "@/lib/engine/types";
import { STATE_LEGEND, vizFill } from "@/components/visualizer/viz-utils";
import { useLocale, type DictKey } from "@/lib/i18n";

const TOC: [string, DictKey][] = [
  ["getting-started", "docs.tocGettingStarted"],
  ["controls", "docs.tocControls"],
  ["shortcuts", "docs.tocShortcuts"],
  ["legend", "docs.tocLegend"],
  ["levels", "docs.tocLevels"],
  ["practice", "docs.tocPractice"],
  ["playground", "docs.tocPlayground"],
  ["faq", "docs.tocFaq"],
];

const CONTROLS: [DictKey, DictKey][] = [
  ["docs.controlPlayPauseName", "docs.controlPlayPauseDesc"],
  ["docs.controlStepName", "docs.controlStepDesc"],
  ["docs.controlScrubberName", "docs.controlScrubberDesc"],
  ["docs.controlSpeedName", "docs.controlSpeedDesc"],
  ["docs.controlResetName", "docs.controlResetDesc"],
  ["docs.controlDifficultyName", "docs.controlDifficultyDesc"],
  ["docs.controlInputName", "docs.controlInputDesc"],
  ["docs.controlUndoRedoName", "docs.controlUndoRedoDesc"],
  ["docs.controlSaveLoadName", "docs.controlSaveLoadDesc"],
  ["docs.controlExportImportName", "docs.controlExportImportDesc"],
  ["docs.controlScreenshotName", "docs.controlScreenshotDesc"],
  ["docs.controlZoomPanName", "docs.controlZoomPanDesc"],
];

const SHORTCUTS: [string, DictKey[]][] = [
  ["Space", ["shell.shortcutPlayPause"]],
  ["→ / ←", ["shell.shortcutNextStep", "shell.shortcutPrevStep"]],
  ["R", ["shell.shortcutReset"]],
  ["F", ["shell.shortcutFullscreen"]],
  ["+ / −", ["shell.shortcutSpeedUp", "shell.shortcutSlowDown"]],
  ["Ctrl / ⌘ + K", ["docs.shortcutSearch"]],
];

const FAQ: [DictKey, DictKey][] = [
  ["docs.faqPrivacyQ", "docs.faqPrivacyA"],
  ["docs.faqOfflineQ", "docs.faqOfflineA"],
  ["docs.faqCustomInputQ", "docs.faqCustomInputA"],
  ["docs.faqShareQ", "docs.faqShareA"],
  ["docs.faqBrowsersQ", "docs.faqBrowsersA"],
  ["docs.faqNewAlgorithmsQ", "docs.faqNewAlgorithmsA"],
];

export default function DocsPage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader icon={BookOpen} title={t("docs.pageTitle")} description={t("docs.pageDescription")} />

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 grid gap-1 text-sm">
            {TOC.map(([id, labelKey]) => (
              <a key={id} href={`#${id}`} className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {t(labelKey)}
              </a>
            ))}
          </nav>
        </aside>

        <div className="grid gap-6">
          <Section id="getting-started" title={t("docs.sectionGettingStartedTitle")}>
            <p>
              {t("docs.sectionGettingStartedBodyPrefix")} <strong>{t("docs.sectionGettingStartedPlay")}</strong>{" "}
              {t("docs.sectionGettingStartedBodySuffix")}
            </p>
          </Section>

          <Section id="controls" title={t("docs.sectionControlsTitle")}>
            <div className="grid gap-2">
              {CONTROLS.map(([nameKey, descKey]) => (
                <div key={nameKey} className="grid gap-0.5 border-b border-border/60 py-2 last:border-0 sm:grid-cols-[220px_1fr] sm:gap-4">
                  <span className="text-sm font-medium">{t(nameKey)}</span>
                  <span className="text-sm text-muted-foreground">{t(descKey)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="shortcuts" title={t("docs.sectionShortcutsTitle")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHORTCUTS.map(([key, actionKeys]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm text-muted-foreground">{actionKeys.map((k) => t(k)).join(" / ")}</span>
                  <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
                </div>
              ))}
            </div>
          </Section>

          <Section id="legend" title={t("docs.sectionLegendTitle")}>
            <p className="mb-3">{t("docs.sectionLegendIntro")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {STATE_LEGEND.map((l) => (
                <span key={l.state} className="flex items-center gap-2 text-sm">
                  <span className="size-3 rounded-full" style={{ background: vizFill(l.state) }} />
                  {l.label}
                </span>
              ))}
            </div>
          </Section>

          <Section id="levels" title={t("docs.sectionLevelsTitle")}>
            <p className="mb-3">{t("docs.sectionLevelsIntro")}</p>
            <div className="grid gap-2 sm:grid-cols-5">
              {LEVELS.map((l) => (
                <div key={l.level} className="rounded-xl border border-border p-3 text-center">
                  <div className="text-2xl font-bold gradient-text">{l.level}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{l.label}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="practice" title={t("docs.sectionPracticeTitle")}>
            <p>
              <strong>{t("docs.sectionPracticeModeLabel")}</strong> {t("docs.sectionPracticeBodySuffix")}
            </p>
          </Section>

          <Section id="playground" title={t("docs.sectionPlaygroundTitle")}>
            <p>
              {t("docs.sectionPlaygroundBodyPrefix")} <strong>{t("docs.sectionPlaygroundLabel")}</strong>{" "}
              {t("docs.sectionPlaygroundBodySuffix")}
            </p>
          </Section>

          <Section id="faq" title={t("docs.sectionFaqTitle")}>
            <div className="grid gap-4">
              {FAQ.map(([qKey, aKey]) => (
                <div key={qKey}>
                  <h3 className="text-sm font-semibold">{t(qKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(aKey)}</p>
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
