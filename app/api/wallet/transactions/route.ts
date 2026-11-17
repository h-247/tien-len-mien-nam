import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import { getAppDb } from '@/lib/server/db';
import { transactions, wallets } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await requireApprovedUser();
    const db = await getAppDb();

    const userWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    const txList = await db.query.transactions.findMany({
      where: eq(transactions.userId, user.id),
      orderBy: [desc(transactions.createdAt)],
      limit: 50,
    });

    return NextResponse.json({
      balance: userWallet?.balance || 0,
      totalWon: userWallet?.totalWon || 0,
      totalLost: userWallet?.totalLost || 0,
      matchesPlayed: userWallet?.matchesPlayed || 0,
      matchesWon: userWallet?.matchesWon || 0,
      transactions: txList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
