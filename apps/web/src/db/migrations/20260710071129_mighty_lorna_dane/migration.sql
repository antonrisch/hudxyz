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
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
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
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	CONSTRAINT `fk_app_assets_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_listing_type_slug_unique` ON `categories` (`listing_type`,`slug`);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_assets_object_key_unique` ON `app_assets` (`object_key`);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('43da5dd9-f81a-71c3-8e58-c4e44238d063', 'app', 'business', 'Business', 10);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('06875ec1-fd3e-7b73-8831-0773942bac92', 'app', 'developer-tools', 'Developer Tools', 20);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('4afbc9a9-2797-7ea7-8cd3-290412c4210e', 'app', 'education', 'Education', 30);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('1eecbacd-75da-726c-8bfe-70b297e16c8d', 'app', 'entertainment', 'Entertainment', 40);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('04738e92-bb79-7699-8d69-7e52a63ea336', 'app', 'finance', 'Finance', 50);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('7763655f-365b-71cf-8257-0a5cc01c6ed4', 'app', 'health-fitness', 'Health & Fitness', 60);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('a06c308d-eed7-70b5-8a1b-45ebd109942d', 'app', 'lifestyle', 'Lifestyle', 70);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('585c6862-708d-7ff0-84cf-7b8c4c12ceef', 'app', 'music', 'Music', 80);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('6f30cf5d-b146-7d11-8abb-099b5bdb4c23', 'app', 'navigation', 'Navigation', 90);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('abebba06-daa3-76fe-81ab-322530273219', 'app', 'news', 'News', 100);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('d62d3de6-9cf2-74bc-88e7-11e0fa520a68', 'app', 'photo-video', 'Photo & Video', 110);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('99f34f63-58ad-7626-8d46-a8c51e51ec1f', 'app', 'productivity', 'Productivity', 120);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('1b94cad7-37cf-758d-88db-fccd92982d8e', 'app', 'reference', 'Reference', 130);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('12c12cb8-17fe-7aa6-8bca-52dec352c143', 'app', 'social', 'Social Networking', 140);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('f20927e9-e8ef-7404-81f5-5515d06b6e62', 'app', 'sports', 'Sports', 150);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('f36177db-6b95-79ee-8fe9-5c76d0ca16d0', 'app', 'travel', 'Travel', 160);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('7b96fdec-f12a-7030-8a7d-816749967451', 'app', 'utilities', 'Utilities', 170);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('777f8314-e17c-7fd6-8b78-be4c2e6dc635', 'app', 'weather', 'Weather', 180);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('10a1ed3a-0409-756f-8964-6df3d093bbf5', 'game', 'action', 'Action', 10);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('963ea9c9-ccce-70c3-8cde-d3fa3d99ce52', 'game', 'adventure', 'Adventure', 20);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('16258640-d8d2-773b-831f-0dba6fb4bf17', 'game', 'board', 'Board', 30);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('3fd8ba4b-6df0-76f3-86e2-d35e0f41620e', 'game', 'card', 'Card', 40);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('cf23fad0-3324-7926-831f-a0d6412cea9f', 'game', 'casual', 'Casual', 50);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('264b542c-573d-7227-827d-5a5c94dee7a2', 'game', 'family', 'Family', 60);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('3c0e4709-0352-765d-8f3b-bc591b1acd11', 'game', 'puzzle', 'Puzzle', 70);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('8d431d4c-c16a-7d74-8ff0-57eaf1fe3c95', 'game', 'racing', 'Racing', 80);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('b841ceda-8bc1-7ad5-8339-c805e2a50c40', 'game', 'role-playing', 'Role Playing', 90);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('515d359a-739b-7de2-8ef2-19e5e746e263', 'game', 'simulation', 'Simulation', 100);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('228d3867-ba00-7b34-859e-43dae9067c88', 'game', 'sports', 'Sports', 110);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('a05ace97-e186-70bf-8c52-d6739f8c0b54', 'game', 'strategy', 'Strategy', 120);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('24f65a60-fc03-705d-8939-a77c82e2895c', 'game', 'trivia', 'Trivia', 130);
--> statement-breakpoint
INSERT INTO `categories` (`id`, `listing_type`, `slug`, `name`, `sort_order`) VALUES ('8d859543-edc2-7aee-82a2-36df8f317503', 'game', 'word', 'Word', 140);
