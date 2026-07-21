import { NextResponse } from "next/server";

import {
  adminHubPatchSchema,
  deleteHubForAdmin,
  getHubForAdmin,
  serializeAdminDetail,
  updateHubForAdmin,
} from "@/lib/hubs/admin";
import { DraftNotFoundError, DraftValidationError } from "@/lib/hubs/draft";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/padme/hubs/[id] */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getHubForAdmin(id);
  if (!detail) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }
  return NextResponse.json(serializeAdminDetail(detail));
}

/** PUT /api/padme/hubs/[id] */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = adminHubPatchSchema.safeParse(body);
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
    const hub = await updateHubForAdmin(id, parsed.data);
    const detail = await getHubForAdmin(hub.id);
    if (!detail) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
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

/** DELETE /api/padme/hubs/[id] */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deleteHubForAdmin(id);
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
