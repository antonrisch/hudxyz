import { NextResponse } from "next/server";

import { apiError } from "@/lib/apps/api-error";
import { listingPath } from "@/lib/apps/public-id";
import { searchPublishedListings } from "@/lib/apps/search";
import { clientIp, originCheckOrNull, rateLimitOrNull } from "@/lib/apps/submit-guard";

const DEFAULT_LIMIT = 5;
const MIN_LIMIT = 1;
const MAX_LIMIT = 20;

function parseLimit(raw: string | null): number | null {
  if (raw == null || raw === "") return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

export async function GET(request: Request) {
  const originBlocked = originCheckOrNull(request);
  if (originBlocked) return originBlocked;

  const limited = rateLimitOrNull(`search:${clientIp(request)}`, 60, 60_000);
  if (limited) return limited;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = parseLimit(url.searchParams.get("limit"));
  if (limit == null) {
    return apiError("Invalid limit", 400);
  }

  try {
    // Short/empty queries return [] inside searchPublishedListings (no FTS hit).
    const listings = await searchPublishedListings({ query: q, limit });
    const results = listings.map((listing) => ({
      publicId: listing.publicId,
      name: listing.name,
      listingType: listing.listingType,
      categoryName: listing.categoryName,
      iconUrl: listing.iconUrl,
      href: listingPath(listing.slug, listing.publicId),
    }));

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=60",
        },
      },
    );
  } catch (error) {
    console.error("Directory search failed", error);
    return apiError("Search unavailable", 500);
  }
}
