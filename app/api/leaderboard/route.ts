import { NextResponse } from 'next/server';
import { getAppDb } from '../../../lib/server/db';
import { wallets, profiles, users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const db = await getAppDb();

    // Fetch all approved players with their profiles and wallets
    const allWallets = await db.query.wallets.findMany();
    const approvedUsers = await db.query.users.findMany({
      where: eq(users.status, 'approved'),
    });
    const approvedUserIds = new Set(approvedUsers.map((u) => u.id));
    const allProfiles = await db.query.profiles.findMany();
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    const leaderboardItems = allWallets
      .filter((w) => approvedUserIds.has(w.userId))
      .map((w) => {
        const prof = profileMap.get(w.userId);
        // Hiệu của tổng tiền thắng và tổng tiền thua
        const netProfit = w.totalWon - w.totalLost;

        return {
          userId: w.userId,
          displayName: prof?.displayName || 'Người chơi',
          avatarUrl: prof?.avatarUrl || null,
          totalWon: w.totalWon,
          totalLost: w.totalLost,
          netProfit,
        };
      });

    // Sắp xếp giảm dần theo hiệu của tổng tiền thắng và tổng tiền thua
    leaderboardItems.sort((a, b) => b.netProfit - a.netProfit);

    // Gán thứ hạng
    const ranked = leaderboardItems.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    return NextResponse.json({
      leaderboard: ranked,
      timeframe: 'all',
      totalCount: ranked.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
