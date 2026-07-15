import { NextResponse } from "next/server";

import { appAssetKinds, type AppAssetKind } from "@/db/schema";
import { appsMedia } from "@/flags";
import { isValidPreviewDimensions, isValidPreviewDurationMs } from "@/lib/apps/asset-limits";
import { assertObjectKeyForApp } from "@/lib/apps/asset-keys";
import { saveDraftAsset } from "@/lib/apps/assets";
import { requireHumanOrNull } from "@/lib/apps/botid";
import { DraftConflictError } from "@/lib/apps/draft";
import { isAppsMediaKind } from "@/lib/apps/media-policy";
import { requireEditableDraftAccess, requireSubmitSession } from "@/lib/apps/submit-guard";
import { publicUrl } from "@/lib/r2";

type RegisterBody = {
  appId?: string;
  kind?: AppAssetKind;
  objectKey?: string;
  sortOrder?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export async function POST(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { appId, kind, objectKey, sortOrder, width, height, durationMs } = body;

  if (!appId || !kind || !objectKey) {
    return NextResponse.json({ error: "appId, kind, and objectKey are required" }, { status: 400 });
  }

  if (!appAssetKinds.includes(kind)) {
    return NextResponse.json({ error: "kind must be icon, screenshot, or video" }, { status: 400 });
  }

  if (isAppsMediaKind(kind) && !(await appsMedia())) {
    return NextResponse.json(
      { error: "Screenshot and preview video uploads are temporarily disabled" },
      { status: 403 },
    );
  }

  const access = await requireEditableDraftAccess(request, appId);
  if ("error" in access) return access.error;
  const app = access.app;

  if (!assertObjectKeyForApp(app.id, objectKey, kind)) {
    return NextResponse.json({ error: "objectKey does not match app" }, { status: 400 });
  }

  if (kind === "video") {
    if (durationMs !== undefined && !isValidPreviewDurationMs(durationMs)) {
      return NextResponse.json(
        { error: "video duration must be between 5 and 30 seconds" },
        { status: 400 },
      );
    }
    if (width !== undefined && height !== undefined && !isValidPreviewDimensions(width, height)) {
      return NextResponse.json(
        { error: "video dimensions must be between 1 and 1920 on each edge" },
        { status: 400 },
      );
    }
  }

  let asset;
  try {
    asset = await saveDraftAsset({
      appId: app.id,
      kind,
      objectKey,
      sortOrder,
      width,
      height,
      durationMs: kind === "video" ? durationMs : undefined,
    });
  } catch (error) {
    if (error instanceof DraftConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({
    id: asset.id,
    kind: asset.kind,
    objectKey: asset.objectKey,
    publicUrl: publicUrl(asset.objectKey),
    sortOrder: asset.sortOrder,
    width: asset.width,
    height: asset.height,
    durationMs: asset.durationMs,
  });
}
