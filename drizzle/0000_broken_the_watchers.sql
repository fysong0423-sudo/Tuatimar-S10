CREATE TABLE `manual_bsr_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_date` text NOT NULL,
	`asin` text NOT NULL,
	`bsr` integer NOT NULL,
	`category` text NOT NULL,
	`zip` text DEFAULT '90001' NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_manual_bsr_date_asin` ON `manual_bsr_entries` (`snapshot_date`,`asin`);--> statement-breakpoint
CREATE INDEX `idx_manual_bsr_date` ON `manual_bsr_entries` (`snapshot_date`);--> statement-breakpoint
CREATE TABLE `manual_keyword_ranks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_date` text NOT NULL,
	`keyword` text NOT NULL,
	`rank` integer,
	`page` integer,
	`status` text NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_manual_keyword_date_keyword` ON `manual_keyword_ranks` (`snapshot_date`,`keyword`);--> statement-breakpoint
CREATE INDEX `idx_manual_keyword_date` ON `manual_keyword_ranks` (`snapshot_date`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`asin` text NOT NULL,
	`market` text DEFAULT 'Amazon US' NOT NULL,
	`zip` text DEFAULT '90001' NOT NULL,
	`amazon_url` text NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_asin` ON `products` (`asin`);--> statement-breakpoint
PRAGMA optimize;
