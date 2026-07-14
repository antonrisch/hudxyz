import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingsBrowseView } from "@/components/listings/listings-browse-view";
import {
  appsCanonicalPath,
  parseListingSort,
  parseListingType,
  type BrowseParams,
} from "@/lib/apps/browse-params";
import { listPublishedCategoryCounts, listPublishedListings } from "@/lib/apps/queries";
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
  const listingType = parseListingType(browse.type);
  const name = categoryDisplayName(slug) ?? slug;
  const typeLabel =
    listingType === "app" ? "apps" : listingType === "game" ? "games" : "apps and games";

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
  const listingType = parseListingType(browse.type);
  const sort = parseListingSort(browse.sort);
  const name = categoryDisplayName(slug) ?? slug;

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
