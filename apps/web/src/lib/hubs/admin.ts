import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { hubs, type HubStatus } from "@/db/schema";
import { deleteObject } from "@/lib/r2";

import {
  DraftNotFoundError,
  DraftValidationError,
  getDraftHubById,
  getDraftHubDetail,
  type DraftHubDetail,
  type DraftHubRow,
} from "./draft";
import { draftHubPatchSchema, slugifyName } from "./draft-schema";

async function revalidateAfterAdminMutation(wasOrIsPublished: boolean) {
  revalidatePath("/padme");
  if (!wasOrIsPublished) return;
  revalidatePath("/hubs");
  revalidatePath("/");
}

export async function touchHubLogoForAdmin(hubId: string): Promise<void> {
  const existing = await getHubForAdmin(hubId);
  if (!existing) return;

  const db = getDb();
  await db.update(hubs).set({ updatedAt: new Date() }).where(eq(hubs.id, existing.id));
  await revalidateAfterAdminMutation(existing.status === "published");
}

export const adminListStatuses = ["draft", "pending", "published", "rejected"] as const;
export type AdminListStatus = (typeof adminListStatuses)[number];

const adminMutableStatuses = ["pending", "published", "rejected"] as const;
type AdminMutableStatus = (typeof adminMutableStatuses)[number];

const adminViewableStatuses = ["draft", "pending", "published", "rejected"] as const;
type AdminViewableStatus = (typeof adminViewableStatuses)[number];

export const adminHubPatchSchema = draftHubPatchSchema.extend({
  status: z.enum(adminMutableStatuses).optional(),
  reviewerNotes: z
    .union([z.string().trim().max(4000), z.null()])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type AdminHubPatch = z.infer<typeof adminHubPatchSchema>;

export type AdminListFilter = { status: AdminListStatus } | { recent: true };

export type AdminListItem = {
  id: string;
  publicId: string;
  slug: string;
  name: string;
  homepage: string;
  contactEmail: string;
  status: HubStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

function isAdminMutableStatus(status: HubStatus): status is AdminMutableStatus {
  return (adminMutableStatuses as readonly string[]).includes(status);
}

function isAdminViewableStatus(status: HubStatus): status is AdminViewableStatus {
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

export function serializeAdminHub(row: DraftHubRow) {
  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    homepage: row.homepage,
    launchUrl: row.launchUrl,
    logoObjectKey: row.logoObjectKey,
    contactEmail: row.contactEmail,
    status: row.status,
    reviewerNotes: row.reviewerNotes,
    ...serializeTimestamps(row),
  };
}

export type AdminHubDto = ReturnType<typeof serializeAdminHub>;

export function serializeAdminDetail(detail: DraftHubDetail) {
  return {
    ...serializeAdminHub(detail),
    logoUrl: detail.logoUrl,
  };
}

export type AdminDetailDto = ReturnType<typeof serializeAdminDetail>;

export async function listHubsForAdmin(filter: AdminListFilter): Promise<AdminListItem[]> {
  const db = getDb();

  const conditions =
    "recent" in filter
      ? [inArray(hubs.status, ["published", "rejected"]), isNotNull(hubs.reviewedAt)]
      : [eq(hubs.status, filter.status)];

  const orderBy =
    "recent" in filter
      ? desc(hubs.reviewedAt)
      : filter.status === "pending"
        ? desc(hubs.submittedAt)
        : desc(hubs.updatedAt);

  const rows = await db
    .select({
      id: hubs.id,
      publicId: hubs.publicId,
      slug: hubs.slug,
      name: hubs.name,
      homepage: hubs.homepage,
      contactEmail: hubs.contactEmail,
      status: hubs.status,
      submittedAt: hubs.submittedAt,
      reviewedAt: hubs.reviewedAt,
      publishedAt: hubs.publishedAt,
      updatedAt: hubs.updatedAt,
    })
    .from(hubs)
    .where(and(...conditions))
    .orderBy(orderBy);

  return rows.map((row) => ({
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    homepage: row.homepage,
    contactEmail: row.contactEmail,
    status: row.status,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getHubForAdmin(hubId: string): Promise<DraftHubDetail | null> {
  const detail = await getDraftHubDetail(hubId);
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

export async function updateHubForAdmin(hubId: string, patch: AdminHubPatch): Promise<DraftHubRow> {
  const existing = await getDraftHubById(hubId);
  if (!existing) {
    throw new DraftNotFoundError();
  }
  if (!isAdminViewableStatus(existing.status)) {
    throw new DraftValidationError(
      "Only draft, pending, published, or rejected hubs can be updated.",
    );
  }

  const name = patch.name ?? existing.name;
  const nextFields = {
    name,
    homepage: patch.homepage ?? existing.homepage,
    contactEmail: patch.contactEmail ?? existing.contactEmail,
    slug: slugifyName(name),
    launchUrl: patch.launchUrl ?? existing.launchUrl,
    description: patch.description !== undefined ? patch.description : existing.description,
    reviewerNotes: patch.reviewerNotes !== undefined ? patch.reviewerNotes : existing.reviewerNotes,
  };

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
  const rows = await db
    .update(hubs)
    .set({
      ...nextFields,
      ...statusColumns,
      updatedAt: now,
    })
    .where(eq(hubs.id, existing.id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new DraftNotFoundError();
  }

  await revalidateAfterAdminMutation(existing.status === "published" || row.status === "published");

  return row;
}

export async function deleteHubForAdmin(hubId: string): Promise<void> {
  const existing = await getDraftHubById(hubId);
  if (!existing) {
    throw new DraftNotFoundError();
  }
  if (!isAdminViewableStatus(existing.status)) {
    throw new DraftValidationError(
      "Only draft, pending, published, or rejected hubs can be deleted.",
    );
  }

  if (existing.logoObjectKey) {
    await deleteObject(existing.logoObjectKey).catch(() => undefined);
  }

  const db = getDb();
  await db.delete(hubs).where(eq(hubs.id, existing.id));

  await revalidateAfterAdminMutation(existing.status === "published");
}
