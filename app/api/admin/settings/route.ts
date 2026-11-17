import { NextResponse } from 'next/server';
import { requireAdminUser } from '../../../../lib/server/auth';
import { getAppDb } from '../../../../lib/server/db';
import { systemSettings } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export async function GET() {
  try {
    await requireAdminUser();
    const db = await getAppDb();
    const settings = await db.query.systemSettings.findMany();
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();
    const db = await getAppDb();
    const body = await req.json();
    const parsed = settingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    const now = Date.now();
    await db
      .insert(systemSettings)
      .values({
        key: parsed.data.key,
        value: parsed.data.value,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: parsed.data.value,
          updatedAt: now,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
