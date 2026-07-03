"use client";

import * as React from "react";
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
import type { InputField } from "@/lib/engine/types";
import { ChipListInput, isListValue } from "./chip-list-input";

/** Schema-driven manual-input dialog: fields come from the algorithm module. */
export function InputDialog({
  open,
  onOpenChange,
  fields,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fields: InputField[];
  initial: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = React.useState<Record<string, string>>(initial);

  React.useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom input</DialogTitle>
          <DialogDescription>
            Build your own dataset — the visualization regenerates instantly.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onSubmit(values);
              onOpenChange(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Invalid input.");
            }
          }}
        >
          {fields.map((f) => {
            const raw = values[f.key] ?? "";
            const asList = isListValue(raw);
            return (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                {asList ? (
                  <ChipListInput
                    value={raw}
                    onChange={(next) => setValues((v) => ({ ...v, [f.key]: next }))}
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    value={raw}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    autoComplete="off"
                  />
                )}
                {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Generate</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
