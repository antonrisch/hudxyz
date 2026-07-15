import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { type ListingType } from "@/db/schema";
import { publicUrl } from "@/lib/r2";

import type { ListingListItem, ListingSort } from "./queries";

/** Tunable BM25 column weights (app_id unused). Order: name, author, description, categories. */
export const SEARCH_WEIGHTS = {
  name: 10.0,
  author: 3.0,
  description: 1.0,
  categories: 5.0,
} as const;

export type SearchSort = ListingSort | "relevance";

export type SearchListingItem = ListingListItem & {
  /** Internal app id — available for admin membership; omit from public API responses. */
  id: string;
  author: string;
};

export type SearchPublishedFilter = {
  query: string;
  listingType?: ListingType;
  categorySlug?: string;
  sort?: SearchSort;
  limit?: number;
};

export const MIN_QUERY_CHARS = 2;
export const MAX_QUERY_CHARS = 100;

/**
 * Collapse whitespace, trim, and enforce the search length window.
 * Returns null when the query is too short to search.
 */
export function normalizeSearchInput(raw: string): string | null {
  const normalized = raw.replace(/\s+/gu, " ").trim().slice(0, MAX_QUERY_CHARS);
  if (normalized.replace(/\s/gu, "").length < MIN_QUERY_CHARS) {
    return null;
  }
  return normalized;
}

/**
 * Normalize input and build a safe FTS5 AND-prefix query.
 * Returns null when the query is too short to search.
 */
export function buildFtsMatchQuery(raw: string): string | null {
  const normalized = normalizeSearchInput(raw);
  if (!normalized) return null;

  const tokens = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return null;

  // Escape double quotes by doubling; wrap each token as a phrase with prefix.
  return tokens.map((token) => `"${token.replace(/"/g, '""')}"*`).join(" ");
}

type SearchRow = {
  id: string;
  slug: string;
  public_id: string;
  name: string;
  description: string | null;
  listing_type: ListingType;
  category_name: string;
  icon_object_key: string | null;
  launch_url: string;
  launch_count: number;
  sim_count: number;
  author: string;
};

function mapSearchRows(rows: SearchRow[]): SearchListingItem[] {
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    publicId: row.public_id,
    name: row.name,
    description: row.description,
    listingType: row.listing_type,
    categoryName: row.category_name,
    iconUrl: row.icon_object_key ? publicUrl(row.icon_object_key) : null,
    launchUrl: row.launch_url,
    launchCount: row.launch_count,
    simCount: row.sim_count,
    author: row.author,
  }));
}

/**
 * Search published listings via FTS5. Returns [] for short/empty queries.
 * Throws on FTS/DB failure — callers must not fall back to unbounded LIKE.
 */
export async function searchPublishedListings(
  filter: SearchPublishedFilter,
): Promise<SearchListingItem[]> {
  const matchQuery = buildFtsMatchQuery(filter.query);
  if (!matchQuery) return [];

  const db = getDb();
  const sort = filter.sort ?? "relevance";
  const { name, author, description, categories: categoryWeight } = SEARCH_WEIGHTS;

  const orderBySql =
    sort === "popular"
      ? sql`(apps.launch_count + apps.sim_count) DESC, apps.published_at DESC`
      : sort === "new"
        ? sql`apps.published_at DESC`
        : sql`bm25(app_search, 0.0, ${name}, ${author}, ${description}, ${categoryWeight}) ASC,
              (apps.launch_count + apps.sim_count) DESC,
              apps.published_at DESC`;

  const listingTypeFilter = filter.listingType
    ? sql`AND apps.listing_type = ${filter.listingType}`
    : sql``;
  const categoryFilter = filter.categorySlug
    ? sql`AND (primary_category.slug = ${filter.categorySlug} OR secondary_category.slug = ${filter.categorySlug})`
    : sql``;
  const limitClause = filter.limit != null ? sql`LIMIT ${filter.limit}` : sql``;

  const rows = await db.all<SearchRow>(sql`
    SELECT
      apps.id AS id,
      apps.slug AS slug,
      apps.public_id AS public_id,
      apps.name AS name,
      apps.description AS description,
      apps.listing_type AS listing_type,
      primary_category.name AS category_name,
      app_assets.object_key AS icon_object_key,
      apps.launch_url AS launch_url,
      apps.launch_count AS launch_count,
      apps.sim_count AS sim_count,
      apps.author AS author
    FROM app_search
    INNER JOIN apps ON apps.id = app_search.app_id
    INNER JOIN categories AS primary_category ON primary_category.id = apps.primary_category_id
    LEFT JOIN categories AS secondary_category ON secondary_category.id = apps.secondary_category_id
    LEFT JOIN app_assets ON app_assets.app_id = apps.id AND app_assets.kind = 'icon'
    WHERE app_search MATCH ${matchQuery}
      AND apps.status = 'published'
      ${listingTypeFilter}
      ${categoryFilter}
    ORDER BY ${orderBySql}
    ${limitClause}
  `);

  return mapSearchRows(rows);
}
