import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { appAssets, apps, categories, type AppStatus, type ListingType } from "@/db/schema";
import { listingPath } from "@/lib/apps/public-id";
import { deleteObject } from "@/lib/r2";

import {
  DraftNotFoundError,
  DraftValidationError,
  assertCategoriesForListing,
  getDraftAppById,
  getDraftAppDetail,
  type DraftAppDetail,
  type DraftAppRow,
} from "./draft";
import { draftAppPatchSchema, slugifyName } from "./draft-schema";
import { rebuildAppSearchDocument } from "./search-index";

const primaryCategory = alias(categories, "primary_category");

/** Statuses the admin queue can filter. */
export const adminListStatuses = ["draft", "pending", "published", "rejected"] as const;
export type AdminListStatus = (typeof adminListStatuses)[number];

/** Statuses admin can transition between (not `draft` — use send-to-pending). */
const adminMutableStatuses = ["pending", "published", "rejected"] as const;
type AdminMutableStatus = (typeof adminMutableStatuses)[number];

const adminViewableStatuses = ["draft", "pending", "published", "rejected"] as const;
type AdminViewableStatus = (typeof adminViewableStatuses)[number];

export const adminAppPatchSchema = draftAppPatchSchema.extend({
  status: z.enum(adminMutableStatuses).optional(),
  reviewerNotes: z
    .union([z.string().trim().max(4000), z.null()])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type AdminAppPatch = z.infer<typeof adminAppPatchSchema>;

export type AdminListFilter = { status: AdminListStatus } | { recent: true };

export type AdminListItem = {
  id: string;
  publicId: string;
  slug: string;
  name: string;
  author: string;
  contactEmail: string;
  listingType: ListingType;
  status: AppStatus;
  categoryName: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

function isAdminMutableStatus(status: AppStatus): status is AdminMutableStatus {
  return (adminMutableStatuses as readonly string[]).includes(status);
}

function isAdminViewableStatus(status: AppStatus): status is AdminViewableStatus {
  return (adminViewableStatuses as readonly string[]).includes(status);
}

function serializeTimestamps(row: {
  submittedAt: Date | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeAdminApp(row: DraftAppRow) {
  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    author: row.author,
    contactEmail: row.contactEmail,
    description: row.description,
    launchUrl: row.launchUrl,
    listingType: row.listingType,
    primaryCategoryId: row.primaryCategoryId,
    secondaryCategoryId: row.secondaryCategoryId,
    targetDevice: row.targetDevice,
    status: row.status,
    reviewerNotes: row.reviewerNotes,
    ...serializeTimestamps(row),
  };
}

export type AdminAppDto = ReturnType<typeof serializeAdminApp>;

export function serializeAdminDetail(detail: DraftAppDetail) {
  return {
    ...serializeAdminApp(detail),
    assets: detail.assets,
  };
}

export type AdminDetailDto = ReturnType<typeof serializeAdminDetail>;

export async function listAppsForAdmin(filter: AdminListFilter): Promise<AdminListItem[]> {
  const db = getDb();

  const conditions =
    "recent" in filter
      ? [inArray(apps.status, ["published", "rejected"]), isNotNull(apps.reviewedAt)]
      : [eq(apps.status, filter.status)];

  const orderBy =
    "recent" in filter
      ? desc(apps.reviewedAt)
      : filter.status === "pending"
        ? desc(apps.submittedAt)
        : filter.status === "draft"
          ? desc(apps.updatedAt)
          : desc(apps.updatedAt);

  const rows = await db
    .select({
      id: apps.id,
      publicId: apps.publicId,
      slug: apps.slug,
      name: apps.name,
      author: apps.author,
      contactEmail: apps.contactEmail,
      listingType: apps.listingType,
      status: apps.status,
      categoryName: primaryCategory.name,
      submittedAt: apps.submittedAt,
      reviewedAt: apps.reviewedAt,
      publishedAt: apps.publishedAt,
      updatedAt: apps.updatedAt,
    })
    .from(apps)
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .where(and(...conditions))
    .orderBy(orderBy);

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    author: row.author,
    contactEmail: row.contactEmail,
    listingType: row.listingType,
    status: row.status,
    categoryName: row.categoryName,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

/** Queue detail — draft / pending / published / rejected. */
export async function getAppForAdmin(appId: string): Promise<DraftAppDetail | null> {
  const detail = await getDraftAppDetail(appId);
  if (!detail) return null;
  if (!isAdminViewableStatus(detail.status)) return null;
  return detail;
}

type StatusColumns = {
  status: AdminMutableStatus;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  submittedAt?: Date;
};

function statusColumnsForTransition(
  current: AdminViewableStatus,
  next: AdminMutableStatus,
  existingPublishedAt: Date | null,
  now: Date,
): StatusColumns {
  switch (next) {
    case "published":
      return {
        status: "published",
        reviewedAt: now,
        publishedAt: existingPublishedAt ?? now,
      };
    case "rejected":
      return {
        status: "rejected",
        reviewedAt: now,
        publishedAt: null,
      };
    case "pending":
      return {
        status: "pending",
        reviewedAt: null,
        publishedAt: null,
        ...(current === "draft" ? { submittedAt: now } : {}),
      };
    default: {
      const _exhaustive: never = next;
      return _exhaustive;
    }
  }
}

/**
 * Update metadata and/or status for draft / pending / published / rejected apps.
 * Sibling to draft-only `updateDraftApp`. Status may move draft → pending, or among
 * pending / published / rejected.
 */
export async function updateAppForAdmin(appId: string, patch: AdminAppPatch): Promise<DraftAppRow> {
  const existing = await getDraftAppById(appId);
  if (!existing) {
    throw new DraftNotFoundError();
  }
  if (!isAdminViewableStatus(existing.status)) {
    throw new DraftValidationError(
      "Only draft, pending, published, or rejected apps can be updated.",
    );
  }

  const name = patch.name ?? existing.name;
  const nextFields = {
    name,
    author: patch.author ?? existing.author,
    contactEmail: patch.contactEmail ?? existing.contactEmail,
    slug: slugifyName(name),
    launchUrl: patch.launchUrl ?? existing.launchUrl,
    listingType: patch.listingType ?? existing.listingType,
    primaryCategoryId: patch.primaryCategoryId ?? existing.primaryCategoryId,
    secondaryCategoryId:
      patch.secondaryCategoryId !== undefined
        ? patch.secondaryCategoryId
        : existing.secondaryCategoryId,
    description: patch.description !== undefined ? patch.description : existing.description,
    targetDevice: patch.targetDevice ?? existing.targetDevice,
    reviewerNotes: patch.reviewerNotes !== undefined ? patch.reviewerNotes : existing.reviewerNotes,
  };

  await assertCategoriesForListing({
    listingType: nextFields.listingType,
    primaryCategoryId: nextFields.primaryCategoryId,
    secondaryCategoryId: nextFields.secondaryCategoryId,
  });

  if (patch.status !== undefined && patch.status !== existing.status) {
    if (existing.status === "draft" && patch.status !== "pending") {
      throw new DraftValidationError("Drafts can only be sent to pending.");
    }
    if (existing.status !== "draft" && !isAdminMutableStatus(existing.status)) {
      throw new DraftValidationError("Invalid status transition.");
    }
  }

  const now = new Date();
  const statusColumns =
    patch.status !== undefined && patch.status !== existing.status
      ? statusColumnsForTransition(existing.status, patch.status, existing.publishedAt, now)
      : null;

  const db = getDb();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(apps)
      .set({
        ...nextFields,
        ...statusColumns,
        updatedAt: now,
      })
      .where(eq(apps.id, existing.id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new DraftNotFoundError();
    }

    await rebuildAppSearchDocument(tx, row.id);
    return row;
  });
}

/**
 * Permanently delete an app listing: R2 objects, FTS row, and the apps row
 * (cascades app_assets + collection_apps). Any Padme-viewable status.
 */
export async function deleteAppForAdmin(appId: string): Promise<void> {
  const existing = await getDraftAppById(appId);
  if (!existing) {
    throw new DraftNotFoundError();
  }
  if (!isAdminViewableStatus(existing.status)) {
    throw new DraftValidationError(
      "Only draft, pending, published, or rejected apps can be deleted.",
    );
  }

  const db = getDb();
  const assets = await db.select().from(appAssets).where(eq(appAssets.appId, existing.id));

  for (const asset of assets) {
    await deleteObject(asset.objectKey).catch(() => undefined);
  }

  await db.transaction(async (tx) => {
    await tx.run(sql`DELETE FROM app_search WHERE app_id = ${existing.id}`);
    await tx.delete(apps).where(eq(apps.id, existing.id));
  });

  revalidatePath("/apps");
  revalidatePath("/padme");
  if (existing.status === "published") {
    revalidatePath(listingPath(existing.slug, existing.publicId));
  }
}
