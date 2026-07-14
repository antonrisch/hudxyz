"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { Copy } from "@/components/icons/copy";
import { buttonVariants } from "@/components/ui/button";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

export function SubmitConfirmation({ name, publicId }: { name: string; publicId: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl tracking-tight">Submitted for review 🎉</h1>
        <p className="text-muted-foreground">
          Thanks for submitting {name}. We&apos;ll review it and get back to you — it won&apos;t
          appear on hudxyz.com until it&apos;s approved.
        </p>
      </div>

      {publicId ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Submission ID</p>
          <button
            type="button"
            aria-label={copied ? "Copied submission ID" : "Copy submission ID"}
            onClick={() =>
              void copy(publicId, {
                successMessage: "Submission ID copied",
                errorMessage: "Could not copy submission ID",
              })
            }
            className={cn(
              "flex w-full max-w-xs min-w-0 items-center gap-2 rounded-xl border border-border bg-background p-1 pl-3 text-left outline-none select-none",
              "hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "transition-transform active:scale-[0.99]",
            )}
          >
            <span className="min-w-0 flex-1 truncate font-mono text-sm tracking-wide text-foreground">
              {publicId}
            </span>
            <span
              className={cn(
                buttonVariants({ variant: "brand-secondary", size: "sm" }),
                "pointer-events-none shrink-0",
              )}
            >
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      ) : null}

      <Link href="/apps" className={buttonVariants({ variant: "brand", size: "lg" })}>
        Back to Apps & Games
      </Link>
    </div>
  );
}
