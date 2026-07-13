import { NextResponse } from "next/server";

import { deleteAppAsset } from "@/lib/apps/assets";
import { requireHumanOrNull } from "@/lib/apps/botid";
import { requireSubmitSession } from "@/lib/apps/submit-guard";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const { id } = await params;
  const deleted = await deleteAppAsset(id);

  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}
