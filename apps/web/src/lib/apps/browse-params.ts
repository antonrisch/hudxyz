import { listingTypes, type ListingType } from "@/db/schema";
import type { ListingSort } from "@/lib/apps/queries";
import { normalizeSearchInput, type SearchSort } from "@/lib/apps/search";

export type BrowseParams = {
  type?: string | string[];
  sort?: string | string[];
  q?: string | string[];
};

export type BrowsePathOptions = {
  listingType?: ListingType;
  categorySlug?: string;
  sort?: SearchSort;
  query?: string;
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

/** Browse sort when a search query is present. Defaults to relevance. */
export function parseSearchSort(value: string | string[] | undefined): SearchSort {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "popular") return "popular";
  if (raw === "new") return "new";
  return "relevance";
}

/**
 * Normalize and validate a search query from URL params.
 * Returns undefined when missing or shorter than 2 visible characters.
 */
export function parseSearchQuery(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return normalizeSearchInput(raw) ?? undefined;
}

export function hasBrowseFilters(params: BrowseParams): boolean {
  if (parseSearchQuery(params.q)) return true;
  if (parseListingType(params.type)) return true;
  const rawSort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  return rawSort === "new" || rawSort === "popular";
}

/** Navigational browse URL (includes non-default sort; preserves q). */
export function appsBrowsePath(options: BrowsePathOptions): string {
  const params = new URLSearchParams();
  if (options.query) params.set("q", options.query);
  if (options.listingType) params.set("type", options.listingType);

  const defaultSort = options.query ? "relevance" : "new";
  if (options.sort && options.sort !== defaultSort) {
    params.set("sort", options.sort);
  }

  const query = params.toString();

  if (options.categorySlug) {
    return query
      ? `/apps/category/${options.categorySlug}?${query}`
      : `/apps/category/${options.categorySlug}`;
  }

  return query ? `/apps?${query}` : "/apps";
}

/** Canonical URL — sort and category type refinements omitted per PRD. Search pages canonicalize to /apps. */
export function appsCanonicalPath(options: {
  listingType?: ListingType;
  categorySlug?: string;
  query?: string;
}): string {
  if (options.query) {
    return "/apps";
  }
  if (options.categorySlug) {
    return `/apps/category/${options.categorySlug}`;
  }
  if (options.listingType) {
    return `/apps?type=${options.listingType}`;
  }
  return "/apps";
}
