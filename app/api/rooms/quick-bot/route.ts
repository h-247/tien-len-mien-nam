import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import { createQuickBotRoom } from '@/lib/server/game-service';
import { z } from 'zod';

const quickBotSchema = z.object({
  stake: z.number().int().min(0).max(10000000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
  botCount: z.number().int().min(1).max(3).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireApprovedUser();
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chức năng chơi với Bot chỉ dành cho Quản trị viên.' },
        { status: 403 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    const parsed = quickBotSchema.safeParse(body);
    const difficulty = parsed.success && parsed.data.difficulty ? parsed.data.difficulty : 'mixed';
    const botCount = parsed.success && parsed.data.botCount ? parsed.data.botCount : 3;

    const result = await createQuickBotRoom({
      hostUserId: user.id,
      stake: 0,
      difficulty,
      botCount,
    });

    return NextResponse.json({ success: true, roomId: result.roomId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
