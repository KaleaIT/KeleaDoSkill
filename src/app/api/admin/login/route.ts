import { setting } from '@/lib/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { adminConfigured, cookieName, correctPassword, issueSession, limit, sameOrigin } from '@/lib/security';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник' }, { status: 403 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Админка не настроена на сервере' }, { status: 503 });
  if (!await limit(request, 'login', 5, 15)) return NextResponse.json({ error: 'Слишком много попыток. Подождите 15 минут.' }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 });
  let password: unknown; try { password = JSON.parse(raw).password; } catch { return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 }); }
  if (typeof password !== 'string' || password.length > 256 || !await correctPassword(password)) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, issueSession(), { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 28800 });
  return response;
}
