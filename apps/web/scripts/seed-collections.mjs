#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import "dotenv/config";

function collectionStableId(slug) {
  const digest = createHash("sha256").update(`hudxyz/collection/v1/${slug}`).digest("hex");

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `7${digest.slice(12, 15)}`,
    `8${digest.slice(16, 19)}`,
    digest.slice(20, 32),
  ].join("-");
}

function membershipStableId(collectionId, appId) {
  const digest = createHash("sha256")
    .update(`hudxyz/collection-app/v1/${collectionId}/${appId}`)
    .digest("hex");

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `7${digest.slice(12, 15)}`,
    `8${digest.slice(16, 19)}`,
    digest.slice(20, 32),
  ].join("-");
}

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_CONNECTION_URL / TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });
const now = Date.now();

const smartShelves = [
  {
    slug: "new",
    name: "New",
    description: "Recently published apps and games.",
    sortOrder: 10,
    smartSort: "new",
    itemLimit: 6,
  },
  {
    slug: "popular",
    name: "Popular",
    description: "Most opened apps and games.",
    sortOrder: 20,
    smartSort: "popular",
    itemLimit: 6,
  },
];

for (const shelf of smartShelves) {
  const id = collectionStableId(shelf.slug);
  await client.execute({
    sql: `INSERT INTO collections (
            id, slug, name, description, kind, status, sort_order,
            cover_object_key, filter_listing_type, filter_category_slug,
            smart_sort, item_limit, published_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'smart', 'published', ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            kind = 'smart',
            status = 'published',
            sort_order = excluded.sort_order,
            filter_listing_type = NULL,
            filter_category_slug = NULL,
            smart_sort = excluded.smart_sort,
            item_limit = excluded.item_limit,
            published_at = COALESCE(collections.published_at, excluded.published_at),
            updated_at = excluded.updated_at`,
    args: [
      id,
      shelf.slug,
      shelf.name,
      shelf.description,
      shelf.sortOrder,
      shelf.smartSort,
      shelf.itemLimit,
      now,
      now,
      now,
    ],
  });
}

const published = await client.execute({
  sql: `SELECT id, public_id, published_at
        FROM apps
        WHERE status = 'published'
        ORDER BY published_at DESC, public_id ASC`,
  args: [],
});

if (published.rows.length > 0) {
  const featuredId = collectionStableId("featured");
  await client.execute({
    sql: `INSERT INTO collections (
            id, slug, name, description, kind, status, sort_order,
            cover_object_key, filter_listing_type, filter_category_slug,
            smart_sort, item_limit, published_at, created_at, updated_at
          ) VALUES (?, 'featured', 'Featured', 'Editor picks from the catalog.',
                    'editorial', 'published', 0, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            kind = 'editorial',
            status = 'published',
            sort_order = 0,
            filter_listing_type = NULL,
            filter_category_slug = NULL,
            smart_sort = NULL,
            item_limit = NULL,
            published_at = COALESCE(collections.published_at, excluded.published_at),
            updated_at = excluded.updated_at`,
    args: [featuredId, now, now, now],
  });

  const featuredLookup = await client.execute({
    sql: `SELECT id FROM collections WHERE slug = 'featured' LIMIT 1`,
    args: [],
  });
  const collectionId = featuredLookup.rows[0]?.id ?? featuredId;

  const memberIds = published.rows.slice(0, 6).map((row) => String(row.id));
  for (let index = 0; index < memberIds.length; index += 1) {
    const appId = memberIds[index];
    const membershipId = membershipStableId(collectionId, appId);
    await client.execute({
      sql: `INSERT INTO collection_apps (id, collection_id, app_id, sort_order, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(collection_id, app_id) DO UPDATE SET
              sort_order = excluded.sort_order`,
      args: [membershipId, collectionId, appId, index, now],
    });
  }

  console.log(
    `Seeded smart shelves (new, popular) and editorial featured (${memberIds.length} members).`,
  );
} else {
  console.log("Seeded smart shelves (new, popular). No published apps for featured.");
}
