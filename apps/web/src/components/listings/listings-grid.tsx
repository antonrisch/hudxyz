import { ListingRow } from "@/components/listings/listing-row";
import type { ListingListItem } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

export function ListingsGrid({
  listings,
  variant = "default",
  className,
}: {
  listings: readonly ListingListItem[];
  variant?: "default" | "numbered";
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "list-none",
        variant === "numbered"
          ? "columns-1 gap-3 md:columns-2 lg:columns-3 [&>li]:mb-3 [&>li]:break-inside-avoid"
          : "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {listings.map((listing, i) => (
        <ListingRow
          key={listing.publicId}
          listing={listing}
          variant={variant}
          index={variant === "numbered" ? i + 1 : undefined}
        />
      ))}
    </ul>
  );
}
