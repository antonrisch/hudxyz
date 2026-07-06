"use client";

import { ChevronDown } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const SLIDER_MIN = 0;
const SLIDER_MAX = 100;
const SLIDER_STEP = 5;

const controlSlotClass = "flex min-h-9 items-center";

function snapSliderValue(value: number) {
  const snapped = Math.round(value / SLIDER_STEP) * SLIDER_STEP;
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, snapped));
}

export function PanelSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col px-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-3 text-left"
      >
        <span className="text-sm font-bold text-foreground">{title}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground", open && "rotate-180")}
        />
      </button>
      {open ? <div className="flex flex-col gap-4 pb-3">{children}</div> : null}
    </section>
  );
}

// stack adjacent property rows — compact for switch pairs, default for control clusters.
export function PanelRowGroup({
  compact = false,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return <div className={cn("flex flex-col", compact ? "gap-1" : "gap-2")}>{children}</div>;
}

// figma property row — label left, compact control right.
export function PanelRow({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <Label htmlFor={htmlFor} className="truncate font-normal text-foreground">
          {label}
        </Label>
        {hint}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

// stacked field — label above a full-width control (pickers, sliders).
export function PanelField({
  label,
  controlClassName,
  children,
}: {
  label: string;
  controlClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="w-fit text-sm leading-none font-medium text-foreground">{label}</span>
      <div className={cn(controlSlotClass, controlClassName ?? "w-full")}>{children}</div>
    </div>
  );
}

export function PanelSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const inputId = `${id}-value`;

  const commitValue = (raw: string) => {
    setEditing(false);
    setDraft("");
    const next = Number.parseFloat(raw.replace("%", "").trim());
    if (!Number.isFinite(next)) return;
    onChange(snapSliderValue(next));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      return;
    }
    if (e.key === "Escape") {
      setEditing(false);
      setDraft("");
    }
  };

  return (
    <PanelField label={label} controlClassName="min-h-7 w-full">
      <div className="flex w-full min-w-0 items-center gap-2">
        <Slider
          id={id}
          className="min-w-0 flex-1"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={[value]}
          onValueChange={(values) => {
            const next = Array.isArray(values) ? values[0] : values;
            if (next != null) onChange(next);
          }}
          aria-label={label}
        />
        <input
          id={inputId}
          aria-label={`${label} value`}
          inputMode="numeric"
          value={editing ? draft : `${value}%`}
          onFocus={(e) => {
            setEditing(true);
            setDraft(String(value));
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-10 shrink-0 rounded-xl border border-border/50 bg-muted text-center text-sm font-medium tabular-nums text-muted-foreground outline-none hover:text-foreground focus-visible:border-ring focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
    </PanelField>
  );
}
