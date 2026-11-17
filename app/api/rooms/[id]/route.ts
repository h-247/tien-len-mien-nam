import { NextResponse } from 'next/server';
import { requireApprovedUser } from '@/lib/server/auth';
import { getClientRoomState } from '@/lib/server/game-service';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprovedUser();
    const { id } = await context.params;

    const state = await getClientRoomState(id, user.id);
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
