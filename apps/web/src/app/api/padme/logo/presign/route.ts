import { NextResponse } from "next/server";

import { getHubForAdmin } from "@/lib/hubs/admin";
import { isAllowedLogoContentType, sanitizeLogoFilename } from "@/lib/hubs/logo-limits";
import { hubLogoObjectKey } from "@/lib/hubs/logo";
import { presignPut, publicUrl } from "@/lib/r2";

type PresignBody = {
  hubId?: string;
  filename?: string;
  contentType?: string;
};

/** POST /api/padme/logo/presign */
export async function POST(request: Request) {
  let body: PresignBody;
  try {
    body = (await request.json()) as PresignBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { hubId, filename, contentType } = body;

  if (!hubId || !filename || !contentType) {
    return NextResponse.json(
      { error: "hubId, filename, and contentType are required" },
      { status: 400 },
    );
  }

  if (!isAllowedLogoContentType(contentType)) {
    return NextResponse.json(
      { error: "contentType must be image/jpeg, image/png, or image/webp" },
      { status: 400 },
    );
  }

  if (!sanitizeLogoFilename(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const hub = await getHubForAdmin(hubId);
  if (!hub) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  const safeFilename = sanitizeLogoFilename(filename)!;
  const objectKey = hubLogoObjectKey(hub.id, safeFilename);
  const uploadUrl = await presignPut(objectKey, contentType);

  return NextResponse.json({
    uploadUrl,
    objectKey,
    publicUrl: publicUrl(objectKey),
  });
}
