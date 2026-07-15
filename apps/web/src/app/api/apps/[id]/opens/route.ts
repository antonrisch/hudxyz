import { NextResponse } from "next/server";
import { z } from "zod";

import { incrementPublishedOpen } from "@/lib/apps/opens";
import { openKinds } from "@/lib/apps/track-open";
import { clientIp, originCheckOrNull, rateLimitOrNull } from "@/lib/apps/submit-guard";

const kindSchema = z.enum(openKinds);

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Increment launch_count or sim_count for a published listing.
 * POST /api/apps/[id]/opens?kind=launch|sim
 */
export async function POST(request: Request, context: RouteContext) {
  const originBlocked = originCheckOrNull(request);
  if (originBlocked) return originBlocked;

  const limited = rateLimitOrNull(`opens:${clientIp(request)}`, 60, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const kindParam = new URL(request.url).searchParams.get("kind");
  const parsed = kindSchema.safeParse(kindParam);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const updated = await incrementPublishedOpen(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
