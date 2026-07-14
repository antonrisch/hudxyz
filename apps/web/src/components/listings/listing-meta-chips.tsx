import Link from "next/link";

import { appsBrowsePath } from "@/lib/apps/browse-params";
import { formatOpenCount, totalOpenCount } from "@/lib/apps/listing-urls";
import type { ListingDetail } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

const chipClassName =
  "inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground";

function MetaChip({ children }: { children: React.ReactNode }) {
  return <span className={chipClassName}>{children}</span>;
}

function MetaChipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(chipClassName, "hover:bg-input hover:text-foreground")}>
      {children}
    </Link>
  );
}

/** Taxonomy chips + open count below the page header. */
export function ListingMetaChips({
  listing,
  className,
}: {
  listing: ListingDetail;
  className?: string;
}) {
  const typeLabel = listing.listingType === "game" ? "Game" : "App";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <MetaChipLink href={appsBrowsePath({ listingType: listing.listingType })}>
        {typeLabel}
      </MetaChipLink>
      {listing.categorySlug ? (
        <MetaChipLink href={appsBrowsePath({ categorySlug: listing.categorySlug })}>
          {listing.categoryName}
        </MetaChipLink>
      ) : listing.categoryName ? (
        <MetaChip>{listing.categoryName}</MetaChip>
      ) : null}
      {listing.secondaryCategorySlug && listing.secondaryCategoryName ? (
        <MetaChipLink href={appsBrowsePath({ categorySlug: listing.secondaryCategorySlug })}>
          {listing.secondaryCategoryName}
        </MetaChipLink>
      ) : null}
      <span className="hidden tabular-nums text-base text-foreground sm:inline">
        {formatOpenCount(totalOpenCount(listing))}
      </span>
    </div>
  );
}
