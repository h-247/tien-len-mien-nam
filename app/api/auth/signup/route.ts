import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/server/db';
import { users, profiles, wallets, transactions } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { hashPassword } from '@/lib/server/crypto';

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự.')
    .max(30, 'Tên đăng nhập tối đa 30 ký tự.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới.'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự.')
    .max(100, 'Mật khẩu tối đa 100 ký tự.'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự.')
    .max(30, 'Tên hiển thị tối đa 30 ký tự.'),
  email: z
    .string()
    .trim()
    .email('Email không đúng định dạng.')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .trim()
    .max(250, 'Giới thiệu tối đa 250 ký tự.')
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const { username, password, displayName, bio } = parsed.data;
    const cleanUsername = username.toLowerCase();
    const cleanEmail = parsed.data.email
      ? parsed.data.email.toLowerCase()
      : `${cleanUsername}@tienlen.vn`;

    const db = await getAppDb();

    // Check if username already exists
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, cleanUsername),
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email này đã được sử dụng. Vui lòng chọn email khác.' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const userId = `user_${cleanUsername}_${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = await hashPassword(password);

    // Insert user with status 'pending' (Awaiting Administrator Approval)
    await db.insert(users).values({
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      fullName: displayName,
      role: 'player',
      status: 'pending', // Key: requires admin approval!
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    // Insert profile
    await db.insert(profiles).values({
      userId,
      displayName,
      avatarUrl: null,
      bio: bio || 'Người chơi mới đăng ký chờ ban quản trị duyệt.',
      createdAt: now,
      updatedAt: now,
    });

    // Create wallet with default starting balance (1.000.000 VND)
    const walletId = `wallet_${userId}`;
    const startingBalance = 1000000;
    await db.insert(wallets).values({
      id: walletId,
      userId,
      balance: startingBalance,
      totalWon: 0,
      totalLost: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create starting transaction
    await db.insert(transactions).values({
      id: `tx_${now}_${userId}`,
      walletId,
      userId,
      amount: startingBalance,
      balanceAfter: startingBalance,
      type: 'STARTING_GRANT',
      description: 'Vốn khởi nghiệp mặc định khi đăng ký',
      createdAt: now,
    });

    const res = NextResponse.json({
      success: true,
      message: 'Đăng ký thành công! Hồ sơ của bạn đã được gửi tới Ban quản trị để phê duyệt.',
      user: {
        id: userId,
        username: cleanUsername,
        displayName,
        email: cleanEmail,
        role: 'player',
        status: 'pending',
        balance: startingBalance,
      },
    });

    // Set cookie so they are logged in and see the "Chờ duyệt" screen
    res.cookies.set('x-dev-user-id', userId, { path: '/', httpOnly: false });
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
