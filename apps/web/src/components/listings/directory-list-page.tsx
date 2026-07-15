import { JsonLd } from "@/components/layout/json-ld";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import { ListingsGrid } from "@/components/listings/listings-grid";
import { listingPath } from "@/lib/apps/public-id";
import type { ListingListItem } from "@/lib/apps/queries";
import { itemListJsonLd } from "@/lib/apps/seo";

/** Shared shell for collection, category, and search result pages. */
export function DirectoryListPage({
  title,
  description,
  path,
  listings,
  variant = "default",
  includeJsonLd = true,
}: {
  title: string;
  description: string | null;
  path: string;
  listings: readonly ListingListItem[];
  variant?: "default" | "numbered";
  /** Search results skip JsonLd (noindex page). */
  includeJsonLd?: boolean;
}) {
  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      {includeJsonLd ? (
        <JsonLd
          data={itemListJsonLd({
            name: title,
            description:
              description ?? `Browse ${title} on the Meta Ray-Ban Display apps directory.`,
            path,
            items: listings.map((listing) => ({
              name: listing.name,
              path: listingPath(listing.slug, listing.publicId),
            })),
          })}
        />
      ) : null}
      <h1 className="font-bold text-3xl tracking-tight">{title}</h1>
      {description ? <p className="mt-2 text-base text-muted-foreground">{description}</p> : null}

      {listings.length === 0 ? (
        <div className="mt-8">
          <ListingsEmpty />
        </div>
      ) : (
        <ListingsGrid listings={listings} variant={variant} className="mt-8" />
      )}
    </main>
  );
}
