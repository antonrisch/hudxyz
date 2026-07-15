import { NextResponse } from "next/server";

import { adminListStatuses, listAppsForAdmin } from "@/lib/apps/admin";

/**
 * Admin queue list.
 * GET /api/padme/apps?status=draft|pending|published|rejected
 * GET /api/padme/apps?recent=1
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recent = searchParams.get("recent");
  const status = searchParams.get("status");

  if (recent === "1" || recent === "true") {
    const items = await listAppsForAdmin({ recent: true });
    return NextResponse.json({ items });
  }

  const resolvedStatus =
    status && (adminListStatuses as readonly string[]).includes(status)
      ? (status as (typeof adminListStatuses)[number])
      : "pending";

  const items = await listAppsForAdmin({ status: resolvedStatus });
  return NextResponse.json({ items });
}
