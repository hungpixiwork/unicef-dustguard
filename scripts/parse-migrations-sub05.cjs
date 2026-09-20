const fs = require('fs');
const path = require('path');

const migrationsDir = 'migrations';
const files = fs.readdirSync(migrationsDir).sort();

for (const file of files) {
  if (file.endsWith('.sql')) {
    console.log(`=== File: ${file} ===`);
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tableMatches = content.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/g);
    for (const match of tableMatches) {
      const tableName = match[1];
      const body = match[2];
      const lines = body.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('--') && !l.startsWith('CONSTRAINT') && !l.startsWith('PRIMARY KEY') && !l.startsWith('FOREIGN KEY') && !l.startsWith('CHECK'))
        .map(l => l.split(/\s+/)[0]);
      console.log(`  Table ${tableName}:`, lines.slice(0, 10).join(', ') + (lines.length > 10 ? '...' : ''));
    }
  }
}
