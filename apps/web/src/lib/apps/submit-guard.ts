import { NextResponse } from "next/server";

import { getDraftAppById, type DraftAppRow } from "@/lib/apps/draft";
import {
  draftEditCookieName,
  readDraftEditTokenFromCookieHeader,
  verifyDraftEditToken,
} from "@/lib/apps/draft-edit-token";
import {
  SUBMIT_SESSION_COOKIE,
  isSubmitSessionConfigured,
  verifySubmitSessionValue,
} from "@/lib/apps/submit-session";

/** In-process rate limit buckets (per instance). Good enough for stub/presign abuse. */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function isEditableDraft(app: Pick<DraftAppRow, "status">): boolean {
  return app.status === "draft";
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Sliding fixed window. Returns a 429 response when over limit, else null.
 */
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

/** When Origin is present, require it to match this request's origin. */
export function originCheckOrNull(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const expected = new URL(request.url).origin;
  if (origin !== expected) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  return null;
}

/**
 * Require a valid submit-session cookie on mutating public `/api/apps/*`.
 * Fail closed when SUBMIT_SESSION_SECRET is unset.
 */
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

/**
 * Require ownership of a specific draft via its edit-token cookie.
 * Returns 404 (not 401/403) so private drafts are not enumerable.
 */
export async function requireDraftEditAccess(
  request: Request,
  appId: string,
): Promise<{ app: DraftAppRow } | { error: NextResponse }> {
  const app = await getDraftAppById(appId);
  if (!app) {
    return { error: NextResponse.json({ error: "App not found" }, { status: 404 }) };
  }

  const token = readDraftEditTokenFromCookieHeader(request.headers.get("cookie"), app.publicId);
  const ok = await verifyDraftEditToken(app.editTokenHash, token);
  if (!ok) {
    return { error: NextResponse.json({ error: "App not found" }, { status: 404 }) };
  }

  return { app };
}

/** Require draft ownership and reject mutations after submission. */
export async function requireEditableDraftAccess(
  request: Request,
  appId: string,
): Promise<{ app: DraftAppRow } | { error: NextResponse }> {
  const access = await requireDraftEditAccess(request, appId);
  if ("error" in access) return access;
  if (!isEditableDraft(access.app)) {
    return {
      error: NextResponse.json({ error: "Only draft apps can be changed" }, { status: 409 }),
    };
  }
  return access;
}

export { draftEditCookieName };
