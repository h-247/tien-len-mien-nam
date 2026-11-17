import { NextResponse } from 'next/server';
import { getAppDb } from '../../../lib/server/db';
import { wallets, profiles, users, transactions } from '../../../db/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const timeframe = url.searchParams.get('timeframe') || 'all'; // 'today' | 'week' | 'month' | 'all'
    const sortBy = url.searchParams.get('sortBy') || 'profit'; // 'profit' | 'balance' | 'wins' | 'winRate'

    const db = await getAppDb();

    // Calculate start timestamp for timeframe in Vietnam Time (UTC+7)
    let startTime = 0;
    const now = new Date();
    // Offset for UTC+7 (420 minutes)
    const vnOffsetMs = 7 * 60 * 60 * 1000;
    const vnNow = new Date(now.getTime() + vnOffsetMs);

    if (timeframe === 'today') {
      const vnStartOfDay = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));
      startTime = vnStartOfDay.getTime() - vnOffsetMs;
    } else if (timeframe === 'week') {
      const dayOfWeek = vnNow.getUTCDay(); // 0 is Sunday
      const diff = vnNow.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
      const vnStartOfWeek = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), diff));
      startTime = vnStartOfWeek.getTime() - vnOffsetMs;
    } else if (timeframe === 'month') {
      const vnStartOfMonth = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), 1));
      startTime = vnStartOfMonth.getTime() - vnOffsetMs;
    }

    // Fetch all approved players with their profiles and wallets
    const allWallets = await db.query.wallets.findMany();
    const approvedUsers = await db.query.users.findMany({
      where: eq(users.status, 'approved'),
    });
    const approvedUserIds = new Set(approvedUsers.map((u) => u.id));
    const allProfiles = await db.query.profiles.findMany();
    const profileMap = new Map(allProfiles.map((p) => [p.userId, p]));

    // If a timeframe is specified, compute winnings/losses from transactions within that timeframe
    let txMap: Map<string, { won: number; lost: number; net: number }> = new Map();
    if (startTime > 0) {
      const txs = await db.query.transactions.findMany({
        where: and(
          eq(transactions.type, 'MATCH_SETTLEMENT'),
          gte(transactions.createdAt, startTime)
        ),
      });

      for (const tx of txs) {
        const cur = txMap.get(tx.userId) || { won: 0, lost: 0, net: 0 };
        if (tx.amount > 0) {
          cur.won += tx.amount;
        } else {
          cur.lost += Math.abs(tx.amount);
        }
        cur.net += tx.amount;
        txMap.set(tx.userId, cur);
      }
    }

    const leaderboardItems = allWallets
      .filter((w) => approvedUserIds.has(w.userId))
      .map((w) => {
        const prof = profileMap.get(w.userId);
        const tfStats = txMap.get(w.userId);

        const totalWon = startTime > 0 ? tfStats?.won || 0 : w.totalWon;
        const totalLost = startTime > 0 ? tfStats?.lost || 0 : w.totalLost;
        const netProfit = totalWon - totalLost;
        const winRate = w.matchesPlayed > 0 ? Math.round((w.matchesWon / w.matchesPlayed) * 100) : 0;

        return {
          userId: w.userId,
          displayName: prof?.displayName || 'Người chơi',
          avatarUrl: prof?.avatarUrl || null,
          balance: w.balance,
          totalWon,
          totalLost,
          netProfit,
          matchesPlayed: w.matchesPlayed,
          matchesWon: w.matchesWon,
          winRate,
        };
      });

    // Sort according to requested sort criterion
    leaderboardItems.sort((a, b) => {
      switch (sortBy) {
        case 'balance':
          return b.balance - a.balance;
        case 'wins':
          return b.matchesWon - a.matchesWon;
        case 'winRate':
          // Prioritize players with at least 3 matches
          if (a.matchesPlayed >= 3 && b.matchesPlayed < 3) return -1;
          if (b.matchesPlayed >= 3 && a.matchesPlayed < 3) return 1;
          return b.winRate - a.winRate;
        case 'profit':
        default:
          return b.netProfit - a.netProfit;
      }
    });

    // Add rank numbers (1, 2, 3...)
    const ranked = leaderboardItems.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    return NextResponse.json({
      leaderboard: ranked,
      timeframe,
      sortBy,
      totalCount: ranked.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
