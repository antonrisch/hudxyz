import { NextResponse } from "next/server";

import { listPublishedHubs } from "@/lib/hubs/queries";
import { clientIp, originCheckOrNull, rateLimitOrNull } from "@/lib/hubs/submit-guard";

/**
 * Public published hubs for header search / lightweight clients.
 * GET /api/hubs/list
 */
export async function GET(request: Request) {
  const originBlocked = originCheckOrNull(request);
  if (originBlocked) return originBlocked;

  const limited = rateLimitOrNull(`hubs-list:${clientIp(request)}`, 60, 60_000);
  if (limited) return limited;

  const hubs = await listPublishedHubs();
  return NextResponse.json({ hubs });
}
