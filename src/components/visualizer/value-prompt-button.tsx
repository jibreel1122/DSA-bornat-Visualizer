"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Icon button that expands into a small popover with one text field and a
 * confirm action — the shared shape behind the Search / Insert / Remove
 * toolbar actions, which all need "ask for one value, then act on it".
 */
export function ValuePromptButton({
  icon,
  label,
  placeholder,
  confirmLabel,
  onSubmit,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
  /** Render as a prominent labeled button instead of a small ghost icon — for the primary Insert/Delete/Search actions. */
  emphasized?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    setValue("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setValue("");
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            {emphasized ? (
              <Button variant="secondary" size="sm" aria-label={label}>
                {icon} {confirmLabel}
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" aria-label={label}>
                {icon}
              </Button>
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm">
            {confirmLabel}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Two-field popover: "change X to Y" — the Edit action for any list-shaped
 * field. Mirrors ValuePromptButton's shape but takes an old + new value.
 */
export function EditPromptButton({
  icon,
  label,
  oldPlaceholder,
  newPlaceholder,
  confirmLabel,
  onSubmit,
}: {
  icon: React.ReactNode;
  label: string;
  oldPlaceholder?: string;
  newPlaceholder?: string;
  confirmLabel: string;
  onSubmit: (oldValue: string, newValue: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [oldValue, setOldValue] = React.useState("");
  const [newValue, setNewValue] = React.useState("");

  const submit = () => {
    const o = oldValue.trim();
    const n = newValue.trim();
    if (!o || !n) return;
    onSubmit(o, n);
    setOldValue("");
    setNewValue("");
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setOldValue("");
          setNewValue("");
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" aria-label={label}>
              {icon} {confirmLabel}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64">
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            value={oldValue}
            onChange={(e) => setOldValue(e.target.value)}
            placeholder={oldPlaceholder ?? "Current value"}
            className="h-8 text-xs"
          />
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={newPlaceholder ?? "New value"}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm">
            {confirmLabel}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
