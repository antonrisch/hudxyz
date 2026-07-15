import type { MetadataRoute } from "next";

import { listingPath } from "@/lib/apps/public-id";
import { listPublishedCategoryCounts, listPublishedListingPaths } from "@/lib/apps/queries";
import { listPublishedCollectionPaths } from "@/lib/collections/queries";
import { legal } from "@/lib/legal/config";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/simulator`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/apps`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/apps/categories`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/privacy`,
      lastModified: new Date(legal.lastUpdated),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${base}/terms`,
      lastModified: new Date(legal.lastUpdated),
      changeFrequency: "yearly",
      priority: 0.5,
    },
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

    listingEntries = listings.map((listing) => ({
      url: `${base}${listingPath(listing.slug, listing.publicId)}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    collectionEntries = collections.map((collection) => ({
      url: `${base}/apps/collections/${collection.slug}`,
      lastModified: collection.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

    categoryEntries = categories.map((category) => ({
      url: `${base}/apps/category/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));
  } catch (error) {
    // Sitemap should still serve static routes if Turso is unreachable.
    console.error("Sitemap directory entries unavailable", error);
  }

  return [...staticEntries, ...categoryEntries, ...collectionEntries, ...listingEntries];
}
