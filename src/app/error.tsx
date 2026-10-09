'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="legal-page container"><h1>Не удалось загрузить страницу</h1><p>Попробуйте ещё раз. Если ошибка повторяется, свяжитесь со школой в Telegram.</p><button type="button" className="button" onClick={reset}>Повторить</button><a className="text-link" href="https://t.me/KaleaDoSkill" target="_blank" rel="noopener noreferrer">Написать в Telegram</a></main>;
}
