"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import {
  Binary,
  ChevronDown,
  Globe,
  Menu,
  Moon,
  MonitorCog,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";
import { CommandPalette } from "./command-palette";

const TOP_LINKS = [
  { href: "/algorithms", key: "nav.algorithms" as const },
  { href: "/data-structures", key: "nav.dataStructures" as const },
  { href: "/neural-network", key: "nav.neuralNet" as const },
  { href: "/practice", key: "nav.practice" as const },
  { href: "/playground", key: "nav.playground" as const },
  { href: "/docs", key: "nav.docs" as const },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const mounted = useMounted();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full">
        <div className="glass border-b border-glass-border">
          <nav className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
            <Link href="/" className="mr-2 flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg gradient-bg text-white shadow-md shadow-primary/30">
                <Binary className="size-4" />
              </span>
              <span className="hidden sm:inline">
                Bornat <span className="text-muted-foreground font-normal">Visualizer</span>
              </span>
            </Link>

            <div className="hidden items-center gap-0.5 md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    {t("nav.explore")} <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="grid w-[440px] grid-cols-2 p-2">
                  <DropdownMenuLabel className="col-span-2">{t("nav.categories")}</DropdownMenuLabel>
                  {CATEGORIES.map((c) => (
                    <DropdownMenuItem key={c.id} asChild>
                      <Link href={`/${c.id}`} className="flex items-start gap-2.5 py-2">
                        <c.icon className="mt-0.5 size-4 text-primary" />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-medium leading-none">{c.short}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {c.description}
                          </span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {TOP_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    pathname.startsWith(l.href) && "bg-accent text-foreground",
                  )}
                >
                  {t(l.key)}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-8 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:flex"
              >
                <Search className="size-3.5" />
                <span>{t("nav.search")}</span>
                <kbd className="ml-4 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  Ctrl K
                </kbd>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="sm:hidden"
                aria-label={t("nav.search")}
                onClick={() => setSearchOpen(true)}
              >
                <Search />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t("nav.toggleTheme")}>
                    {mounted && theme === "light" ? <Sun /> : <Moon />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun /> {t("nav.light")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon /> {t("nav.dark")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <MonitorCog /> {t("nav.system")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t("nav.toggleLanguage")}>
                    <Globe />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocale("ar")}>العربية</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon-sm" asChild aria-label={t("nav.settings")}>
                <Link href="/settings">
                  <Settings />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label={t("nav.menu")}
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </nav>

          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="border-t border-glass-border md:hidden"
            >
              <div className="mx-auto grid max-w-7xl gap-0.5 px-4 py-3">
                {TOP_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-lg px-3 py-2 text-sm hover:bg-accent"
                  >
                    {t(l.key)}
                  </Link>
                ))}
                <div className="mt-1 grid grid-cols-2 gap-0.5 border-t border-border pt-2">
                  {CATEGORIES.map((c) => (
                    <Link
                      key={c.id}
                      href={`/${c.id}`}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <c.icon className="size-4 text-primary" /> {c.short}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
