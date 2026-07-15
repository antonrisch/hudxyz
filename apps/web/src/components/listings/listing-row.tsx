"use client";

import Link from "next/link";
import { ListingIcon } from "@/components/listings/listing-icon";
import { buttonVariants } from "@/components/ui/button";
import { listingPath } from "@/lib/apps/public-id";
import type { ListingListItem } from "@/lib/apps/queries";
import { trackListingOpen } from "@/lib/apps/track-open";
import { cn } from "@/lib/utils";

export function ListingRow({
  listing,
  index,
  variant = "default",
  className,
}: {
  listing: ListingListItem;
  /** 1-based rank when `variant="numbered"`. */
  index?: number;
  variant?: "default" | "numbered";
  className?: string;
}) {
  const href = listingPath(listing.slug, listing.publicId);
  const simulatorHref = `/simulator?url=${encodeURIComponent(listing.launchUrl)}`;
  const description = listing.description ?? `${listing.listingType} · ${listing.categoryName}`;
  const numbered = variant === "numbered" && index != null;

  return (
    <li
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm hover:bg-input",
        className,
      )}
    >
      <div className={cn("flex shrink-0 items-center", numbered && "gap-1.5")}>
        {numbered ? (
          <span
            className="w-5 shrink-0 text-center text-base font-semibold tabular-nums text-foreground"
            aria-hidden
          >
            {index}
          </span>
        ) : null}
        <ListingIcon src={listing.iconUrl} alt="" size={64} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link
          href={href}
          className="line-clamp-1 text-base font-semibold leading-none outline-none before:absolute before:inset-0 before:rounded-xl focus-visible:before:ring-3 focus-visible:before:ring-ring/50"
        >
          {listing.name}
        </Link>
        <p title={description} className="truncate text-sm leading-none text-muted-foreground">
          {description}
        </p>
      </div>
      <Link
        href={simulatorHref}
        onClick={() => trackListingOpen(listing.publicId, "sim")}
        className={cn(buttonVariants({ variant: "brand" }), "relative z-10")}
      >
        Try
      </Link>
    </li>
  );
}
