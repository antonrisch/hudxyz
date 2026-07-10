import type { ListingType } from "@/db/schema";

import { findCategoryDefinition } from "@/lib/catalog/categories";

export type ListingCategoryAssignment = {
  listingType: ListingType;
  primaryCategoryId: string;
  secondaryCategoryId: string | null;
};

export type ResolvedCategory = {
  id: string;
  listingType: ListingType;
  slug: string;
};

export class ListingCategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingCategoryValidationError";
  }
}

export function validateListingCategories(
  assignment: ListingCategoryAssignment,
  categoriesById: ReadonlyMap<string, ResolvedCategory>,
): void {
  const primary = categoriesById.get(assignment.primaryCategoryId);
  if (!primary) {
    throw new ListingCategoryValidationError("Primary category does not exist.");
  }

  if (primary.listingType !== assignment.listingType) {
    throw new ListingCategoryValidationError(
      "Primary category must belong to the listing type.",
    );
  }

  if (!findCategoryDefinition(primary.listingType, primary.slug)) {
    throw new ListingCategoryValidationError("Primary category is not in the catalog.");
  }

  if (!assignment.secondaryCategoryId) {
    return;
  }

  if (assignment.secondaryCategoryId === assignment.primaryCategoryId) {
    throw new ListingCategoryValidationError(
      "Secondary category must differ from the primary category.",
    );
  }

  const secondary = categoriesById.get(assignment.secondaryCategoryId);
  if (!secondary) {
    throw new ListingCategoryValidationError("Secondary category does not exist.");
  }

  if (secondary.listingType !== assignment.listingType) {
    throw new ListingCategoryValidationError(
      "Secondary category must belong to the listing type.",
    );
  }

  if (!findCategoryDefinition(secondary.listingType, secondary.slug)) {
    throw new ListingCategoryValidationError("Secondary category is not in the catalog.");
  }
}
