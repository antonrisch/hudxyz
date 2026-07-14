import type { MetadataRoute } from "next";

import { listingPath } from "@/lib/apps/public-id";
import { listPublishedListingPaths } from "@/lib/apps/queries";
import { categoryCatalog } from "@/lib/category/categories";
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

  try {
    const [listings, collections] = await Promise.all([
      listPublishedListingPaths(),
      listPublishedCollectionPaths(),
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
  } catch (error) {
    // Sitemap should still serve static routes if Turso is unreachable.
    console.error("Sitemap directory entries unavailable", error);
  }

  const categorySlugs = [...new Set(categoryCatalog.map((category) => category.slug))];
  const categoryEntries: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${base}/apps/category/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.65,
  }));

  return [...staticEntries, ...categoryEntries, ...collectionEntries, ...listingEntries];
}
