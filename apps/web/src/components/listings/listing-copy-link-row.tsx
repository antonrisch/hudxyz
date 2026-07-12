"use client";

import { Check, Copy } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListingCopyLinkRow({
  url,
  copied,
  disabled,
  onCopy,
}: {
  url: string;
  copied: boolean;
  disabled?: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy link"}
      disabled={disabled ?? !url}
      onClick={onCopy}
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-background p-1 pl-3 text-left outline-none select-none",
        "hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{url}</span>
      <span
        className={cn(
          buttonVariants({ variant: "brand-secondary", size: "sm" }),
          "pointer-events-none shrink-0",
        )}
      >
        {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
        {copied ? "Copied" : "Copy link"}
      </span>
    </button>
  );
}
