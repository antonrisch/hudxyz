import { NextResponse } from "next/server";

import { deleteAppAsset } from "@/lib/apps/assets";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteAppAsset(id);

  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}
