import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { uuidv7 } from "@/lib/uuidv7";

/** SQLite epoch-ms default for timestamp columns. */
const timestampDefaultNow = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;

/**
 * Platform profile — auth identity tables come later with Better Auth.
 * Hubs may set `ownerUserId` once sign-in lands.
 *
 * Future: when app listings return, `apps.hubId` MUST be NOT NULL → hubs(id).
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

export const hubStatuses = ["draft", "pending", "published", "rejected", "archived"] as const;

export type HubStatus = (typeof hubStatuses)[number];

/**
 * Developer / studio directory entry (shadcn-registry analog).
 * Public UI is a flat `/hubs` list; submit + Padme manage lifecycle.
 */
export const hubs = sqliteTable(
  "hubs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    /** Stable public id (10-char Crockford). Used in `?id=` draft deep-links. */
    publicId: text("public_id").notNull().unique(),
    /** Derived from name — not unique. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** External site linked from the directory row title. */
    homepage: text("homepage").notNull(),
    /** Required Try → simulator target. */
    launchUrl: text("launch_url").notNull(),
    /** R2 object key for the hub logo. Null until uploaded. */
    logoObjectKey: text("logo_object_key"),
    /** Private review contact — not shown on the public directory. */
    contactEmail: text("contact_email").notNull(),
    status: text("status").notNull().default("draft").$type<HubStatus>(),
    /** Set when Better Auth lands; nullable for anonymous submit. */
    ownerUserId: text("owner_user_id").references(() => users.id),
    reviewerNotes: text("reviewer_notes"),
    /** SHA-256 hash of the per-draft edit token (raw token only in HttpOnly cookie). */
    editTokenHash: text("edit_token_hash"),
    termsVersion: text("terms_version"),
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefaultNow),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(timestampDefaultNow),
  },
  (table) => [index("hubs_status_published_at_idx").on(table.status, table.publishedAt)],
);
