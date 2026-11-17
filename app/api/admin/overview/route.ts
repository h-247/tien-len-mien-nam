import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { users, rooms, wallets, gameRounds } from '../../../../db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const admin = await requireAdminUser();
    const db = await getAppDb();

    const allUsers = await db.query.users.findMany();
    const allRooms = await db.query.rooms.findMany();
    const allWallets = await db.query.wallets.findMany();
    const allRounds = await db.query.gameRounds.findMany();

    const totalUsers = allUsers.length;
    const pendingUsers = allUsers.filter((u) => u.status === 'pending').length;
    const approvedUsers = allUsers.filter((u) => u.status === 'approved').length;
    const suspendedUsers = allUsers.filter((u) => u.status === 'suspended').length;
    const activeRooms = allRooms.filter((r) => r.status === 'playing' || r.status === 'waiting').length;
    const totalVnd = allWallets.reduce((sum, w) => sum + w.balance, 0);

    return NextResponse.json({
      totalUsers,
      pendingUsers,
      approvedUsers,
      suspendedUsers,
      activeRooms,
      totalRooms: allRooms.length,
      totalRounds: allRounds.length,
      totalVnd,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
