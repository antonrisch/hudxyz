"use client";

import { Check } from "lucide-react";

import { Copy } from "@/components/icons/copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Full-width copy control: truncated value + brand Copy / Copied chip. */
export function CopyLinkRow({
  value,
  copied,
  disabled,
  onCopy,
  label = "Copy link",
  copiedLabel = "Copied",
  ariaLabel,
  ariaCopiedLabel,
  className,
  valueClassName,
}: {
  value: string;
  copied: boolean;
  disabled?: boolean;
  onCopy: () => void;
  label?: string;
  copiedLabel?: string;
  ariaLabel?: string;
  ariaCopiedLabel?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <button
      type="button"
      aria-label={copied ? (ariaCopiedLabel ?? copiedLabel) : (ariaLabel ?? label)}
      disabled={disabled ?? !value}
      onClick={onCopy}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background p-1 pl-3 text-left outline-none select-none",
        "hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "transition-transform active:scale-[0.99]",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className={cn("min-w-0 flex-1 truncate text-sm text-muted-foreground", valueClassName)}>
        {value}
      </span>
      <span
        className={cn(
          buttonVariants({ variant: "brand-secondary", size: "sm" }),
          "pointer-events-none shrink-0",
        )}
      >
        {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}
