CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`details` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_admin_id` ON `audit_logs` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `game_hands` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`seat_index` integer NOT NULL,
	`cards` text NOT NULL,
	`initial_cards` text NOT NULL,
	`finished_position` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `game_rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_game_hands_round_id` ON `game_hands` (`round_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_game_hands_round_seat` ON `game_hands` (`round_id`,`seat_index`);--> statement-breakpoint
CREATE TABLE `game_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`round_number` integer DEFAULT 1 NOT NULL,
	`stake` integer NOT NULL,
	`status` text DEFAULT 'playing' NOT NULL,
	`first_player_seat` integer NOT NULL,
	`current_turn_seat` integer NOT NULL,
	`last_play_seat` integer,
	`last_play_cards` text,
	`last_play_type` text,
	`trick_passes` text DEFAULT '[]' NOT NULL,
	`winner_seat` integer,
	`rank_positions` text DEFAULT '[]' NOT NULL,
	`instant_win_type` text,
	`round_logs` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_game_rounds_room_id` ON `game_rounds` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_game_rounds_created_at` ON `game_rounds` (`created_at`);--> statement-breakpoint
CREATE TABLE `game_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`room_id` text NOT NULL,
	`stake` integer NOT NULL,
	`settlement_data` text NOT NULL,
	`total_chop_bonuses` integer DEFAULT 0 NOT NULL,
	`total_penalties` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `game_rounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_settlements_round_id_unique` ON `game_settlements` (`round_id`);--> statement-breakpoint
CREATE INDEX `idx_game_settlements_room_id` ON `game_settlements` (`room_id`);--> statement-breakpoint
CREATE INDEX `idx_game_settlements_created_at` ON `game_settlements` (`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`bio` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `room_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`invitee_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_room_invitations_invitee` ON `room_invitations` (`invitee_user_id`);--> statement-breakpoint
CREATE INDEX `idx_room_invitations_room` ON `room_invitations` (`room_id`);--> statement-breakpoint
CREATE TABLE `room_seats` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`seat_index` integer NOT NULL,
	`user_id` text,
	`is_bot` integer DEFAULT false NOT NULL,
	`bot_difficulty` text,
	`bot_name` text,
	`is_host` integer DEFAULT false NOT NULL,
	`stake_accepted` integer DEFAULT false NOT NULL,
	`is_ready` integer DEFAULT false NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_room_seats_room_id` ON `room_seats` (`room_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_room_seats_room_seat` ON `room_seats` (`room_id`,`seat_index`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`host_user_id` text NOT NULL,
	`stake` integer DEFAULT 10000 NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`current_round_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rooms_code` ON `rooms` (`code`);--> statement-breakpoint
CREATE INDEX `idx_rooms_status` ON `rooms` (`status`);--> statement-breakpoint
CREATE INDEX `idx_rooms_visibility` ON `rooms` (`visibility`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_id` text NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`type` text NOT NULL,
	`reference_type` text,
	`reference_id` text,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_user_id` ON `transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_wallet_id` ON `transactions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_created_at` ON `transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`role` text DEFAULT 'player' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`rejection_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`balance` integer DEFAULT 1000000 NOT NULL,
	`total_won` integer DEFAULT 0 NOT NULL,
	`total_lost` integer DEFAULT 0 NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`matches_won` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_user_id_unique` ON `wallets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_wallets_user_id` ON `wallets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_wallets_balance` ON `wallets` (`balance`);