import { createHash } from "node:crypto";

import type { ListingType } from "@/db/schema";

/** Deterministic category PK — stable across seeds and migrations. */
export function categoryStableId(listingType: ListingType, slug: string): string {
  const digest = createHash("sha256")
    .update(`hudxyz/category/v1/${listingType}/${slug}`)
    .digest("hex");

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `7${digest.slice(12, 15)}`,
    `8${digest.slice(16, 19)}`,
    digest.slice(20, 32),
  ].join("-");
}
