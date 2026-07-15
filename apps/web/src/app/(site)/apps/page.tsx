import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

import { JsonLd } from "@/components/layout/json-ld";
import { DirectoryListPage } from "@/components/listings/directory-list-page";
import { ListingShelf } from "@/components/listings/listing-shelf";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import {
  hasLegacyBrowseParams,
  parseSearchQuery,
  type BrowseParams,
} from "@/lib/apps/browse-params";
import { listingPath } from "@/lib/apps/public-id";
import { searchPublishedListings } from "@/lib/apps/search";
import { directorySocialMetadata, itemListJsonLd } from "@/lib/apps/seo";
import { listPublishedShelves } from "@/lib/collections/queries";

const HUB_COPY = {
  title: "Apps and Games",
  description:
    "Discover the best web apps and games for Meta Ray-Ban Display made by the community.",
} as const;

const SEARCH_LIMIT = 20;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BrowseParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = parseSearchQuery(params.q);

  if (query) {
    return {
      title: `Search: ${query}`,
      description: `Search results for “${query}” in the Meta Ray-Ban Display app directory.`,
      robots: { index: false, follow: true },
      alternates: { canonical: "/apps" },
    };
  }

  const description = `${HUB_COPY.description} Open them in the hudxyz.com simulator.`;
  return {
    title: HUB_COPY.title,
    description,
    alternates: { canonical: "/apps" },
    ...directorySocialMetadata({
      title: HUB_COPY.title,
      description,
      path: "/apps",
    }),
  };
}

export default async function AppsPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  const params = await searchParams;
  const query = parseSearchQuery(params.q);

  if (query) {
    const listings = await searchPublishedListings({ query, limit: SEARCH_LIMIT });
    return (
      <DirectoryListPage
        title={`Results for “${query}”`}
        description={null}
        path="/apps"
        listings={listings}
        includeJsonLd={false}
      />
    );
  }

  if (hasLegacyBrowseParams(params)) {
    permanentRedirect("/apps");
  }

  const shelves = await listPublishedShelves();
  const jsonItems = shelves.flatMap((shelf) =>
    shelf.listings.slice(0, 6).map((listing) => ({
      name: listing.name,
      path: listingPath(listing.slug, listing.publicId),
    })),
  );

  return (
    <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
      <JsonLd
        data={itemListJsonLd({
          name: HUB_COPY.title,
          description: HUB_COPY.description,
          path: "/apps",
          items: jsonItems,
        })}
      />
      <h1 className="font-bold text-3xl tracking-tight">{HUB_COPY.title}</h1>
      <p className="mt-2 text-base text-muted-foreground">{HUB_COPY.description}</p>

      {shelves.length === 0 ? (
        <div className="mt-8">
          <ListingsEmpty />
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {shelves.map((shelf) => (
            <ListingShelf key={shelf.slug} shelf={shelf} />
          ))}
        </div>
      )}
    </main>
  );
}
