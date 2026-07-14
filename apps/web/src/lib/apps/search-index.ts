import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { sql, type SQLWrapper } from "drizzle-orm";

import type { Database } from "@/db";
import { apps, categories } from "@/db/schema";

const primaryCategory = alias(categories, "primary_category");
const secondaryCategory = alias(categories, "secondary_category");

/** DB-like handle that can run drizzle queries and raw SQL (session or transaction). */
export type SearchIndexDb = {
  run: (query: SQLWrapper | string) => PromiseLike<unknown>;
  select: Database["select"];
};

/**
 * Rebuild one app's FTS document. Deletes any existing row, then inserts only when
 * the app is currently published. Call inside the same transaction as the app write.
 */
export async function rebuildAppSearchDocument(tx: SearchIndexDb, appId: string): Promise<void> {
  await tx.run(sql`DELETE FROM app_search WHERE app_id = ${appId}`);

  const rows = await tx
    .select({
      id: apps.id,
      status: apps.status,
      name: apps.name,
      author: apps.author,
      description: apps.description,
      primaryCategoryName: primaryCategory.name,
      secondaryCategoryName: secondaryCategory.name,
    })
    .from(apps)
    .innerJoin(primaryCategory, eq(apps.primaryCategoryId, primaryCategory.id))
    .leftJoin(secondaryCategory, eq(apps.secondaryCategoryId, secondaryCategory.id))
    .where(and(eq(apps.id, appId)))
    .limit(1);

  const row = rows[0];
  if (!row || row.status !== "published") return;

  const categoryNames = [row.primaryCategoryName, row.secondaryCategoryName]
    .filter((name): name is string => Boolean(name))
    .join(" ");

  await tx.run(sql`
    INSERT INTO app_search (app_id, name, author, description, categories)
    VALUES (
      ${row.id},
      ${row.name},
      ${row.author},
      ${row.description ?? ""},
      ${categoryNames}
    )
  `);
}
