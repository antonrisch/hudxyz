import { and, asc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { cache } from "react";

import { getDb } from "@/db";
import {
  appAssets,
  apps,
  categories,
  collectionApps,
  collections,
  type CollectionKind,
  type ListingType,
  type SmartSort,
} from "@/db/schema";
import sampleListings from "@/db/seed/sample-listings.json";
import {
  type ListingListItem,
  listPublishedListings,
  samplePublishedListingsByAppIds,
} from "@/lib/apps/queries";
import { publicUrl } from "@/lib/r2";

export type PublishedCollection = {
  slug: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  smartSort: SmartSort | null;
  coverUrl: string | null;
};

/** Resolved collection for hub shelves and collection detail pages. */
export type PublishedShelf = PublishedCollection & {
  listings: ListingListItem[];
};

type SampleCollection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  status: "draft" | "published";
  sort_order: number;
  cover_object_key: string | null;
  filter_listing_type: ListingType | null;
  filter_category_slug: string | null;
  smart_sort: SmartSort | null;
  item_limit: number | null;
};

type SampleCollectionApp = {
  collection_id: string;
  app_id: string;
  sort_order: number;
};

type SampleListingsWithCollections = {
  collections?: SampleCollection[];
  collection_apps?: SampleCollectionApp[];
};

function sampleCollections(): SampleCollection[] {
  return ((sampleListings as SampleListingsWithCollections).collections ??
    []) as SampleCollection[];
}

function sampleCollectionApps(): SampleCollectionApp[] {
  return ((sampleListings as SampleListingsWithCollections).collection_apps ??
    []) as SampleCollectionApp[];
}

function useSampleListings(): boolean {
  return process.env.LISTINGS_SOURCE === "sample";
}

async function resolveEditorialListings(collectionId: string): Promise<ListingListItem[]> {
  if (useSampleListings()) {
    const appIds = sampleCollectionApps()
      .filter((row) => row.collection_id === collectionId)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => row.app_id);
    return samplePublishedListingsByAppIds(appIds);
  }

  const db = getDb();
  const primaryCategory = alias(categories, "primary_category");

  const rows = await db
    .select({
      slug: apps.slug,
      publicId: apps.publicId,
      name: apps.name,
      description: apps.description,
      listingType: apps.listingType,
      categoryName: primaryCategory.name,
      iconObjectKey: appAssets.objectKey,
      launchUrl: apps.launchUrl,
      launchCount: apps.launchCount,
      simCount: apps.simCount,
    })
    .from(collectionApps)
    .innerJoin(apps, eq(collectionApps.appId, apps.id))
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .leftJoin(appAssets, and(eq(appAssets.appId, apps.id), eq(appAssets.kind, "icon")))
    .where(and(eq(collectionApps.collectionId, collectionId), eq(apps.status, "published")))
    .orderBy(asc(collectionApps.sortOrder));

  return rows.map((row) => ({
    slug: row.slug,
    publicId: row.publicId,
    name: row.name,
    description: row.description,
    listingType: row.listingType,
    categoryName: row.categoryName,
    iconUrl: row.iconObjectKey ? publicUrl(row.iconObjectKey) : null,
    launchUrl: row.launchUrl,
    launchCount: row.launchCount,
    simCount: row.simCount,
  }));
}

export type CollectionResolveInput = {
  id: string;
  kind: CollectionKind;
  filterListingType: ListingType | null;
  filterCategorySlug: string | null;
  smartSort: SmartSort | null;
  itemLimit: number | null;
};

/**
 * Resolve listings for a collection row (any status).
 * Used by the public hub/detail paths and Padme admin previews.
 */
export async function resolveCollectionListings(
  collection: CollectionResolveInput,
  limit?: number,
): Promise<ListingListItem[]> {
  if (collection.kind === "editorial") {
    return resolveEditorialListings(collection.id);
  }

  if (!collection.smartSort) return [];

  return listPublishedListings({
    listingType: collection.filterListingType ?? undefined,
    categorySlug: collection.filterCategorySlug ?? undefined,
    sort: collection.smartSort,
    limit,
  });
}

/** Item count for admin lists — avoids hydrating full listing rows when only length is needed. */
export async function countCollectionListings(collection: CollectionResolveInput): Promise<number> {
  if (collection.kind === "editorial") {
    if (useSampleListings()) {
      return (await resolveEditorialListings(collection.id)).length;
    }
    const db = getDb();
    const rows = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(collectionApps)
      .innerJoin(apps, eq(collectionApps.appId, apps.id))
      .where(and(eq(collectionApps.collectionId, collection.id), eq(apps.status, "published")));
    return rows[0]?.count ?? 0;
  }

  const listings = await resolveCollectionListings(collection, collection.itemLimit ?? undefined);
  return listings.length;
}

function toPublishedCollection(row: {
  slug: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  smartSort: SmartSort | null;
  coverObjectKey: string | null;
}): PublishedCollection {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    kind: row.kind,
    smartSort: row.smartSort,
    coverUrl: row.coverObjectKey ? publicUrl(row.coverObjectKey) : null,
  };
}

function sampleCollectionInput(collection: SampleCollection) {
  return {
    id: collection.id,
    kind: collection.kind,
    filterListingType: collection.filter_listing_type,
    filterCategorySlug: collection.filter_category_slug,
    smartSort: collection.smart_sort,
    itemLimit: collection.item_limit,
  };
}

export async function listPublishedShelves(): Promise<PublishedShelf[]> {
  if (useSampleListings()) {
    const published = sampleCollections()
      .filter((row) => row.status === "published")
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);

    const resolved = await Promise.all(
      published.map(async (collection) => {
        const listings = await resolveCollectionListings(
          sampleCollectionInput(collection),
          collection.item_limit ?? undefined,
        );
        if (listings.length === 0) return null;
        return {
          ...toPublishedCollection({
            slug: collection.slug,
            name: collection.name,
            description: collection.description,
            kind: collection.kind,
            smartSort: collection.smart_sort,
            coverObjectKey: collection.cover_object_key,
          }),
          listings,
        } satisfies PublishedShelf;
      }),
    );

    return resolved.filter((shelf): shelf is PublishedShelf => shelf != null);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.status, "published"))
    .orderBy(asc(collections.sortOrder));

  const resolved = await Promise.all(
    rows.map(async (collection) => {
      const listings = await resolveCollectionListings(
        collection,
        collection.itemLimit ?? undefined,
      );
      if (listings.length === 0) return null;
      return {
        ...toPublishedCollection(collection),
        listings,
      } satisfies PublishedShelf;
    }),
  );

  return resolved.filter((shelf): shelf is PublishedShelf => shelf != null);
}

export const getPublishedCollectionBySlug = cache(
  async (slug: string): Promise<PublishedShelf | null> => {
    if (useSampleListings()) {
      const collection = sampleCollections().find(
        (row) => row.slug === slug && row.status === "published",
      );
      if (!collection) return null;

      const listings = await resolveCollectionListings(sampleCollectionInput(collection));
      if (listings.length === 0) return null;

      return {
        ...toPublishedCollection({
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          kind: collection.kind,
          smartSort: collection.smart_sort,
          coverObjectKey: collection.cover_object_key,
        }),
        listings,
      };
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(collections)
      .where(and(eq(collections.slug, slug), eq(collections.status, "published")))
      .limit(1);

    const collection = rows[0];
    if (!collection) return null;

    const listings = await resolveCollectionListings(collection);
    if (listings.length === 0) return null;

    return {
      ...toPublishedCollection(collection),
      listings,
    };
  },
);

export type PublishedCollectionPath = {
  slug: string;
  updatedAt: Date;
};

function laterDate(a: Date, b: Date | null | undefined): Date {
  if (!b) return a;
  return b.getTime() > a.getTime() ? b : a;
}

/** Newest published listing `updatedAt` that currently feeds this collection. */
async function latestMemberListingUpdatedAt(
  collection: CollectionResolveInput,
): Promise<Date | null> {
  if (useSampleListings()) {
    const listings = await resolveCollectionListings(collection, collection.itemLimit ?? undefined);
    return listings.length > 0 ? new Date(0) : null;
  }

  const db = getDb();

  if (collection.kind === "editorial") {
    const rows = await db
      .select({ updatedAt: sql<number>`max(${apps.updatedAt})`.mapWith(Number) })
      .from(collectionApps)
      .innerJoin(apps, eq(collectionApps.appId, apps.id))
      .where(and(eq(collectionApps.collectionId, collection.id), eq(apps.status, "published")));
    const value = rows[0]?.updatedAt;
    return value ? new Date(value) : null;
  }

  if (!collection.smartSort) return null;

  const conditions = [eq(apps.status, "published")];
  if (collection.filterListingType) {
    conditions.push(eq(apps.listingType, collection.filterListingType));
  }
  if (collection.filterCategorySlug) {
    const primaryCategory = alias(categories, "primary_category");
    const secondaryCategory = alias(categories, "secondary_category");
    const rows = await db
      .select({ updatedAt: sql<number>`max(${apps.updatedAt})`.mapWith(Number) })
      .from(apps)
      .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
      .leftJoin(secondaryCategory, eq(apps.secondaryCategoryId, secondaryCategory.id))
      .where(
        and(
          ...conditions,
          or(
            eq(primaryCategory.slug, collection.filterCategorySlug),
            eq(secondaryCategory.slug, collection.filterCategorySlug),
          ),
        ),
      );
    const value = rows[0]?.updatedAt;
    return value ? new Date(value) : null;
  }

  const rows = await db
    .select({ updatedAt: sql<number>`max(${apps.updatedAt})`.mapWith(Number) })
    .from(apps)
    .where(and(...conditions));
  const value = rows[0]?.updatedAt;
  return value ? new Date(value) : null;
}

/** Lightweight non-empty published collection rows for sitemap generation. */
export async function listPublishedCollectionPaths(): Promise<PublishedCollectionPath[]> {
  if (useSampleListings()) {
    const published = sampleCollections()
      .filter((row) => row.status === "published")
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);

    const resolved = await Promise.all(
      published.map(async (collection) => {
        const input = sampleCollectionInput(collection);
        const count = await countCollectionListings(input);
        if (count === 0) return null;
        return {
          slug: collection.slug,
          // Sample fixture has no updated_at — use a stable epoch.
          updatedAt: new Date(0),
        } satisfies PublishedCollectionPath;
      }),
    );

    return resolved.filter((row): row is PublishedCollectionPath => row != null);
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.status, "published"))
    .orderBy(asc(collections.sortOrder));

  const resolved = await Promise.all(
    rows.map(async (collection) => {
      const count = await countCollectionListings(collection);
      if (count === 0) return null;
      const memberUpdatedAt = await latestMemberListingUpdatedAt(collection);
      return {
        slug: collection.slug,
        updatedAt: laterDate(collection.updatedAt, memberUpdatedAt),
      } satisfies PublishedCollectionPath;
    }),
  );

  return resolved.filter((row): row is PublishedCollectionPath => row != null);
}
