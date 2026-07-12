import { NextResponse } from "next/server";

import { appAssetKinds, type AppAssetKind } from "@/db/schema";
import { isAllowedContentTypeForKind, sanitizeAssetFilename } from "@/lib/apps/asset-limits";
import { appAssetObjectKey } from "@/lib/apps/asset-keys";
import { getAppById } from "@/lib/apps/assets";
import { presignPut, publicUrl } from "@/lib/r2";

type PresignBody = {
  appId?: string;
  kind?: AppAssetKind;
  filename?: string;
  contentType?: string;
};

export async function POST(request: Request) {
  let body: PresignBody;
  try {
    body = (await request.json()) as PresignBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { appId, kind, filename, contentType } = body;

  if (!appId || !kind || !filename || !contentType) {
    return NextResponse.json(
      { error: "appId, kind, filename, and contentType are required" },
      { status: 400 },
    );
  }

  if (!appAssetKinds.includes(kind)) {
    return NextResponse.json({ error: "kind must be icon, screenshot, or video" }, { status: 400 });
  }

  if (!isAllowedContentTypeForKind(kind, contentType)) {
    return NextResponse.json(
      {
        error:
          kind === "video"
            ? "contentType must be video/mp4"
            : "contentType must be image/jpeg, image/png, or image/webp",
      },
      { status: 400 },
    );
  }

  if (!sanitizeAssetFilename(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const app = await getAppById(appId);
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const objectKey = appAssetObjectKey(app.id, kind, filename);
  const uploadUrl = await presignPut(objectKey, contentType);

  return NextResponse.json({
    uploadUrl,
    objectKey,
    publicUrl: publicUrl(objectKey),
  });
}
