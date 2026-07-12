import { NextResponse } from "next/server";

import {
  DraftNotFoundError,
  DraftValidationError,
  serializeDraftApp,
  submitDraftApp,
} from "@/lib/apps/draft";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Submit a draft for review: draft → pending.
 * POST /api/apps/[id]/submit
 *
 * Requires icon + required listing fields. No auth in v1 (temporary).
 */
export async function POST(_request: Request, context: RouteContext) {
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
