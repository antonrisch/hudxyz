import { NextResponse } from "next/server";

import { appAssetKinds, type AppAssetKind } from "@/db/schema";
import { isValidPreviewDimensions, isValidPreviewDurationMs } from "@/lib/apps/asset-limits";
import { assertObjectKeyForApp } from "@/lib/apps/asset-keys";
import { canAddAsset, deleteAppAssetsByKind, getAppById, insertAppAsset } from "@/lib/apps/assets";
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

  if (!assertObjectKeyForApp(appId, objectKey, kind)) {
    return NextResponse.json({ error: "objectKey does not match app" }, { status: 400 });
  }

  const app = await getAppById(appId);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
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

  if (kind === "icon" || kind === "video") {
    await deleteAppAssetsByKind(appId, kind);
  } else if (!(await canAddAsset(appId, kind))) {
    return NextResponse.json({ error: "Screenshot limit reached" }, { status: 409 });
  }

  const asset = await insertAppAsset({
    appId,
    kind,
    objectKey,
    sortOrder,
    width,
    height,
    durationMs: kind === "video" ? durationMs : undefined,
  });

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
