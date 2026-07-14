import { ListingRow } from "@/components/listings/listing-row";
import type { ListingListItem } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

export function ListingsGrid({
  listings,
  className,
}: {
  listings: readonly ListingListItem[];
  className?: string;
}) {
  return (
    <ul className={cn("grid list-none grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3", className)}>
      {listings.map((listing) => (
        <ListingRow key={listing.publicId} listing={listing} />
      ))}
    </ul>
  );
}
