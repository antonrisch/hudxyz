import { NextResponse } from "next/server";

import {
  DraftConflictError,
  DraftNotFoundError,
  DraftValidationError,
  getDraftHubDetail,
  serializeDraftDetail,
  updateDraftHub,
} from "@/lib/hubs/draft";
import { draftHubPatchSchema } from "@/lib/hubs/draft-schema";
import { requireHumanOrNull } from "@/lib/hubs/botid";
import { requireEditableDraftAccess, requireSubmitSession } from "@/lib/hubs/submit-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/hubs/[id] */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await requireEditableDraftAccess(request, id);
  if ("error" in access) return access.error;

  const detail = await getDraftHubDetail(access.hub.id);
  if (!detail) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }
  return NextResponse.json(serializeDraftDetail(detail));
}

/** PATCH /api/hubs/[id] */
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

  const parsed = draftHubPatchSchema.safeParse(body);
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
    const hub = await updateDraftHub(access.hub.id, parsed.data);
    const detail = await getDraftHubDetail(hub.id);
    if (!detail) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
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
