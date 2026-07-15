import { NextResponse } from "next/server";

import {
  CollectionValidationError,
  reorderCollections,
  reorderCollectionsSchema,
} from "@/lib/collections/admin";

/**
 * Replace hub sort order for all collections.
 * POST /api/padme/collections/reorder
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reorderCollectionsSchema.safeParse(body);
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
    const items = await reorderCollections(parsed.data.orderedIds);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof CollectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
