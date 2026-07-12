import { NextResponse } from "next/server";

import {
  createStubDraft,
  DraftConflictError,
  DraftValidationError,
  serializeDraftApp,
} from "@/lib/apps/draft";

/**
 * Create a silent placeholder draft so media can upload before details are filled.
 * POST /api/apps  body: `{ "stub": true }`
 *
 * No auth in v1 (temporary — gate before public exposure).
 * Full create is not exposed; clients PATCH `/api/apps/[id]` after the stub exists.
 */
export async function POST(request: Request) {
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
    const app = await createStubDraft();
    return NextResponse.json(serializeDraftApp(app), { status: 201 });
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
