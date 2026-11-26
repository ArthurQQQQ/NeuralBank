CREATE TABLE `submissions` (
  `id` text PRIMARY KEY NOT NULL,
  `author_id` text NOT NULL,
  `payload_json` text NOT NULL,
  `content_hash` text NOT NULL,
  `created_at` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `format_status` text DEFAULT 'passed' NOT NULL,
  `reproduction_status` text DEFAULT 'unverified' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_author_content_idx` ON `submissions` (`author_id`, `content_hash`);
--> statement-breakpoint
CREATE INDEX `submissions_created_idx` ON `submissions` (`created_at`);
