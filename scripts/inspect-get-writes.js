import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('audit-d1-writes.json', 'utf8'));
const getWrites = data.filter(d => d.endpoint.startsWith('GET '));
console.log('Total GET writes:', getWrites.length);
getWrites.forEach((w, idx) => {
  console.log(`[${idx+1}] ${w.file}:${w.line} | ${w.endpoint} | ${w.code}`);
});
