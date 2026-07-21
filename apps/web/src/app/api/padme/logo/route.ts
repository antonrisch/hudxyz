import { NextResponse } from "next/server";

import { getHubForAdmin, touchHubLogoForAdmin } from "@/lib/hubs/admin";
import { DraftNotFoundError, DraftValidationError } from "@/lib/hubs/draft";
import { clearHubLogoForAdmin, setHubLogoForAdmin } from "@/lib/hubs/logo";
import { z } from "zod";

const registerSchema = z.object({
  hubId: z.string().trim().min(1),
  objectKey: z.string().trim().min(1),
});

/** POST /api/padme/logo */
export async function POST(request: Request) {
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

  const hub = await getHubForAdmin(parsed.data.hubId);
  if (!hub) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  try {
    const result = await setHubLogoForAdmin({
      hubId: hub.id,
      objectKey: parsed.data.objectKey,
    });
    await touchHubLogoForAdmin(hub.id);
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

/** DELETE /api/padme/logo?hubId= */
export async function DELETE(request: Request) {
  const hubId = new URL(request.url).searchParams.get("hubId");
  if (!hubId) {
    return NextResponse.json({ error: "hubId is required" }, { status: 400 });
  }

  const hub = await getHubForAdmin(hubId);
  if (!hub) {
    return NextResponse.json({ error: "Hub not found" }, { status: 404 });
  }

  try {
    await clearHubLogoForAdmin(hub.id);
    await touchHubLogoForAdmin(hub.id);
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
