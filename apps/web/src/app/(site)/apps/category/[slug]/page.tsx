import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/layout/json-ld";
import { ListingsBrowseView } from "@/components/listings/listings-browse-view";
import {
  appsCanonicalPath,
  parseListingSort,
  parseListingType,
  parseSearchQuery,
  parseSearchSort,
  type BrowseParams,
} from "@/lib/apps/browse-params";
import { listingPath } from "@/lib/apps/public-id";
import { listPublishedCategoryCounts, listPublishedListings } from "@/lib/apps/queries";
import { searchPublishedListings } from "@/lib/apps/search";
import { directorySocialMetadata, itemListJsonLd } from "@/lib/apps/seo";
import { categoryDisplayName, categorySlugExists } from "@/lib/category/categories";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<BrowseParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!categorySlugExists(slug)) {
    return { title: "Category" };
  }

  const browse = await searchParams;
  const query = parseSearchQuery(browse.q);
  const listingType = parseListingType(browse.type);
  const name = categoryDisplayName(slug) ?? slug;
  const typeLabel =
    listingType === "app" ? "apps" : listingType === "game" ? "games" : "apps and games";

  if (query) {
    return {
      title: `Search: ${query} · ${name}`,
      description: `Search results for “${query}” in ${name}.`,
      robots: { index: false, follow: true },
      alternates: { canonical: "/apps" },
    };
  }

  const path = appsCanonicalPath({ categorySlug: slug, listingType });
  const description = `Browse ${typeLabel} in ${name} for Meta Ray-Ban Display.`;
  return {
    title: name,
    description,
    alternates: { canonical: path },
    ...directorySocialMetadata({
      title: name,
      description,
      path,
    }),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<BrowseParams>;
}) {
  const { slug } = await params;
  if (!categorySlugExists(slug)) notFound();

  const browse = await searchParams;
  const query = parseSearchQuery(browse.q);
  const listingType = parseListingType(browse.type);
  const name = categoryDisplayName(slug) ?? slug;

  if (query) {
    const sort = parseSearchSort(browse.sort);
    const [listings, categories] = await Promise.all([
      searchPublishedListings({ query, listingType, categorySlug: slug, sort }),
      listPublishedCategoryCounts({ listingType }),
    ]);

    return (
      <ListingsBrowseView
        header={{
          title: `Results for “${query}”`,
          description: name,
          count: listings.length,
          listingType,
          categorySlug: slug,
          sort,
          categories,
          query,
        }}
        listings={listings}
      />
    );
  }

  const sort = parseListingSort(browse.sort);

  const [listings, categories] = await Promise.all([
    listPublishedListings({ listingType, categorySlug: slug, sort }),
    listPublishedCategoryCounts({ listingType }),
  ]);

  const path = appsCanonicalPath({ categorySlug: slug, listingType });
  const description = `Browse apps and games in ${name} for Meta Ray-Ban Display.`;

  return (
    <>
      <JsonLd
        data={itemListJsonLd({
          name,
          description,
          path,
          items: listings.map((listing) => ({
            name: listing.name,
            path: listingPath(listing.slug, listing.publicId),
          })),
        })}
      />
      <ListingsBrowseView
        header={{
          title: name,
          count: listings.length,
          listingType,
          categorySlug: slug,
          sort,
          categories,
        }}
        listings={listings}
      />
    </>
  );
}
