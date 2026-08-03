CREATE TABLE `daily_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sales_date` text NOT NULL,
	`product_asin` text NOT NULL,
	`units` integer DEFAULT 0 NOT NULL,
	`revenue_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_sales_date_asin` ON `daily_sales` (`sales_date`,`product_asin`);--> statement-breakpoint
CREATE INDEX `idx_daily_sales_date` ON `daily_sales` (`sales_date`);--> statement-breakpoint
CREATE TABLE `monitored_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_asin` text NOT NULL,
	`keyword` text NOT NULL,
	`source` text DEFAULT '团队新增词' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_monitored_keywords_asin_keyword` ON `monitored_keywords` (`product_asin`,`keyword`);--> statement-breakpoint
CREATE INDEX `idx_monitored_keywords_active_asin` ON `monitored_keywords` (`is_active`,`product_asin`);--> statement-breakpoint
CREATE TABLE `refresh_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_asin` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`message` text,
	`requested_by_user_id` text NOT NULL,
	`requested_by_email` text NOT NULL,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`started_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_refresh_jobs_asin_requested` ON `refresh_jobs` (`product_asin`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_refresh_jobs_status` ON `refresh_jobs` (`status`);--> statement-breakpoint
DROP INDEX `idx_manual_keyword_date_keyword`;--> statement-breakpoint
ALTER TABLE `manual_keyword_ranks` ADD `product_asin` text DEFAULT 'B0GGTPHQZK' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_manual_keyword_date_asin_keyword` ON `manual_keyword_ranks` (`snapshot_date`,`product_asin`,`keyword`);--> statement-breakpoint
ALTER TABLE `products` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
PRAGMA optimize;
