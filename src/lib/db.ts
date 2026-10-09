import postgres, { type Sql } from 'postgres';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { contentSchema, defaultContent, type Content } from './content';

let sql: Sql | undefined;
let initialized: Promise<void> | undefined;
let local: DatabaseSync | undefined;

// Vercel Functions have no persistent filesystem. Never use local SQLite there.
export function storageConfigured() {
  return !!process.env.DATABASE_URL || (!process.env.VERCEL && !!process.env.DATABASE_PATH);
}

function sqlite(): DatabaseSync {
  if (process.env.VERCEL || !process.env.DATABASE_PATH) throw new Error('Persistent storage is not configured');
  if (!local) {
    const file = path.resolve(process.env.DATABASE_PATH);
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    local = new DatabaseSync(file);
    local.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), content TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  }
  return local;
}

async function pg(): Promise<Sql> {
  if (!process.env.DATABASE_URL) throw new Error('Persistent storage is not configured');
  sql ??= postgres(process.env.DATABASE_URL, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  if (!initialized) {
    initialized = sql.begin(async transaction => {
      await transaction`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), content TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`;
      await transaction`CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires BIGINT NOT NULL)`;
    }).then(() => undefined).catch(error => { initialized = undefined; throw error; });
  }
  await initialized;
  return sql;
}

export async function readContent(): Promise<{ content: Content; revision: number }> {
  if (!storageConfigured()) return { content: defaultContent, revision: 0 };
  const row = process.env.DATABASE_URL
    ? (await (await pg())`SELECT content, revision FROM settings WHERE id=1`)[0]
    : sqlite().prepare('SELECT content, revision FROM settings WHERE id=1').get();
  return row ? { content: contentSchema.parse(JSON.parse(row.content as string)), revision: Number(row.revision) } : { content: defaultContent, revision: 0 };
}

export async function saveContent(content: Content, revision: number): Promise<boolean> {
  const json = JSON.stringify(contentSchema.parse(content));
  if (process.env.DATABASE_URL) {
    return (await pg()).begin(async transaction => {
      await transaction`INSERT INTO settings(id,content,revision) VALUES(1,${JSON.stringify(defaultContent)},0) ON CONFLICT(id) DO NOTHING`;
      const updated = await transaction`UPDATE settings SET content=${json}, revision=revision+1 WHERE id=1 AND revision=${revision} RETURNING revision`;
      return updated.length === 1;
    });
  }
  const connection = sqlite();
  connection.prepare('INSERT OR IGNORE INTO settings(id,content,revision) VALUES(1,?,0)').run(JSON.stringify(defaultContent));
  return connection.prepare('UPDATE settings SET content=?,revision=revision+1 WHERE id=1 AND revision=?').run(json, revision).changes === 1;
}

export async function consumeLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  if (process.env.DATABASE_URL) {
    const connection = await pg();
    await connection`DELETE FROM rate_limits WHERE expires <= ${now}`;
    const rows = await connection`INSERT INTO rate_limits(key,count,expires) VALUES(${key},1,${now + windowMs})
      ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count`;
    return Number(rows[0].count) <= max;
  }
  const connection = sqlite();
  connection.prepare('DELETE FROM rate_limits WHERE expires <= ?').run(now);
  const row = connection.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(key, now + windowMs);
  return Number(row!.count) <= max;
}

export async function closeStorage() {
  if (sql) await sql.end({ timeout: 5 });
  sql = undefined; initialized = undefined;
  local?.close(); local = undefined;
}
