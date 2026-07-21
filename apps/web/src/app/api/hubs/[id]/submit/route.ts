import { NextResponse } from "next/server";

import {
  DraftConflictError,
  DraftNotFoundError,
  DraftValidationError,
  serializeDraftHub,
  submitDraftHub,
} from "@/lib/hubs/draft";
import { requireHumanOrNull } from "@/lib/hubs/botid";
import { requireEditableDraftAccess, requireSubmitSession } from "@/lib/hubs/submit-guard";
import { submitTermsAcceptanceSchema } from "@/lib/legal/terms-acceptance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Submit a draft for review: draft → pending.
 * POST /api/hubs/[id]/submit
 */
export async function POST(request: Request, context: RouteContext) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const { id } = await context.params;
  const access = await requireEditableDraftAccess(request, id);
  if ("error" in access) return access.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = submitTermsAcceptanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "You must accept the current Terms of Service and Privacy Policy to submit.",
      },
      { status: 400 },
    );
  }

  try {
    const hub = await submitDraftHub(access.hub.id, parsed.data.termsVersion);
    return NextResponse.json(serializeDraftHub(hub));
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DraftValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof DraftConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
