import fs from 'fs';
import path from 'path';

const searchDirs = [
  'app/src',
  'apps/web/src',
  'dustguard-operations/apps/web/src'
];

const patterns = [
  { name: 'setInterval', regex: /setInterval\s*\(/g },
  { name: 'setTimeout', regex: /setTimeout\s*\(/g },
  { name: 'poll', regex: /\b(poll|polling|pollInterval|pollingInterval)\b/gi },
  { name: 'refetchInterval', regex: /refetchInterval/g },
  { name: 'invalidateQueries', regex: /invalidateQueries/g },
  { name: 'heartbeat', regex: /heartbeat/gi },
  { name: 'refresh', regex: /\b(refreshInterval|autoRefresh|refreshTimer|startPolling|stopPolling)\b/gi },
  { name: 'useQuery', regex: /useQuery\s*\(/g },
  { name: 'fetch', regex: /\bfetch\s*\(/g },
  { name: 'axios', regex: /\baxios\b/g },
];

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filePath, fileList);
      }
    } else {
      if (/\.(jsx?|tsx?)$/.test(file)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const results = {};
for (const p of patterns) {
  results[p.name] = [];
}

const allFiles = [];
for (const d of searchDirs) {
  walk(d, allFiles);
}

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of patterns) {
      p.regex.lastIndex = 0;
      if (p.regex.test(line)) {
        results[p.name].push({
          file: file.replace(/\\/g, '/'),
          line: i + 1,
          code: line.trim()
        });
      }
    }
  }
}

console.log('=== SUMMARY OF OCCURRENCES ===');
for (const key of Object.keys(results)) {
  console.log(`${key}: ${results[key].length} occurrences across scanned frontend files`);
}

fs.writeFileSync('scripts/polling-audit-raw.json', JSON.stringify(results, null, 2));
console.log('\nWrote full raw results to scripts/polling-audit-raw.json');
