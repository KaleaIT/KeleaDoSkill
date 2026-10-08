import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { consumeLimit } from './db';
export const cookieName = 'kds_admin';
export function adminConfigured() { return !!process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 16 && !!process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32; }
export function correctPassword(value: string) {
  if (!adminConfigured()) return false;
  const secret = process.env.ADMIN_SESSION_SECRET!;
  return timingSafeEqual(scryptSync(value, secret, 64), scryptSync(process.env.ADMIN_PASSWORD!, secret, 64));
}
export function issueSession() {
  const payload = `${Date.now() + 8 * 60 * 60 * 1000}.${randomBytes(24).toString('hex')}`;
  return `${payload}.${createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(payload).digest('hex')}`;
}
export function validSession(value?: string) {
  if (!adminConfigured() || !value || value.length > 200) return false;
  const [expires, nonce, signature, extra] = value.split('.');
  if (extra || !/^\d+$/.test(expires || '') || !/^[a-f0-9]{48}$/.test(nonce || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expires) <= Date.now()) return false;
  const expected = createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(`${expires}.${nonce}`).digest('hex');
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  // Next's internal bind hostname may differ from the browser's Host in dev.
  // Production uses the explicitly configured public origin.
  const expected = process.env.SITE_URL || `${request.nextUrl.protocol}//${request.headers.get('host') || request.nextUrl.host}`;
  try { return !!origin && origin === new URL(expected).origin; } catch { return false; }
}
export function limit(request: NextRequest, scope: string, max: number, minutes: number) {
  // Only trust a header when the deployment's ingress overwrites it.
  const identity = process.env.TRUST_PROXY === 'true' ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : 'shared';
  const hash = createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'kds-local-rate-limit').update(identity).digest('hex');
  return consumeLimit(`${scope}:${hash}`, max, minutes * 60000);
}
