import { NextResponse } from "next/server";

import { searchPublishedListings } from "@/lib/apps/search";

/**
 * Published-app search for editorial membership (includes internal id).
 * GET /api/padme/apps/search?q=&limit=
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const rawLimit = url.searchParams.get("limit");
  const parsed = rawLimit ? Number.parseInt(rawLimit, 10) : 8;
  const limit = Number.isFinite(parsed) ? Math.min(20, Math.max(1, parsed)) : 8;

  const listings = await searchPublishedListings({ query: q, limit });
  const results = listings.map((listing) => ({
    id: listing.id,
    publicId: listing.publicId,
    name: listing.name,
    author: listing.author,
    listingType: listing.listingType,
    categoryName: listing.categoryName,
    iconUrl: listing.iconUrl,
  }));

  return NextResponse.json({ results });
}
