import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { gameRounds, gameSettlements, rooms } from '../../../../db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    await requireAdminUser();
    const db = await getAppDb();

    const rounds = await db.query.gameRounds.findMany({
      orderBy: [desc(gameRounds.createdAt)],
      limit: 50,
    });

    const matchDetails = await Promise.all(
      rounds.map(async (r) => {
        const settlement = await db.query.gameSettlements.findFirst({
          where: eq(gameSettlements.roundId, r.id),
        });
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, r.roomId),
        });

        return {
          id: r.id,
          roomId: r.roomId,
          roomName: room?.name || 'Phòng',
          roundNumber: r.roundNumber,
          stake: r.stake,
          status: r.status,
          winnerSeat: r.winnerSeat,
          instantWinType: r.instantWinType,
          rankPositions: JSON.parse(r.rankPositions || '[]'),
          settlement: settlement ? JSON.parse(settlement.settlementData) : null,
          createdAt: r.createdAt,
          finishedAt: r.finishedAt,
        };
      })
    );

    return NextResponse.json({ matches: matchDetails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
