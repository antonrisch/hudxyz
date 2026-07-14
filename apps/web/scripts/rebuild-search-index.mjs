#!/usr/bin/env node

import { createClient } from "@libsql/client";
import "dotenv/config";

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_CONNECTION_URL / TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

// DDL lives only in the FTS migration — rebuild assumes the table already exists.
const table = await client.execute(
  `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_search'`,
);
if (table.rows.length === 0) {
  console.error(
    "app_search FTS table is missing. Apply migrations first (pnpm db --migrate), then retry.",
  );
  process.exit(1);
}

await client.execute(`DELETE FROM app_search`);

const published = await client.execute(`
  SELECT
    a.id AS app_id,
    a.name AS name,
    a.author AS author,
    COALESCE(a.description, '') AS description,
    trim(
      COALESCE(pc.name, '') ||
      CASE WHEN sc.name IS NOT NULL THEN ' ' || sc.name ELSE '' END
    ) AS categories
  FROM apps a
  INNER JOIN categories pc ON pc.id = a.primary_category_id
  LEFT JOIN categories sc ON sc.id = a.secondary_category_id
  WHERE a.status = 'published'
`);

for (const row of published.rows) {
  await client.execute({
    sql: `INSERT INTO app_search (app_id, name, author, description, categories)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      String(row.app_id),
      String(row.name),
      String(row.author),
      String(row.description ?? ""),
      String(row.categories ?? ""),
    ],
  });
}

console.log(`Rebuilt app_search with ${published.rows.length} published document(s).`);
