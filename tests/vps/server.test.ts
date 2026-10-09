import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { contentSchema, defaultContent } from '../src/lib/content';
import { db, readContent, saveContent } from '../src/lib/db';
import { correctPassword, issueSession, validSession, sameOrigin } from '../src/lib/security';
import { leadSchema, leadsReady } from '../src/lib/leads';
import { POST as submitLead } from '../src/app/api/leads/route';
import { PUT as updateContent, GET as getContent } from '../src/app/api/admin/content/route';
import { POST as login } from '../src/app/api/admin/login/route';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

before(() => { process.env.DATABASE_PATH = `/tmp/kds-unit-${process.pid}.sqlite`; process.env.ADMIN_PASSWORD = 'test-only-password-123456'; process.env.ADMIN_SESSION_SECRET = 'test-only-session-secret-1234567890'; process.env.LEADS_ENABLED = 'false'; });
const validLead = { name: 'Тестовая заявка', phone: '+7 (999) 123-45-67', email: 'test@example.org', contact: '@test', course: 'python', comment: '', consent: true, website: '', startedAt: Date.now() - 5000 };
function request(path: string, body?: unknown, method = 'POST', cookie?: string) { return new NextRequest(`http://localhost:3000${path}`, { method, headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...(cookie ? { cookie: `kds_admin=${cookie}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
function clearLimits() { db().prepare('DELETE FROM rate_limits').run(); }

test('default content matches schema and rejects unsafe links, duplicate courses and unsupported payment activation', () => {
  assert.ok(contentSchema.safeParse(defaultContent).success);
  const unsafe = structuredClone(defaultContent); unsafe.contacts.telegram = 'javascript:alert(1)'; assert.equal(contentSchema.safeParse(unsafe).success, false);
  const duplicate = structuredClone(defaultContent); duplicate.courses.push(duplicate.courses[0]); assert.equal(contentSchema.safeParse(duplicate).success, false);
  const payment = structuredClone(defaultContent); payment.payments[0].status = 'available'; assert.equal(contentSchema.safeParse(payment).success, false);
});
test('lead validation rejects malformed telephone and missing consent', () => { assert.ok(leadSchema.safeParse(validLead).success); assert.equal(leadSchema.safeParse({ ...validLead, phone: '1234' }).success, false); assert.equal(leadSchema.safeParse({ ...validLead, consent: false }).success, false); });
test('a missing explicit legal PDF keeps delivery closed even with bundled documents present', () => {
  const originalEnabled = process.env.LEADS_ENABLED;
  process.env.LEADS_ENABLED = 'true'; process.env.TELEGRAM_BOT_TOKEN = 'test-only'; process.env.TELEGRAM_CHAT_ID = 'test-only';
  try {
    assert.equal(leadsReady(defaultContent), true);
    const invalid = structuredClone(defaultContent); invalid.legal.privacy = '/documents/nonexistent-file.pdf';
    assert.equal(leadsReady(invalid), false);
  } finally { process.env.LEADS_ENABLED = originalEnabled; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; }
});
test('signed sessions reject tampering, expire, and password comparison works', () => { const session = issueSession(); assert.equal(validSession(session), true); assert.equal(validSession(session.slice(0, -1) + (session.endsWith('a') ? 'b' : 'a')), false); assert.equal(validSession('1.a.b'), false); assert.equal(correctPassword('bad-password'), false); assert.equal(correctPassword(process.env.ADMIN_PASSWORD!), true); });
test('mutations reject foreign or absent origin', () => { assert.equal(sameOrigin(request('/api/leads', validLead)), true); assert.equal(sameOrigin(new NextRequest('http://localhost:3000/api/leads', { headers: { origin: 'https://attacker.example' } })), false); assert.equal(sameOrigin(new NextRequest('http://localhost:3000/api/leads')), false); });
test('unconfigured application never accepts a lead or simulates success', async () => { clearLimits(); const response = await submitLead(request('/api/leads', validLead)); assert.equal(response.status, 503); assert.match((await response.json()).error, /не подключена/); });
test('lead endpoint enforces consent, course, honeypot and rate limit', async () => {
  clearLimits(); assert.equal((await submitLead(request('/api/leads', { ...validLead, consent: false }))).status, 400);
  assert.equal((await submitLead(request('/api/leads', { ...validLead, course: 'does-not-exist' }))).status, 400);
  assert.equal((await submitLead(request('/api/leads', { ...validLead, website: 'spam' }))).status, 400);
  assert.equal((await submitLead(request('/api/leads', { ...validLead, startedAt: Date.now() }))).status, 400);
  await submitLead(request('/api/leads', validLead)); assert.equal((await submitLead(request('/api/leads', validLead))).status, 429);
});
test('admin API blocks anonymous reads and edits and validates updates', async () => {
  assert.equal((await getContent(request('/api/admin/content', undefined, 'GET'))).status, 401);
  assert.equal((await updateContent(request('/api/admin/content', { content: defaultContent, revision: 0 }, 'PUT'))).status, 403);
  const session = issueSession(); const current = readContent();
  const bad = structuredClone(current.content); bad.courses[0].price = -1;
  assert.equal((await updateContent(request('/api/admin/content', { content: bad, revision: current.revision }, 'PUT', session))).status, 400);
  const modified = structuredClone(current.content); modified.hero.title = 'Проверка редактирования';
  assert.equal((await updateContent(request('/api/admin/content', { content: modified, revision: current.revision }, 'PUT', session))).status, 200);
  assert.equal(readContent().content.hero.title, 'Проверка редактирования');
  assert.equal((await updateContent(request('/api/admin/content', { content: modified, revision: current.revision }, 'PUT', session))).status, 409);
  assert.equal(saveContent(defaultContent, readContent().revision), true);
});
test('admin login sets HttpOnly cookie and rejects incorrect password', async () => { clearLimits(); assert.equal((await login(request('/api/admin/login', { password: 'wrong' }))).status, 401); const response = await login(request('/api/admin/login', { password: process.env.ADMIN_PASSWORD })); assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie')!, /HttpOnly/i); assert.match(response.headers.get('set-cookie')!, /SameSite=strict/i); });
test('configured lead delivery confirms Bot API success and reports upstream failure without leaking secrets', async () => {
  const cwd = process.cwd(); const originalFetch = globalThis.fetch;
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'kds-doc-fixture-'));
  mkdirSync(path.join(fixture, 'public/documents'), { recursive: true });
  // Presence fixtures only, not legal documents for the actual site.
  writeFileSync(path.join(fixture, 'public/documents/privacy.pdf'), '%PDF-1.4 test fixture');
  writeFileSync(path.join(fixture, 'public/documents/consent.pdf'), '%PDF-1.4 test fixture');
  const content = structuredClone(defaultContent); content.legal.privacy = '/documents/privacy.pdf'; content.legal.consent = '/documents/consent.pdf';
  saveContent(content, readContent().revision);
  process.env.LEADS_ENABLED = 'true'; process.env.TELEGRAM_BOT_TOKEN = 'fake-test-token'; process.env.TELEGRAM_CHAT_ID = 'fake-test-chat';
  try {
    process.chdir(fixture); clearLimits(); let delivered = false;
    globalThis.fetch = async (url, options) => { assert.equal(String(url), 'https://api.telegram.org/botfake-test-token/sendMessage'); const payload = JSON.parse(String(options?.body)); assert.equal(payload.chat_id, 'fake-test-chat'); assert.match(payload.text, /Тестовая заявка/); assert.match(payload.text, /Python-разработчик/); delivered = true; return Response.json({ ok: true }); };
    assert.equal((await submitLead(request('/api/leads', validLead))).status, 200); assert.equal(delivered, true);
    globalThis.fetch = async () => Response.json({ ok: false, description: 'Secret upstream error' }, { status: 401 });
    const failed = await submitLead(request('/api/leads', validLead)); assert.equal(failed.status, 502); assert.doesNotMatch(JSON.stringify(await failed.json()), /fake-test-token|Secret upstream/);
  } finally { globalThis.fetch = originalFetch; process.chdir(cwd); process.env.LEADS_ENABLED = 'false'; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; saveContent(defaultContent, readContent().revision); }
});
