import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { users, profiles, auditLogs } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const actionSchema = z.object({
  userId: z.string(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().trim().optional(),
});

export async function GET() {
  try {
    await requireAdminUser();
    const db = await getAppDb();

    const pendingUsers = await db.query.users.findMany({
      where: eq(users.status, 'pending'),
    });

    const results = await Promise.all(
      pendingUsers.map(async (u) => {
        const p = await db.query.profiles.findFirst({
          where: eq(profiles.userId, u.id),
        });
        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          displayName: p?.displayName || 'Chưa đặt tên',
          avatarUrl: p?.avatarUrl || null,
          bio: p?.bio || null,
          createdAt: u.createdAt,
        };
      })
    );

    return NextResponse.json({ registrations: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const { userId, action, rejectionReason } = parsed.data;
    const db = await getAppDb();
    const now = Date.now();

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng.' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await db
      .update(users)
      .set({
        status: newStatus,
        rejectionReason: action === 'reject' ? rejectionReason || 'Không đủ điều kiện tham gia' : null,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Audit log
    const auditId = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(auditLogs).values({
      id: auditId,
      adminUserId: admin.id,
      action: action === 'approve' ? 'APPROVE_REGISTRATION' : 'REJECT_REGISTRATION',
      targetType: 'user',
      targetId: userId,
      details: JSON.stringify({
        email: targetUser.email,
        rejectionReason: rejectionReason || null,
      }),
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Đã phê duyệt người chơi!' : 'Đã từ chối đơn đăng ký!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
