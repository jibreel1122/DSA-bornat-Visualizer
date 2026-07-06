"use client";

import Link from "next/link";
import { Binary, Heart } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useLocale } from "@/lib/i18n";

export function Footer() {
  const { t } = useLocale();
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid size-7 place-items-center rounded-lg gradient-bg text-white">
                <Binary className="size-4" />
              </span>
              Bornat Data Structure Visualizer
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t("footer.tagline")}</p>
            <p className="mt-6 flex items-center gap-1.5 text-sm">
              {t("footer.madeBy")} <Heart className="size-4 fill-rose-500 text-rose-500" /> {t("footer.by")}{" "}
              <span className="font-semibold">Jibreel Bornat</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("footer.affiliation")}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("footer.explore")}</h3>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              {CATEGORIES.slice(0, 7).map((c) => (
                <li key={c.id}>
                  <Link href={`/${c.id}`} className="transition-colors hover:text-foreground">
                    {c.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("footer.app")}</h3>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li><Link href="/algorithms" className="transition-colors hover:text-foreground">{t("footer.allAlgorithms")}</Link></li>
              <li><Link href="/practice" className="transition-colors hover:text-foreground">{t("nav.practice")}</Link></li>
              <li><Link href="/playground" className="transition-colors hover:text-foreground">{t("nav.playground")}</Link></li>
              <li><Link href="/docs" className="transition-colors hover:text-foreground">{t("footer.documentation")}</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-foreground">{t("footer.about")}</Link></li>
              <li><Link href="/settings" className="transition-colors hover:text-foreground">{t("nav.settings")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>Bornat Data Structure Visualizer</span>
          <span>{t("footer.rights")}</span>
        </div>
      </div>
    </footer>
  );
}
