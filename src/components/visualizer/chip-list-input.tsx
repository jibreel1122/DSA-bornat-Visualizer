"use client";

import * as React from "react";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A comma-separated string is "list-like" once it holds 2+ tokens. */
export function isListValue(raw: string): boolean {
  return raw.split(",").map((t) => t.trim()).filter(Boolean).length >= 2;
}

function tokenize(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

/**
 * Editable chip list for a comma-separated field value. Each token gets an
 * inline Edit (click) and Delete (×) affordance, plus an Add-value input.
 * Falls back gracefully — callers only mount this when isListValue(value) is true.
 */
export function ChipListInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Highlights the field border when the parent dialog attributed a parse error here. */
  invalid?: boolean;
}) {
  const { t } = useLocale();
  const tokens = tokenize(value);
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const commit = (next: string[]) => onChange(next.join(", "));

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditingText(tokens[i]);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const text = editingText.trim();
    if (text) {
      const next = [...tokens];
      next[editingIdx] = text;
      commit(next);
    }
    setEditingIdx(null);
  };

  const remove = (i: number) => {
    commit(tokens.filter((_, idx) => idx !== i));
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    commit([...tokens, text]);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-lg border bg-background/50 p-2",
        invalid ? "border-destructive" : "border-input",
      )}
    >
      {tokens.map((tok, i) =>
        editingIdx === i ? (
          <Input
            key={i}
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === "Escape") setEditingIdx(null);
            }}
            className="h-7 w-20 px-2 text-xs"
          />
        ) : (
          <span
            key={i}
            className={cn(
              "group inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 py-0.5 pl-2.5 pr-1 text-xs font-medium tabular-nums",
            )}
          >
            {tok}
            <button
              type="button"
              aria-label={t("shell.editValueNamed", { value: tok })}
              onClick={() => startEdit(i)}
              className="rounded-full p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-primary/15 hover:text-primary hover:opacity-100"
            >
              <Pencil className="size-2.5" />
            </button>
            <button
              type="button"
              aria-label={t("shell.deleteValueNamed", { value: tok })}
              onClick={() => remove(i)}
              className="rounded-full p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/15 hover:text-destructive hover:opacity-100"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ),
      )}
      <div className="flex items-center gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t("shell.addValuePlaceholder")}
          className="h-7 w-24 px-2 text-xs"
        />
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t("shell.addValue")} onClick={add}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
