CREATE TABLE `hubs` (
	`id` text PRIMARY KEY,
	`public_id` text NOT NULL UNIQUE,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`homepage` text NOT NULL,
	`launch_url` text NOT NULL,
	`logo_object_key` text,
	`contact_email` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`owner_user_id` text,
	`reviewer_notes` text,
	`edit_token_hash` text,
	`terms_version` text,
	`terms_accepted_at` integer,
	`submitted_at` integer,
	`reviewed_at` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	CONSTRAINT `fk_hubs_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
DROP INDEX IF EXISTS `app_assets_object_key_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `categories_listing_type_slug_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `collection_apps_collection_id_app_id_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `collection_apps_collection_id_sort_order_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `collections_status_sort_order_idx`;--> statement-breakpoint
CREATE INDEX `hubs_status_published_at_idx` ON `hubs` (`status`,`published_at`);--> statement-breakpoint
DROP TABLE `app_assets`;--> statement-breakpoint
DROP TABLE `apps`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
DROP TABLE `collection_apps`;--> statement-breakpoint
DROP TABLE `collections`;--> statement-breakpoint
DROP TABLE IF EXISTS `app_search`;