import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingsBrowseView } from "@/components/listings/listings-browse-view";
import {
  appsCanonicalPath,
  parseListingSort,
  parseListingType,
  parseSearchQuery,
  parseSearchSort,
  type BrowseParams,
} from "@/lib/apps/browse-params";
import { listPublishedCategoryCounts, listPublishedListings } from "@/lib/apps/queries";
import { searchPublishedListings } from "@/lib/apps/search";
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

  return {
    title: name,
    description: `Browse ${typeLabel} in ${name} for Meta Ray-Ban Display.`,
    alternates: { canonical: appsCanonicalPath({ categorySlug: slug }) },
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

  return (
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
  );
}
