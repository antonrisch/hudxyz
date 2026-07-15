import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  appAssets,
  apps,
  categories,
  collectionApps,
  collectionKinds,
  collections,
  collectionStatuses,
  listingTypes,
  smartSorts,
  type CollectionKind,
  type CollectionStatus,
  type ListingType,
  type SmartSort,
} from "@/db/schema";
import { SLUG_PATTERN } from "@/lib/apps/draft-schema";
import type { ListingListItem } from "@/lib/apps/queries";
import { categorySlugExists, categoriesForListingType } from "@/lib/category/categories";
import { publicUrl } from "@/lib/r2";

import { countCollectionListings, resolveCollectionListings } from "./queries";

export class CollectionNotFoundError extends Error {
  constructor(message = "Collection not found") {
    super(message);
    this.name = "CollectionNotFoundError";
  }
}

export class CollectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionValidationError";
  }
}

export class CollectionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionConflictError";
  }
}

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80, "Slug must be at most 80 characters.")
  .regex(SLUG_PATTERN, "Slug must be lowercase URL-safe (a-z, 0-9, hyphens).");

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(80, "Name must be at most 80 characters.");

const descriptionSchema = z
  .union([z.string().trim().max(300, "Description must be at most 300 characters."), z.null()])
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createCollectionSchema = z.object({
  kind: z.enum(collectionKinds),
  name: nameSchema,
  slug: slugSchema,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

export const updateCollectionSchema = z
  .object({
    name: nameSchema.optional(),
    slug: slugSchema.optional(),
    description: descriptionSchema,
    status: z.enum(collectionStatuses).optional(),
    sortOrder: z.number().int().min(0).optional(),
    filterListingType: z.enum(listingTypes).nullable().optional(),
    filterCategorySlug: z
      .union([
        z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(SLUG_PATTERN, "Category slug must be lowercase URL-safe."),
        z.null(),
      ])
      .optional(),
    smartSort: z.enum(smartSorts).optional(),
    itemLimit: z.number().int().min(3).max(24).optional(),
  })
  .strict();

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

export const reorderCollectionsSchema = z.object({
  orderedIds: z.array(z.string().trim().min(1)).min(1),
});

export const replaceMembersSchema = z.object({
  orderedAppIds: z.array(z.string().trim().min(1)),
});

export type AdminCollectionListItem = {
  id: string;
  slug: string;
  name: string;
  kind: CollectionKind;
  status: CollectionStatus;
  sortOrder: number;
  itemCount: number;
  updatedAt: string;
  publishedAt: string | null;
  publishedButEmpty: boolean;
};

export type AdminCollectionMember = {
  id: string;
  publicId: string;
  name: string;
  author: string;
  listingType: ListingType;
  categoryName: string;
  iconUrl: string | null;
  status: string;
};

export type AdminCollectionDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  status: CollectionStatus;
  sortOrder: number;
  coverUrl: string | null;
  filterListingType: ListingType | null;
  filterCategorySlug: string | null;
  smartSort: SmartSort | null;
  itemLimit: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publishedButEmpty: boolean;
  members: AdminCollectionMember[];
  preview: ListingListItem[];
  previewCount: number;
};

type CollectionRow = typeof collections.$inferSelect;

function serializeCollectionTimestamps(row: CollectionRow) {
  return {
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toResolveInput(row: CollectionRow) {
  return {
    id: row.id,
    kind: row.kind,
    filterListingType: row.filterListingType,
    filterCategorySlug: row.filterCategorySlug,
    smartSort: row.smartSort,
    itemLimit: row.itemLimit,
  };
}

function defaultSmartFields(kind: CollectionKind): {
  filterListingType: ListingType | null;
  filterCategorySlug: string | null;
  smartSort: SmartSort | null;
  itemLimit: number | null;
} {
  if (kind === "smart") {
    return {
      filterListingType: null,
      filterCategorySlug: null,
      smartSort: "new",
      itemLimit: 6,
    };
  }
  return {
    filterListingType: null,
    filterCategorySlug: null,
    smartSort: null,
    itemLimit: null,
  };
}

async function assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      excludeId
        ? and(eq(collections.slug, slug), ne(collections.id, excludeId))
        : eq(collections.slug, slug),
    )
    .limit(1);
  if (rows[0]) {
    throw new CollectionConflictError(`Slug “${slug}” is already in use.`);
  }
}

function assertSmartFilterCombo(input: {
  filterListingType: ListingType | null;
  filterCategorySlug: string | null;
  smartSort: SmartSort | null;
  itemLimit: number | null;
}): void {
  if (!input.smartSort) {
    throw new CollectionValidationError("Smart collections require a sort (new or popular).");
  }
  if (input.itemLimit == null || input.itemLimit < 3 || input.itemLimit > 24) {
    throw new CollectionValidationError("Hub item limit must be between 3 and 24.");
  }
  if (input.filterCategorySlug) {
    if (input.filterListingType) {
      const match = categoriesForListingType(input.filterListingType).some(
        (category) => category.slug === input.filterCategorySlug,
      );
      if (!match) {
        throw new CollectionValidationError(
          `Category “${input.filterCategorySlug}” is not valid for ${input.filterListingType}s.`,
        );
      }
    } else if (!categorySlugExists(input.filterCategorySlug)) {
      throw new CollectionValidationError(`Unknown category “${input.filterCategorySlug}”.`);
    }
  }
}

async function loadMembers(collectionId: string): Promise<AdminCollectionMember[]> {
  const db = getDb();
  const primaryCategory = alias(categories, "primary_category");

  const rows = await db
    .select({
      id: apps.id,
      publicId: apps.publicId,
      name: apps.name,
      listingType: apps.listingType,
      categoryName: primaryCategory.name,
      iconObjectKey: appAssets.objectKey,
      author: apps.author,
      status: apps.status,
    })
    .from(collectionApps)
    .innerJoin(apps, eq(collectionApps.appId, apps.id))
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .leftJoin(appAssets, and(eq(appAssets.appId, apps.id), eq(appAssets.kind, "icon")))
    .where(eq(collectionApps.collectionId, collectionId))
    .orderBy(asc(collectionApps.sortOrder));

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    name: row.name,
    listingType: row.listingType,
    categoryName: row.categoryName,
    iconUrl: row.iconObjectKey ? publicUrl(row.iconObjectKey) : null,
    author: row.author,
    status: row.status,
  }));
}

async function toAdminDetail(row: CollectionRow): Promise<AdminCollectionDetail> {
  const preview = await resolveCollectionListings(
    toResolveInput(row),
    row.kind === "smart" ? (row.itemLimit ?? undefined) : undefined,
  );
  const members = row.kind === "editorial" ? await loadMembers(row.id) : [];
  const timestamps = serializeCollectionTimestamps(row);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    kind: row.kind,
    status: row.status,
    sortOrder: row.sortOrder,
    coverUrl: row.coverObjectKey ? publicUrl(row.coverObjectKey) : null,
    filterListingType: row.filterListingType,
    filterCategorySlug: row.filterCategorySlug,
    smartSort: row.smartSort,
    itemLimit: row.itemLimit,
    ...timestamps,
    publishedButEmpty: row.status === "published" && preview.length === 0,
    members,
    preview,
    previewCount: preview.length,
  };
}

/**
 * Revalidate public surfaces that may show this collection.
 * Category/type filtered hubs also call listPublishedShelves only on the unfiltered `/apps`.
 */
export function revalidateCollectionSurfaces(slug: string, collectionId?: string): void {
  revalidatePath("/");
  revalidatePath("/apps");
  revalidatePath(`/apps/collections/${slug}`);
  revalidatePath("/padme/collections");
  if (collectionId) {
    revalidatePath(`/padme/collections/${collectionId}`);
  }
}

export async function listCollectionsForAdmin(): Promise<AdminCollectionListItem[]> {
  const db = getDb();
  const rows = await db.select().from(collections).orderBy(asc(collections.sortOrder));

  const items = await Promise.all(
    rows.map(async (row) => {
      const itemCount = await countCollectionListings(toResolveInput(row));
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        status: row.status,
        sortOrder: row.sortOrder,
        itemCount,
        updatedAt: row.updatedAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        publishedButEmpty: row.status === "published" && itemCount === 0,
      } satisfies AdminCollectionListItem;
    }),
  );

  return items;
}

export async function getCollectionForAdmin(id: string): Promise<AdminCollectionDetail | null> {
  const db = getDb();
  const rows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return toAdminDetail(row);
}

export async function createCollection(
  input: CreateCollectionInput,
): Promise<AdminCollectionDetail> {
  await assertSlugAvailable(input.slug);

  const db = getDb();
  const maxOrder = await db
    .select({ max: sql<number | null>`max(${collections.sortOrder})` })
    .from(collections);
  const nextOrder = (maxOrder[0]?.max ?? -1) + 1;
  const smartDefaults = defaultSmartFields(input.kind);
  const now = new Date();

  const inserted = await db
    .insert(collections)
    .values({
      slug: input.slug,
      name: input.name,
      kind: input.kind,
      status: "draft",
      sortOrder: nextOrder,
      ...smartDefaults,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new CollectionValidationError("Failed to create collection.");
  }

  revalidateCollectionSurfaces(row.slug, row.id);
  return toAdminDetail(row);
}

async function assertPublishable(row: CollectionRow): Promise<void> {
  if (!row.name.trim() || !row.slug.trim()) {
    throw new CollectionValidationError("Name and slug are required to publish.");
  }

  if (row.kind === "editorial") {
    const listings = await resolveCollectionListings(toResolveInput(row));
    if (listings.length === 0) {
      throw new CollectionValidationError(
        "Editorial collections need at least one published member before publishing.",
      );
    }
    return;
  }

  assertSmartFilterCombo({
    filterListingType: row.filterListingType,
    filterCategorySlug: row.filterCategorySlug,
    smartSort: row.smartSort,
    itemLimit: row.itemLimit,
  });

  const listings = await resolveCollectionListings(toResolveInput(row));
  if (listings.length === 0) {
    throw new CollectionValidationError(
      "Smart collection resolves no published apps with the current filters.",
    );
  }
}

export async function updateCollection(
  id: string,
  patch: UpdateCollectionInput,
): Promise<AdminCollectionDetail> {
  const db = getDb();
  const existingRows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  const existing = existingRows[0];
  if (!existing) {
    throw new CollectionNotFoundError();
  }

  if (patch.slug && patch.slug !== existing.slug) {
    await assertSlugAvailable(patch.slug, existing.id);
  }

  const nextKind = existing.kind;
  const nextFilterListingType =
    nextKind === "smart"
      ? patch.filterListingType !== undefined
        ? patch.filterListingType
        : existing.filterListingType
      : null;
  const nextFilterCategorySlug =
    nextKind === "smart"
      ? patch.filterCategorySlug !== undefined
        ? patch.filterCategorySlug
        : existing.filterCategorySlug
      : null;
  const nextSmartSort =
    nextKind === "smart"
      ? patch.smartSort !== undefined
        ? patch.smartSort
        : existing.smartSort
      : null;
  const nextItemLimit =
    nextKind === "smart"
      ? patch.itemLimit !== undefined
        ? patch.itemLimit
        : existing.itemLimit
      : null;

  if (nextKind === "smart") {
    assertSmartFilterCombo({
      filterListingType: nextFilterListingType,
      filterCategorySlug: nextFilterCategorySlug,
      smartSort: nextSmartSort,
      itemLimit: nextItemLimit,
    });
  } else if (
    patch.filterListingType !== undefined ||
    patch.filterCategorySlug !== undefined ||
    patch.smartSort !== undefined ||
    patch.itemLimit !== undefined
  ) {
    throw new CollectionValidationError("Editorial collections do not accept smart filters.");
  }

  const nextStatus = patch.status ?? existing.status;
  const now = new Date();
  let publishedAt = existing.publishedAt;

  const candidate: CollectionRow = {
    ...existing,
    name: patch.name ?? existing.name,
    slug: patch.slug ?? existing.slug,
    description: patch.description !== undefined ? patch.description : existing.description,
    filterListingType: nextFilterListingType,
    filterCategorySlug: nextFilterCategorySlug,
    smartSort: nextSmartSort,
    itemLimit: nextItemLimit,
    status: nextStatus,
  };

  if (nextStatus === "published") {
    await assertPublishable(candidate);
    if (existing.status !== "published") {
      publishedAt = existing.publishedAt ?? now;
    }
  }

  const updated = await db
    .update(collections)
    .set({
      name: candidate.name,
      slug: candidate.slug,
      description: candidate.description,
      status: nextStatus,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
      filterListingType: nextFilterListingType,
      filterCategorySlug: nextFilterCategorySlug,
      smartSort: nextSmartSort,
      itemLimit: nextItemLimit,
      publishedAt,
      updatedAt: now,
    })
    .where(eq(collections.id, existing.id))
    .returning();

  const row = updated[0];
  if (!row) {
    throw new CollectionNotFoundError();
  }

  revalidateCollectionSurfaces(row.slug, row.id);
  if (existing.slug !== row.slug) {
    revalidateCollectionSurfaces(existing.slug, existing.id);
  }
  return toAdminDetail(row);
}

export async function reorderCollections(orderedIds: string[]): Promise<AdminCollectionListItem[]> {
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length) {
    throw new CollectionValidationError("Reorder list contains duplicate ids.");
  }

  const db = getDb();
  const existing = await db.select({ id: collections.id }).from(collections);
  if (existing.length !== orderedIds.length) {
    throw new CollectionValidationError("Reorder list must include every collection exactly once.");
  }
  const existingIds = new Set(existing.map((row) => row.id));
  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw new CollectionValidationError(`Unknown collection id “${id}”.`);
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index];
      if (!id) continue;
      await tx
        .update(collections)
        .set({ sortOrder: index, updatedAt: now })
        .where(eq(collections.id, id));
    }
  });

  revalidatePath("/");
  revalidatePath("/apps");
  revalidatePath("/padme/collections");
  return listCollectionsForAdmin();
}

export async function deleteCollection(id: string): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new CollectionNotFoundError();
  }
  if (row.status !== "draft") {
    throw new CollectionValidationError("Only draft collections can be deleted.");
  }

  await db.delete(collections).where(eq(collections.id, id));
  revalidateCollectionSurfaces(row.slug, row.id);
}

export async function replaceCollectionMembers(
  id: string,
  orderedAppIds: string[],
): Promise<AdminCollectionDetail> {
  const unique = new Set(orderedAppIds);
  if (unique.size !== orderedAppIds.length) {
    throw new CollectionValidationError("Membership list contains duplicate apps.");
  }

  const db = getDb();
  const existingRows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  const existing = existingRows[0];
  if (!existing) {
    throw new CollectionNotFoundError();
  }
  if (existing.kind !== "editorial") {
    throw new CollectionValidationError("Only editorial collections have membership.");
  }

  if (orderedAppIds.length > 0) {
    const published = await db
      .select({ id: apps.id })
      .from(apps)
      .where(and(inArray(apps.id, orderedAppIds), eq(apps.status, "published")));
    if (published.length !== orderedAppIds.length) {
      throw new CollectionValidationError(
        "All members must be published apps. Remove unpublished or unknown ids.",
      );
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(collectionApps).where(eq(collectionApps.collectionId, existing.id));
    if (orderedAppIds.length > 0) {
      await tx.insert(collectionApps).values(
        orderedAppIds.map((appId, index) => ({
          collectionId: existing.id,
          appId,
          sortOrder: index,
          createdAt: now,
        })),
      );
    }
    await tx.update(collections).set({ updatedAt: now }).where(eq(collections.id, existing.id));
  });

  // Published + empty membership stays published; public resolver omits empty shelves.
  revalidateCollectionSurfaces(existing.slug, existing.id);
  const detail = await getCollectionForAdmin(existing.id);
  if (!detail) {
    throw new CollectionNotFoundError();
  }
  return detail;
}
