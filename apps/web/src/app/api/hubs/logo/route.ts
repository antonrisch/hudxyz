import { NextResponse } from "next/server";

import { DraftNotFoundError, DraftValidationError } from "@/lib/hubs/draft";
import { requireHumanOrNull } from "@/lib/hubs/botid";
import { deleteDraftLogo, saveDraftLogo } from "@/lib/hubs/logo";
import { requireEditableDraftAccess, requireSubmitSession } from "@/lib/hubs/submit-guard";
import { z } from "zod";

const registerSchema = z.object({
  hubId: z.string().trim().min(1),
  objectKey: z.string().trim().min(1),
});

/** POST /api/hubs/logo — register after R2 PUT */
export async function POST(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "hubId and objectKey are required" }, { status: 400 });
  }

  const access = await requireEditableDraftAccess(request, parsed.data.hubId);
  if ("error" in access) return access.error;

  try {
    const result = await saveDraftLogo({
      hubId: access.hub.id,
      objectKey: parsed.data.objectKey,
    });
    return NextResponse.json(result);
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

/** DELETE /api/hubs/logo?hubId= */
export async function DELETE(request: Request) {
  const bot = await requireHumanOrNull();
  if (bot) return bot;

  const gated = await requireSubmitSession(request);
  if (gated) return gated;

  const hubId = new URL(request.url).searchParams.get("hubId");
  if (!hubId) {
    return NextResponse.json({ error: "hubId is required" }, { status: 400 });
  }

  const access = await requireEditableDraftAccess(request, hubId);
  if ("error" in access) return access.error;

  try {
    await deleteDraftLogo(access.hub.id);
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
