import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
const directory = process.argv[2];
if (!directory) throw new Error('Usage: node scripts/backup.mjs /secure/backup/directory');
await mkdir(directory, { recursive: true, mode: 0o700 });
const database = new DatabaseSync(path.resolve(process.env.DATABASE_PATH || './data/kaleadoskill.sqlite'), { readOnly: true });
try {
  await backup(database, path.join(directory, `kaleadoskill-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`));
  console.log('SQLite backup completed. Store it outside the public web directory.');
} finally { database.close(); }
