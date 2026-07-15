import type { ListingType } from "@/db/schema";

import catalogJson from "./categories.json";

export type CategoryDefinition = {
  listingType: ListingType;
  slug: string;
  name: string;
  sortOrder: number;
};

/**
 * App Store–style taxonomy seeded into `categories`.
 * Not 1:1 with App Store Connect — intentional curated subset.
 */
export const categoryCatalog = catalogJson as readonly CategoryDefinition[];

export function categoriesForListingType(listingType: ListingType): readonly CategoryDefinition[] {
  return categoryCatalog.filter((category) => category.listingType === listingType);
}

export function findCategoryDefinition(
  listingType: ListingType,
  slug: string,
): CategoryDefinition | undefined {
  return categoryCatalog.find(
    (category) => category.listingType === listingType && category.slug === slug,
  );
}

/** True when the slug exists for any listing type (e.g. `sports` for app + game). */
export function categorySlugExists(slug: string): boolean {
  return categoryCatalog.some((category) => category.slug === slug);
}

/** Display name for a category slug; prefers the first catalog match. */
export function categoryDisplayName(slug: string): string | null {
  return categoryCatalog.find((category) => category.slug === slug)?.name ?? null;
}
