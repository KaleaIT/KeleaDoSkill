import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing, mobile menu, course selection, brand and real Telegram links', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Освой IT. Создай своё будущее.');
  await expect(page.getByText('60 000 ₽', { exact: true })).toHaveCount(2); await expect(page.getByText('40 000 ₽', { exact: true })).toHaveCount(2);
  await expect(page.locator('a[href="https://t.me/KaleaDoSkill"]').first()).toBeVisible();
  for(const logo of await page.locator('.brand img').all()) await expect(logo).toHaveAttribute('src', '/brand/logo-ruby.webp');
  await expect(page.locator('a[href="https://t.me/darlingpgv"]')).toHaveCount(1); await expect(page.locator('a[href="https://t.me/max777_qa"]')).toHaveCount(1);
  await page.getByRole('link', { name: 'Выбрать курс' }).first().click(); await expect(page.locator('#course')).toHaveValue('python');
  await expect(page.getByRole('button', { name: 'Оставить заявку', exact: true })).toBeDisabled();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('.brand img').first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `work/screenshots/kaleadoskill-${width}.png`, fullPage: true });
    await page.screenshot({ path: `work/screenshots/kaleadoskill-hero-${width}.png` });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Открыть меню' }).click(); await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Курсы', exact: true }).click(); await expect(page.getByRole('navigation')).not.toBeVisible();
});
test('landing passes automated WCAG 2.1 AA checks', async ({ page }) => { await page.goto('/'); await expect(page.getByRole('heading', {level:1})).toHaveText('Освой IT. Создай своё будущее.'); const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze(); expect(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) }))).toEqual([]); });
test('FAQ, legal absence and protected admin', async ({ page, request }) => {
  await page.goto('/'); await page.locator('summary').filter({ hasText: 'Как проходят занятия?' }).click(); await expect(page.getByText('Вы изучаете материалы, выполняете практические задания', { exact: false })).toBeVisible();
  await page.goto('/legal/privacy'); await expect(page.getByRole('heading', { name: 'Политика обработки персональных данных', exact: true })).toBeVisible(); await expect(page.getByText('8 октября 2026 года', { exact: false })).toBeVisible();
  await page.goto('/legal/offer'); await expect(page.getByRole('heading', { name: 'Публичная оферта на оказание информационно-консультационных услуг', exact: true })).toBeVisible();
  await page.goto('/legal/consent'); await expect(page.getByRole('heading', { name: 'Согласие на обработку персональных данных', exact: true })).toBeVisible();
  expect((await request.get('/api/admin/content')).status()).toBe(401);
  await page.goto('/admin'); await page.getByLabel('Пароль', { exact: true }).fill('browser-test-password-123'); await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'KaleaDoSkill · Контент' })).toBeVisible();
  await page.getByLabel('Главный заголовок').fill('Ваш новый путь в IT'); await page.getByRole('button', { name: 'Сохранить изменения' }).click(); await expect(page.getByRole('status')).toContainText('Сохранено');
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ваш новый путь в IT');
  await page.goto('/admin'); await page.getByLabel('Главный заголовок').fill('Освой IT. Создай своё будущее.'); await page.getByRole('button', { name: 'Сохранить изменения' }).click(); await expect(page.getByRole('status')).toContainText('Сохранено');
  await page.getByRole('button', { name: 'Выйти', exact: true }).click(); await expect(page.getByLabel('Пароль', { exact: true })).toBeVisible();
});
test('Python retry and payment accordions disclose provider limitations', async ({ page }) => {
  await page.goto('/');
  const quiz = page.locator('#try-python');
  await quiz.getByRole('button', { name: '02 Привет, name' }).click();
  await expect(quiz.getByRole('status')).toHaveText('Почти! Попробуй ещё раз');
  await quiz.getByRole('button', { name: '01 Привет, KaleaDoSkill' }).click();
  await expect(quiz.getByRole('status')).toHaveText('Верно! Именно так работает эта программа');
  await quiz.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(quiz.getByRole('status')).toHaveText('Выбери ответ — опыт не нужен.');
  const methods = page.locator('.course-grid .course-payment');
  await expect(methods).toHaveCount(2);
  for (const item of await methods.all()) {
    await expect(item).not.toHaveAttribute('open', '');
    await item.locator('summary').click();
    await expect(item).toHaveAttribute('open', '');
    await expect(item.getByText('От 3 до 60 месяцев', { exact: false })).toBeVisible();
    await expect(item.getByText('Онлайн-оплата пока не подключена.', { exact: true })).toBeVisible();
    await item.locator('summary').click();
    await expect(item).not.toHaveAttribute('open', '');
  }
});
test('admin rejects foreign origin, stale revisions, and unauthenticated writes', async ({ request }) => {
  expect((await request.post('/api/admin/login', { headers:{ Origin:'https://foreign.invalid' }, data:{password:'browser-test-password-123'} })).status()).toBe(403);
  expect((await request.put('/api/admin/content', { headers:{ Origin:'http://127.0.0.1:3200' }, data:{content:{},revision:0} })).status()).toBe(403);
  expect((await request.post('/api/admin/login', { headers:{ Origin:'http://127.0.0.1:3200' }, data:{password:'browser-test-password-123'} })).status()).toBe(200);
  const current = await (await request.get('/api/admin/content')).json();
  expect((await request.put('/api/admin/content', { headers:{ Origin:'http://127.0.0.1:3200' }, data:current })).status()).toBe(200);
  expect((await request.put('/api/admin/content', { headers:{ Origin:'http://127.0.0.1:3200' }, data:current })).status()).toBe(409);
});
test('review fixes keep terminal labels and expanded payment cards clear', async ({ page }) => {
  for (const width of [320, 375, 768, 1101, 1440, 1575]) {
    await page.setViewportSize({ width, height:892 }); await page.goto('/');
    const terminal = await page.locator('.code-card').boundingBox();
    const label = await page.locator('.art-bottom').boundingBox();
    expect(label!.y).toBeGreaterThan(terminal!.y + terminal!.height + 8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const cards = page.locator('.course-card');
    const original = await cards.nth(1).evaluate(e => { const b=e.getBoundingClientRect(); return {height:b.height,y:b.y+window.scrollY}; });
    await cards.nth(0).locator('summary').click();
    const after = await cards.nth(1).evaluate(e => { const b=e.getBoundingClientRect(); return {height:b.height,y:b.y+window.scrollY}; });
    if(width <= 680) expect(after!.height).toBeCloseTo(original!.height, 0);
    else expect(after.height).toBeCloseTo((await cards.nth(0).boundingBox())!.height, 0);
    if(width > 680) expect(after!.y).toBeCloseTo(original!.y,0);
    const content = cards.nth(0).locator('.payment-options');
    expect(await content.evaluate(e=>e.clientHeight)).toBeLessThanOrEqual(416);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await cards.nth(0).locator('summary').click();
    await cards.nth(1).locator('summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await cards.nth(1).locator('summary').click();
    const bank = page.locator('.bank-payment');
    await expect(bank).not.toHaveAttribute('open','');
    await bank.locator('summary').click();
    await expect(bank.getByText('Возраст покупателя: 18–70 лет.')).toBeVisible();
    await expect(bank.getByText('От 3 до 60 месяцев', {exact:false})).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({path:`work/screenshots/review-${width}.png`,fullPage:true});
  }
  await expect(page.locator('.faq-list')).not.toContainText('Вы гарантируете трудоустройство?');
  await expect(page.locator('.faq-list')).not.toContainText('Как работают рассрочка, кредит и Сплит?');
  await expect(page.locator('.footer-disclaimer')).toHaveCount(0);
  await expect(page.locator('#payment .section-heading')).toContainText('Возможны персональные скидки');
});


test('course rows, payment labels and scrollbars stay aligned when toggled', async ({ page }) => {
  for (const width of [375, 768, 1101, 1575]) {
    await page.setViewportSize({width,height:892}); await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const cards=page.locator('.course-card');
    if(width>680) {
      const a=await cards.nth(0).boundingBox(), b=await cards.nth(1).boundingBox();
      expect(a!.height).toBeCloseTo(b!.height,0);
      for(const selector of ['h3','.course-divider','.course-project','.course-bottom','.course-support','.course-format','summary']) {
        const left=await cards.nth(0).locator(selector).boundingBox(), right=await cards.nth(1).locator(selector).boundingBox();
        expect(left!.y).toBeCloseTo(right!.y,0);
      }
    }
    for (const item of await page.locator('.course-payment').all()) {
      const label=item.locator('summary > span').first();
      const before=await label.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+window.scrollY,width:r.width,height:r.height};});
      await item.locator('summary').click();
      expect(await label.evaluate(e=>getComputedStyle(e).transform)).toBe('none');
      const after=await label.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+window.scrollY,width:r.width,height:r.height};});
      expect(after).toEqual(before);
      const content=item.locator('.payment-options');
      expect(await content.evaluate(e=>getComputedStyle(e).scrollbarWidth)).toBe('thin');
      expect(await content.evaluate(e=>getComputedStyle(e).scrollbarColor)).toBe('rgb(168, 139, 85) rgb(23, 61, 47)');
      expect(await content.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
      await content.evaluate(e=>{e.scrollTop=e.scrollHeight;});
      expect(await content.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
      await content.evaluate(e=>{e.scrollTop=0;});
      await item.locator('summary').click();
    }
    for(const item of await cards.locator('.course-payment').all()) await item.locator('summary').click();
    if(width>680) expect((await cards.nth(0).boundingBox())!.height).toBeCloseTo((await cards.nth(1).boundingBox())!.height,0);
    await page.locator('.course-grid').screenshot({animations:'disabled',style:'.site-header,.skip-link {visibility:hidden!important}',path:`work/screenshots/aligned-courses-${width}.png`});
    await page.locator('.bank-payment summary').click();
    await page.locator('.payment-grid').screenshot({animations:'disabled',style:'.site-header,.skip-link {visibility:hidden!important}',path:`work/screenshots/aligned-payment-${width}.png`});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
