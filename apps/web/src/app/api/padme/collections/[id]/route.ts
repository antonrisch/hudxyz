import { NextResponse } from "next/server";

import {
  CollectionConflictError,
  CollectionNotFoundError,
  CollectionValidationError,
  deleteCollection,
  getCollectionForAdmin,
  updateCollection,
  updateCollectionSchema,
} from "@/lib/collections/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Admin collection detail.
 * GET /api/padme/collections/[id]
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const detail = await getCollectionForAdmin(id);
  if (!detail) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

/**
 * Update collection metadata / smart filters / status.
 * PATCH /api/padme/collections/[id]
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateCollectionSchema.safeParse(body);
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
    const detail = await updateCollection(id, parsed.data);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof CollectionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CollectionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CollectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/**
 * Delete a draft collection.
 * DELETE /api/padme/collections/[id]
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deleteCollection(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof CollectionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof CollectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
