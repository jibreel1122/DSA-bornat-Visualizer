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
}: {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (value: string) => void;
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
            <Button variant="ghost" size="icon-sm" aria-label={label}>
              {icon}
            </Button>
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
