const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbs = [
  'data/dustguard-community.db',
  'app/prisma/dev.db',
  'app/dev.db',
  'dustguard-operations/data/dustguard-operations.db'
];

for (const dbPath of dbs) {
  if (fs.existsSync(dbPath)) {
    console.log(`\n=== DB: ${dbPath} ===`);
    const db = new DatabaseSync(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('Tables count:', tables.length);
    const targetTables = ['iot_readings', 'cases', 'campaign_participants', 'notifications', 'iot_devices', 'iot_events'];
    for (const t of targetTables) {
      const exists = tables.some(row => row.name === t);
      if (exists) {
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
        console.log(`  Table ${t}: [${cols.join(', ')}]`);
        const indexes = db.prepare(`PRAGMA index_list(${t})`).all().map(idx => idx.name);
        console.log(`  Indexes on ${t}: [${indexes.join(', ')}]`);
      } else {
        console.log(`  Table ${t}: NOT FOUND`);
      }
    }
  } else {
    console.log('\nDB not found:', dbPath);
  }
}
