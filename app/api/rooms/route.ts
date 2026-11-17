import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import { getAppDb } from '@/lib/server/db';
import { rooms, roomSeats, profiles } from '@/db/schema';
import { createRoom } from '@/lib/server/game-service';
import { eq, desc, ne } from 'drizzle-orm';
import { z } from 'zod';

const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên phòng từ 2 đến 40 ký tự.')
    .max(40, 'Tên phòng từ 2 đến 40 ký tự.'),
  stake: z.number().int().min(1000, 'Mức cược tối thiểu 1.000 ₫.').max(10000000, 'Mức cược tối đa 10.000.000 ₫.'),
  visibility: z.enum(['public', 'private']).default('public'),
});

export async function GET() {
  try {
    const db = await getAppDb();
    const allRooms = await db.query.rooms.findMany({
      where: ne(rooms.status, 'closed'),
      orderBy: [desc(rooms.createdAt)],
      limit: 30,
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
          playerCount: seats.length,
          maxPlayers: 4,
          createdAt: r.createdAt,
        };
      })
    );

    return NextResponse.json({ rooms: roomDetails });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApprovedUser();
    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const { roomId, code } = await createRoom({
      hostUserId: user.id,
      name: parsed.data.name,
      stake: parsed.data.stake,
      visibility: parsed.data.visibility,
    });

    return NextResponse.json({ success: true, roomId, code });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
