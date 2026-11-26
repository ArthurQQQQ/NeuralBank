CREATE TABLE `contributions` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `category` text NOT NULL,
  `summary` text NOT NULL,
  `source` text NOT NULL,
  `contributor` text NOT NULL,
  `created_at` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contributions_status_created_idx` ON `contributions` (`status`, `created_at`);
