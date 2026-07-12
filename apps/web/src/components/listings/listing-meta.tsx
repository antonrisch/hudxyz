import { ListingShareDialog } from "@/components/listings/listing-share-dialog";
import { authorSiteHref, authorSiteLabel } from "@/lib/apps/listing-urls";
import type { ListingDetail } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

/** Quiet byline under the title — developer site + share. */
export function ListingMeta({
  listing,
  className,
}: {
  listing: ListingDetail;
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
      <span className="mx-1 hidden text-border sm:inline" aria-hidden>
        ·
      </span>
      <ListingShareDialog name={listing.name} slug={listing.slug} publicId={listing.publicId} />
    </div>
  );
}
