import { setting } from './runtime';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { consumeLimit, storageConfigured } from './db';
export const cookieName = 'kds_admin';
export function adminConfigured() { return storageConfigured() && !!setting('ADMIN_PASSWORD') && setting('ADMIN_PASSWORD')!.length >= 16 && !!setting('ADMIN_SESSION_SECRET') && setting('ADMIN_SESSION_SECRET')!.length >= 32; }
export async function correctPassword(value: string) {
  if (!adminConfigured()) return false;
  const salt = new TextEncoder().encode(setting('ADMIN_SESSION_SECRET')!);
  async function derive(password: string) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
  }
  const [given, expected] = await Promise.all([derive(value), derive(setting('ADMIN_PASSWORD')!)]);
  return timingSafeEqual(given, expected);
}
export function issueSession() {
  const payload = `${Date.now() + 8 * 60 * 60 * 1000}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', setting('ADMIN_SESSION_SECRET')!).update(payload).digest('hex')}`;
}
export function validSession(value?: string) {
  if (!adminConfigured() || !value || value.length > 200) return false;
  const [expires, nonce, signature, extra] = value.split('.');
  if (extra || !/^\d+$/.test(expires || '') || !/^[a-f0-9]{48}$/.test(nonce || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expires) <= Date.now()) return false;
  const expected = createHmac('sha256', setting('ADMIN_SESSION_SECRET')!).update(`${expires}.${nonce}`).digest('hex');
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Next's internal bind hostname may differ from the browser's Host in dev.
  // Production uses the explicitly configured public origin.
  const configured = [setting('SITE_URL')];
  if (setting('VERCEL') === '1' && setting('VERCEL_URL')) configured.push(`https://${setting('VERCEL_URL')}`);
  const allowed = configured.filter(Boolean);
  if (!allowed.length) allowed.push(`${request.nextUrl.protocol}//${request.headers.get('host') || request.nextUrl.host}`);
  try { return !!origin && allowed.some(value => origin === new URL(value!).origin); } catch { return false; }
}
export async function limit(request: NextRequest, scope: string, max: number, minutes: number) {
  // Only trust a header when the deployment's ingress overwrites it.
  const identity = setting('TRUST_PROXY') === 'true' ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : 'shared';
  const hash = createHmac('sha256', setting('RATE_LIMIT_SECRET') || setting('ADMIN_SESSION_SECRET') || 'kds-local-rate-limit').update(identity).digest('hex');
  return consumeLimit(`${scope}:${hash}`, max, minutes * 60000);
}
