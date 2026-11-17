import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/server/db';
import { users, profiles, wallets, transactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { seedAllAccounts } from '@/lib/server/seed-helper';

const createAccountSchema = z.object({
  displayName: z.string().trim().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự.').max(30),
  email: z.string().trim().email('Email không hợp lệ.').optional().or(z.literal('')),
  role: z.enum(['admin', 'player']).default('player'),
  status: z.enum(['approved', 'pending']).default('approved'),
  balance: z.number().int().min(0).default(1000000),
});

export async function GET() {
  try {
    const db = await getAppDb();

    // Ensure seed accounts exist
    await seedAllAccounts(db);

    // Fetch all accounts
    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });

    const accountList = await Promise.all(
      allUsers.map(async (u) => {
        const p = await db.query.profiles.findFirst({
          where: eq(profiles.userId, u.id),
        });
        const w = await db.query.wallets.findFirst({
          where: eq(wallets.userId, u.id),
        });

        return {
          id: u.id,
          email: u.email,
          displayName: p?.displayName || u.fullName || u.id,
          role: u.role,
          status: u.status,
          balance: w?.balance || 0,
          matchesPlayed: w?.matchesPlayed || 0,
          matchesWon: w?.matchesWon || 0,
        };
      })
    );

    return NextResponse.json({ accounts: accountList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const db = await getAppDb();
    const now = Date.now();
    const slug = parsed.data.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15) || 'user';
    const userId = `user_${slug}_${Math.random().toString(36).substring(2, 6)}`;
    const email = parsed.data.email || `${slug}_${now.toString().slice(-4)}@sites.test`;

    // Create user
    await db.insert(users).values({
      id: userId,
      email,
      fullName: parsed.data.displayName,
      role: parsed.data.role,
      status: parsed.data.status,
      createdAt: now,
      updatedAt: now,
    });

    // Create profile
    await db.insert(profiles).values({
      userId,
      displayName: parsed.data.displayName,
      avatarUrl: null,
      bio: 'Người chơi Tiến Lên Miền Nam',
      createdAt: now,
      updatedAt: now,
    });

    // Create wallet
    const walletId = `wallet_${userId}`;
    const startingBalance = parsed.data.balance;
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

    await db.insert(transactions).values({
      id: `tx_${now}_${userId}`,
      walletId,
      userId,
      amount: startingBalance,
      balanceAfter: startingBalance,
      type: 'STARTING_GRANT',
      description: 'Vốn khởi nghiệp ban đầu',
      createdAt: now,
    });

    // Sign in by setting cookie
    const res = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        status: parsed.data.status,
        balance: startingBalance,
      },
    });

    res.cookies.set('x-dev-user-id', userId, { path: '/', httpOnly: false });
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
