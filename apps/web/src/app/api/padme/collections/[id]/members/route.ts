import { NextResponse } from "next/server";

import {
  CollectionNotFoundError,
  CollectionValidationError,
  replaceCollectionMembers,
  replaceMembersSchema,
} from "@/lib/collections/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Replace ordered editorial membership.
 * PUT /api/padme/collections/[id]/members
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = replaceMembersSchema.safeParse(body);
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
    const detail = await replaceCollectionMembers(id, parsed.data.orderedAppIds);
    return NextResponse.json(detail);
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
