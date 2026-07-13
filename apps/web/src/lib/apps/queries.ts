import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import { getDb } from "@/db";
import { appAssets, apps, categories, type ListingType } from "@/db/schema";
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

function listFromSample(filter?: { listingType?: ListingType }): ListingListItem[] {
  return sampleListings.apps
    .filter((app) => app.status === "published")
    .filter((app) => !filter?.listingType || app.listing_type === filter.listingType)
    .slice()
    .sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0))
    .map(sampleListItem);
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

export async function listPublishedListings(filter?: {
  listingType?: ListingType;
}): Promise<ListingListItem[]> {
  if (useSampleListings()) {
    return listFromSample(filter);
  }

  const db = getDb();

  const conditions = [eq(apps.status, "published")];
  if (filter?.listingType) {
    conditions.push(eq(apps.listingType, filter.listingType));
  }

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
    .from(apps)
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .leftJoin(appAssets, and(eq(appAssets.appId, apps.id), eq(appAssets.kind, "icon")))
    .where(and(...conditions))
    .orderBy(desc(apps.publishedAt));

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
