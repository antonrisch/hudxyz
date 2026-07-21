import { NextResponse } from "next/server";

import { getDraftHubById, type DraftHubRow } from "@/lib/hubs/draft";
import {
  draftEditCookieName,
  readDraftEditTokenFromCookieHeader,
  verifyDraftEditToken,
} from "@/lib/hubs/draft-edit-token";
import {
  SUBMIT_SESSION_COOKIE,
  isSubmitSessionConfigured,
  verifySubmitSessionValue,
} from "@/lib/hubs/submit-session";

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function isEditableDraft(hub: Pick<DraftHubRow, "status">): boolean {
  return hub.status === "draft";
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitOrNull(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  existing.count += 1;
  if (existing.count > limit) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}

export function originCheckOrNull(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const expected = new URL(request.url).origin;
  if (origin !== expected) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  return null;
}

export async function requireSubmitSession(request: Request): Promise<NextResponse | null> {
  if (!isSubmitSessionConfigured()) {
    return NextResponse.json({ error: "Submit is not configured" }, { status: 503 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SUBMIT_SESSION_COOKIE}=`));
  const value = match?.slice(SUBMIT_SESSION_COOKIE.length + 1);

  if (!(await verifySubmitSessionValue(value))) {
    return NextResponse.json({ error: "Submit session required" }, { status: 401 });
  }

  return originCheckOrNull(request);
}

export async function requireDraftEditAccess(
  request: Request,
  hubId: string,
): Promise<{ hub: DraftHubRow } | { error: NextResponse }> {
  const hub = await getDraftHubById(hubId);
  if (!hub) {
    return { error: NextResponse.json({ error: "Hub not found" }, { status: 404 }) };
  }

  const token = readDraftEditTokenFromCookieHeader(request.headers.get("cookie"), hub.publicId);
  const ok = await verifyDraftEditToken(hub.editTokenHash, token);
  if (!ok) {
    return { error: NextResponse.json({ error: "Hub not found" }, { status: 404 }) };
  }

  return { hub };
}

export async function requireEditableDraftAccess(
  request: Request,
  hubId: string,
): Promise<{ hub: DraftHubRow } | { error: NextResponse }> {
  const access = await requireDraftEditAccess(request, hubId);
  if ("error" in access) return access;
  if (!isEditableDraft(access.hub)) {
    return {
      error: NextResponse.json({ error: "Only draft hubs can be changed" }, { status: 409 }),
    };
  }
  return access;
}

export { draftEditCookieName };
