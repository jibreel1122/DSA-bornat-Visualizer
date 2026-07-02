"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/catalog/page-header";
import { useSettings } from "@/components/providers/settings-provider";
import { useMounted } from "@/lib/hooks";
import { LEVELS, type Level } from "@/lib/engine/types";
import { Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / Pause"],
  ["→ / ←", "Next / Previous step"],
  ["R", "Reset to start"],
  ["F", "Toggle fullscreen"],
  ["+ / −", "Increase / decrease speed"],
  ["Ctrl / ⌘ + K", "Open global search"],
];

function clearKeys(predicate: (key: string) => boolean): number {
  let count = 0;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith("bdsv:") && predicate(key)) {
      localStorage.removeItem(key);
      count++;
    }
  }
  return count;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const { settings, update } = useSettings();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader icon={SettingsIcon} title="Settings" description="Personalize appearance, accessibility, and visualizer defaults. Everything is stored locally on this device." />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose your color theme.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors",
                    mounted && theme === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  <opt.icon className="size-5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accessibility</CardTitle>
            <CardDescription>Make the app more comfortable to use.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1">
            <ToggleRow
              label="Reduced motion"
              desc="Minimize animations and auto-playing effects."
              checked={settings.reducedMotion}
              onChange={(v) => update({ reducedMotion: v })}
            />
            <ToggleRow
              label="High contrast"
              desc="Increase border and text contrast."
              checked={settings.highContrast}
              onChange={(v) => update({ highContrast: v })}
            />
            <ToggleRow
              label="Large text"
              desc="Scale up the base font size."
              checked={settings.largeText}
              onChange={(v) => update({ largeText: v })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visualizer defaults</CardTitle>
            <CardDescription>Applied to every new visualization you open.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Default animation speed</span>
                <span className="font-mono text-muted-foreground">{settings.defaultSpeed}×</span>
              </div>
              <Slider
                value={[settings.defaultSpeed]}
                min={0.25}
                max={4}
                step={0.25}
                onValueChange={([v]) => update({ defaultSpeed: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Default difficulty</span>
              <Select value={String(settings.defaultLevel)} onValueChange={(v) => update({ defaultLevel: Number(v) as Level })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.level} value={String(l.level)}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>Manage everything stored on this device.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <DataButton
              label="Clear favorites"
              onConfirm={() => clearKeys((k) => k === "bdsv:favorites")}
            />
            <DataButton
              label="Clear history"
              onConfirm={() => clearKeys((k) => k === "bdsv:history")}
            />
            <DataButton
              label="Clear notes & saves"
              onConfirm={() => clearKeys((k) => k.startsWith("bdsv:notes:") || k.startsWith("bdsv:save:"))}
            />
            <DataButton
              label="Reset everything"
              destructive
              onConfirm={() => clearKeys(() => true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keyboard shortcuts</CardTitle>
            <CardDescription>Available on any visualizer page.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {SHORTCUTS.map(([key, action]) => (
                <div key={key} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm last:border-0">
                  <span className="text-muted-foreground">{action}</span>
                  <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function DataButton({
  label,
  destructive,
  onConfirm,
}: {
  label: string;
  destructive?: boolean;
  onConfirm: () => number;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={destructive ? "destructive" : "secondary"} size="sm">
          <Trash2 /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>This cannot be undone. The data is removed from this device only.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              onClick={() => {
                const n = onConfirm();
                toast.success(`Cleared ${n} item${n === 1 ? "" : "s"}.`);
              }}
            >
              Confirm
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
