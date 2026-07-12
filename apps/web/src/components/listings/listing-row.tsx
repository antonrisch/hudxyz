import Link from "next/link";

import { ListingIcon } from "@/components/listings/listing-icon";
import { buttonVariants } from "@/components/ui/button";
import type { ListingListItem } from "@/lib/apps/queries";
import { cn } from "@/lib/utils";

export function ListingRow({
  listing,
  className,
}: {
  listing: ListingListItem;
  className?: string;
}) {
  const href = `/apps/${listing.slug}`;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm outline-none transition-colors duration-100",
          "hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
      >
        <ListingIcon src={listing.iconUrl} alt="" size={64} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="line-clamp-1 text-base font-semibold text-foreground leading-none">
            {listing.name}
          </p>
          <p
            title={listing.description}
            className="truncate text-sm text-muted-foreground leading-none"
          >
            {listing.description}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            buttonVariants({ variant: "brand-secondary" }),
            "font-medium pointer-events-none",
          )}
        >
          View
        </span>
      </Link>
    </li>
  );
}
