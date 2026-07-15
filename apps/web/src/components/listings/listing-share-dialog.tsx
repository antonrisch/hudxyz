"use client";

import { useState } from "react";
import { Share } from "lucide-react";

import { ListingCopyLinkRow } from "@/components/listings/listing-copy-link-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LISTING_SHARE_TARGETS,
  listingShareTitle,
  listingShareUrl,
} from "@/lib/apps/share-targets";
import { listingPath } from "@/lib/apps/public-id";
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

function canUseNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function ListingShareDialog({
  name,
  slug,
  publicId,
  appearance = "button",
  preferNativeShare = false,
  className,
}: {
  name: string;
  slug: string;
  publicId: string;
  appearance?: "button" | "link";
  preferNativeShare?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [listingPageUrl, setListingPageUrl] = useState("");
  const { copied, copy, resetCopied } = useCopyToClipboard();

  const title = name.trim() || "This app";
  const shareTitle = listingShareTitle(name);
  const copyUrl = listingPageUrl ? listingShareUrl(listingPageUrl, "app-share-cb") : "";

  const listingPageHref = () => `${window.location.origin}${listingPath(slug, publicId)}`;

  const openDialog = () => {
    setListingPageUrl(listingPageHref());
    resetCopied();
    setOpen(true);
  };

  const share = async () => {
    if (!preferNativeShare) {
      openDialog();
      return;
    }

    const url = listingShareUrl(listingPageHref(), "app-share-native");

    if (canUseNativeShare()) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    openDialog();
  };

  return (
    <>
      {appearance === "link" ? (
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 text-base text-brand transition-colors outline-none",
            "hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/50",
            className,
          )}
          onClick={() => void share()}
        >
          <Share className="size-4" aria-hidden />
          Share
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className={className}
          onClick={() => void share()}
          aria-label="Share"
        >
          <Share className="size-5" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5 sm:max-w-md" showCloseButton>
          <DialogHeader className="gap-1.5 pr-8">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription>Share this web app</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2.5">
            {LISTING_SHARE_TARGETS.map((target) => (
              <a
                key={target.name}
                href={
                  listingPageUrl
                    ? target.href(
                        listingShareUrl(listingPageUrl, `app-share-${target.name}`),
                        shareTitle,
                      )
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                aria-label={target.label}
                className={cn(
                  "inline-flex size-10 shrink-0 items-center justify-center rounded-xl p-2.5 transition-transform outline-none",
                  "hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
                  !listingPageUrl && "pointer-events-none opacity-50",
                  target.className,
                )}
              >
                <target.Icon className={cn("size-full", target.iconClassName)} />
              </a>
            ))}
          </div>

          <ListingCopyLinkRow
            url={copyUrl}
            copied={copied}
            disabled={!copyUrl}
            onCopy={() => void copy(copyUrl)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
