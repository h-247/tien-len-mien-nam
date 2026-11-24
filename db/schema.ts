import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(), // ChatGPT User ID or local dev ID
    email: text('email').notNull(),
    username: text('username'),
    passwordHash: text('password_hash'),
    fullName: text('full_name'),
    role: text('role', { enum: ['admin', 'player'] }).notNull().default('player'),
    status: text('status', {
      enum: ['new', 'pending', 'approved', 'rejected', 'suspended'],
    })
      .notNull()
      .default('new'),
    rejectionReason: text('rejection_reason'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_username').on(table.username),
    index('idx_users_status').on(table.status),
    index('idx_users_role').on(table.role),
  ]
);

export const profiles = sqliteTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const wallets = sqliteTable(
  'wallets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(1000000), // Virtual VND integer
    totalWon: integer('total_won').notNull().default(0),
    totalLost: integer('total_lost').notNull().default(0),
    matchesPlayed: integer('matches_played').notNull().default(0),
    matchesWon: integer('matches_won').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_wallets_user_id').on(table.userId),
    index('idx_wallets_balance').on(table.balance),
  ]
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(), // Positive or negative VND
    balanceAfter: integer('balance_after').notNull(),
    type: text('type').notNull(), // 'STARTING_GRANT' | 'MATCH_SETTLEMENT' | 'CHOP_BONUS' | 'CHOP_PENALTY' | 'ADMIN_ADJUSTMENT'
    referenceType: text('reference_type'), // 'round' | 'admin' | 'system'
    referenceId: text('reference_id'),
    description: text('description').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_transactions_user_id').on(table.userId),
    index('idx_transactions_wallet_id').on(table.walletId),
    index('idx_transactions_created_at').on(table.createdAt),
  ]
);

export const rooms = sqliteTable(
  'rooms',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    hostUserId: text('host_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stake: integer('stake').notNull().default(1000), // Default 1.000 VND
    status: text('status', {
      enum: ['waiting', 'ready', 'playing', 'finished', 'closed'],
    })
      .notNull()
      .default('waiting'),
    visibility: text('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('public'),
    currentRoundId: text('current_round_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_rooms_code').on(table.code),
    index('idx_rooms_status').on(table.status),
    index('idx_rooms_visibility').on(table.visibility),
  ]
);

export const roomSeats = sqliteTable(
  'room_seats',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    seatIndex: integer('seat_index').notNull(), // 0, 1, 2, 3
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    isBot: integer('is_bot', { mode: 'boolean' }).notNull().default(false),
    botDifficulty: text('bot_difficulty', { enum: ['easy', 'medium', 'hard'] }),
    botName: text('bot_name'),
    isHost: integer('is_host', { mode: 'boolean' }).notNull().default(false),
    stakeAccepted: integer('stake_accepted', { mode: 'boolean' }).notNull().default(false),
    isReady: integer('is_ready', { mode: 'boolean' }).notNull().default(false),
    joinedAt: integer('joined_at').notNull(),
  },
  (table) => [
    index('idx_room_seats_room_id').on(table.roomId),
    uniqueIndex('idx_room_seats_room_seat').on(table.roomId, table.seatIndex),
  ]
);

export const roomInvitations = sqliteTable(
  'room_invitations',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    inviterUserId: text('inviter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inviteeUserId: text('invitee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted', 'declined'] })
      .notNull()
      .default('pending'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_room_invitations_invitee').on(table.inviteeUserId),
    index('idx_room_invitations_room').on(table.roomId),
  ]
);

export const gameRounds = sqliteTable(
  'game_rounds',
  {
    id: text('id').primaryKey(),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    roundNumber: integer('round_number').notNull().default(1),
    stake: integer('stake').notNull(),
    status: text('status', { enum: ['playing', 'finished'] })
      .notNull()
      .default('playing'),
    firstPlayerSeat: integer('first_player_seat').notNull(),
    currentTurnSeat: integer('current_turn_seat').notNull(),
    lastPlaySeat: integer('last_play_seat'), // Seat that played the current trick's highest cards
    lastPlayCards: text('last_play_cards'), // JSON array of string card IDs
    lastPlayType: text('last_play_type'), // Combo type
    trickPasses: text('trick_passes').notNull().default('[]'), // JSON array of seat indices who passed in current trick
    winnerSeat: integer('winner_seat'), // First player to finish
    rankPositions: text('rank_positions').notNull().default('[]'), // JSON array of seat indices in order of finish [1st, 2nd, 3rd, 4th]
    instantWinType: text('instant_win_type'), // 'dragon_straight' | 'six_pairs' | 'five_pairs' | 'four_twos' | 'same_color' | null
    roundLogs: text('round_logs').notNull().default('[]'), // JSON array of event messages
    version: integer('version').notNull().default(1), // Concurrency version
    createdAt: integer('created_at').notNull(),
    finishedAt: integer('finished_at'),
  },
  (table) => [
    index('idx_game_rounds_room_id').on(table.roomId),
    index('idx_game_rounds_created_at').on(table.createdAt),
  ]
);

export const gameHands = sqliteTable(
  'game_hands',
  {
    id: text('id').primaryKey(),
    roundId: text('round_id')
      .notNull()
      .references(() => gameRounds.id, { onDelete: 'cascade' }),
    seatIndex: integer('seat_index').notNull(),
    cards: text('cards').notNull(), // JSON array of string card IDs currently in hand
    initialCards: text('initial_cards').notNull(), // JSON array of string card IDs initially dealt
    finishedPosition: integer('finished_position'), // 1 (Nhất), 2 (Nhì), 3 (Ba), 4 (Bét)
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_game_hands_round_id').on(table.roundId),
    uniqueIndex('idx_game_hands_round_seat').on(table.roundId, table.seatIndex),
  ]
);

export const gameSettlements = sqliteTable(
  'game_settlements',
  {
    id: text('id').primaryKey(),
    roundId: text('round_id')
      .notNull()
      .unique()
      .references(() => gameRounds.id, { onDelete: 'cascade' }),
    roomId: text('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    stake: integer('stake').notNull(),
    settlementData: text('settlement_data').notNull(), // JSON breakdown of player payouts/penalties
    totalChopBonuses: integer('total_chop_bonuses').notNull().default(0),
    totalPenalties: integer('total_penalties').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_game_settlements_room_id').on(table.roomId),
    index('idx_game_settlements_created_at').on(table.createdAt),
  ]
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    details: text('details').notNull(), // JSON metadata
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_audit_logs_admin_id').on(table.adminUserId),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ]
);

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
