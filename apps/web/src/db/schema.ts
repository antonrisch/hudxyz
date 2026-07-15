import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { uuidv7 } from "@/lib/uuidv7";

/** SQLite epoch-ms default for timestamp columns (replaces deprecated `.default(timestampDefaultNow)`). */
const timestampDefaultNow = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;

/**
 * Platform profile — auth identity tables come later with Better Auth.
 * Deferred: blog/news content, device/provider entities, simulator sessions,
 * launch event history, votes/comments.
 */
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefaultNow),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(timestampDefaultNow),
});

export const appStatuses = ["draft", "pending", "published", "rejected", "archived"] as const;

export type AppStatus = (typeof appStatuses)[number];

export const appAssetKinds = ["icon", "screenshot", "video"] as const;

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
  /** Stable public id (10-char Crockford). Used in URLs and `?id=` draft links. */
  publicId: text("public_id").notNull().unique(),
  /** SEO crumb derived from name — not unique; pair with publicId in paths. */
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  author: text("author").notNull(),
  /** Private review contact — not shown on public directory pages. */
  contactEmail: text("contact_email").notNull(),
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
  /** SHA-256 hash of the per-draft edit token (raw token only in HttpOnly cookie). */
  editTokenHash: text("edit_token_hash"),
  /** Terms version accepted at submit time (`legal.termsVersion`). Null for legacy rows. */
  termsVersion: text("terms_version"),
  termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  /** Opens via “Open on Glasses” (device install / deep link). */
  launchCount: integer("launch_count").notNull().default(0),
  /** Opens via “Try in Simulator”. */
  simCount: integer("sim_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(timestampDefaultNow),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(timestampDefaultNow),
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
    /** Video length in ms (optional; validated when provided). */
    durationMs: integer("duration_ms"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefaultNow),
  },
  (table) => [uniqueIndex("app_assets_object_key_unique").on(table.objectKey)],
);

export const collectionKinds = ["editorial", "smart"] as const;

export type CollectionKind = (typeof collectionKinds)[number];

export const collectionStatuses = ["draft", "published"] as const;

export type CollectionStatus = (typeof collectionStatuses)[number];

export const smartSorts = ["new", "popular"] as const;

export type SmartSort = (typeof smartSorts)[number];

export const collections = sqliteTable(
  "collections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull().$type<CollectionKind>(),
    status: text("status").notNull().default("draft").$type<CollectionStatus>(),
    sortOrder: integer("sort_order").notNull().default(0),
    coverObjectKey: text("cover_object_key"),
    filterListingType: text("filter_listing_type").$type<ListingType>(),
    filterCategorySlug: text("filter_category_slug"),
    smartSort: text("smart_sort").$type<SmartSort>(),
    itemLimit: integer("item_limit"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefaultNow),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefaultNow),
  },
  (table) => [index("collections_status_sort_order_idx").on(table.status, table.sortOrder)],
);

export const collectionApps = sqliteTable(
  "collection_apps",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefaultNow),
  },
  (table) => [
    uniqueIndex("collection_apps_collection_id_app_id_unique").on(table.collectionId, table.appId),
    index("collection_apps_collection_id_sort_order_idx").on(table.collectionId, table.sortOrder),
  ],
);
