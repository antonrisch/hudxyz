import { NextResponse } from "next/server";

import { requireHumanOrNull } from "@/lib/hubs/botid";
import { isAllowedLogoContentType, sanitizeLogoFilename } from "@/lib/hubs/logo-limits";
import { hubLogoObjectKey } from "@/lib/hubs/logo";
import {
  clientIp,
  rateLimitOrNull,
  requireEditableDraftAccess,
  requireSubmitSession,
} from "@/lib/hubs/submit-guard";
import { presignPut, publicUrl } from "@/lib/r2";

type PresignBody = {
  hubId?: string;
  filename?: string;
  contentType?: string;
};

/** POST /api/hubs/logo/presign */
export async function POST(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const limited = rateLimitOrNull(`presign:${clientIp(request)}`, 60, 60_000);
  if (limited) return limited;

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

  const access = await requireEditableDraftAccess(request, hubId);
  if ("error" in access) return access.error;

  const safeFilename = sanitizeLogoFilename(filename)!;
  const objectKey = hubLogoObjectKey(access.hub.id, safeFilename);
  const uploadUrl = await presignPut(objectKey, contentType);

  return NextResponse.json({
    uploadUrl,
    objectKey,
    publicUrl: publicUrl(objectKey),
  });
}
