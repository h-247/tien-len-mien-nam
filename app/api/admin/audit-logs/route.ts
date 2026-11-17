import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { auditLogs, users } from '../../../../db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    await requireAdminUser();
    const db = await getAppDb();

    const logs = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit: 100,
    });

    const enrichedLogs = await Promise.all(
      logs.map(async (l) => {
        const admin = await db.query.users.findFirst({
          where: eq(users.id, l.adminUserId),
        });
        return {
          id: l.id,
          adminEmail: admin?.email || l.adminUserId,
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId,
          details: JSON.parse(l.details || '{}'),
          createdAt: l.createdAt,
        };
      })
    );

    return NextResponse.json({ logs: enrichedLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
