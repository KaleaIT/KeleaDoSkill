'use client';
import { useState } from 'react';
export default function AdminLogin({ configured }: { configured: boolean }) {
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function login(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const password = new FormData(e.currentTarget).get('password'); setLoading(true); setError(''); try { const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); window.location.reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сети'); } finally { setLoading(false); } }
  return <main className="admin-login"><a className="text-link" href="/">← На сайт</a><h1>Управление сайтом</h1>{configured ? <><p>Вход для владельца KaleaDoSkill.</p><form onSubmit={login}><label className="form-field" htmlFor="password">Пароль<input type="password" id="password" name="password" autoComplete="current-password" required maxLength={256} /></label><button className="button" disabled={loading}>{loading ? 'Входим…' : 'Войти'}</button>{error && <p className="form-error" role="alert">{error}</p>}</form></> : <p>Вход отключён до настройки серверных учётных данных. Обратитесь к администратору сервера.</p>}</main>;
}
