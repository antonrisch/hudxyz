import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { getDb } from "@/db";
import { appAssets, apps, categories, type ListingType, type SmartSort } from "@/db/schema";
import sampleListings from "@/db/seed/sample-listings.json";
import { findCategoryDefinition } from "@/lib/category/categories";
import { publicUrl } from "@/lib/r2";

export type ListingListItem = {
  slug: string;
  publicId: string;
  name: string;
  description: string | null;
  listingType: ListingType;
  categoryName: string;
  iconUrl: string | null;
  launchUrl: string;
  launchCount: number;
  simCount: number;
};

export type ListingMediaImage = {
  url: string;
  width: number | null;
  height: number | null;
};

export type ListingMediaVideo = {
  url: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

export type ListingDetail = ListingListItem & {
  author: string;
  targetDevice: string;
  categorySlug: string;
  secondaryCategorySlug: string | null;
  secondaryCategoryName: string | null;
  screenshots: ListingMediaImage[];
  video: ListingMediaVideo | null;
};

/** Browse / smart-shelf sort. Alias of schema `SmartSort`. */
export type ListingSort = SmartSort;

export type ListPublishedFilter = {
  listingType?: ListingType;
  categorySlug?: string;
  sort?: ListingSort;
  limit?: number;
};

export type CategoryCount = {
  slug: string;
  name: string;
  count: number;
  /** Newest published listing update touching this category (sitemap lastmod). */
  updatedAt: Date;
};

type SampleCategoryRef = {
  listing_type: ListingType;
  slug: string;
};

type SampleApp = (typeof sampleListings.apps)[number];
type SampleAsset = (typeof sampleListings.app_assets)[number];

const primaryCategory = alias(categories, "primary_category");
const secondaryCategory = alias(categories, "secondary_category");

function useSampleListings(): boolean {
  return process.env.LISTINGS_SOURCE === "sample";
}

/** `public/suggested-apps/foo.png` → `/suggested-apps/foo.png` */
function sourcePathToPublicUrl(sourcePath: string | undefined): string | null {
  if (!sourcePath) return null;
  const trimmed = sourcePath.replace(/^public\//, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function categoryNameFromRef(ref: SampleCategoryRef | null | undefined): string | null {
  if (!ref) return null;
  return findCategoryDefinition(ref.listing_type, ref.slug)?.name ?? ref.slug;
}

/** Local `public/...` path or absolute `_source_url` for sample assets. */
function sampleAssetUrl(asset: SampleAsset): string | null {
  if ("_source_url" in asset && typeof asset._source_url === "string") {
    return asset._source_url;
  }
  return sourcePathToPublicUrl(asset._source_path);
}

function iconUrlForApp(appId: string): string | null {
  const asset = sampleListings.app_assets.find(
    (row) => row.app_id === appId && row.kind === "icon",
  ) as SampleAsset | undefined;
  return asset ? sampleAssetUrl(asset) : null;
}

function sampleListItem(app: SampleApp): ListingListItem {
  return {
    slug: app.slug,
    publicId: app.public_id,
    name: app.name,
    description: app.description,
    listingType: app.listing_type as ListingType,
    categoryName: categoryNameFromRef(app.primary_category as SampleCategoryRef) ?? "Uncategorized",
    iconUrl: iconUrlForApp(app.id),
    launchUrl: app.launch_url,
    launchCount: app.launch_count ?? 0,
    simCount: app.sim_count ?? 0,
  };
}

/** Ordered published sample list items for internal app ids (sample mode only). */
export function samplePublishedListingsByAppIds(appIds: readonly string[]): ListingListItem[] {
  const byId = new Map(sampleListings.apps.map((app) => [app.id, app] as const));
  return appIds.flatMap((appId) => {
    const app = byId.get(appId);
    if (!app || app.status !== "published") return [];
    return [sampleListItem(app)];
  });
}

function sampleMatchesCategory(app: SampleApp, categorySlug: string): boolean {
  const primary = app.primary_category as SampleCategoryRef | null;
  const secondary = app.secondary_category as SampleCategoryRef | null;
  return primary?.slug === categorySlug || secondary?.slug === categorySlug;
}

function sampleOpenCount(app: SampleApp): number {
  return (app.launch_count ?? 0) + (app.sim_count ?? 0);
}

function listFromSample(filter?: ListPublishedFilter): ListingListItem[] {
  let rows = sampleListings.apps
    .filter((app) => app.status === "published")
    .filter((app) => !filter?.listingType || app.listing_type === filter.listingType)
    .filter((app) => !filter?.categorySlug || sampleMatchesCategory(app, filter.categorySlug));

  const sort = filter?.sort ?? "new";
  rows = rows.slice().sort((a, b) => {
    if (sort === "popular") {
      const openDiff = sampleOpenCount(b) - sampleOpenCount(a);
      if (openDiff !== 0) return openDiff;
    }
    return (b.published_at ?? 0) - (a.published_at ?? 0);
  });

  if (filter?.limit != null) {
    rows = rows.slice(0, filter.limit);
  }

  return rows.map(sampleListItem);
}

function detailFromSample(publicId: string): ListingDetail | null {
  const app = sampleListings.apps.find(
    (row) => row.public_id === publicId && row.status === "published",
  ) as SampleApp | undefined;
  if (!app) return null;

  const assets = sampleListings.app_assets
    .filter((row) => row.app_id === app.id)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  let iconUrl: string | null = null;
  const screenshots: ListingMediaImage[] = [];
  let video: ListingMediaVideo | null = null;

  for (const asset of assets) {
    const url = sampleAssetUrl(asset);
    if (!url) continue;

    switch (asset.kind) {
      case "icon":
        iconUrl = url;
        break;
      case "screenshot":
        screenshots.push({ url, width: asset.width, height: asset.height });
        break;
      case "video":
        video = {
          url,
          width: asset.width,
          height: asset.height,
          durationMs: asset.duration_ms,
        };
        break;
      default:
        break;
    }
  }

  return {
    ...sampleListItem(app),
    iconUrl,
    author: app.author,
    targetDevice: app.target_device,
    categorySlug: (app.primary_category as SampleCategoryRef).slug,
    secondaryCategorySlug: (app.secondary_category as SampleCategoryRef | null)?.slug ?? null,
    secondaryCategoryName: categoryNameFromRef(app.secondary_category as SampleCategoryRef | null),
    screenshots,
    video,
  };
}

function mapListRows(
  rows: Array<{
    slug: string;
    publicId: string;
    name: string;
    description: string | null;
    listingType: ListingType;
    categoryName: string;
    iconObjectKey: string | null;
    launchUrl: string;
    launchCount: number;
    simCount: number;
  }>,
): ListingListItem[] {
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

export async function listPublishedListings(
  filter?: ListPublishedFilter,
): Promise<ListingListItem[]> {
  if (useSampleListings()) {
    return listFromSample(filter);
  }

  const db = getDb();

  const conditions = [eq(apps.status, "published")];
  if (filter?.listingType) {
    conditions.push(eq(apps.listingType, filter.listingType));
  }
  if (filter?.categorySlug) {
    conditions.push(
      or(
        eq(primaryCategory.slug, filter.categorySlug),
        eq(secondaryCategory.slug, filter.categorySlug),
      )!,
    );
  }

  const sort = filter?.sort ?? "new";
  const orderBy =
    sort === "popular"
      ? [desc(sql`${apps.launchCount} + ${apps.simCount}`), desc(apps.publishedAt)]
      : [desc(apps.publishedAt)];

  let query = db
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
    .from(apps)
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .leftJoin(secondaryCategory, eq(apps.secondaryCategoryId, secondaryCategory.id))
    .leftJoin(appAssets, and(eq(appAssets.appId, apps.id), eq(appAssets.kind, "icon")))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .$dynamic();

  if (filter?.limit != null) {
    query = query.limit(filter.limit);
  }

  return mapListRows(await query);
}

export async function listPublishedCategoryCounts(filter?: {
  listingType?: ListingType;
}): Promise<CategoryCount[]> {
  if (useSampleListings()) {
    const counts = new Map<string, { name: string; count: number; updatedAt: Date }>();

    for (const app of sampleListings.apps) {
      if (app.status !== "published") continue;
      if (filter?.listingType && app.listing_type !== filter.listingType) continue;

      const refs = [
        app.primary_category as SampleCategoryRef,
        app.secondary_category as SampleCategoryRef | null,
      ].filter(Boolean) as SampleCategoryRef[];
      const updatedAt = new Date(app.updated_at);

      for (const ref of refs) {
        const name = categoryNameFromRef(ref) ?? ref.slug;
        const existing = counts.get(ref.slug);
        if (existing) {
          existing.count += 1;
          if (updatedAt > existing.updatedAt) existing.updatedAt = updatedAt;
        } else {
          counts.set(ref.slug, { name, count: 1, updatedAt });
        }
      }
    }

    return [...counts.entries()]
      .map(([slug, value]) => ({
        slug,
        name: value.name,
        count: value.count,
        updatedAt: value.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const db = getDb();
  const conditions = [eq(apps.status, "published")];
  if (filter?.listingType) {
    conditions.push(eq(apps.listingType, filter.listingType));
  }

  const primaryRows = await db
    .select({
      slug: primaryCategory.slug,
      name: primaryCategory.name,
      count: sql<number>`count(*)`.mapWith(Number),
      updatedAt: sql<number>`max(${apps.updatedAt})`.mapWith(Number),
    })
    .from(apps)
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .where(and(...conditions))
    .groupBy(primaryCategory.slug, primaryCategory.name);

  const secondaryRows = await db
    .select({
      slug: secondaryCategory.slug,
      name: secondaryCategory.name,
      count: sql<number>`count(*)`.mapWith(Number),
      updatedAt: sql<number>`max(${apps.updatedAt})`.mapWith(Number),
    })
    .from(apps)
    .innerJoin(secondaryCategory, eq(apps.secondaryCategoryId, secondaryCategory.id))
    .where(and(...conditions))
    .groupBy(secondaryCategory.slug, secondaryCategory.name);

  const counts = new Map<string, { name: string; count: number; updatedAt: Date }>();
  for (const row of [...primaryRows, ...secondaryRows]) {
    if (!row.slug) continue;
    const updatedAt = new Date(row.updatedAt);
    const existing = counts.get(row.slug);
    if (existing) {
      existing.count += row.count;
      if (updatedAt > existing.updatedAt) existing.updatedAt = updatedAt;
    } else {
      counts.set(row.slug, { name: row.name, count: row.count, updatedAt });
    }
  }

  return [...counts.entries()]
    .map(([slug, value]) => ({
      slug,
      name: value.name,
      count: value.count,
      updatedAt: value.updatedAt,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPublishedListingByPublicId(
  publicId: string,
): Promise<ListingDetail | null> {
  if (useSampleListings()) {
    return detailFromSample(publicId);
  }

  const db = getDb();

  const rows = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      publicId: apps.publicId,
      name: apps.name,
      description: apps.description,
      listingType: apps.listingType,
      author: apps.author,
      launchUrl: apps.launchUrl,
      targetDevice: apps.targetDevice,
      categoryName: primaryCategory.name,
      categorySlug: primaryCategory.slug,
      secondaryCategoryName: secondaryCategory.name,
      secondaryCategorySlug: secondaryCategory.slug,
      launchCount: apps.launchCount,
      simCount: apps.simCount,
    })
    .from(apps)
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .leftJoin(secondaryCategory, eq(apps.secondaryCategoryId, secondaryCategory.id))
    .where(and(eq(apps.publicId, publicId), eq(apps.status, "published")))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const assets = await db
    .select()
    .from(appAssets)
    .where(eq(appAssets.appId, row.id))
    .orderBy(asc(appAssets.sortOrder));

  let iconUrl: string | null = null;
  const screenshots: ListingMediaImage[] = [];
  let video: ListingMediaVideo | null = null;

  for (const asset of assets) {
    switch (asset.kind) {
      case "icon":
        iconUrl = publicUrl(asset.objectKey);
        break;
      case "screenshot":
        screenshots.push({
          url: publicUrl(asset.objectKey),
          width: asset.width,
          height: asset.height,
        });
        break;
      case "video":
        video = {
          url: publicUrl(asset.objectKey),
          width: asset.width,
          height: asset.height,
          durationMs: asset.durationMs,
        };
        break;
      default: {
        const _exhaustive: never = asset.kind;
        void _exhaustive;
      }
    }
  }

  return {
    slug: row.slug,
    publicId: row.publicId,
    name: row.name,
    description: row.description,
    listingType: row.listingType,
    categoryName: row.categoryName,
    secondaryCategoryName: row.secondaryCategoryName,
    categorySlug: row.categorySlug,
    secondaryCategorySlug: row.secondaryCategorySlug,
    iconUrl,
    author: row.author,
    launchUrl: row.launchUrl,
    targetDevice: row.targetDevice,
    launchCount: row.launchCount,
    simCount: row.simCount,
    screenshots,
    video,
  };
}

/** Legacy slug-only lookup — returns the listing when exactly one published row matches. */
export async function getPublishedListingBySlug(slug: string): Promise<ListingDetail | null> {
  if (useSampleListings()) {
    const matches = sampleListings.apps.filter(
      (row) => row.slug === slug && row.status === "published",
    );
    if (matches.length !== 1) return null;
    return detailFromSample(matches[0]!.public_id);
  }

  const db = getDb();
  const rows = await db
    .select({ publicId: apps.publicId })
    .from(apps)
    .where(and(eq(apps.slug, slug), eq(apps.status, "published")))
    .limit(2);

  if (rows.length !== 1) return null;
  return getPublishedListingByPublicId(rows[0]!.publicId);
}

export type PublishedListingPath = {
  slug: string;
  publicId: string;
  updatedAt: Date;
};

/** Lightweight rows for sitemap generation. */
export async function listPublishedListingPaths(): Promise<PublishedListingPath[]> {
  if (useSampleListings()) {
    return sampleListings.apps
      .filter((row) => row.status === "published")
      .map((row) => ({
        slug: row.slug,
        publicId: row.public_id,
        updatedAt: new Date(row.updated_at),
      }));
  }

  const db = getDb();
  const rows = await db
    .select({
      slug: apps.slug,
      publicId: apps.publicId,
      updatedAt: apps.updatedAt,
    })
    .from(apps)
    .where(eq(apps.status, "published"))
    .orderBy(desc(apps.updatedAt));

  return rows;
}
