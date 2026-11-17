import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/server/db';
import { users, profiles, wallets, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { userId, role, displayName } = body || {};
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = await getAppDb();
    const now = Date.now();

    let u = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!u) {
      await db.insert(users).values({
        id: userId,
        email: `${userId}@sites.test`,
        fullName: displayName || userId,
        role: role || (userId.includes('admin') ? 'admin' : 'player'),
        status: 'approved',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(profiles).values({
        userId,
        displayName: displayName || (userId.includes('admin') ? 'Quản trị viên' : `Người chơi ${userId}`),
        avatarUrl: null,
        bio: 'Tài khoản thử nghiệm',
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(wallets).values({
        id: `wallet_${userId}`,
        userId,
        balance: 1000000,
        totalWon: 0,
        totalLost: 0,
        matchesPlayed: 0,
        matchesWon: 0,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(transactions).values({
        id: `tx_${now}_dev_${userId}`,
        walletId: `wallet_${userId}`,
        userId,
        amount: 1000000,
        balanceAfter: 1000000,
        type: 'STARTING_GRANT',
        description: 'Vốn khởi nghiệp thử nghiệm',
        createdAt: now,
      });
    }

    const res = NextResponse.json({ success: true, userId });
    res.cookies.set('x-dev-user-id', userId, { path: '/', httpOnly: false });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
