CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL UNIQUE,
	`display_name` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY,
	`listing_type` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `apps` (
	`id` text PRIMARY KEY,
	`public_id` text NOT NULL UNIQUE,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`author` text NOT NULL,
	`contact_email` text NOT NULL,
	`description` text,
	`launch_url` text NOT NULL,
	`listing_type` text NOT NULL,
	`primary_category_id` text NOT NULL,
	`secondary_category_id` text,
	`target_device` text DEFAULT 'mrbd' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_by_user_id` text,
	`reviewer_notes` text,
	`submitted_at` integer,
	`reviewed_at` integer,
	`published_at` integer,
	`launch_count` integer DEFAULT 0 NOT NULL,
	`sim_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	CONSTRAINT `fk_apps_primary_category_id_categories_id_fk` FOREIGN KEY (`primary_category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_apps_secondary_category_id_categories_id_fk` FOREIGN KEY (`secondary_category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_apps_submitted_by_user_id_users_id_fk` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_assets` (
	`id` text PRIMARY KEY,
	`app_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	CONSTRAINT `fk_app_assets_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`cover_object_key` text,
	`filter_listing_type` text,
	`filter_category_slug` text,
	`smart_sort` text,
	`item_limit` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collection_apps` (
	`id` text PRIMARY KEY,
	`collection_id` text NOT NULL,
	`app_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	CONSTRAINT `fk_collection_apps_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_collection_apps_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_listing_type_slug_unique` ON `categories` (`listing_type`,`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_assets_object_key_unique` ON `app_assets` (`object_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_apps_collection_id_app_id_unique` ON `collection_apps` (`collection_id`,`app_id`);
--> statement-breakpoint
CREATE INDEX `collection_apps_collection_id_sort_order_idx` ON `collection_apps` (`collection_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `collections_status_sort_order_idx` ON `collections` (`status`,`sort_order`);
--> statement-breakpoint
-- FTS5 search index (not in schema.ts — custom SQL only)
CREATE VIRTUAL TABLE `app_search` USING fts5(
  app_id UNINDEXED,
  name,
  author,
  description,
  categories,
  tokenize = 'unicode61 remove_diacritics 2',
  prefix = '2 3'
);
