import { NextRequest, NextResponse } from 'next/server';
import { cookieName, sameOrigin } from '@/lib/security';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  const response = NextResponse.json({ ok: true }); response.cookies.delete(cookieName); return response;
}
