import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const dbs = [
  'data/dustguard-community.db',
  'dustguard-operations/data/dustguard-operations.db',
  'app/prisma/dev.db',
  '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6ceec9eee9ef12138004991452fdf68588135f51c0d8df30d22659ff9436d93e.sqlite'
];

for (const p of dbs) {
  if (fs.existsSync(p)) {
    try {
      const db = new DatabaseSync(p, { readOnly: true });
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all();
      console.log(`=== ${p} (Tables: ${tables.length}) ===`);
      for (const t of tables) {
        try {
          const count = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get();
          console.log(`  ${t.name.padEnd(35)} : ${count.cnt}`);
        } catch (e) {
          console.log(`  ${t.name.padEnd(35)} : ERROR (${e.message})`);
        }
      }
    } catch (err) {
      console.error(`Error opening ${p}:`, err.message);
    }
  } else {
    console.log(`File not found: ${p}`);
  }
}
