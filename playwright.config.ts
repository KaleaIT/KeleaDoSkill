import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3200', headless: true, screenshot: 'only-on-failure', launchOptions: { ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) } },
  webServer: { command: 'npm start -- --port 3200', url: 'http://127.0.0.1:3200', reuseExistingServer: false, timeout: 120000, env: { DATABASE_PATH: `/tmp/kds-browser-${process.pid}.sqlite`, ADMIN_PASSWORD: 'browser-test-password-123', ADMIN_SESSION_SECRET: 'browser-test-session-secret-123456789', LEADS_ENABLED: process.env.KDS_FORM_TEST === '1' ? 'true' : 'false', SITE_URL: '', ...(process.env.KDS_FORM_TEST === '1' ? { TELEGRAM_BOT_TOKEN: 'synthetic-not-a-real-token', TELEGRAM_CHAT_ID: '-123', RATE_LIMIT_SECRET: 'synthetic-production-test-secret-123456789' } : {}) } }
});
