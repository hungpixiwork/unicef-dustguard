import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('audit-d1-writes.json', 'utf8'));
const serverWrites = data.filter(d => d.file.startsWith('server/'));
console.log('Total server/ writes:', serverWrites.length);
serverWrites.slice(0, 62).forEach((w, idx) => {
  console.log(`[${idx+1}] ${w.file}:${w.line} | ${w.endpoint} | ${w.code}`);
});
