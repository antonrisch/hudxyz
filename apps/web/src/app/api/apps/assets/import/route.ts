import { NextResponse } from "next/server";
import { z } from "zod";

import { MAX_ICON_BYTES, sanitizeAssetFilename } from "@/lib/apps/asset-limits";
import { appAssetObjectKey } from "@/lib/apps/asset-keys";
import { saveDraftAsset } from "@/lib/apps/assets";
import { requireHumanOrNull } from "@/lib/apps/botid";
import { DraftConflictError } from "@/lib/apps/draft";
import { httpUrlSchema } from "@/lib/apps/http-url";
import { detectImageContentType, SafeFetchError, safeFetch } from "@/lib/apps/safe-fetch";
import {
  clientIp,
  rateLimitOrNull,
  requireEditableDraftAccess,
  requireSubmitSession,
} from "@/lib/apps/submit-guard";
import { deleteObject, publicUrl, putObject } from "@/lib/r2";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const bodySchema = z.object({
  appId: z.string().trim().min(1),
  kind: z.literal("icon"),
  url: httpUrlSchema("Enter a valid icon URL.", "Icon URL must start with http:// or https://"),
});

function filenameForIcon(sourceUrl: string, contentType: string): string {
  const ext = EXT_BY_CONTENT_TYPE[contentType] ?? "png";
  try {
    const pathname = new URL(sourceUrl).pathname;
    const base = pathname.split("/").pop() ?? "";
    const sanitized = sanitizeAssetFilename(base);
    if (sanitized) {
      const lastDot = sanitized.lastIndexOf(".");
      const stem = lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized;
      const id = crypto.randomUUID().slice(0, 8);
      return `${stem || "icon"}-${id}.${ext}`;
    }
  } catch {
    // fall through
  }
  return `icon-${crypto.randomUUID().slice(0, 8)}.${ext}`;
}

/**
 * Fetch a remote icon and register it on a draft (server-side; avoids CORS).
 * POST /api/apps/assets/import  body: `{ appId, kind: "icon", url }`
 */
export async function POST(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const limited = rateLimitOrNull(`asset-import:${clientIp(request)}`, 20, 60_000);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { appId, kind, url } = parsed.data;

  const access = await requireEditableDraftAccess(request, appId);
  if ("error" in access) return access.error;
  const app = access.app;

  let fetched;
  try {
    fetched = await safeFetch(url, {
      maxBytes: MAX_ICON_BYTES,
      accept: "image/png, image/jpeg, image/webp, image/*;q=0.8",
    });
  } catch (error) {
    if (error instanceof SafeFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  // Trust magic bytes over Content-Type (blocks SVG/ICO / spoofed headers).
  const contentType = detectImageContentType(fetched.body);
  if (!contentType) {
    return NextResponse.json(
      { error: "Icon must be JPEG, PNG, or WebP (SVG and ICO are not supported)." },
      { status: 400 },
    );
  }

  if (fetched.body.byteLength > MAX_ICON_BYTES) {
    return NextResponse.json({ error: "Icon must be 256 KB or smaller." }, { status: 400 });
  }

  const filename = filenameForIcon(fetched.url, contentType);
  const objectKey = appAssetObjectKey(app.id, kind, filename);

  await putObject(objectKey, fetched.body, contentType);

  let asset;
  try {
    asset = await saveDraftAsset({
      appId: app.id,
      kind,
      objectKey,
      sortOrder: 0,
    });
  } catch (error) {
    await deleteObject(objectKey).catch(() => undefined);
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
