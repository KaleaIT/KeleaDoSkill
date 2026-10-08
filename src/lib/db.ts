import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { contentSchema, defaultContent, type Content } from './content';

let connection: DatabaseSync | undefined;
export function db() {
  if (!connection) {
    const file = path.resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || './data/kaleadoskill.sqlite');
    mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    connection = new DatabaseSync(file);
    connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), content TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
    connection.prepare('INSERT OR IGNORE INTO settings(id, content) VALUES(1, ?)').run(JSON.stringify(defaultContent));
  }
  return connection;
}
export function readContent(): { content: Content; revision: number } {
  const row = db().prepare('SELECT content, revision FROM settings WHERE id=1').get() as { content: string; revision: number };
  return { content: contentSchema.parse(JSON.parse(row.content)), revision: row.revision };
}
export function saveContent(content: Content, revision: number) {
  const result = db().prepare('UPDATE settings SET content=?, revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(contentSchema.parse(content)), revision);
  return result.changes === 1;
}
export function consumeLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  db().prepare('DELETE FROM rate_limits WHERE expires <= ?').run(now);
  const row = db().prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(key, now + windowMs) as { count: number };
  return row.count <= max;
}
