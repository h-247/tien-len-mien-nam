import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth';
import { getAppDb } from '@/lib/server/db';
import { users, profiles, wallets, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự.')
    .max(30, 'Tên hiển thị tối đa 30 ký tự.'),
  avatarUrl: z.string().url('Đường dẫn ảnh đại diện không hợp lệ.').optional().or(z.literal('')),
  bio: z.string().trim().max(200, 'Giới thiệu tối đa 200 ký tự.').optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập qua ChatGPT.' },
        { status: 401 }
      );
    }

    if (user.status !== 'new' && user.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Tài khoản đã gửi yêu cầu đăng ký hoặc đã được kích hoạt.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const db = await getAppDb();
    const now = Date.now();

    // Update user status to 'pending'
    await db
      .update(users)
      .set({
        status: 'pending',
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    // Create or update profile
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
    });

    if (existingProfile) {
      await db
        .update(profiles)
        .set({
          displayName: parsed.data.displayName,
          avatarUrl: parsed.data.avatarUrl || null,
          bio: parsed.data.bio || null,
          updatedAt: now,
        })
        .where(eq(profiles.userId, user.id));
    } else {
      await db.insert(profiles).values({
        userId: user.id,
        displayName: parsed.data.displayName,
        avatarUrl: parsed.data.avatarUrl || null,
        bio: parsed.data.bio || null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Ensure wallet exists
    const existingWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    if (!existingWallet) {
      const walletId = `wallet_${user.id}`;
      const startingBalance = 1000000; // 1.000.000 VND
      await db.insert(wallets).values({
        id: walletId,
        userId: user.id,
        balance: startingBalance,
        totalWon: 0,
        totalLost: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Starting grant transaction
      await db.insert(transactions).values({
        id: `tx_${now}_init`,
        walletId,
        userId: user.id,
        amount: startingBalance,
        balanceAfter: startingBalance,
        type: 'STARTING_GRANT',
        referenceType: 'system',
        referenceId: 'welcome',
        description: 'Tặng vốn khởi nghiệp 1.000.000 ₫ khi gia nhập Tiến Lên Miền Nam',
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Gửi yêu cầu đăng ký thành công! Vui lòng chờ Quản trị viên xét duyệt.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
