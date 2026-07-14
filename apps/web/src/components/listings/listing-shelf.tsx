import { ChevronTitle } from "@/components/layout/chevron-title";
import { ListingsGrid } from "@/components/listings/listings-grid";
import type { PublishedShelf } from "@/lib/collections/queries";
import { cn } from "@/lib/utils";

export function ListingShelf({ shelf, className }: { shelf: PublishedShelf; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <ChevronTitle
        href={`/apps/collections/${shelf.slug}`}
        size="sm"
        description={shelf.description}
      >
        {shelf.name}
      </ChevronTitle>
      <ListingsGrid listings={shelf.listings} />
    </section>
  );
}
