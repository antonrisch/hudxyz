import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { hubs, type HubStatus } from "@/db/schema";
import { hashDraftEditToken, mintDraftEditToken } from "@/lib/hubs/draft-edit-token";
import { legal } from "@/lib/legal/config";
import { publicUrl } from "@/lib/r2";

import type { DraftHubFields, DraftHubPatch } from "./draft-schema";
import { slugifyName } from "./draft-schema";
import { generatePublicId, isPublicId } from "./public-id";

/**
 * Sentinels for silently created drafts (`POST /api/hubs` `{ stub: true }`).
 * Lets logo upload before the developer fills required fields.
 */
export const DRAFT_STUB_LAUNCH_URL = "https://hudxyz.com/.draft-placeholder";
export const DRAFT_STUB_HOMEPAGE = "https://hudxyz.com/.draft-placeholder";
export const DRAFT_STUB_CONTACT_EMAIL = "stub@hudxyz.com";

export function isDraftStub(hub: { launchUrl: string }): boolean {
  return hub.launchUrl === DRAFT_STUB_LAUNCH_URL;
}

export type DraftHubRow = typeof hubs.$inferSelect;

export type DraftHubDetail = DraftHubRow & {
  logoUrl: string | null;
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
  constructor(message = "Hub not found") {
    super(message);
    this.name = "DraftNotFoundError";
  }
}

async function mintUniquePublicId(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 8; attempt++) {
    const publicId = generatePublicId();
    const existing = await db
      .select({ id: hubs.id })
      .from(hubs)
      .where(eq(hubs.publicId, publicId))
      .limit(1);
    if (!existing[0]) return publicId;
  }
  throw new DraftConflictError("Could not allocate a public id. Try again.");
}

function serializeHub(row: DraftHubRow) {
  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    homepage: row.homepage,
    launchUrl: row.launchUrl,
    logoObjectKey: row.logoObjectKey,
    logoUrl: row.logoObjectKey ? publicUrl(row.logoObjectKey) : null,
    contactEmail: row.contactEmail,
    status: row.status,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeDraftHub(row: DraftHubRow) {
  return serializeHub(row);
}

export type DraftHubDto = ReturnType<typeof serializeDraftHub>;

export function serializeDraftDetail(detail: DraftHubDetail) {
  return serializeHub(detail);
}

export type DraftDetailDto = ReturnType<typeof serializeDraftDetail>;

/** Minimal draft so logo can upload before the developer fills the form. */
export async function createStubDraft(): Promise<{ hub: DraftHubRow; editToken: string }> {
  return createDraftHub({
    name: "Untitled",
    homepage: DRAFT_STUB_HOMEPAGE,
    contactEmail: DRAFT_STUB_CONTACT_EMAIL,
    launchUrl: DRAFT_STUB_LAUNCH_URL,
    description: null,
  });
}

export async function createDraftHub(
  input: DraftHubFields,
): Promise<{ hub: DraftHubRow; editToken: string }> {
  const publicId = await mintUniquePublicId();
  const slug = slugifyName(input.name);
  const editToken = mintDraftEditToken();
  const editTokenHash = await hashDraftEditToken(editToken);

  const db = getDb();
  const rows = await db
    .insert(hubs)
    .values({
      publicId,
      name: input.name,
      homepage: input.homepage,
      contactEmail: input.contactEmail,
      slug,
      launchUrl: input.launchUrl,
      description: input.description,
      status: "draft",
      editTokenHash,
    })
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create draft hub");
  }
  return { hub: row, editToken };
}

export async function updateDraftHub(hubId: string, patch: DraftHubPatch): Promise<DraftHubRow> {
  const existing = await getDraftHubById(hubId);
  if (!existing) {
    throw new DraftNotFoundError();
  }
  if (existing.status !== "draft") {
    throw new DraftValidationError("Only draft hubs can be updated.");
  }

  const name = patch.name ?? existing.name;
  const next = {
    name,
    homepage: patch.homepage ?? existing.homepage,
    contactEmail: patch.contactEmail ?? existing.contactEmail,
    slug: slugifyName(name),
    launchUrl: patch.launchUrl ?? existing.launchUrl,
    description: patch.description !== undefined ? patch.description : existing.description,
  };

  const db = getDb();
  const rows = await db
    .update(hubs)
    .set({
      ...next,
      updatedAt: new Date(),
    })
    .where(and(eq(hubs.id, existing.id), eq(hubs.status, "draft")))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new DraftConflictError("Draft changed or was already submitted.");
  }
  return row;
}

export async function getDraftHubById(hubId: string): Promise<DraftHubRow | undefined> {
  const db = getDb();
  if (isPublicId(hubId)) {
    const byPublic = await db.select().from(hubs).where(eq(hubs.publicId, hubId)).limit(1);
    return byPublic[0];
  }
  const rows = await db.select().from(hubs).where(eq(hubs.id, hubId)).limit(1);
  return rows[0];
}

export async function getDraftHubDetail(hubId: string): Promise<DraftHubDetail | null> {
  const hub = await getDraftHubById(hubId);
  if (!hub) return null;
  return {
    ...hub,
    logoUrl: hub.logoObjectKey ? publicUrl(hub.logoObjectKey) : null,
  };
}

export async function submitDraftHub(hubId: string, termsVersion: string): Promise<DraftHubRow> {
  if (termsVersion !== legal.termsVersion) {
    throw new DraftValidationError(
      "Please refresh and accept the current Terms of Service before submitting.",
    );
  }

  const detail = await getDraftHubDetail(hubId);
  if (!detail) {
    throw new DraftNotFoundError();
  }
  if (detail.status !== "draft") {
    throw new DraftValidationError("Only draft hubs can be submitted for review.");
  }

  const missing: string[] = [];
  if (!detail.name.trim() || isDraftStub(detail) || detail.name === "Untitled") {
    missing.push("name");
  }
  if (!detail.homepage.trim() || detail.homepage === DRAFT_STUB_HOMEPAGE) {
    missing.push("homepage");
  }
  if (!detail.contactEmail.trim() || detail.contactEmail === DRAFT_STUB_CONTACT_EMAIL) {
    missing.push("contactEmail");
  }
  if (!detail.launchUrl.trim() || isDraftStub(detail)) missing.push("launchUrl");
  if (!detail.logoObjectKey) missing.push("logo");

  if (missing.length > 0) {
    throw new DraftValidationError(`Missing required fields: ${missing.join(", ")}`);
  }

  const now = new Date();
  const db = getDb();
  const rows = await db
    .update(hubs)
    .set({
      slug: slugifyName(detail.name),
      status: "pending" satisfies HubStatus,
      termsVersion: legal.termsVersion,
      termsAcceptedAt: now,
      submittedAt: now,
      updatedAt: now,
    })
    .where(and(eq(hubs.id, detail.id), eq(hubs.status, "draft")))
    .returning();

  const row = rows[0];
  if (!row) {
    throw new DraftConflictError("Draft was already submitted.");
  }
  return row;
}
