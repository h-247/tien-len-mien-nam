import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('x-dev-user-id');
  return res;
}

export async function GET() {
  const res = NextResponse.redirect(new URL('/', 'http://localhost:3000'));
  res.cookies.delete('x-dev-user-id');
  return res;
}
