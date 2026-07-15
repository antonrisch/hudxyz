import { normalizeSearchInput } from "@/lib/apps/search";

export type BrowseParams = {
  type?: string | string[];
  sort?: string | string[];
  q?: string | string[];
};

/**
 * Normalize and validate a search query from URL params.
 * Returns undefined when missing or shorter than 2 visible characters.
 */
export function parseSearchQuery(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return normalizeSearchInput(raw) ?? undefined;
}

/** True when legacy type/sort browse params are present (redirect to /apps). */
export function hasLegacyBrowseParams(params: BrowseParams): boolean {
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const sort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  return Boolean(type || sort);
}

export function categoryPath(slug: string): string {
  return `/apps/category/${slug}`;
}

export function appsSearchPath(query: string): string {
  return `/apps?q=${encodeURIComponent(query)}`;
}
