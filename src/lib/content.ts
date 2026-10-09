import { z } from 'zod';

const text = z.string().trim().min(1).max(1500);
const telegram = z.string().url().refine(v => { const u = new URL(v); return u.protocol === 'https:' && u.hostname === 't.me' && !u.username && !u.password; }, 'Нужна ссылка https://t.me/...');
const doc = z.string().max(180).refine(v => !v || /^\/documents\/[a-zA-Z0-9_-]+\.pdf$/.test(v), 'Используйте локальный PDF: /documents/name.pdf');
export const contentSchema = z.object({
  hero: z.object({ eyebrow: text, title: text, subtitle: text, description: text }),
  promotion: z.string().max(300),
  courses: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/).max(40), title: text, label: text, description: text, price: z.number().int().min(0).max(10000000), duration: text, skills: z.array(text).min(1).max(20), project: text })).min(1).max(12).refine(v => new Set(v.map(c => c.id)).size === v.length, 'ID курсов должны быть уникальны'),
  benefits: z.array(z.object({ title: text, description: text })).min(1).max(12),
  included: z.array(text).min(1).max(15),
  faq: z.array(z.object({ question: text, answer: text })).min(1).max(20),
  contacts: z.object({ phone: z.string().max(30).refine(v => !v || /^\+?[0-9 ()-]{7,30}$/.test(v)), telegram: telegram, additional: z.array(z.object({ label: text, url: telegram })).max(8) }),
  payments: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: text, description: text, status: z.enum(['request', 'unavailable', 'available']), url: z.string().max(1000).refine(v => !v || /^https:\/\//.test(v), 'Только HTTPS') })).max(10).superRefine((items, ctx) => items.forEach((p, i) => { if (p.status === 'available' && !p.url) ctx.addIssue({ code: 'custom', path: [i, 'url'], message: 'Для активного продукта нужна официальная ссылка' }); })),
  legal: z.object({ privacy: doc, offer: doc, consent: doc })
});
export type Content = z.infer<typeof contentSchema>;
export const defaultContent: Content = {
  hero: { eyebrow: 'ШКОЛА IT-ПРОФЕССИЙ', title: 'Освой IT. Создай своё будущее.', subtitle: 'От первой строки кода — к собственным проектам.', description: 'Освой программирование с наставником, получи реальные практические навыки, создай портфолио и подготовься к трудоустройству' },
  promotion: '',
  courses: [
    { id: 'python', title: 'Python-разработчик', label: 'ПРОГРАММИРОВАНИЕ', description: 'От первой строки кода до собственных проектов. Учитесь превращать идеи в работающие решения.', price: 50000, duration: '3–4 месяца', skills: ['Синтаксис Python и алгоритмы', 'Данные, файлы и работа с API', 'Git и основы SQL', 'Тестирование и отладка', 'Основы командной разработки', 'Подготовка к техническому интервью'], project: 'Практические проекты для портфолио' },
    { id: 'qa', title: 'QA Manual — ручное тестирование ПО', label: 'QUALITY ASSURANCE', description: 'Научитесь видеть продукт глазами пользователя, находить ошибки и помогать команде выпускать качественный софт.', price: 40000, duration: '2–3 месяца', skills: ['Виды тестирования, тест-кейсы и чек-листы', 'Баг-репорты и тестовая документация', 'Клиент-сервер, HTTP и API', 'Postman и DevTools', 'Основы SQL, Git и трекеры задач', 'Подготовка к техническому интервью'], project: 'Практика тестирования и оформление результатов' }
  ],
  benefits: [
    { title: 'Можно начать с нуля', description: 'Двигаемся от основ к сложным задачам. Предыдущий опыт в IT не обязателен.' },
    { title: 'Наставник рядом', description: 'Персональный ментор-куратор помогает разобраться, даёт обратную связь и поддерживает.' },
    { title: 'Практика с первого шага', description: 'Закрепляйте знания на задачах и собирайте проекты для своего портфолио.' },
    { title: 'Понятный путь к профессии', description: 'Последовательная программа, подготовка резюме и практика технических интервью.' },
    { title: 'Прозрачная стоимость', description: 'Вы заранее знаете цену курса и что входит в обучение.' }
  ],
  included: ['Учебные материалы в Notion', 'Домашние задания с проверкой', 'Консультации и поддержка наставника', 'Практика и проекты для портфолио', 'Подготовка резюме и к собеседованиям'],
  faq: [
    { question: 'Подойдёт ли мне обучение, если я никогда не работал в IT?', answer: 'Да. Курсы подходят начинающим и тем, кто хочет сменить направление. Начинаем с основ и постепенно переходим к практике.' },
    { question: 'Можно ли начать совсем с нуля?', answer: 'Можно. Для старта не нужны знания программирования. Понадобятся компьютер, интернет и время для выполнения заданий.' },
    { question: 'Как проходят занятия?', answer: 'Вы изучаете материалы, выполняете практические задания и получаете обратную связь наставника. Формат, график и условия консультаций уточняются перед оформлением обучения.' },
    { question: 'Как я получу учебные материалы?', answer: 'Доступ к материалам в Notion выдаётся индивидуально после оформления обучения. Публичного доступа к материалам нет.' },
    { question: 'Что входит в стоимость курса?', answer: 'Материалы, домашние задания и их проверка, консультации, поддержка наставника, практика, проекты и подготовка к собеседованиям.' },
    { question: 'Как связаться со школой?', answer: 'Напишите в официальный Telegram KaleaDoSkill. Дополнительные контакты указаны внизу страницы.' }
  ],
  contacts: { phone: '+7 952 672 7722', telegram: 'https://t.me/KaleaDoSkill', additional: [{ label: '@darlingpgv', url: 'https://t.me/darlingpgv' }, { label: '@max777_qa', url: 'https://t.me/max777_qa' }] },
  payments: [
    { id: 'sber', name: 'Сбербанк', description: 'Полная оплата, кредит, рассрочка или оплата частями — при доступности конкретного продукта.', status: 'request', url: '' },
    { id: 'tbank', name: 'Т-Банк', description: 'Рассрочка по графику. Условия и возможность оформления зависят от банка и договора.', status: 'request', url: '' },
    { id: 'split', name: 'Яндекс Сплит', description: 'Оплата частями по условиям сервиса. Возможны комиссии и ограничения.', status: 'request', url: '' }
  ],
  legal: { privacy: '', offer: '', consent: '' }
};
export const money = (n: number) => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
