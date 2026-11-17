import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

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

CREATE TABLE IF NOT EXISTS system_settings (
	key text PRIMARY KEY NOT NULL,
	value text NOT NULL,
	updated_at integer NOT NULL
);

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
`;

const SEED_ACCOUNTS = [
  // --- Quản trị viên (Admins) ---
  {
    id: 'local_seedy',
    email: 'seedy@sites.test',
    fullName: 'Quản trị viên Seedy',
    displayName: 'Quản trị viên (Seedy)',
    role: 'admin',
    status: 'approved',
    bio: 'Quản trị viên hệ thống Tiến Lên Miền Nam Online',
    balance: 10000000,
    totalWon: 5000000,
    totalLost: 2000000,
    matchesPlayed: 45,
    matchesWon: 30,
  },
  {
    id: 'admin_minh',
    email: 'minh.hoang@tienlen.vn',
    fullName: 'Hoàng Minh Quân',
    displayName: 'Admin Minh Quân',
    role: 'admin',
    status: 'approved',
    bio: 'Giám sát trận đấu & điều hành phòng game',
    balance: 20000000,
    totalWon: 12000000,
    totalLost: 4000000,
    matchesPlayed: 80,
    matchesWon: 55,
  },

  // --- Cao thủ đã duyệt (Approved Players) ---
  {
    id: 'player1',
    email: 'player1@sites.test',
    fullName: 'Nguyễn Văn A',
    displayName: 'Nguyễn Văn A (Thần Bài)',
    role: 'player',
    status: 'approved',
    bio: 'Chuyên gia tới trắng và chặt 3 đôi thông',
    balance: 5000000,
    totalWon: 4200000,
    totalLost: 1800000,
    matchesPlayed: 52,
    matchesWon: 34,
  },
  {
    id: 'player2',
    email: 'player2@sites.test',
    fullName: 'Trần Thị B',
    displayName: 'Trần Thị B (Nữ Hoàng Heo)',
    role: 'player',
    status: 'approved',
    bio: 'Giữ heo cơ đến cuối ván để chốt hạ',
    balance: 3800000,
    totalWon: 2900000,
    totalLost: 1400000,
    matchesPlayed: 40,
    matchesWon: 24,
  },
  {
    id: 'player3',
    email: 'player3@sites.test',
    fullName: 'Lê Văn C',
    displayName: 'Lê Văn C (Tay Đua Bài)',
    role: 'player',
    status: 'approved',
    bio: 'Lối đánh tốc độ, ưu tiên xả rác và sảnh dài',
    balance: 2500000,
    totalWon: 1800000,
    totalLost: 1200000,
    matchesPlayed: 32,
    matchesWon: 17,
  },
  {
    id: 'player4',
    email: 'player4@sites.test',
    fullName: 'Phạm Thị D',
    displayName: 'Phạm Thị D (Thánh Xếp Sảnh)',
    role: 'player',
    status: 'approved',
    bio: 'Bậc thầy biến hóa sảnh rồng và tứ quý ẩn',
    balance: 1500000,
    totalWon: 1100000,
    totalLost: 900000,
    matchesPlayed: 24,
    matchesWon: 13,
  },
  {
    id: 'player_vinh',
    email: 'vinh.phong@gmail.com',
    fullName: 'Vũ Quang Vinh',
    displayName: 'Vũ Quang Vinh (Đại Gia)',
    role: 'player',
    status: 'approved',
    bio: 'Cược lớn không ngại, sẵn sàng đọ tứ quý',
    balance: 15000000,
    totalWon: 14000000,
    totalLost: 6000000,
    matchesPlayed: 68,
    matchesWon: 45,
  },
  {
    id: 'player_huong',
    email: 'huong.do@yahoo.com',
    fullName: 'Đỗ Thu Hương',
    displayName: 'Đỗ Thu Hương (Hải Phòng)',
    role: 'player',
    status: 'approved',
    bio: 'Đánh chắc thắng chắc, tính toán từng lá bài rác',
    balance: 8200000,
    totalWon: 6500000,
    totalLost: 2800000,
    matchesPlayed: 55,
    matchesWon: 36,
  },
  {
    id: 'player_nam',
    email: 'nam.hoang@tienlen.vn',
    fullName: 'Hoàng Văn Nam',
    displayName: 'Hoàng Nam (Vua Tới Trắng)',
    role: 'player',
    status: 'approved',
    bio: 'May mắn là một phần thực lực',
    balance: 4600000,
    totalWon: 3200000,
    totalLost: 1600000,
    matchesPlayed: 35,
    matchesWon: 21,
  },
  {
    id: 'player_linh',
    email: 'linh.mai@outlook.com',
    fullName: 'Mai Phương Linh',
    displayName: 'Mai Linh (Rình Heo)',
    role: 'player',
    status: 'approved',
    bio: 'Ai đi heo trước là xác định với 4 đôi thông!',
    balance: 2800000,
    totalWon: 1900000,
    totalLost: 1500000,
    matchesPlayed: 28,
    matchesWon: 14,
  },

  // --- Tài khoản chờ duyệt (Pending Accounts) ---
  {
    id: 'player_pending_tuan',
    email: 'tuan.trinh@gmail.com',
    fullName: 'Trịnh Quốc Tuấn',
    displayName: 'Trịnh Tuấn (Tân Thủ)',
    role: 'player',
    status: 'pending',
    bio: 'Tân thủ mới gia nhập, xin phép ban quản trị phê duyệt',
    balance: 1000000,
    totalWon: 0,
    totalLost: 0,
    matchesPlayed: 0,
    matchesWon: 0,
  },
  {
    id: 'player_pending_nga',
    email: 'nga.bui@gmail.com',
    fullName: 'Bùi Thanh Nga',
    displayName: 'Bùi Thanh Nga (Chờ Duyệt)',
    role: 'player',
    status: 'pending',
    bio: 'Người chơi mới từ miền Trung, mong được giao lưu học hỏi',
    balance: 1000000,
    totalWon: 0,
    totalLost: 0,
    matchesPlayed: 0,
    matchesWon: 0,
  },

  // --- Tài khoản bị tạm khóa (Suspended Account) ---
  {
    id: 'player_suspended_huy',
    email: 'huy.dang@spammer.org',
    fullName: 'Đặng Gia Huy',
    displayName: 'Đặng Gia Huy (Tạm Khóa)',
    role: 'player',
    status: 'suspended',
    bio: 'Tài khoản vi phạm quy tắc chơi gian lận',
    rejectionReason: 'Vi phạm quy chế phòng chơi nhiều lần',
    balance: 450000,
    totalWon: 200000,
    totalLost: 800000,
    matchesPlayed: 12,
    matchesWon: 3,
  },
];

function findD1DatabaseFiles() {
  const baseDir = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    return [];
  }
  return fs.readdirSync(baseDir)
    .filter(f => f.endsWith('.sqlite') && !f.startsWith('metadata'))
    .map(f => path.join(baseDir, f));
}

export function seedDatabase(dbPath) {
  console.log(`\n🌱 Khởi tạo và nạp dữ liệu mẫu vào: ${dbPath}`);
  const db = new Database(dbPath);

  // Execute table creation
  const statements = INIT_SQL.replace(/\r\n/g, '\n').split(';').map(s => s.trim()).filter(Boolean);
  for (const s of statements) {
    try { db.exec(s); } catch (_) {}
  }
  try { db.exec('ALTER TABLE users ADD COLUMN password_hash text;'); } catch (_) {}
  try { db.exec('ALTER TABLE users ADD COLUMN username text;'); } catch (_) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);'); } catch (_) {}

  const now = Date.now();
  let inserted = 0;
  let updated = 0;

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, full_name, role, status, rejection_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateUser = db.prepare(`
    UPDATE users SET role = ?, status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?
  `);

  const insertProfile = db.prepare(`
    INSERT INTO profiles (user_id, display_name, avatar_url, bio, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateProfile = db.prepare(`
    UPDATE profiles SET display_name = ?, bio = ?, updated_at = ? WHERE user_id = ?
  `);

  const insertWallet = db.prepare(`
    INSERT INTO wallets (id, user_id, balance, total_won, total_lost, matches_played, matches_won, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateWallet = db.prepare(`
    UPDATE wallets SET balance = ?, total_won = ?, total_lost = ?, matches_played = ?, matches_won = ?, updated_at = ?
    WHERE user_id = ?
  `);

  const insertTx = db.prepare(`
    INSERT INTO transactions (id, wallet_id, user_id, amount, balance_after, type, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const checkUser = db.prepare(`SELECT id FROM users WHERE id = ?`);

  const seedTransaction = db.transaction(() => {
    for (const acc of SEED_ACCOUNTS) {
      const exists = checkUser.get(acc.id);
      if (!exists) {
        insertUser.run(acc.id, acc.email, acc.fullName, acc.role, acc.status, acc.rejectionReason || null, now, now);
        insertProfile.run(acc.id, acc.displayName, null, acc.bio, now, now);
        insertWallet.run(`wallet_${acc.id}`, acc.id, acc.balance, acc.totalWon, acc.totalLost, acc.matchesPlayed, acc.matchesWon, now, now);
        insertTx.run(`tx_${now}_${acc.id}`, `wallet_${acc.id}`, acc.id, acc.balance, acc.balance, 'STARTING_GRANT', 'Vốn khởi nghiệp mặc định', now);
        inserted++;
      } else {
        updateUser.run(acc.role, acc.status, acc.rejectionReason || null, now, acc.id);
        updateProfile.run(acc.displayName, acc.bio, now, acc.id);
        updateWallet.run(acc.balance, acc.totalWon, acc.totalLost, acc.matchesPlayed, acc.matchesWon, now, acc.id);
        updated++;
      }
    }
  });

  seedTransaction();

  console.log(`✅ Hoàn tất: ${inserted} tài khoản mới tạo, ${updated} tài khoản được cập nhật.`);
  db.close();
}

function main() {
  const dbFiles = findD1DatabaseFiles();
  if (dbFiles.length === 0) {
    // If no db files found yet, create default database file
    const defaultDb = path.resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/tienlen-local.sqlite');
    seedDatabase(defaultDb);
  } else {
    for (const f of dbFiles) {
      seedDatabase(f);
    }
  }

  console.log('\n📋 DANH SÁCH TÀI KHOẢN MẪU ĐÃ NẠP (SEED ACCOUNTS):');
  console.log('='.repeat(78));
  console.log(
    'ID'.padEnd(20) +
    'Tên hiển thị'.padEnd(28) +
    'Vai trò'.padEnd(10) +
    'Trạng thái'.padEnd(12) +
    'Số dư (VND)'
  );
  console.log('-'.repeat(78));

  for (const acc of SEED_ACCOUNTS) {
    const roleIcon = acc.role === 'admin' ? '🛡️ Admin' : '🎮 Player';
    const statusMap = {
      approved: 'Đã duyệt',
      pending: 'Chờ duyệt',
      suspended: 'Tạm khóa',
      rejected: 'Từ chối',
      new: 'Mới',
    };
    console.log(
      acc.id.padEnd(20) +
      acc.displayName.padEnd(28) +
      roleIcon.padEnd(10) +
      (statusMap[acc.status] || acc.status).padEnd(12) +
      acc.balance.toLocaleString('vi-VN') + ' ₫'
    );
  }
  console.log('='.repeat(78));
}

main();
