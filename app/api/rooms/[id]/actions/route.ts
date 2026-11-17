import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import {
  joinRoom,
  leaveRoom,
  updateRoomStake,
  acceptStake,
  configureBotSeat,
  kickSeat,
  startRoomMatch,
  executeSingleBotStep,
  submitPlayAction,
  submitPassAction,
  getClientRoomState,
} from '@/lib/server/game-service';
import { z } from 'zod';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('join') }),
  z.object({ action: z.literal('leave') }),
  z.object({ action: z.literal('acceptStake') }),
  z.object({
    action: z.literal('updateStake'),
    stake: z.number().int().min(1000).max(10000000),
  }),
  z.object({
    action: z.literal('configureBot'),
    seatIndex: z.number().int().min(0).max(3),
    botAction: z.enum(['add', 'remove']),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    botName: z.string().trim().max(20).optional(),
  }),
  z.object({
    action: z.literal('kick'),
    seatIndex: z.number().int().min(0).max(3),
  }),
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('botStep') }),
  z.object({
    action: z.literal('play'),
    cardIds: z.array(z.string()).min(1).max(13),
    version: z.number().int(),
  }),
  z.object({
    action: z.literal('pass'),
    version: z.number().int(),
  }),
]);

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprovedUser();
    const { id: roomId } = await context.params;

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Hành động không hợp lệ.' },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    switch (payload.action) {
      case 'join':
        await joinRoom({ roomId, userId: user.id });
        break;

      case 'leave':
        await leaveRoom({ roomId, userId: user.id });
        break;

      case 'acceptStake':
        await acceptStake({ roomId, userId: user.id });
        break;

      case 'updateStake':
        await updateRoomStake({
          roomId,
          hostUserId: user.id,
          stake: payload.stake,
        });
        break;

      case 'configureBot':
        await configureBotSeat({
          roomId,
          hostUserId: user.id,
          seatIndex: payload.seatIndex,
          action: payload.botAction,
          difficulty: payload.difficulty,
          botName: payload.botName,
        });
        break;

      case 'kick':
        await kickSeat({
          roomId,
          hostUserId: user.id,
          seatIndex: payload.seatIndex,
        });
        break;

      case 'start':
        await startRoomMatch({
          roomId,
          hostUserId: user.id,
        });
        break;

      case 'botStep':
        await executeSingleBotStep({
          roomId,
        });
        break;

      case 'play':
        await submitPlayAction({
          roomId,
          userId: user.id,
          cardIds: payload.cardIds,
          version: payload.version,
        });
        break;

      case 'pass':
        await submitPassAction({
          roomId,
          userId: user.id,
          version: payload.version,
        });
        break;
    }

    // Return the updated room state immediately
    const newState = await getClientRoomState(roomId, user.id);
    return NextResponse.json({ success: true, state: newState });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
