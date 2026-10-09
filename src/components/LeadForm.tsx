'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, LoaderCircle, Send } from 'lucide-react';
import type { Content } from '@/lib/content';
import { z } from 'zod';
// Server-side validation remains authoritative; no server secrets in this component.
const clientSchema = z.object({ name: z.string().trim().min(2, 'Введите имя (от 2 символов)').max(80), phone: z.string().regex(/^\+?[0-9 ()-]{10,25}$/, 'Проверьте номер телефона').refine(v => { const n = v.replace(/\D/g, '').length; return n >= 10 && n <= 15; }, 'Проверьте номер телефона'), email: z.email('Проверьте email'), contact: z.string().trim().min(2, 'Укажите удобный способ связи'), consent: z.literal(true, { error: 'Необходимо согласие' }) });
export default function LeadForm({ content, enabled, initialCourse }: { content: Content; enabled: boolean; initialCourse: string }) {
  const [course, setCourse] = useState(initialCourse);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => { setStartedAt(Date.now()); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!enabled || status === 'sending') return;
    const form = new FormData(event.currentTarget);
    const body = { name: String(form.get('name') || ''), phone: String(form.get('phone') || ''), email: String(form.get('email') || ''), contact: String(form.get('contact') || ''), course, comment: String(form.get('comment') || ''), consent: form.get('consent') === 'on', website: String(form.get('website') || ''), startedAt };
    const parsed = clientSchema.safeParse(body);
    if (!parsed.success) { setFields(parsed.error.flatten().fieldErrors); setStatus('error'); setError('Проверьте отмеченные поля.'); return; }
    setFields({}); setStatus('sending'); setError('');
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setFields(result.fields || {}); throw new Error(result.error || 'Не удалось отправить заявку'); }
      setStatus('success');
    } catch (e) { setStatus('error'); setError(e instanceof Error ? e.message : 'Ошибка сети. Проверьте подключение.'); }
  }
  const field = (id: string, label: string, placeholder: string, type = 'text', autoComplete?: string) => <label className="form-field" htmlFor={id}>{label}<input id={id} name={id} type={type} placeholder={placeholder} autoComplete={autoComplete} required maxLength={id === 'name' ? 80 : 160} aria-invalid={!!fields[id]} aria-describedby={fields[id] ? `${id}-error` : undefined} />{fields[id] && <span id={`${id}-error`} className="field-error">{fields[id][0]}</span>}</label>;
  if (status === 'success') return <div className="form-success" role="status"><CheckCircle2 size={48} /><h3>Заявка отправлена</h3><p>Спасибо! Школа получила вашу заявку. Ответим по указанному вами контакту.</p><button className="button" onClick={() => { setStatus('idle'); setStartedAt(Date.now()); }}>Вернуться к форме</button></div>;
  return <form className="lead-form" onSubmit={submit} noValidate>
    {!enabled && <div className="form-notice"><span className="status-dot" /><span>Приём заявок через форму скоро откроется. Сейчас можно <a href={content.contacts.telegram} target="_blank" rel="noopener noreferrer">написать в Telegram</a>.</span></div>}
    <fieldset disabled={!enabled || status === 'sending'}><legend className="sr-only">Ваши контактные данные</legend>
      <div className="form-grid">{field('name', 'Ваше имя', 'Как к вам обращаться', 'text', 'given-name')}{field('phone', 'Телефон', '+7 (999) 000-00-00', 'tel', 'tel')}{field('email', 'Email', 'you@example.ru', 'email', 'email')}{field('contact', 'Удобный способ связи', 'Например, Telegram @username')}</div>
      <label className="form-field" htmlFor="course">Интересующий курс<select id="course" name="course" value={course} onChange={e => setCourse(e.target.value)}><option value="undecided">Пока не определился — помогите выбрать</option>{content.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label className="form-field" htmlFor="comment">Комментарий <span className="optional">необязательно</span><textarea id="comment" name="comment" rows={3} maxLength={1500} placeholder="Расскажите о своих целях или задайте вопрос" /></label>
      <div className="honeypot" aria-hidden="true"><label htmlFor="website">Ваш сайт</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="consent"><input name="consent" type="checkbox" required aria-invalid={!!fields.consent} /> <span>Я даю <a href={content.legal.consent || '/legal/consent'} target="_blank" rel="noopener noreferrer">согласие на обработку персональных данных</a> и ознакомлен с <a href={content.legal.privacy || '/legal/privacy'} target="_blank" rel="noopener noreferrer">политикой обработки данных</a>.</span></label>
      {fields.consent && <p className="field-error">{fields.consent[0]}</p>}
      <button className="button form-submit" type="submit">{status === 'sending' ? <><LoaderCircle className="spin" size={18} /> Отправляем…</> : <>Оставить заявку</>}</button>
    </fieldset>
    {status === 'error' && <p className="form-error" role="alert">{error}</p>}
    {!enabled && <a className="button telegram-form" href={content.contacts.telegram} target="_blank" rel="noopener noreferrer"><Send size={17} /> Написать в Telegram</a>}
    <p className="form-footnote">Заявка ни к чему не обязывает. Обсудим ваши цели и ответим на вопросы.</p>
  </form>;
}
