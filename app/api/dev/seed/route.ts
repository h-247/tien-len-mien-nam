import { NextResponse } from 'next/server';
import { getAppDb } from '@/lib/server/db';
import { seedAllAccounts } from '@/lib/server/seed-helper';

export async function POST() {
  try {
    const db = await getAppDb();
    const result = await seedAllAccounts(db);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getAppDb();
    const result = await seedAllAccounts(db);
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
