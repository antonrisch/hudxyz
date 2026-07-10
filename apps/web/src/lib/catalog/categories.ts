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
