import { NextRequest, NextResponse } from 'next/server';
import { contentSchema } from '@/lib/content';
import { readContent, saveContent } from '@/lib/db';
import { cookieName, sameOrigin, validSession } from '@/lib/security';
export async function GET(request: NextRequest) {
  if (!validSession(request.cookies.get(cookieName)?.value)) return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
  return NextResponse.json(readContent(), { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(request: NextRequest) {
  if (!sameOrigin(request) || !validSession(request.cookies.get(cookieName)?.value)) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 120000) return NextResponse.json({ error: 'Слишком большой запрос' }, { status: 413 });
  let body; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 }); }
  const parsed = contentSchema.safeParse(body.content);
  if (!parsed.success || !Number.isSafeInteger(body.revision) || body.revision < 0) return NextResponse.json({ error: 'Проверьте настройки', details: parsed.success ? [] : parsed.error.issues }, { status: 400 });
  if (!saveContent(parsed.data, body.revision)) return NextResponse.json({ error: 'Настройки уже изменены в другой вкладке. Скопируйте свои изменения, затем перезагрузите страницу.' }, { status: 409 });
  return NextResponse.json({ ok: true, revision: body.revision + 1 });
}
