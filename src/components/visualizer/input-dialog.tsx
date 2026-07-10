"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { InputField } from "@/lib/engine/types";
import { ChipListInput, isListValue } from "./chip-list-input";

/**
 * Figures out which field(s) are responsible for a parseInput failure.
 *
 * Modules only expose a single `parseInput(allFields) => throws` — there's no
 * per-field validation contract. To still give in-context feedback, we probe
 * each field in isolation: start from a known-good baseline (the last values
 * that parsed, or an all-empty baseline) and swap in one field's current raw
 * value at a time. If that swap makes parsing fail, that field is a suspect.
 * This correctly localizes the vast majority of real mistakes because
 * modules validate fields in a fixed order (e.g. parse the list, then check
 * a "start node" against it), so a single bad field reliably reproduces the
 * failure on its own.
 */
function localizeErrors(
  fields: InputField[],
  values: Record<string, string>,
  baseline: Record<string, string>,
  parseInput: (fields: Record<string, string>) => unknown,
  wholeError: string,
): Record<string, string> {
  const suspects: Record<string, string> = {};
  for (const f of fields) {
    if (values[f.key] === baseline[f.key]) continue; // unchanged from known-good — not the cause
    const probe = { ...baseline, [f.key]: values[f.key] };
    try {
      parseInput(probe);
    } catch (e) {
      suspects[f.key] = e instanceof Error ? e.message : wholeError;
    }
  }
  return suspects;
}

/** Schema-driven manual-input dialog: fields come from the algorithm module. */
export function InputDialog({
  open,
  onOpenChange,
  fields,
  initial,
  onSubmit,
  parseInput,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fields: InputField[];
  initial: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  /** Same validation the module uses — enables per-field error localization. */
  parseInput?: (fields: Record<string, string>) => unknown;
}) {
  const { t } = useLocale();
  const [values, setValues] = React.useState<Record<string, string>>(initial);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setValues(initial);
      setFieldErrors({});
    }
  }, [open, initial]);

  const setField = (key: string, next: string) => {
    setValues((v) => ({ ...v, [key]: next }));
    setFieldErrors((errs) => {
      if (!errs[key]) return errs;
      const next = { ...errs };
      delete next[key];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shell.customInput")}</DialogTitle>
          <DialogDescription>{t("shell.customInputDesc")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onSubmit(values);
              setFieldErrors({});
              onOpenChange(false);
            } catch (err) {
              const message = err instanceof Error ? err.message : t("shell.invalidInput");
              const localized = parseInput
                ? localizeErrors(fields, values, initial, parseInput, message)
                : {};
              if (Object.keys(localized).length > 0) {
                setFieldErrors(localized);
                const first = fields.find((f) => localized[f.key]);
                toast.error(first ? `${first.label}: ${localized[first.key]}` : message);
              } else {
                // couldn't localize to a specific field — fall back to the banner
                toast.error(message);
              }
            }
          }}
        >
          {fields.map((f) => {
            const raw = values[f.key] ?? "";
            const asList = isListValue(raw);
            const fieldError = fieldErrors[f.key];
            return (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                {asList ? (
                  <ChipListInput
                    value={raw}
                    onChange={(next) => setField(f.key, next)}
                    invalid={Boolean(fieldError)}
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    value={raw}
                    placeholder={f.placeholder}
                    onChange={(e) => setField(f.key, e.target.value)}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldError)}
                    className={cn(
                      fieldError && "border-destructive focus-visible:ring-destructive/50",
                    )}
                  />
                )}
                {fieldError ? (
                  <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                    <AlertCircle className="size-3 shrink-0" />
                    {fieldError}
                  </p>
                ) : (
                  f.help && <p className="text-xs text-muted-foreground">{f.help}</p>
                )}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("shell.cancel")}
            </Button>
            <Button type="submit">{t("shell.generate")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
