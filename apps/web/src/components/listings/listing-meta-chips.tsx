import { formatOpenCount } from "@/lib/apps/listing-urls";
import type { ListingDetail } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium text-secondary-foreground">
      {children}
    </span>
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
  const categoryLabel = [listing.categoryName, listing.secondaryCategoryName]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <MetaChip>{typeLabel}</MetaChip>
      {categoryLabel ? <MetaChip>{categoryLabel}</MetaChip> : null}
      <span className="tabular-nums text-base text-foreground">
        {formatOpenCount(listing.launchCount)}
      </span>
    </div>
  );
}
