import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appAssets, apps, categories, type AppStatus, type ListingType } from "@/db/schema";
import {
  ListingCategoryValidationError,
  validateListingCategories,
  type ResolvedCategory,
} from "@/lib/category/validate-listing-categories";
import { publicUrl } from "@/lib/r2";

import type { DraftAppFields, DraftAppPatch } from "./draft-schema";
import { slugifyName } from "./draft-schema";
import { generatePublicId, isPublicId } from "./public-id";

/**
 * Sentinels for silently created drafts (`POST /api/apps` `{ stub: true }`).
 * Lets media upload before the developer fills required fields. The form treats
 * these as empty; submit rejects them until replaced with real values.
 */
export const DRAFT_STUB_LAUNCH_URL = "https://hudxyz.com/.draft-placeholder";
export const DRAFT_STUB_CONTACT_EMAIL = "stub@hudxyz.com";

export function isDraftStub(app: { launchUrl: string }): boolean {
  return app.launchUrl === DRAFT_STUB_LAUNCH_URL;
}

export type DraftAppRow = typeof apps.$inferSelect;

export type DraftAssetSummary = {
  id: string;
  kind: (typeof appAssets.$inferSelect)["kind"];
  objectKey: string;
  publicUrl: string;
  sortOrder: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

export type DraftAppDetail = DraftAppRow & {
  assets: DraftAssetSummary[];
};

export class DraftValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftValidationError";
  }
}

export class DraftConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftConflictError";
  }
}

export class DraftNotFoundError extends Error {
  constructor(message = "App not found") {
    super(message);
    this.name = "DraftNotFoundError";
  }
}

export async function loadCategoriesById(): Promise<Map<string, ResolvedCategory>> {
  const db = getDb();
  const rows = await db
    .select({
      id: categories.id,
      listingType: categories.listingType,
      slug: categories.slug,
    })
    .from(categories);

  return new Map(rows.map((row) => [row.id, row]));
}

export async function listCategoriesForForm(): Promise<
  { id: string; listingType: ListingType; slug: string; name: string; sortOrder: number }[]
> {
  const db = getDb();
  return db
    .select({
      id: categories.id,
      listingType: categories.listingType,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .orderBy(asc(categories.listingType), asc(categories.sortOrder), asc(categories.name));
}

export async function assertCategoriesForListing(input: {
  listingType: ListingType;
  primaryCategoryId: string;
  secondaryCategoryId: string | null;
}) {
  const categoriesById = await loadCategoriesById();
  try {
    validateListingCategories(input, categoriesById);
  } catch (error) {
    if (error instanceof ListingCategoryValidationError) {
      throw new DraftValidationError(error.message);
    }
    throw error;
  }
}

async function mintUniquePublicId(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 8; attempt++) {
    const publicId = generatePublicId();
    const existing = await db
      .select({ id: apps.id })
      .from(apps)
      .where(eq(apps.publicId, publicId))
      .limit(1);
    if (!existing[0]) return publicId;
  }
  throw new DraftConflictError("Could not allocate a public id. Try again.");
}

function serializeApp(row: DraftAppRow) {
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
    submittedAt: row.submittedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeDraftApp(row: DraftAppRow) {
  return serializeApp(row);
}

export type DraftAppDto = ReturnType<typeof serializeDraftApp>;

export function serializeDraftDetail(detail: DraftAppDetail) {
  return {
    ...serializeApp(detail),
    assets: detail.assets,
  };
}

export type DraftDetailDto = ReturnType<typeof serializeDraftDetail>;

/** Minimal draft so media can upload before the developer fills the form. */
export async function createStubDraft(): Promise<DraftAppRow> {
  const db = getDb();
  const appCategories = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(eq(categories.listingType, "app"))
    .orderBy(asc(categories.sortOrder));

  // Neutral placeholder until review (or the submitter) sets a real category.
  const primaryCategoryId =
    appCategories.find((category) => category.slug === "utilities")?.id ?? appCategories[0]?.id;
  if (!primaryCategoryId) {
    throw new DraftValidationError("No categories seeded.");
  }

  return createDraftApp({
    name: "Untitled",
    author: "Unknown",
    contactEmail: DRAFT_STUB_CONTACT_EMAIL,
    launchUrl: DRAFT_STUB_LAUNCH_URL,
    listingType: "app",
    primaryCategoryId,
    secondaryCategoryId: null,
    description: null,
    targetDevice: "mrbd",
  });
}

export async function createDraftApp(input: DraftAppFields): Promise<DraftAppRow> {
  await assertCategoriesForListing({
    listingType: input.listingType,
    primaryCategoryId: input.primaryCategoryId,
    secondaryCategoryId: input.secondaryCategoryId,
  });

  const publicId = await mintUniquePublicId();
  const slug = slugifyName(input.name);

  const db = getDb();
  const rows = await db
    .insert(apps)
    .values({
      publicId,
      name: input.name,
      author: input.author,
      contactEmail: input.contactEmail,
      slug,
      launchUrl: input.launchUrl,
      listingType: input.listingType,
      primaryCategoryId: input.primaryCategoryId,
      secondaryCategoryId: input.secondaryCategoryId,
      description: input.description,
      targetDevice: input.targetDevice ?? "mrbd",
      status: "draft",
    })
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create draft app");
  }
  return row;
}

export async function updateDraftApp(appId: string, patch: DraftAppPatch): Promise<DraftAppRow> {
  const existing = await getDraftAppById(appId);
  if (!existing) {
    throw new DraftNotFoundError();
  }
  if (existing.status !== "draft") {
    throw new DraftValidationError("Only draft apps can be updated.");
  }

  const name = patch.name ?? existing.name;
  const next = {
    name,
    author: patch.author ?? existing.author,
    contactEmail: patch.contactEmail ?? existing.contactEmail,
    // Slug is always derived from the current name (not user-managed).
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
  };

  await assertCategoriesForListing({
    listingType: next.listingType,
    primaryCategoryId: next.primaryCategoryId,
    secondaryCategoryId: next.secondaryCategoryId,
  });

  const db = getDb();
  const rows = await db
    .update(apps)
    .set({
      ...next,
      updatedAt: new Date(),
    })
    .where(eq(apps.id, existing.id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new DraftNotFoundError();
  }
  return row;
}

export async function getDraftAppById(appId: string): Promise<DraftAppRow | undefined> {
  const db = getDb();
  if (isPublicId(appId)) {
    const byPublic = await db.select().from(apps).where(eq(apps.publicId, appId)).limit(1);
    return byPublic[0];
  }
  const rows = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
  return rows[0];
}

export async function getDraftAppDetail(appId: string): Promise<DraftAppDetail | null> {
  const app = await getDraftAppById(appId);
  if (!app) return null;

  const db = getDb();
  const assetRows = await db
    .select()
    .from(appAssets)
    .where(eq(appAssets.appId, app.id))
    .orderBy(asc(appAssets.kind), asc(appAssets.sortOrder), asc(appAssets.createdAt));

  return {
    ...app,
    assets: assetRows.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      objectKey: asset.objectKey,
      publicUrl: publicUrl(asset.objectKey),
      sortOrder: asset.sortOrder,
      width: asset.width,
      height: asset.height,
      durationMs: asset.durationMs,
    })),
  };
}

export async function submitDraftApp(appId: string): Promise<DraftAppRow> {
  const detail = await getDraftAppDetail(appId);
  if (!detail) {
    throw new DraftNotFoundError();
  }
  if (detail.status !== "draft") {
    throw new DraftValidationError("Only draft apps can be submitted for review.");
  }

  const missing: string[] = [];
  if (!detail.name.trim() || isDraftStub(detail) || detail.name === "Untitled") {
    missing.push("name");
  }
  if (!detail.author.trim() || detail.author === "Unknown") missing.push("author");
  if (!detail.contactEmail.trim() || detail.contactEmail === DRAFT_STUB_CONTACT_EMAIL) {
    missing.push("contactEmail");
  }
  if (!detail.launchUrl.trim() || isDraftStub(detail)) missing.push("launchUrl");
  if (!detail.primaryCategoryId) missing.push("primaryCategoryId");
  if (!detail.assets.some((asset) => asset.kind === "icon")) missing.push("icon");

  if (missing.length > 0) {
    throw new DraftValidationError(`Missing required fields: ${missing.join(", ")}`);
  }

  await assertCategoriesForListing({
    listingType: detail.listingType,
    primaryCategoryId: detail.primaryCategoryId,
    secondaryCategoryId: detail.secondaryCategoryId,
  });

  const now = new Date();
  const db = getDb();
  const rows = await db
    .update(apps)
    .set({
      // Finalize SEO crumb from the submitted name.
      slug: slugifyName(detail.name),
      status: "pending" satisfies AppStatus,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(apps.id, detail.id))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new DraftNotFoundError();
  }
  return row;
}
