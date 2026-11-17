import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { users, profiles, wallets, auditLogs } from '../../../../db/schema';
import { applyBalanceChange } from '../../../../lib/server/ledger';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const playerActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('suspend'),
    userId: z.string(),
    reason: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal('reactivate'),
    userId: z.string(),
  }),
  z.object({
    action: z.literal('adjustBalance'),
    userId: z.string(),
    amount: z.number().int().refine((val) => val !== 0, 'Số tiền điều chỉnh không được bằng 0.'),
    reason: z
      .string()
      .trim()
      .min(5, 'Bắt buộc phải nhập lý do điều chỉnh số dư (tối thiểu 5 ký tự).')
      .max(200),
  }),
]);

export async function GET() {
  try {
    await requireAdminUser();
    const db = await getAppDb();

    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    });

    const playerList = await Promise.all(
      allUsers.map(async (u) => {
        const p = await db.query.profiles.findFirst({
          where: eq(profiles.userId, u.id),
        });
        const w = await db.query.wallets.findFirst({
          where: eq(wallets.userId, u.id),
        });

        return {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          displayName: p?.displayName || 'Chưa đặt tên',
          avatarUrl: p?.avatarUrl || null,
          role: u.role,
          status: u.status,
          rejectionReason: u.rejectionReason,
          balance: w?.balance || 0,
          totalWon: w?.totalWon || 0,
          totalLost: w?.totalLost || 0,
          matchesPlayed: w?.matchesPlayed || 0,
          matchesWon: w?.matchesWon || 0,
          createdAt: u.createdAt,
        };
      })
    );

    return NextResponse.json({ players: playerList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await req.json();
    const parsed = playerActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const db = await getAppDb();
    const now = Date.now();

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người chơi.' }, { status: 404 });
    }

    if (payload.action === 'suspend') {
      await db
        .update(users)
        .set({
          status: 'suspended',
          rejectionReason: payload.reason || 'Tài khoản bị tạm khóa bởi Quản trị viên.',
          updatedAt: now,
        })
        .where(eq(users.id, payload.userId));

      await db.insert(auditLogs).values({
        id: `audit_${now}_${Math.random().toString(36).substring(2, 7)}`,
        adminUserId: admin.id,
        action: 'SUSPEND_PLAYER',
        targetType: 'user',
        targetId: payload.userId,
        details: JSON.stringify({ reason: payload.reason || 'Khóa tài khoản' }),
        createdAt: now,
      });

      return NextResponse.json({ success: true, message: 'Đã tạm khóa tài khoản người chơi.' });
    }

    if (payload.action === 'reactivate') {
      await db
        .update(users)
        .set({
          status: 'approved',
          rejectionReason: null,
          updatedAt: now,
        })
        .where(eq(users.id, payload.userId));

      await db.insert(auditLogs).values({
        id: `audit_${now}_${Math.random().toString(36).substring(2, 7)}`,
        adminUserId: admin.id,
        action: 'REACTIVATE_PLAYER',
        targetType: 'user',
        targetId: payload.userId,
        details: JSON.stringify({ action: 'Mở khóa tài khoản' }),
        createdAt: now,
      });

      return NextResponse.json({ success: true, message: 'Đã kích hoạt lại tài khoản người chơi.' });
    }

    if (payload.action === 'adjustBalance') {
      const res = await applyBalanceChange({
        userId: payload.userId,
        amount: payload.amount,
        type: 'ADMIN_ADJUSTMENT',
        referenceType: 'admin',
        referenceId: admin.id,
        description: `Điều chỉnh số dư bởi Quản trị viên: ${payload.reason}`,
        adminUserId: admin.id,
      });

      return NextResponse.json({
        success: true,
        message: `Đã điều chỉnh ${payload.amount >= 0 ? '+' : ''}${payload.amount.toLocaleString('vi-VN')} ₫. Số dư mới: ${res.newBalance.toLocaleString('vi-VN')} ₫.`,
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
