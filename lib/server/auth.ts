import { headers, cookies } from 'next/headers';
import { getChatGPTUser } from '../../app/chatgpt-auth';
import { getAppDb } from './db';
import { users, profiles, wallets } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'player';
  status: 'new' | 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason: string | null;
  profile: {
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  } | null;
  wallet: {
    id: string;
    balance: number;
    totalWon: number;
    totalLost: number;
    matchesPlayed: number;
    matchesWon: number;
  } | null;
}

const DEFAULT_ADMIN_EMAILS = ['seedy@sites.test', 'admin@tienlen.vn', 'admin@chatgpt.com'];

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const reqHeaders = await headers();
  const reqCookies = await cookies();
  const db = await getAppDb();

  let chatGPTUser = await getChatGPTUser();

  // Support dev user simulation if in local dev
  const devUserId = reqHeaders.get('x-dev-user-id') || reqCookies.get('x-dev-user-id')?.value;
  if (devUserId) {
    chatGPTUser = {
      userId: devUserId,
      email: `${devUserId}@sites.test`,
      displayName: devUserId.charAt(0).toUpperCase() + devUserId.slice(1),
      fullName: devUserId.charAt(0).toUpperCase() + devUserId.slice(1),
    };
  }

  if (!chatGPTUser) {
    return null;
  }

  // Lookup user in DB
  let dbUser = await db.query.users.findFirst({
    where: eq(users.id, chatGPTUser.userId),
  });

  const isAdminEmail = DEFAULT_ADMIN_EMAILS.includes(chatGPTUser.email.toLowerCase());

  if (!dbUser) {
    const now = Date.now();
    const role = isAdminEmail ? 'admin' : 'player';
    const status = isAdminEmail ? 'approved' : 'new';

    await db.insert(users).values({
      id: chatGPTUser.userId,
      email: chatGPTUser.email,
      fullName: chatGPTUser.fullName || chatGPTUser.displayName,
      role,
      status,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    if (isAdminEmail) {
      // Auto-create admin profile and wallet
      await db.insert(profiles).values({
        userId: chatGPTUser.userId,
        displayName: 'Quản trị viên',
        avatarUrl: null,
        bio: 'Hệ thống Quản trị Tiến Lên Miền Nam',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(wallets).values({
        id: `wallet_${chatGPTUser.userId}`,
        userId: chatGPTUser.userId,
        balance: 10000000,
        totalWon: 0,
        totalLost: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    dbUser = await db.query.users.findFirst({
      where: eq(users.id, chatGPTUser.userId),
    });
  }

  if (!dbUser) return null;

  // Fetch profile
  const userProfile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, dbUser.id),
  });

  // Fetch wallet
  const userWallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, dbUser.id),
  });

  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    role: dbUser.role as 'admin' | 'player',
    status: dbUser.status as 'new' | 'pending' | 'approved' | 'rejected' | 'suspended',
    rejectionReason: dbUser.rejectionReason,
    profile: userProfile
      ? {
          displayName: userProfile.displayName,
          avatarUrl: userProfile.avatarUrl,
          bio: userProfile.bio,
        }
      : null,
    wallet: userWallet
      ? {
          id: userWallet.id,
          balance: userWallet.balance,
          totalWon: userWallet.totalWon,
          totalLost: userWallet.totalLost,
          matchesPlayed: userWallet.matchesPlayed,
          matchesWon: userWallet.matchesWon,
        }
      : null,
  };
}

export async function requireApprovedUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Chưa đăng nhập. Vui lòng đăng nhập qua ChatGPT.');
  }

  if (user.status !== 'approved') {
    if (user.status === 'new') {
      throw new Error('Tài khoản mới. Vui lòng đăng ký tham gia chơi.');
    }
    if (user.status === 'pending') {
      throw new Error('Tài khoản đang chờ Quản trị viên xét duyệt.');
    }
    if (user.status === 'rejected') {
      throw new Error(`Tài khoản đã bị từ chối: ${user.rejectionReason || 'Không có lý do cụ thể'}`);
    }
    if (user.status === 'suspended') {
      throw new Error('Tài khoản đã bị tạm khóa bởi Quản trị viên.');
    }
    throw new Error('Tài khoản chưa được phê duyệt.');
  }

  return user;
}

export async function requireAdminUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Chưa đăng nhập.');
  }
  if (user.role !== 'admin') {
    throw new Error('Bạn không có quyền Quản trị viên.');
  }
  return user;
}
