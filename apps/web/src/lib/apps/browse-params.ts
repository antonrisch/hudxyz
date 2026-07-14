import { listingTypes, type ListingType } from "@/db/schema";
import type { ListingSort } from "@/lib/apps/queries";

export type BrowseParams = {
  type?: string | string[];
  sort?: string | string[];
};

export type BrowsePathOptions = {
  listingType?: ListingType;
  categorySlug?: string;
  sort?: ListingSort;
};

export function parseListingType(value: string | string[] | undefined): ListingType | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return (listingTypes as readonly string[]).includes(raw) ? (raw as ListingType) : undefined;
}

export function parseListingSort(value: string | string[] | undefined): ListingSort {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "popular" ? "popular" : "new";
}

export function hasBrowseFilters(params: BrowseParams): boolean {
  if (parseListingType(params.type)) return true;
  const rawSort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  return rawSort === "new" || rawSort === "popular";
}

/** Navigational browse URL (includes non-default sort). */
export function appsBrowsePath(options: BrowsePathOptions): string {
  const params = new URLSearchParams();
  if (options.listingType) params.set("type", options.listingType);
  if (options.sort && options.sort !== "new") params.set("sort", options.sort);
  const query = params.toString();

  if (options.categorySlug) {
    return query
      ? `/apps/category/${options.categorySlug}?${query}`
      : `/apps/category/${options.categorySlug}`;
  }

  return query ? `/apps?${query}` : "/apps";
}

/** Canonical URL — sort and category type refinements omitted per PRD. */
export function appsCanonicalPath(options: {
  listingType?: ListingType;
  categorySlug?: string;
}): string {
  if (options.categorySlug) {
    return `/apps/category/${options.categorySlug}`;
  }
  if (options.listingType) {
    return `/apps?type=${options.listingType}`;
  }
  return "/apps";
}
