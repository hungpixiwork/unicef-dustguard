import fs from 'node:fs';

const content = fs.readFileSync('server/community.ts', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/app\.get\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (m) {
    const route = m[1];
    // Collect next 40 lines
    const snippet = lines.slice(i, Math.min(lines.length, i + 45)).join('\n');
    if (/INSERT|UPDATE|DELETE|run\(|exec\(|\.run\(|\.exec\(|\.batch\(/i.test(snippet)) {
      console.log(`POTENTIAL WRITE IN GET /api${route} at line ${i+1}:`);
      // Find which line
      for (let j = i; j < Math.min(lines.length, i + 45); j++) {
        if (/INSERT|UPDATE|DELETE|run\(|exec\(/i.test(lines[j])) {
          console.log(`   line ${j+1}: ${lines[j].trim()}`);
        }
      }
    }
  }
}
