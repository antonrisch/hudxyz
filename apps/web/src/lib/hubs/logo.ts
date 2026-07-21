import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { hubs } from "@/db/schema";
import { deleteObject, publicUrl } from "@/lib/r2";

import {
  DraftNotFoundError,
  DraftValidationError,
  getDraftHubById,
  type DraftHubRow,
} from "./draft";
import { sanitizeLogoFilename } from "./logo-limits";

export function hubLogoObjectKey(hubId: string, filename: string): string {
  return `hubs/${hubId}/logo/${filename}`;
}

export function assertObjectKeyForHub(hubId: string, objectKey: string): boolean {
  return objectKey.startsWith(`hubs/${hubId}/logo/`);
}

export async function getHubById(hubId: string): Promise<DraftHubRow | undefined> {
  return getDraftHubById(hubId);
}

/** Draft-only: set or replace logo object key; deletes previous R2 object. */
export async function saveDraftLogo(input: {
  hubId: string;
  objectKey: string;
}): Promise<{ logoObjectKey: string; logoUrl: string }> {
  const hub = await getDraftHubById(input.hubId);
  if (!hub) throw new DraftNotFoundError();
  if (hub.status !== "draft") {
    throw new DraftValidationError("Only draft hubs can change their logo.");
  }
  if (!assertObjectKeyForHub(hub.id, input.objectKey)) {
    throw new DraftValidationError("Invalid logo object key.");
  }

  const previous = hub.logoObjectKey;
  const db = getDb();
  await db
    .update(hubs)
    .set({ logoObjectKey: input.objectKey, updatedAt: new Date() })
    .where(eq(hubs.id, hub.id));

  if (previous && previous !== input.objectKey) {
    await deleteObject(previous).catch(() => undefined);
  }

  return { logoObjectKey: input.objectKey, logoUrl: publicUrl(input.objectKey) };
}

export async function deleteDraftLogo(hubId: string): Promise<void> {
  const hub = await getDraftHubById(hubId);
  if (!hub) throw new DraftNotFoundError();
  if (hub.status !== "draft") {
    throw new DraftValidationError("Only draft hubs can change their logo.");
  }
  if (!hub.logoObjectKey) return;

  const key = hub.logoObjectKey;
  const db = getDb();
  await db
    .update(hubs)
    .set({ logoObjectKey: null, updatedAt: new Date() })
    .where(eq(hubs.id, hub.id));
  await deleteObject(key).catch(() => undefined);
}

/** Admin path: set logo without draft-status check. */
export async function setHubLogoForAdmin(input: {
  hubId: string;
  objectKey: string;
}): Promise<{ logoObjectKey: string; logoUrl: string }> {
  const hub = await getDraftHubById(input.hubId);
  if (!hub) throw new DraftNotFoundError();
  if (!assertObjectKeyForHub(hub.id, input.objectKey)) {
    throw new DraftValidationError("Invalid logo object key.");
  }

  const previous = hub.logoObjectKey;
  const db = getDb();
  await db
    .update(hubs)
    .set({ logoObjectKey: input.objectKey, updatedAt: new Date() })
    .where(eq(hubs.id, hub.id));

  if (previous && previous !== input.objectKey) {
    await deleteObject(previous).catch(() => undefined);
  }

  return { logoObjectKey: input.objectKey, logoUrl: publicUrl(input.objectKey) };
}

export async function clearHubLogoForAdmin(hubId: string): Promise<void> {
  const hub = await getDraftHubById(hubId);
  if (!hub) throw new DraftNotFoundError();
  if (!hub.logoObjectKey) return;

  const key = hub.logoObjectKey;
  const db = getDb();
  await db
    .update(hubs)
    .set({ logoObjectKey: null, updatedAt: new Date() })
    .where(eq(hubs.id, hub.id));
  await deleteObject(key).catch(() => undefined);
}

export { sanitizeLogoFilename };
