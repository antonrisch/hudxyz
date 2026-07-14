import type { Metadata } from "next";

import { ListingShelf } from "@/components/listings/listing-shelf";
import { ListingsBrowseView } from "@/components/listings/listings-browse-view";
import { ListingsEmpty } from "@/components/listings/listings-empty";
import {
  appsCanonicalPath,
  hasBrowseFilters,
  parseListingSort,
  parseListingType,
  parseSearchQuery,
  parseSearchSort,
  type BrowseParams,
} from "@/lib/apps/browse-params";
import { listPublishedCategoryCounts, listPublishedListings } from "@/lib/apps/queries";
import { searchPublishedListings } from "@/lib/apps/search";
import { listPublishedShelves } from "@/lib/collections/queries";

const HUB_COPY = {
  title: "Apps and Games",
  description:
    "Discover the best web apps and games for Meta Ray-Ban Display made by the community.",
} as const;

const TYPE_COPY = {
  app: {
    title: "Apps",
    description: "Discover the best web apps for Meta Ray-Ban Display made by the community.",
  },
  game: {
    title: "Games",
    description: "Discover the best games for Meta Ray-Ban Display made by the community.",
  },
} as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<BrowseParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = parseSearchQuery(params.q);
  const listingType = parseListingType(params.type);
  const filtered = hasBrowseFilters(params);

  if (query) {
    return {
      title: `Search: ${query}`,
      description: `Search results for “${query}” in the Meta Ray-Ban Display app directory.`,
      robots: { index: false, follow: true },
      alternates: { canonical: "/apps" },
    };
  }

  if (!filtered) {
    return {
      title: HUB_COPY.title,
      description: `${HUB_COPY.description} Open them in the hud.xyz simulator.`,
      alternates: { canonical: "/apps" },
    };
  }

  const copy = listingType ? TYPE_COPY[listingType] : HUB_COPY;
  return {
    title: copy.title,
    description: `${copy.description} Open them in the hud.xyz simulator.`,
    alternates: { canonical: appsCanonicalPath({ listingType }) },
  };
}

export default async function AppsPage({ searchParams }: { searchParams: Promise<BrowseParams> }) {
  const params = await searchParams;
  const query = parseSearchQuery(params.q);
  const listingType = parseListingType(params.type);

  if (query) {
    const sort = parseSearchSort(params.sort);
    const [listings, categories] = await Promise.all([
      searchPublishedListings({ query, listingType, sort }),
      listPublishedCategoryCounts({ listingType }),
    ]);

    return (
      <ListingsBrowseView
        header={{
          title: `Results for “${query}”`,
          count: listings.length,
          listingType,
          sort,
          categories,
          query,
        }}
        listings={listings}
      />
    );
  }

  const sort = parseListingSort(params.sort);
  const filtered = hasBrowseFilters(params);

  if (!filtered) {
    const shelves = await listPublishedShelves();

    return (
      <main className="page-px mx-auto w-full max-w-6xl flex-1 py-10">
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

  const [listings, categories] = await Promise.all([
    listPublishedListings({ listingType, sort }),
    listPublishedCategoryCounts({ listingType }),
  ]);

  const copy = listingType ? TYPE_COPY[listingType] : HUB_COPY;

  return (
    <ListingsBrowseView
      header={{
        title: copy.title,
        description: copy.description,
        count: listings.length,
        listingType,
        sort,
        categories,
      }}
      listings={listings}
    />
  );
}
