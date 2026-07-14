import { NextResponse } from "next/server";

import {
  CollectionConflictError,
  CollectionValidationError,
  createCollection,
  createCollectionSchema,
  listCollectionsForAdmin,
} from "@/lib/collections/admin";

/**
 * Admin collection list.
 * GET /api/padme/collections
 */
export async function GET() {
  const items = await listCollectionsForAdmin();
  return NextResponse.json({ items });
}

/**
 * Create a draft collection.
 * POST /api/padme/collections
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCollectionSchema.safeParse(body);
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
    const collection = await createCollection(parsed.data);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    if (error instanceof CollectionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CollectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
