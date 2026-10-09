import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-800.css';
import type { Metadata, Viewport } from 'next';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/manrope/cyrillic-800.css';
import './globals.css';
const site = process.env.SITE_URL;
export const metadata: Metadata = {
  ...(site ? { metadataBase: new URL(site), alternates: { canonical: '/' } } : {}),
  title: 'KaleaDoSkill — школа IT-профессий | Python и QA',
  description: 'Освой IT. Создай своё будущее. Практическое обучение Python и тестированию с поддержкой наставника. Python — 60 000 ₽, QA — 40 000 ₽.',
  openGraph: { title: 'KaleaDoSkill — Освой IT. Создай своё будущее.', description: 'Практическое обучение Python и QA с поддержкой наставника.', locale: 'ru_RU', type: 'website', ...(site ? { url: site, images: [{ url: '/brand/logo-original.jpeg', width: 1280, height: 1280, alt: 'KaleaDoSkill' }] } : {}) },
  robots: site ? { index: true, follow: true } : { index: false, follow: false },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#061611' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ru"><body>{children}</body></html>; }
