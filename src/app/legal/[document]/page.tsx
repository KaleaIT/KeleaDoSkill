import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { legalDocuments } from '@/content/legal/documents';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readContent } from '@/lib/db';
import { bundledLegalDocumentAvailable, documentAvailable } from '@/lib/leads';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Юридические документы — KaleaDoSkill', robots: { index: false, follow: false } };
export default async function Legal({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!['privacy', 'offer', 'consent'].includes(document)) notFound();
  const { content } = await readContent(); const url = content.legal[document as keyof typeof content.legal];
  if (documentAvailable(url)) redirect(url);
  const names: Record<string, string> = { privacy: 'Политика обработки персональных данных', offer: 'Публичная оферта', consent: 'Согласие на обработку персональных данных' };
  if (!bundledLegalDocumentAvailable(document as 'privacy' | 'offer' | 'consent')) return <main className="legal-page container"><Link href="/" className="text-link">← На главную</Link><div className="eyebrow">KALEADOSKILL</div><h1>{names[document]}</h1><p>Документ ещё не предоставлен владельцем школы. Эта страница сообщает о его отсутствии и не заменяет юридический документ.</p><Link className="button" href="/#contacts">Контакты школы</Link></main>;
  const markdown = legalDocuments[document];
  return <main className="legal-page legal-document container"><Link href="/" className="text-link">← На главную</Link><div className="eyebrow">KALEADOSKILL · ЮРИДИЧЕСКИЕ ДОКУМЕНТЫ</div><article><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></article><div className="legal-page-actions"><Link className="button" href="/">Вернуться на сайт</Link><a className="text-link" href="mailto:kaleadoskill@mail.ru">kaleadoskill@mail.ru</a></div></main>;
}
