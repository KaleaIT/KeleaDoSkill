import { z } from 'zod';
import type { Content } from './content';
import { documentAssets } from '@/content/document-assets';
import { legalDocuments } from '@/content/legal/documents';
import { setting } from './runtime';
import { storageConfigured } from './db';

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
export function documentAvailable(url: string) { return documentAssets.includes(url); }
export function bundledLegalDocumentAvailable(document: 'privacy' | 'offer' | 'consent') { return !!legalDocuments[document]; }
export function leadsReady(content: Content) {
  const privacyReady = content.legal.privacy ? documentAvailable(content.legal.privacy) : bundledLegalDocumentAvailable('privacy');
  const consentReady = content.legal.consent ? documentAvailable(content.legal.consent) : bundledLegalDocumentAvailable('consent');
  const secret = setting('RATE_LIMIT_SECRET') || setting('ADMIN_SESSION_SECRET');
  return storageConfigured() && !!secret && secret.length >= 32 && setting('LEADS_ENABLED') === 'true' && !!setting('TELEGRAM_BOT_TOKEN') && !!setting('TELEGRAM_CHAT_ID') && privacyReady && consentReady;
}
export function telegramMessage(data: z.infer<typeof leadSchema>, title: string) {
  return `Новая заявка KaleaDoSkill\nКурс: ${title}\nИмя: ${data.name}\nТелефон: ${data.phone}\nEmail: ${data.email}\nСвязь: ${data.contact}\nКомментарий: ${data.comment || '—'}\nСогласие: дано, ${new Date().toISOString()}`;
}
