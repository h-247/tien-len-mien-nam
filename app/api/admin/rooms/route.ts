import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { rooms, roomSeats, profiles } from '../../../../db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    await requireAdminUser();
    const db = await getAppDb();

    const allRooms = await db.query.rooms.findMany({
      orderBy: [desc(rooms.createdAt)],
      limit: 100,
    });

    const roomDetails = await Promise.all(
      allRooms.map(async (r) => {
        const seats = await db.query.roomSeats.findMany({
          where: eq(roomSeats.roomId, r.id),
        });
        const hostProfile = await db.query.profiles.findFirst({
          where: eq(profiles.userId, r.hostUserId),
        });

        return {
          id: r.id,
          code: r.code,
          name: r.name,
          hostDisplayName: hostProfile?.displayName || 'Chủ phòng',
          stake: r.stake,
          status: r.status,
          visibility: r.visibility,
          seatCount: seats.length,
          currentRoundId: r.currentRoundId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      })
    );

    return NextResponse.json({ rooms: roomDetails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
