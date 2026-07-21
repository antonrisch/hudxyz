"use client";

import Link from "next/link";

import { CopyLinkRow } from "@/components/copy-link-row";
import { buttonVariants } from "@/components/ui/button";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";

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
          <CopyLinkRow
            value={publicId}
            copied={copied}
            label="Copy"
            copiedLabel="Copied"
            ariaLabel="Copy submission ID"
            ariaCopiedLabel="Copied submission ID"
            className="max-w-xs"
            valueClassName="font-mono tracking-wide text-foreground"
            onCopy={() =>
              void copy(publicId, {
                successMessage: "Submission ID copied",
                errorMessage: "Could not copy submission ID",
              })
            }
          />
        </div>
      ) : null}

      <Link href="/hubs" className={buttonVariants({ variant: "brand", size: "lg" })}>
        Back to Directory
      </Link>
    </div>
  );
}
