import { NextResponse } from "next/server";

import { deleteDraftAsset, getAppAssetById } from "@/lib/apps/assets";
import { requireHumanOrNull } from "@/lib/apps/botid";
import { DraftConflictError } from "@/lib/apps/draft";
import { requireEditableDraftAccess, requireSubmitSession } from "@/lib/apps/submit-guard";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const { id } = await params;
  const asset = await getAppAssetById(id);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const access = await requireEditableDraftAccess(request, asset.appId);
  if ("error" in access) return access.error;

  let deleted;
  try {
    deleted = await deleteDraftAsset(id, access.app.id);
  } catch (error) {
    if (error instanceof DraftConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}
