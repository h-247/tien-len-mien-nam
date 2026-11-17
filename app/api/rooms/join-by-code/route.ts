import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import { joinRoom } from '@/lib/server/game-service';
import { z } from 'zod';

const joinSchema = z.object({
  code: z.string().trim().min(4, 'Mã phòng không hợp lệ.').max(10),
});

export async function POST(req: Request) {
  try {
    const user = await requireApprovedUser();
    const body = await req.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Mã phòng không hợp lệ.' },
        { status: 400 }
      );
    }

    const result = await joinRoom({
      code: parsed.data.code,
      userId: user.id,
    });

    return NextResponse.json({ success: true, roomId: result.roomId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
