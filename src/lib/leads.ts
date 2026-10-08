import { z } from 'zod';
import type { Content } from './content';
import { existsSync } from 'node:fs';
import path from 'node:path';
export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя (от 2 символов)').max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{10,25}$/, 'Проверьте номер телефона').refine(v => v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 15, 'Проверьте номер телефона'),
  email: z.email('Проверьте email').max(160),
  contact: z.string().trim().min(2, 'Укажите удобный способ связи').max(160),
  course: z.string().min(1).max(40),
  comment: z.string().trim().max(1500),
  consent: z.literal(true, { error: 'Необходимо согласие на обработку данных' }),
  website: z.string().max(200),
  startedAt: z.number().int().positive()
});
export function documentAvailable(url: string) { return !!url && /^\/documents\/[a-zA-Z0-9_-]+\.pdf$/.test(url) && existsSync(path.join(process.cwd(), 'public', url)); }
export function bundledLegalDocumentAvailable(document: 'privacy' | 'offer' | 'consent') {
  return existsSync(path.join(process.cwd(), 'src', 'content', 'legal', `${document}.md`));
}
export function leadsReady(content: Content) {
  const privacyReady = content.legal.privacy ? documentAvailable(content.legal.privacy) : bundledLegalDocumentAvailable('privacy');
  const consentReady = content.legal.consent ? documentAvailable(content.legal.consent) : bundledLegalDocumentAvailable('consent');
  return process.env.LEADS_ENABLED === 'true' && !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID && privacyReady && consentReady;
}
export function telegramMessage(data: z.infer<typeof leadSchema>, title: string) {
  return `Новая заявка KaleaDoSkill\nКурс: ${title}\nИмя: ${data.name}\nТелефон: ${data.phone}\nEmail: ${data.email}\nСвязь: ${data.contact}\nКомментарий: ${data.comment || '—'}\nСогласие: дано, ${new Date().toISOString()}`;
}
