import { NextResponse } from "next/server";

import {
  DraftNotFoundError,
  DraftValidationError,
  serializeDraftApp,
  submitDraftApp,
} from "@/lib/apps/draft";
import { requireHumanOrNull } from "@/lib/apps/botid";
import { requireSubmitSession } from "@/lib/apps/submit-guard";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Submit a draft for review: draft → pending.
 * POST /api/apps/[id]/submit
 */
export async function POST(request: Request, context: RouteContext) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const { id } = await context.params;

  try {
    const app = await submitDraftApp(id);
    return NextResponse.json(serializeDraftApp(app));
  } catch (error) {
    if (error instanceof DraftNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DraftValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
