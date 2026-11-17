import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import { createQuickBotRoom } from '@/lib/server/game-service';
import { z } from 'zod';

const quickBotSchema = z.object({
  stake: z.number().int().min(1000).max(10000000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireApprovedUser();
    let body = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }

    const parsed = quickBotSchema.safeParse(body);
    const stake = parsed.success ? parsed.data.stake : 10000;
    const difficulty = parsed.success ? parsed.data.difficulty : 'mixed';

    const result = await createQuickBotRoom({
      hostUserId: user.id,
      stake,
      difficulty,
    });

    return NextResponse.json({ success: true, roomId: result.roomId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
