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
  className,
}: {
  listing: ListingListItem;
  className?: string;
}) {
  const href = listingPath(listing.slug, listing.publicId);
  const simulatorHref = `/simulator?url=${encodeURIComponent(listing.launchUrl)}`;

  const description = listing.description ?? `${listing.listingType} · ${listing.categoryName}`;

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm transition-colors duration-100",
        "hover:bg-muted has-[a:focus-visible]:border-ring has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50",
        className,
      )}
    >
      <Link href={href} className="group flex min-w-0 flex-1 items-center gap-3 outline-none">
        <ListingIcon src={listing.iconUrl} alt="" size={64} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="line-clamp-1 text-base font-semibold text-foreground leading-none">
            {listing.name}
          </p>
          <p title={description} className="truncate text-sm text-muted-foreground leading-none">
            {description}
          </p>
        </div>
      </Link>
      <Link
        href={simulatorHref}
        onClick={() => trackListingOpen(listing.publicId, "sim")}
        className={cn(
          buttonVariants({ variant: "brand", size: "default" }),
          "shrink-0 flex-none font-medium px-3",
        )}
      >
        Try
      </Link>
    </li>
  );
}
