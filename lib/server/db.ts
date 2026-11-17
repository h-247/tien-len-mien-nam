import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

let initialized = false;

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
	id text PRIMARY KEY NOT NULL,
	email text NOT NULL,
	username text,
	password_hash text,
	full_name text,
	role text DEFAULT 'player' NOT NULL,
	status text DEFAULT 'new' NOT NULL,
	rejection_reason text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS profiles (
	user_id text PRIMARY KEY NOT NULL,
	display_name text NOT NULL,
	avatar_url text,
	bio text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS wallets (
	id text PRIMARY KEY NOT NULL,
	user_id text NOT NULL UNIQUE,
	balance integer DEFAULT 1000000 NOT NULL,
	total_won integer DEFAULT 0 NOT NULL,
	total_lost integer DEFAULT 0 NOT NULL,
	matches_played integer DEFAULT 0 NOT NULL,
	matches_won integer DEFAULT 0 NOT NULL,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_balance ON wallets (balance);

CREATE TABLE IF NOT EXISTS transactions (
	id text PRIMARY KEY NOT NULL,
	wallet_id text NOT NULL,
	user_id text NOT NULL,
	amount integer NOT NULL,
	balance_after integer NOT NULL,
	type text NOT NULL,
	reference_type text,
	reference_id text,
	description text NOT NULL,
	created_at integer NOT NULL,
	FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);

CREATE TABLE IF NOT EXISTS rooms (
	id text PRIMARY KEY NOT NULL,
	code text NOT NULL UNIQUE,
	name text NOT NULL,
	host_user_id text NOT NULL,
	stake integer DEFAULT 10000 NOT NULL,
	status text DEFAULT 'waiting' NOT NULL,
	visibility text DEFAULT 'public' NOT NULL,
	current_round_id text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	FOREIGN KEY (host_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_visibility ON rooms (visibility);

CREATE TABLE IF NOT EXISTS room_seats (
	id text PRIMARY KEY NOT NULL,
	room_id text NOT NULL,
	seat_index integer NOT NULL,
	user_id text,
	is_bot integer DEFAULT 0 NOT NULL,
	bot_difficulty text,
	bot_name text,
	is_host integer DEFAULT 0 NOT NULL,
	stake_accepted integer DEFAULT 0 NOT NULL,
	is_ready integer DEFAULT 0 NOT NULL,
	joined_at integer NOT NULL,
	FOREIGN KEY (room_id) REFERENCES rooms(id) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS idx_room_seats_room_id ON room_seats (room_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_seats_room_seat ON room_seats (room_id, seat_index);

CREATE TABLE IF NOT EXISTS room_invitations (
	id text PRIMARY KEY NOT NULL,
	room_id text NOT NULL,
	inviter_user_id text NOT NULL,
	invitee_user_id text NOT NULL,
	status text DEFAULT 'pending' NOT NULL,
	created_at integer NOT NULL,
	FOREIGN KEY (room_id) REFERENCES rooms(id) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_room_invitations_invitee ON room_invitations (invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_room ON room_invitations (room_id);

CREATE TABLE IF NOT EXISTS game_rounds (
	id text PRIMARY KEY NOT NULL,
	room_id text NOT NULL,
	round_number integer DEFAULT 1 NOT NULL,
	stake integer NOT NULL,
	status text DEFAULT 'playing' NOT NULL,
	first_player_seat integer NOT NULL,
	current_turn_seat integer NOT NULL,
	last_play_seat integer,
	last_play_cards text,
	last_play_type text,
	trick_passes text DEFAULT '[]' NOT NULL,
	winner_seat integer,
	rank_positions text DEFAULT '[]' NOT NULL,
	instant_win_type text,
	round_logs text DEFAULT '[]' NOT NULL,
	version integer DEFAULT 1 NOT NULL,
	created_at integer NOT NULL,
	finished_at integer,
	FOREIGN KEY (room_id) REFERENCES rooms(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_game_rounds_room_id ON game_rounds (room_id);
CREATE INDEX IF NOT EXISTS idx_game_rounds_created_at ON game_rounds (created_at);

CREATE TABLE IF NOT EXISTS game_hands (
	id text PRIMARY KEY NOT NULL,
	round_id text NOT NULL,
	seat_index integer NOT NULL,
	cards text NOT NULL,
	initial_cards text NOT NULL,
	finished_position integer,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	FOREIGN KEY (round_id) REFERENCES game_rounds(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_game_hands_round_id ON game_hands (round_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_hands_round_seat ON game_hands (round_id, seat_index);

CREATE TABLE IF NOT EXISTS game_settlements (
	id text PRIMARY KEY NOT NULL,
	round_id text NOT NULL UNIQUE,
	room_id text NOT NULL,
	stake integer NOT NULL,
	settlement_data text NOT NULL,
	total_chop_bonuses integer DEFAULT 0 NOT NULL,
	total_penalties integer DEFAULT 0 NOT NULL,
	created_at integer NOT NULL,
	FOREIGN KEY (round_id) REFERENCES game_rounds(id) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (room_id) REFERENCES rooms(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_game_settlements_room_id ON game_settlements (room_id);
CREATE INDEX IF NOT EXISTS idx_game_settlements_created_at ON game_settlements (created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
	id text PRIMARY KEY NOT NULL,
	admin_user_id text NOT NULL,
	action text NOT NULL,
	target_type text NOT NULL,
	target_id text NOT NULL,
	details text NOT NULL,
	created_at integer NOT NULL,
	FOREIGN KEY (admin_user_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE IF NOT EXISTS system_settings (
	key text PRIMARY KEY NOT NULL,
	value text NOT NULL,
	updated_at integer NOT NULL
);
`;

export async function getAppDb() {
  if (!env.DB) {
    throw new Error('Cloudflare D1 binding DB is unavailable.');
  }

  if (!initialized) {
    try {
      await env.DB.exec(INIT_SQL);
      try {
        await env.DB.exec('ALTER TABLE users ADD COLUMN password_hash text;');
      } catch (_) {}
      try {
        await env.DB.exec('ALTER TABLE users ADD COLUMN username text;');
      } catch (_) {}
      try {
        await env.DB.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);');
      } catch (_) {}
      initialized = true;
    } catch (e) {
      console.error('Error ensuring tables:', e);
    }
  }

  return drizzle(env.DB, { schema });
}
