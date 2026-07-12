PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_apps` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`author` text NOT NULL,
	`description` text NOT NULL,
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
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	CONSTRAINT `fk_apps_primary_category_id_categories_id_fk` FOREIGN KEY (`primary_category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_apps_secondary_category_id_categories_id_fk` FOREIGN KEY (`secondary_category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_apps_submitted_by_user_id_users_id_fk` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
UPDATE `apps` SET `description` = `name` WHERE `description` IS NULL OR trim(`description`) = '';--> statement-breakpoint
INSERT INTO `__new_apps`(`id`, `slug`, `name`, `author`, `description`, `launch_url`, `listing_type`, `primary_category_id`, `secondary_category_id`, `target_device`, `status`, `submitted_by_user_id`, `reviewer_notes`, `submitted_at`, `reviewed_at`, `published_at`, `launch_count`, `created_at`, `updated_at`) SELECT `id`, `slug`, `name`, `author`, `description`, `launch_url`, `listing_type`, `primary_category_id`, `secondary_category_id`, `target_device`, `status`, `submitted_by_user_id`, `reviewer_notes`, `submitted_at`, `reviewed_at`, `published_at`, `launch_count`, `created_at`, `updated_at` FROM `apps`;--> statement-breakpoint
DROP TABLE `apps`;--> statement-breakpoint
ALTER TABLE `__new_apps` RENAME TO `apps`;--> statement-breakpoint
PRAGMA foreign_keys=ON;