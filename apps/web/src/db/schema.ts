import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { uuidv7 } from "@/lib/uuidv7";

/** SQLite epoch-ms default for timestamp columns (replaces deprecated `.default(timestampDefaultNow)`). */
const timestampDefaultNow = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;

/**
 * Platform profile — auth identity tables come later with Better Auth.
 * Deferred: blog/news content, device/provider entities, simulator sessions,
 * launch analytics counters, votes/comments.
 */
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(timestampDefaultNow),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(timestampDefaultNow),
});

export const appStatuses = ["draft", "pending", "published", "rejected", "archived"] as const;

export type AppStatus = (typeof appStatuses)[number];

export const appAssetKinds = ["icon", "screenshot"] as const;

export type AppAssetKind = (typeof appAssetKinds)[number];

export const listingTypes = ["app", "game"] as const;

export type ListingType = (typeof listingTypes)[number];

export const categories = sqliteTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    listingType: text("listing_type").notNull().$type<ListingType>(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("categories_listing_type_slug_unique").on(table.listingType, table.slug)],
);

export const apps = sqliteTable("apps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  launchUrl: text("launch_url").notNull(),
  listingType: text("listing_type").notNull().$type<ListingType>(),
  primaryCategoryId: text("primary_category_id")
    .notNull()
    .references(() => categories.id),
  secondaryCategoryId: text("secondary_category_id").references(() => categories.id),
  targetDevice: text("target_device").notNull().default("mrbd"),
  status: text("status").notNull().default("draft").$type<AppStatus>(),
  submittedByUserId: text("submitted_by_user_id").references(() => users.id),
  reviewerNotes: text("reviewer_notes"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(timestampDefaultNow),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(timestampDefaultNow),
});

export const appAssets = sqliteTable(
  "app_assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<AppAssetKind>(),
    objectKey: text("object_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(timestampDefaultNow),
  },
  (table) => [uniqueIndex("app_assets_object_key_unique").on(table.objectKey)],
);
