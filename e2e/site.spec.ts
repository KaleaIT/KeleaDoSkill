import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing, mobile menu, course selection, brand and real Telegram links', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('С нуля — до первой работы в IT');
  await expect(page.getByText('60 000 ₽', { exact: true })).toHaveCount(2); await expect(page.getByText('40 000 ₽', { exact: true })).toHaveCount(2);
  await expect(page.locator('a[href="https://t.me/KaleaDoSkill"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://t.me/darlingpgv"]')).toHaveCount(1); await expect(page.locator('a[href="https://t.me/max777_qa"]')).toHaveCount(1);
  await page.getByRole('link', { name: 'Выбрать курс' }).first().click(); await expect(page.locator('#course')).toHaveValue('python');
  await expect(page.getByRole('button', { name: 'Оставить заявку', exact: true })).toBeDisabled();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('.brand img').first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `/tmp/kaleadoskill-${width}.png`, fullPage: true });
    await page.screenshot({ path: `/tmp/kaleadoskill-hero-${width}.png` });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Открыть меню' }).click(); await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Курсы', exact: true }).click(); await expect(page.getByRole('navigation')).not.toBeVisible();
});
test('landing passes automated WCAG 2.1 AA checks', async ({ page }) => { await page.goto('/'); const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze(); expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) }))).toEqual([]); });
test('FAQ, legal absence and protected admin', async ({ page, request }) => {
  await page.goto('/'); await page.locator('summary').filter({ hasText: 'Вы гарантируете трудоустройство?' }).click(); await expect(page.getByText('Нет. Мы помогаем подготовить резюме', { exact: false })).toBeVisible();
  await page.goto('/legal/privacy'); await expect(page.getByRole('heading', { name: 'Политика обработки персональных данных', exact: true })).toBeVisible(); await expect(page.getByText('8 октября 2026 года', { exact: false })).toBeVisible();
  await page.goto('/legal/offer'); await expect(page.getByRole('heading', { name: 'Публичная оферта на оказание информационно-консультационных услуг', exact: true })).toBeVisible();
  await page.goto('/legal/consent'); await expect(page.getByRole('heading', { name: 'Согласие на обработку персональных данных', exact: true })).toBeVisible();
  expect((await request.get('/api/admin/content')).status()).toBe(401);
  await page.goto('/admin'); await page.getByLabel('Пароль', { exact: true }).fill('browser-test-password-123'); await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'KaleaDoSkill · Контент' })).toBeVisible();
  await page.getByLabel('Главный заголовок').fill('Ваш новый путь в IT'); await page.getByRole('button', { name: 'Сохранить изменения' }).click(); await expect(page.getByRole('status')).toContainText('Сохранено');
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ваш новый путь в IT');
  await page.goto('/admin'); await page.getByLabel('Главный заголовок').fill('С нуля — до первой работы в IT'); await page.getByRole('button', { name: 'Сохранить изменения' }).click(); await expect(page.getByRole('status')).toContainText('Сохранено');
  await page.getByRole('button', { name: 'Выйти', exact: true }).click(); await expect(page.getByLabel('Пароль', { exact: true })).toBeVisible();
});
