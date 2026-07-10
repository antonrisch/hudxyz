#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import "dotenv/config";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(join(root, "src/lib/catalog/categories.json"), "utf8"));

function categoryStableId(listingType, slug) {
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

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_CONNECTION_URL / TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

for (const category of catalog) {
  const id = categoryStableId(category.listingType, category.slug);
  await client.execute({
    sql: `INSERT INTO categories (id, listing_type, slug, name, sort_order)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            listing_type = excluded.listing_type,
            slug = excluded.slug,
            name = excluded.name,
            sort_order = excluded.sort_order`,
    args: [id, category.listingType, category.slug, category.name, category.sortOrder],
  });
}

console.log(`Seeded ${catalog.length} categories.`);
