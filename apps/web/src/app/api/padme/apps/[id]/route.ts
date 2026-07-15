import { NextResponse } from "next/server";

import {
  adminAppPatchSchema,
  deleteAppForAdmin,
  getAppForAdmin,
  serializeAdminDetail,
  updateAppForAdmin,
} from "@/lib/apps/admin";
import { DraftNotFoundError, DraftValidationError } from "@/lib/apps/draft";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Admin detail.
 * GET /api/padme/apps/[id]
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getAppForAdmin(id);
  if (!detail) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  return NextResponse.json(serializeAdminDetail(detail));
}

/**
 * Admin metadata + status update.
 * PUT /api/padme/apps/[id]
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = adminAppPatchSchema.safeParse(body);
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
    const app = await updateAppForAdmin(id, parsed.data);
    const detail = await getAppForAdmin(app.id);
    if (!detail) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    return NextResponse.json(serializeAdminDetail(detail));
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

/**
 * Permanently delete an app listing and its assets.
 * DELETE /api/padme/apps/[id]
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deleteAppForAdmin(id);
    return new NextResponse(null, { status: 204 });
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
