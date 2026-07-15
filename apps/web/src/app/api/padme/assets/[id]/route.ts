import { NextResponse } from "next/server";

import { getAppForAdmin, touchAppMediaForAdmin } from "@/lib/apps/admin";
import { deleteAppAsset, getAppAssetById } from "@/lib/apps/assets";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getAppAssetById(id);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const app = await getAppForAdmin(asset.appId);
  if (!app) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const deleted = await deleteAppAsset(id);
  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  await touchAppMediaForAdmin(app.id);

  return NextResponse.json({ ok: true, id: deleted.id });
}
