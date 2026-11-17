import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/server/db';
import { users, profiles, wallets } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { verifyPassword } from '@/lib/server/crypto';

const signinSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập hoặc email.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const { usernameOrEmail, password } = parsed.data;
    const cleanIdentifier = usernameOrEmail.toLowerCase();
    const db = await getAppDb();

    // Find user by username, email, or id
    const targetUser = await db.query.users.findFirst({
      where: or(
        eq(users.username, cleanIdentifier),
        eq(users.email, cleanIdentifier),
        eq(users.id, cleanIdentifier)
      ),
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại.' },
        { status: 400 }
      );
    }

    // Verify password if user has passwordHash
    if (targetUser.passwordHash) {
      const isMatch = await verifyPassword(password, targetUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Mật khẩu không chính xác.' },
          { status: 400 }
        );
      }
    } else {
      // Demo accounts without a password: allow default password '123456' or password matching id
      if (password !== '123456' && password !== targetUser.id) {
        return NextResponse.json(
          { error: 'Mật khẩu tài khoản mẫu này là 123456.' },
          { status: 400 }
        );
      }
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, targetUser.id),
    });

    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, targetUser.id),
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        username: targetUser.username,
        displayName: profile?.displayName || targetUser.fullName || targetUser.id,
        role: targetUser.role,
        status: targetUser.status,
        rejectionReason: targetUser.rejectionReason,
        balance: wallet?.balance || 0,
      },
    });

    res.cookies.set('x-dev-user-id', targetUser.id, { path: '/', httpOnly: false });
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
