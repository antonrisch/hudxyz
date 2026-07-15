import { NextResponse } from "next/server";

import {
  createStubDraft,
  DraftConflictError,
  DraftValidationError,
  serializeDraftApp,
} from "@/lib/apps/draft";
import { draftEditCookieOptions, draftEditCookieName } from "@/lib/apps/draft-edit-token";
import { clientIp, rateLimitOrNull, requireSubmitSession } from "@/lib/apps/submit-guard";
import { requireHumanOrNull } from "@/lib/apps/botid";

/**
 * Create a silent placeholder draft so media can upload before details are filled.
 * POST /api/apps  body: `{ "stub": true }`
 */
export async function POST(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const limited = rateLimitOrNull(`stub:${clientIp(request)}`, 20, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isStub =
    typeof body === "object" &&
    body !== null &&
    "stub" in body &&
    (body as { stub?: unknown }).stub === true;

  if (!isStub) {
    return NextResponse.json(
      { error: "Expected { stub: true }. Create a stub, then PATCH the draft." },
      { status: 400 },
    );
  }

  try {
    const { app, editToken } = await createStubDraft();
    const response = NextResponse.json(serializeDraftApp(app), { status: 201 });
    response.cookies.set(
      draftEditCookieName(app.publicId),
      editToken,
      draftEditCookieOptions(process.env.NODE_ENV === "production"),
    );
    return response;
  } catch (error) {
    if (error instanceof DraftValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof DraftConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
