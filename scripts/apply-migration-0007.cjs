const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbPath = 'data/dustguard-community.db';
if (!fs.existsSync(dbPath)) {
  console.log('Database not found:', dbPath);
  process.exit(0);
}

const db = new DatabaseSync(dbPath);
const sql = fs.readFileSync('migrations/0007_perf_indexes.sql', 'utf8');
const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

for (const stmt of stmts) {
  try {
    db.exec(stmt);
    console.log('Executed successfully:', stmt.replace(/\s+/g, ' ').substring(0, 60));
  } catch (err) {
    console.log('Skipped/Notice:', err.message);
  }
}

const indexes = db.prepare(`SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND tbl_name IN ('iot_readings', 'cases', 'iot_events')`).all();
console.log('Current Indexes:', indexes);

// Test EXPLAIN QUERY PLAN
const explain = db.prepare(`EXPLAIN QUERY PLAN SELECT * FROM iot_readings WHERE device_id = 'DG-IOT-001' ORDER BY created_at DESC LIMIT 1`).all();
console.log('EXPLAIN QUERY PLAN:', explain);
