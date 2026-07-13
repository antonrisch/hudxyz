import type { ReactNode } from "react";

import {
  authorSiteHref,
  authorSiteLabel,
  formatOpenCount,
  totalOpenCount,
} from "@/lib/apps/listing-urls";
import type { ListingDetail } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

/** Quiet byline under the title — developer site + share (desktop); opens on mobile. */
export function ListingMeta({
  listing,
  share,
  className,
}: {
  listing: ListingDetail;
  share?: ReactNode;
  className?: string;
}) {
  const href = authorSiteHref(listing.author);
  const label = authorSiteLabel(listing.author);

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1 text-base",
        "sm:flex-row sm:flex-wrap sm:items-center sm:gap-0",
        className,
      )}
    >
      {href && label ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-medium text-brand hover:underline"
        >
          {label}
        </a>
      ) : null}
      <span className="tabular-nums text-muted-foreground sm:hidden">
        {formatOpenCount(totalOpenCount(listing))}
      </span>
      {share ? (
        <>
          <span className="mx-1 text-border" aria-hidden>
            ·
          </span>
          {share}
        </>
      ) : null}
    </div>
  );
}
