import { and, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appAssets, apps, type AppAssetKind } from "@/db/schema";
import { DraftConflictError } from "@/lib/apps/draft";
import { isPublicId } from "@/lib/apps/public-id";
import { deleteObject } from "@/lib/r2";

import { MAX_PREVIEWS_PER_APP, MAX_SCREENSHOTS_PER_APP } from "./asset-limits";

type AppAssetInput = {
  appId: string;
  kind: AppAssetKind;
  objectKey: string;
  sortOrder?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

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

export async function insertAppAsset(input: AppAssetInput) {
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

/**
 * Register public-submit media while holding a write lock across the draft
 * status check and asset mutation. R2 cleanup follows the committed DB write.
 */
export async function saveDraftAsset(input: AppAssetInput) {
  const staleObjectKeys: string[] = [];
  const db = getDb();
  const asset = await db.transaction(
    async (tx) => {
      const app = await tx
        .select({ status: apps.status })
        .from(apps)
        .where(eq(apps.id, input.appId))
        .limit(1);
      if (app[0]?.status !== "draft") {
        throw new DraftConflictError("Only draft apps can be changed.");
      }

      const existing = await tx
        .select()
        .from(appAssets)
        .where(and(eq(appAssets.appId, input.appId), eq(appAssets.kind, input.kind)));

      if (input.kind === "screenshot") {
        if (existing.length >= MAX_SCREENSHOTS_PER_APP) {
          throw new DraftConflictError("Screenshot limit reached.");
        }
      } else {
        staleObjectKeys.push(...existing.map((row) => row.objectKey));
        if (existing.length > 0) {
          await tx
            .delete(appAssets)
            .where(and(eq(appAssets.appId, input.appId), eq(appAssets.kind, input.kind)));
        }
      }

      const rows = await tx
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

      const row = rows[0];
      if (!row) throw new Error("Failed to register app asset");
      return row;
    },
    { behavior: "immediate" },
  );

  await Promise.all(staleObjectKeys.map((key) => deleteObject(key).catch(() => undefined)));
  return asset;
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

/** Atomically reject public-submit deletes once the app leaves draft status. */
export async function deleteDraftAsset(assetId: string, appId: string) {
  const db = getDb();
  const asset = await db.transaction(
    async (tx) => {
      const app = await tx
        .select({ status: apps.status })
        .from(apps)
        .where(eq(apps.id, appId))
        .limit(1);
      if (app[0]?.status !== "draft") {
        throw new DraftConflictError("Only draft apps can be changed.");
      }

      const rows = await tx
        .select()
        .from(appAssets)
        .where(and(eq(appAssets.id, assetId), eq(appAssets.appId, appId)))
        .limit(1);
      const row = rows[0];
      if (!row) return null;

      await tx.delete(appAssets).where(eq(appAssets.id, assetId));
      return row;
    },
    { behavior: "immediate" },
  );

  if (asset) await deleteObject(asset.objectKey).catch(() => undefined);
  return asset;
}
