import { NextResponse } from "next/server";

import { adminListStatuses, listHubsForAdmin } from "@/lib/hubs/admin";

/**
 * Admin queue list.
 * GET /api/padme/hubs?status=draft|pending|published|rejected
 * GET /api/padme/hubs?recent=1
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recent = searchParams.get("recent");
  const status = searchParams.get("status");

  if (recent === "1" || recent === "true") {
    const items = await listHubsForAdmin({ recent: true });
    return NextResponse.json({ items });
  }

  const resolvedStatus =
    status && (adminListStatuses as readonly string[]).includes(status)
      ? (status as (typeof adminListStatuses)[number])
      : "pending";

  const items = await listHubsForAdmin({ status: resolvedStatus });
  return NextResponse.json({ items });
}
