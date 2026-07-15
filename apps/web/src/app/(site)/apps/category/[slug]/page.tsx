import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { DirectoryListPage } from "@/components/listings/directory-list-page";
import {
  appsSearchPath,
  categoryPath,
  hasLegacyBrowseParams,
  parseSearchQuery,
  type BrowseParams,
} from "@/lib/apps/browse-params";
import { listPublishedListings } from "@/lib/apps/queries";
import { directorySocialMetadata } from "@/lib/apps/seo";
import { categoryDisplayName, categorySlugExists } from "@/lib/category/categories";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!categorySlugExists(slug)) {
    return { title: "Category" };
  }

  const name = categoryDisplayName(slug) ?? slug;
  const path = categoryPath(slug);
  const description = `Browse apps and games in ${name} for Meta Ray-Ban Display.`;

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
  if (query) {
    redirect(appsSearchPath(query));
  }
  if (hasLegacyBrowseParams(browse)) {
    permanentRedirect(categoryPath(slug));
  }

  const name = categoryDisplayName(slug) ?? slug;
  const listings = await listPublishedListings({ categorySlug: slug });
  if (listings.length === 0) notFound();

  const path = categoryPath(slug);
  const description = `Browse apps and games in ${name} for Meta Ray-Ban Display.`;

  return (
    <DirectoryListPage title={name} description={description} path={path} listings={listings} />
  );
}
