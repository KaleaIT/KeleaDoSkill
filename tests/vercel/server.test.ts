import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { defaultContent } from '../../src/lib/content';
import { closeStorage, consumeLimit, readContent, saveContent, storageConfigured } from '../../src/lib/db';
import { leadsReady } from '../../src/lib/leads';
import { sameOrigin } from '../../src/lib/security';
import { POST } from '../../src/app/api/leads/route';

process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), 'kds-vercel-test-')), 'test.sqlite');
process.env.RATE_LIMIT_SECRET = 'local-test-rate-limit-secret-at-least-32-characters';
process.env.LEADS_ENABLED = 'false';
after(closeStorage);

const payload = { name: 'Тест формы', phone: '+7 999 123-45-67', email: 'test@example.invalid', contact: '@test', course: 'python', comment: 'Synthetic test, no real applicant', consent: true, website: '', startedAt: Date.now() - 3000 };
function request(data: unknown, origin='http://localhost:3000') {
  return new NextRequest('http://localhost:3000/api/leads', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) });
}

test('content persists and concurrent edits reject stale revisions', async () => {
  const current = await readContent();
  const changed = structuredClone(current.content); changed.hero.title = 'Persisted title';
  assert.equal(await saveContent(changed,current.revision),true);
  assert.equal(await saveContent(defaultContent,current.revision),false);
  await closeStorage();
  assert.equal((await readContent()).content.hero.title,'Persisted title');
  assert.equal(await saveContent(defaultContent,(await readContent()).revision),true);
});

test('persistent rate limit permits exactly five concurrent attempts', async () => {
  const key = 'parallel-'+Date.now();
  const result = await Promise.all(Array.from({length:8},()=>consumeLimit(key,5,60000)));
  assert.equal(result.filter(Boolean).length,5);
});

test('Vercel never accepts temporary SQLite as persistent storage', async () => {
  process.env.VERCEL='1';
  const databaseURL=process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  try {
    assert.equal(storageConfigured(),false);
    assert.equal(leadsReady(defaultContent),false);
    assert.equal((await POST(request(payload))).status,503);
    assert.equal((await readContent()).content.hero.title,defaultContent.hero.title);
  } finally {
    delete process.env.VERCEL;
    if(databaseURL) process.env.DATABASE_URL=databaseURL;
  }
});

test('foreign origins and malformed applications never reach Telegram', async () => {
  assert.equal((await POST(request(payload,'https://foreign.invalid'))).status,403);
  assert.equal((await POST(request({...payload,consent:false}))).status,400);
  assert.equal((await POST(request({...payload,course:'missing'}))).status,400);
  assert.equal((await POST(request({...payload,website:'spam'}))).status,400);
  assert.equal((await POST(request({...payload,startedAt:Date.now()}))).status,400);
});

test('Telegram success is verified and upstream failure never reports success or leaks a token', async () => {
  // Clear only this test's shared identity by using a separate proxy identity.
  process.env.TRUST_PROXY='true';
  process.env.LEADS_ENABLED='true';process.env.TELEGRAM_BOT_TOKEN='test-only-token';process.env.TELEGRAM_CHAT_ID='test-only-chat';
  const originalFetch=globalThis.fetch;
  const freshRequest=()=>{ const r=request(payload);r.headers.set('x-forwarded-for','192.0.2.10');return r; };
  try {
    assert.equal(leadsReady(defaultContent),true);
    globalThis.fetch=async (url,options)=>{
      assert.equal(String(url),'https://api.telegram.org/bottest-only-token/sendMessage');
      const body=JSON.parse(String(options?.body));
      assert.equal(body.chat_id,'test-only-chat');assert.match(body.text,/Тест формы/);assert.match(body.text,/Python-разработчик/);
      return Response.json({ok:true});
    };
    assert.equal((await POST(freshRequest())).status,200);
    globalThis.fetch=async()=>Response.json({ok:false,description:'Private upstream detail'},{status:401});
    const failed=await POST(freshRequest());assert.equal(failed.status,502);
    assert.doesNotMatch(JSON.stringify(await failed.json()),/test-only-token|Private upstream detail/);
    globalThis.fetch=async()=>{throw new Error('Network timeout');};
    assert.equal((await POST(freshRequest())).status,502);
  } finally {
    globalThis.fetch=originalFetch;process.env.LEADS_ENABLED='false';process.env.TRUST_PROXY='false';delete process.env.TELEGRAM_BOT_TOKEN;delete process.env.TELEGRAM_CHAT_ID;
  }
});

test('production and current Vercel preview origins are accepted, arbitrary previews rejected', () => {
  process.env.SITE_URL='https://school.example';process.env.VERCEL='1';process.env.VERCEL_URL='current-deployment.vercel.app';
  try {
    assert.equal(sameOrigin(request(payload,'https://school.example')),true);
    assert.equal(sameOrigin(request(payload,'https://current-deployment.vercel.app')),true);
    assert.equal(sameOrigin(request(payload,'https://other-deployment.vercel.app')),false);
  } finally {delete process.env.SITE_URL;delete process.env.VERCEL;delete process.env.VERCEL_URL;}
});
