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
CREATE UNIQUE INDEX `collection_apps_collection_id_app_id_unique` ON `collection_apps` (`collection_id`,`app_id`);--> statement-breakpoint
CREATE INDEX `collection_apps_collection_id_sort_order_idx` ON `collection_apps` (`collection_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `collections_status_sort_order_idx` ON `collections` (`status`,`sort_order`);