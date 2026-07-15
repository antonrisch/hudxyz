import { NextResponse } from "next/server";

import {
  DraftConflictError,
  DraftNotFoundError,
  DraftValidationError,
  getDraftAppDetail,
  serializeDraftDetail,
  updateDraftApp,
} from "@/lib/apps/draft";
import { draftAppPatchSchema } from "@/lib/apps/draft-schema";
import { requireHumanOrNull } from "@/lib/apps/botid";
import { requireEditableDraftAccess, requireSubmitSession } from "@/lib/apps/submit-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Read a listing by id for form hydration. Requires the draft edit-token cookie.
 * GET /api/apps/[id]
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await requireEditableDraftAccess(request, id);
  if ("error" in access) return access.error;

  const detail = await getDraftAppDetail(access.app.id);
  if (!detail) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json(serializeDraftDetail(detail));
}

/**
 * Update a draft listing. Only `status === "draft"`.
 * PATCH /api/apps/[id]
 */
export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = draftAppPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const app = await updateDraftApp(access.app.id, parsed.data);
    const detail = await getDraftAppDetail(app.id);
    if (!detail) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    return NextResponse.json(serializeDraftDetail(detail));
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
