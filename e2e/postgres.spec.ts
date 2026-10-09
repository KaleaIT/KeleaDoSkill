import { test, expect } from '@playwright/test';

test('minified production routes read PostgreSQL and enable a configured form', async ({ page, request }) => {
  test.skip(!process.env.DATABASE_URL || process.env.KDS_FORM_TEST !== '1', 'Requires the isolated PostgreSQL regression database');
  const response = await request.get('/api/leads');
  expect(response.status()).toBe(200);
  const status = await response.json();
  expect(status).toMatchObject({ ready: true, issues: [] });
  expect(JSON.stringify(status)).not.toContain('synthetic-not-a-real-token');

  const landing = await page.goto('/');
  expect(landing?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Освой IT. Создай своё будущее.');
  await expect(page.getByRole('button', { name: 'Оставить заявку', exact: true })).toBeEnabled();
  await expect(page.locator('#name')).toBeEnabled();
  await expect(page.locator('#phone')).toBeEnabled();

  // An invalid request exercises the actual production handler without sending
  // anything to Telegram. Delivery responses are covered by mocked unit tests.
  const invalid = await request.post('/api/leads', {
    headers: { origin: 'http://127.0.0.1:3200' },
    data: { name: 'Тест', consent: false },
  });
  expect(invalid.status()).toBe(400);
});
