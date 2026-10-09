import { setting } from '@/lib/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { readContent } from '@/lib/db';
import { leadSchema, leadsReady, telegramMessage } from '@/lib/leads';
import { limit, sameOrigin } from '@/lib/security';
import { storageConfigured } from '@/lib/db';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  if (!storageConfigured()) return NextResponse.json({ error: 'Форма пока не подключена. Напишите в официальный Telegram.' }, { status: 503 });
  try {
    if (!await limit(request, 'leads', 5, 15)) return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 });
  } catch {
    return NextResponse.json({ error: 'Сервис временно недоступен. Попробуйте позже.' }, { status: 503 });
  }
  const raw = await request.text();
  if (raw.length > 12000) return NextResponse.json({ error: 'Слишком большой запрос' }, { status: 413 });
  let body: unknown; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 }); }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте поля формы', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const data = parsed.data;
  if (data.website || Date.now() - data.startedAt < 2000 || Date.now() - data.startedAt > 86400000) return NextResponse.json({ error: 'Не удалось отправить. Обновите страницу и попробуйте ещё раз.' }, { status: 400 });
  const { content } = await readContent();
  const course = content.courses.find(c => c.id === data.course);
  if (!course && data.course !== 'undecided') return NextResponse.json({ error: 'Выберите доступный курс' }, { status: 400 });
  if (!leadsReady(content)) return NextResponse.json({ error: 'Форма пока не подключена. Напишите в официальный Telegram.' }, { status: 503 });
  try {
    const response = await fetch(`https://api.telegram.org/bot${setting('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ chat_id: setting('TELEGRAM_CHAT_ID'), text: telegramMessage(data, course?.title || 'Не определился') })
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error('Delivery unavailable');
    return NextResponse.json({ ok: true });
  } catch {
    // Never log applicant data, bot token or Telegram response bodies.
    return NextResponse.json({ error: 'Не удалось доставить заявку. Попробуйте позже или напишите в Telegram.' }, { status: 502 });
  }
}
