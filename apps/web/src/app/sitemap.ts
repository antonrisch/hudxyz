import type { MetadataRoute } from "next";

import { listingPath } from "@/lib/apps/public-id";
import { listPublishedCategoryCounts, listPublishedListingPaths } from "@/lib/apps/queries";
import { listPublishedCollectionPaths } from "@/lib/collections/queries";
import { legal } from "@/lib/legal/config";
import { sitemapLastModified } from "@/lib/seo/sitemap-date";
import { siteUrl } from "@/lib/site";

function entry(url: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return lastModified ? { url, lastModified } : { url };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    entry(base),
    entry(`${base}/simulator`),
    entry(`${base}/apps`),
    entry(`${base}/apps/categories`),
    entry(`${base}/privacy`, new Date(legal.privacyLastUpdated)),
    entry(`${base}/terms`, new Date(legal.termsLastUpdated)),
  ];

  let listingEntries: MetadataRoute.Sitemap = [];
  let collectionEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];

  try {
    const [listings, collections, categories] = await Promise.all([
      listPublishedListingPaths(),
      listPublishedCollectionPaths(),
      listPublishedCategoryCounts(),
    ]);

    listingEntries = listings.map((listing) =>
      entry(
        `${base}${listingPath(listing.slug, listing.publicId)}`,
        sitemapLastModified(listing.updatedAt),
      ),
    );

    collectionEntries = collections.map((collection) =>
      entry(
        `${base}/apps/collections/${collection.slug}`,
        sitemapLastModified(collection.updatedAt),
      ),
    );

    categoryEntries = categories.map((category) =>
      entry(`${base}/apps/category/${category.slug}`, sitemapLastModified(category.updatedAt)),
    );
  } catch (error) {
    // Sitemap should still serve static routes if Turso is unreachable.
    console.error("Sitemap directory entries unavailable", error);
  }

  return [...staticEntries, ...categoryEntries, ...collectionEntries, ...listingEntries];
}
