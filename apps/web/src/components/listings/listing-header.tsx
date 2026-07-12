import { ListingActions } from "@/components/listings/listing-actions";
import { ListingIcon } from "@/components/listings/listing-icon";
import { ListingMeta } from "@/components/listings/listing-meta";
import { ListingMetaChips } from "@/components/listings/listing-meta-chips";
import type { ListingDetail } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

export function ListingHeader({
  listing,
  className,
}: {
  listing: ListingDetail;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <ListingIcon
            src={listing.iconUrl}
            alt={`${listing.name} icon`}
            size={80}
            className="size-24 shrink-0 sm:size-20"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{listing.name}</h1>
            <ListingMeta listing={listing} />
          </div>
        </div>
        <ListingActions launchUrl={listing.launchUrl} appName={listing.name} />
      </div>
      <ListingMetaChips listing={listing} />
    </header>
  );
}
