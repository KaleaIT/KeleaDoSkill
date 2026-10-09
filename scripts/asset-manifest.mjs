import { readdirSync, existsSync, writeFileSync } from 'node:fs';
const files = existsSync('public/documents') ? readdirSync('public/documents').filter(x => /^[a-zA-Z0-9_-]+\.pdf$/.test(x)).map(x => '/documents/'+x) : [];
writeFileSync('src/content/document-assets.ts', 'export const documentAssets: string[] = '+JSON.stringify(files)+';\n');
