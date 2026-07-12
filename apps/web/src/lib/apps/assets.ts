import { and, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appAssets, apps, type AppAssetKind } from "@/db/schema";
import { isPublicId } from "@/lib/apps/public-id";
import { deleteObject } from "@/lib/r2";

import { MAX_PREVIEWS_PER_APP, MAX_SCREENSHOTS_PER_APP } from "./asset-limits";

export async function getAppById(appId: string) {
  const db = getDb();
  if (isPublicId(appId)) {
    const byPublic = await db.select().from(apps).where(eq(apps.publicId, appId)).limit(1);
    return byPublic[0];
  }
  const rows = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
  return rows[0];
}

export async function countAppAssets(appId: string, kind: AppAssetKind): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ value: count() })
    .from(appAssets)
    .where(and(eq(appAssets.appId, appId), eq(appAssets.kind, kind)));
  return rows[0]?.value ?? 0;
}

export async function deleteAppAssetsByKind(appId: string, kind: AppAssetKind) {
  const db = getDb();
  const existing = await db
    .select()
    .from(appAssets)
    .where(and(eq(appAssets.appId, appId), eq(appAssets.kind, kind)));

  for (const asset of existing) {
    await deleteObject(asset.objectKey).catch(() => undefined);
  }

  if (existing.length > 0) {
    await db.delete(appAssets).where(and(eq(appAssets.appId, appId), eq(appAssets.kind, kind)));
  }
}

/** Icon and video are replace-in-place (max 1); screenshots accumulate up to the cap. */
export async function canAddAsset(appId: string, kind: AppAssetKind): Promise<boolean> {
  switch (kind) {
    case "icon":
      return (await countAppAssets(appId, "icon")) === 0;
    case "video":
      return (await countAppAssets(appId, "video")) < MAX_PREVIEWS_PER_APP;
    case "screenshot":
      return (await countAppAssets(appId, "screenshot")) < MAX_SCREENSHOTS_PER_APP;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export async function insertAppAsset(input: {
  appId: string;
  kind: AppAssetKind;
  objectKey: string;
  sortOrder?: number;
  width?: number;
  height?: number;
  durationMs?: number;
}) {
  const db = getDb();
  const rows = await db
    .insert(appAssets)
    .values({
      appId: input.appId,
      kind: input.kind,
      objectKey: input.objectKey,
      sortOrder: input.sortOrder ?? 0,
      width: input.width,
      height: input.height,
      durationMs: input.durationMs,
    })
    .returning();

  return rows[0];
}

export async function getAppAssetById(assetId: string) {
  const db = getDb();
  const rows = await db.select().from(appAssets).where(eq(appAssets.id, assetId)).limit(1);
  return rows[0];
}

export async function deleteAppAsset(assetId: string) {
  const asset = await getAppAssetById(assetId);
  if (!asset) return null;

  await deleteObject(asset.objectKey).catch(() => undefined);
  const db = getDb();
  await db.delete(appAssets).where(eq(appAssets.id, assetId));
  return asset;
}
